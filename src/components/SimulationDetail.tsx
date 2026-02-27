import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  History,
  FileText,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useTaxConfig, TAX_RATE_MAP } from "@/contexts/TaxConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSimulationAuditLog, useCreateAuditEntry, useUpdateSimulation } from "@/hooks/useSimulations";
import { useCostEstimateTemplates, useCostEstimates } from "@/hooks/useCostEstimates";
import { downloadCostEstimatePdf } from "@/lib/generateCostEstimatePdf";
import { format } from "date-fns";
import StatusBadge from "@/components/StatusBadge";
import CostEstimateDetailViewer from "@/components/CostEstimateDetailViewer";
import GenerateCostEstimateDialog from "@/components/GenerateCostEstimateDialog";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "SGD", "AUD", "CAD", "INR", "BRL"] as const;

interface BenefitLine {
  id: string;
  category: string;
  label: string;
  amount: number;
  isOverridden: boolean;
  originalAmount: number;
}

interface Scenario {
  id: string;
  name: string;
  currency: string;
  benefits: BenefitLine[];
}

function generateBenefits(sim: any, grossUpMultiplier: number): BenefitLine[] {
  const baseSalary = Number(sim.base_salary) || 0;
  const cola = baseSalary * (Number(sim.cola_percent) || 0) / 100;
  const housingMonthly = Number(sim.housing_cap) || 0;
  const housingTotal = housingMonthly * (Number(sim.duration_months) || 24);
  const fxBuffer = baseSalary * (Number(sim.exchange_rate_buffer) || 0) / 100;
  const relocation = sim.include_relocation_lump_sum ? (Number(sim.relocation_lump_sum) || 0) : 0;
  const schooling = sim.include_schooling ? Math.round(baseSalary * 0.12) : 0;
  const spouseSupport = sim.include_spouse_support ? Math.round(baseSalary * 0.05) : 0;

  const taxRate = TAX_RATE_MAP[sim.tax_approach] ?? 0.22;
  const baseTaxCost = Math.round(baseSalary * taxRate);
  const taxCost = Math.round(baseTaxCost * grossUpMultiplier);

  const lines: BenefitLine[] = [
    { id: "base", category: "Compensation", label: "Base Salary", amount: baseSalary, isOverridden: false, originalAmount: baseSalary },
    { id: "cola", category: "Compensation", label: "COLA Adjustment", amount: Math.round(cola), isOverridden: false, originalAmount: Math.round(cola) },
    { id: "fx", category: "Compensation", label: "FX Rate Buffer", amount: Math.round(fxBuffer), isOverridden: false, originalAmount: Math.round(fxBuffer) },
    { id: "housing", category: "Allowances", label: "Housing Allowance", amount: Math.round(housingTotal), isOverridden: false, originalAmount: Math.round(housingTotal) },
    { id: "tax", category: "Tax & Social", label: "Tax Costs (incl. Gross-Up)", amount: taxCost, isOverridden: false, originalAmount: taxCost },
    { id: "relocation", category: "Relocation", label: "Relocation Lump Sum", amount: relocation, isOverridden: false, originalAmount: relocation },
  ];

  if (schooling > 0) lines.push({ id: "schooling", category: "Allowances", label: "Schooling Allowance", amount: schooling, isOverridden: false, originalAmount: schooling });
  if (spouseSupport > 0) lines.push({ id: "spouse", category: "Allowances", label: "Spouse / Partner Support", amount: spouseSupport, isOverridden: false, originalAmount: spouseSupport });

  return lines;
}

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

const formatNumber = (amount: number) =>
  new Intl.NumberFormat("en-US").format(amount);

const getCurrencySymbol = (currency: string) => {
  const parts = new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
};

/* ─── Donut Chart ─── */
function DonutChart({ total, currency, color = "hsl(var(--primary))" }: { total: number; currency: string; color?: string }) {
  const size = 140;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.15}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{currency}</span>
        <span className="text-lg font-bold text-foreground tabular-nums">{formatNumber(total)}</span>
      </div>
    </div>
  );
}

interface SimulationDetailProps {
  simulation: any;
  onBack: () => void;
}

export default function SimulationDetail({ simulation, onBack }: SimulationDetailProps) {
  const { user } = useAuth();
  const { grossUpMultiplier } = useTaxConfig();
  const { data: auditLog } = useSimulationAuditLog(simulation.id);
  const createAuditEntry = useCreateAuditEntry();
  const updateSimulation = useUpdateSimulation();
  const { data: ceTemplates } = useCostEstimateTemplates();

  const { data: linkedEstimates } = useCostEstimates(simulation.id);
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const [showCEDialog, setShowCEDialog] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const policyName = (simulation as any).policies?.name;

  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const saved = simulation.cost_breakdown as any;
    if (saved?.scenarios && Array.isArray(saved.scenarios) && saved.scenarios.length > 0) {
      return saved.scenarios as Scenario[];
    }
    return [
      {
        id: "primary",
        name: simulation.employee_name || "Primary Scenario",
        currency: simulation.currency || "USD",
        benefits: generateBenefits(simulation, grossUpMultiplier),
      },
    ];
  });

  // Auto-save scenarios
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistScenarios = useCallback((updatedScenarios: Scenario[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateSimulation.mutate({
        id: simulation.id,
        cost_breakdown: { scenarios: updatedScenarios } as any,
      });
    }, 800);
  }, [simulation.id, updateSimulation]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    persistScenarios(scenarios);
  }, [scenarios, persistScenarios]);

  const addScenario = () => {
    const base = scenarios[0];
    const newScenario: Scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${scenarios.length + 1}`,
      currency: base.currency,
      benefits: base.benefits.map((b) => ({ ...b, isOverridden: false, amount: b.originalAmount })),
    };
    setScenarios((prev) => [...prev, newScenario]);
  };

  const removeScenario = (scenarioId: string) => {
    if (scenarios.length <= 1) return;
    setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
  };

  const updateScenarioName = (scenarioId: string, name: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, name } : s)));
  };

  // Exchange rates
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  useEffect(() => {
    async function fetchRates() {
      const { data: tables } = await supabase
        .from("lookup_tables")
        .select("id")
        .eq("name", "Exchange Rates")
        .limit(1);
      if (!tables || tables.length === 0) return;
      const { data: rows } = await supabase
        .from("lookup_table_rows")
        .select("row_data")
        .eq("lookup_table_id", tables[0].id);
      if (!rows) return;
      const rateMap: Record<string, number> = {};
      rows.forEach((r: any) => {
        const d = r.row_data;
        if (d.base_currency && d.target_currency && d.rate) {
          rateMap[`${d.base_currency}_${d.target_currency}`] = Number(d.rate);
        }
      });
      setExchangeRates(rateMap);
    }
    fetchRates();
  }, []);

  const getExchangeRate = useCallback((from: string, to: string): number | null => {
    if (from === to) return 1;
    const direct = exchangeRates[`${from}_${to}`];
    if (direct) return direct;
    const inverse = exchangeRates[`${to}_${from}`];
    if (inverse) return 1 / inverse;
    if (from !== "USD" && to !== "USD") {
      const fromToUsd = exchangeRates[`${from}_USD`] || (exchangeRates[`USD_${from}`] ? 1 / exchangeRates[`USD_${from}`] : null);
      const usdToTarget = exchangeRates[`USD_${to}`] || (exchangeRates[`${to}_USD`] ? 1 / exchangeRates[`${to}_USD`] : null);
      if (fromToUsd && usdToTarget) return fromToUsd * usdToTarget;
    }
    return null;
  }, [exchangeRates]);

  const updateScenarioCurrency = (scenarioId: string, newCurrency: string) => {
    setScenarios((prev) => prev.map((s) => {
      if (s.id !== scenarioId) return s;
      const oldCurrency = s.currency;
      if (oldCurrency === newCurrency) return s;
      const rate = getExchangeRate(oldCurrency, newCurrency);
      if (rate === null || rate === 1) return { ...s, currency: newCurrency };
      return {
        ...s,
        currency: newCurrency,
        benefits: s.benefits.map((b) => ({
          ...b,
          amount: Math.round(b.amount * rate),
          originalAmount: Math.round(b.originalAmount * rate),
        })),
      };
    }));
  };

  const updateBenefitAmount = (scenarioId: string, benefitId: string, amount: number) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    const benefit = scenario?.benefits.find((b) => b.id === benefitId);
    if (benefit && amount !== benefit.amount && user) {
      createAuditEntry.mutate({
        simulation_id: simulation.id,
        scenario_id: scenarioId,
        scenario_name: scenario!.name,
        field_id: benefitId,
        field_label: benefit.label,
        old_value: benefit.amount,
        new_value: amount,
        action: amount !== benefit.originalAmount ? "override" : "reset",
        changed_by: user.id,
      });
    }
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? { ...s, benefits: s.benefits.map((b) => b.id === benefitId ? { ...b, amount, isOverridden: amount !== b.originalAmount } : b) }
          : s
      )
    );
  };

  const resetBenefit = (scenarioId: string, benefitId: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? { ...s, benefits: s.benefits.map((b) => b.id === benefitId ? { ...b, amount: b.originalAmount, isOverridden: false } : b) }
          : s
      )
    );
  };

  const addCustomBenefit = (scenarioId: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? { ...s, benefits: [...s.benefits, { id: crypto.randomUUID(), category: "Custom", label: "New Benefit", amount: 0, isOverridden: true, originalAmount: 0 }] }
          : s
      )
    );
  };

  const updateBenefitLabel = (scenarioId: string, benefitId: string, label: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? { ...s, benefits: s.benefits.map((b) => (b.id === benefitId ? { ...b, label } : b)) }
          : s
      )
    );
  };

  const removeBenefit = (scenarioId: string, benefitId: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? { ...s, benefits: s.benefits.filter((b) => b.id !== benefitId) }
          : s
      )
    );
  };

  // Get all unique categories across all scenarios
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    scenarios.forEach((s) => s.benefits.forEach((b) => cats.add(b.category)));
    return Array.from(cats);
  }, [scenarios]);

  // Get all unique benefit labels per category
  const benefitsByCategory = useMemo(() => {
    const result: Record<string, string[]> = {};
    allCategories.forEach((cat) => {
      const labels = new Set<string>();
      scenarios.forEach((s) => s.benefits.filter((b) => b.category === cat).forEach((b) => labels.add(b.label)));
      result[cat] = Array.from(labels);
    });
    return result;
  }, [allCategories, scenarios]);

  const donutColors = [
    "hsl(var(--primary))",
    "hsl(210, 40%, 65%)",
    "hsl(var(--accent))",
  ];

  const scenarioTotals = scenarios.map((s) => s.benefits.reduce((sum, b) => sum + b.amount, 0));

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>View Simulations</span>
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {simulation.employee_name}
              </h1>
              <Pencil className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {simulation.sim_code} · {simulation.origin_city || simulation.origin_country} → {simulation.destination_city || simulation.destination_country}
              {simulation.start_date && ` · ${format(new Date(simulation.start_date), "MMM yyyy")}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
            </Button>
            {(simulation.status === "completed" || simulation.status === "running") && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await updateSimulation.mutateAsync({ id: simulation.id, status: "approved" as any });
                    toast.success("Simulation approved");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to approve");
                  }
                }}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Approve
              </Button>
            )}
            {ceTemplates && ceTemplates.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowCEDialog(true)}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Estimate
              </Button>
            )}
            <Button size="sm" onClick={addScenario}>
              <Plus className="w-4 h-4 mr-1" /> Add Scenario
            </Button>
            <Button size="sm" variant="default" onClick={() => toast.info("Recalculating...")}>
              <RefreshCw className="w-4 h-4 mr-1" /> Recalculate
            </Button>
          </div>
        </div>
      </div>

      {/* Comparison Panel */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Donut Charts Row */}
        <div className="border-b border-border">
          <div className="grid" style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}>
            {/* Empty label column */}
            <div />
            {/* Donut per scenario */}
            {scenarios.map((scenario, i) => {
              const total = scenarioTotals[i];
              return (
                <div key={scenario.id} className="flex flex-col items-center py-6 border-l border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      value={scenario.name}
                      onChange={(e) => updateScenarioName(scenario.id, e.target.value)}
                      className="text-sm font-semibold h-7 max-w-[200px] bg-transparent border-none p-0 focus-visible:ring-0 text-foreground text-center"
                    />
                    {scenarios.length > 1 && (
                      <button
                        onClick={() => removeScenario(scenario.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <DonutChart total={total} currency={scenario.currency} color={donutColors[i % donutColors.length]} />
                  <div className="mt-2">
                    <Select value={scenario.currency} onValueChange={(v) => updateScenarioCurrency(scenario.id, v)}>
                      <SelectTrigger className="h-6 w-[70px] text-xs border-none bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible Category Sections */}
        {allCategories.map((category) => {
          const isCollapsed = !!collapsedCategories[category];
          const labels = benefitsByCategory[category];
          const categoryTotals = scenarios.map((s) =>
            s.benefits.filter((b) => b.category === category).reduce((sum, b) => sum + b.amount, 0)
          );

          return (
            <div key={category}>
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full grid items-center border-b border-border hover:bg-muted/30 transition-colors"
                style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}
              >
                <div className="flex items-center gap-2 px-5 py-3">
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  <span className="text-sm font-semibold text-foreground">{category}</span>
                </div>
                {scenarios.map((s, i) => (
                  <div key={s.id} className="px-5 py-3 text-right text-sm font-semibold text-foreground tabular-nums border-l border-border">
                    {formatNumber(categoryTotals[i])}
                  </div>
                ))}
              </button>

              {/* Benefit Rows */}
              {!isCollapsed && labels.map((label) => (
                <div
                  key={label}
                  className="grid items-center border-b border-border/50 hover:bg-muted/10 transition-colors"
                  style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}
                >
                  <div className="px-5 py-2.5 pl-10 text-sm text-muted-foreground">{label}</div>
                  {scenarios.map((scenario) => {
                    const benefit = scenario.benefits.find((b) => b.label === label && b.category === category);
                    if (!benefit) {
                      return <div key={scenario.id} className="px-5 py-2.5 text-right text-sm text-muted-foreground/40 border-l border-border">—</div>;
                    }
                    return (
                      <div key={scenario.id} className="flex items-center justify-end gap-1.5 px-5 py-2.5 border-l border-border">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(benefit.amount)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/,/g, "");
                            updateBenefitAmount(scenario.id, benefit.id, Number(raw) || 0);
                          }}
                          className={`h-6 w-[100px] text-sm text-right bg-transparent border-none p-0 focus-visible:ring-0 tabular-nums ${
                            benefit.isOverridden ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-foreground"
                          }`}
                        />
                        {benefit.isOverridden && benefit.category !== "Custom" && (
                          <button
                            onClick={() => resetBenefit(scenario.id, benefit.id)}
                            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Reset"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        {benefit.category === "Custom" && (
                          <button
                            onClick={() => removeBenefit(scenario.id, benefit.id)}
                            className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}

        {/* Total Row */}
        <div
          className="grid items-center bg-primary/5 border-t-2 border-primary/20"
          style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}
        >
          <div className="px-5 py-3 flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Total</span>
          </div>
          {scenarios.map((s, i) => (
            <div key={s.id} className="px-5 py-3 text-right text-lg font-bold text-foreground tabular-nums border-l border-primary/10">
              {formatNumber(scenarioTotals[i])}
            </div>
          ))}
        </div>

        {/* Year-by-Year Breakdown (below total) */}
        {simulation.duration_months > 0 && (() => {
          const months = simulation.duration_months as number;
          const years = Math.ceil(months / 12);
          const rows: { label: string; monthsInYear: number }[] = [];
          for (let y = 1; y <= years; y++) {
            const mInYear = y < years ? 12 : (months % 12 || 12);
            rows.push({ label: `Year ${y}${mInYear < 12 ? ` (${mInYear}mo)` : ""}`, monthsInYear: mInYear });
          }
          return rows.map((r) => (
            <div
              key={r.label}
              className="grid items-center border-t border-border/30 bg-muted/10"
              style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}
            >
              <div className="px-5 py-2 pl-10 text-xs text-muted-foreground">{r.label}</div>
              {scenarios.map((s, i) => (
                <div key={s.id} className="px-5 py-2 text-right text-xs text-muted-foreground tabular-nums border-l border-border/30">
                  {formatNumber(Math.round(scenarioTotals[i] / months * r.monthsInYear))}
                </div>
              ))}
            </div>
          ));
        })()}
      </div>

      {/* Add benefit buttons per scenario */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}>
        <div />
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => addCustomBenefit(scenario.id)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Benefit Line
          </button>
        ))}
      </div>

      {/* Linked Cost Estimates */}
      {linkedEstimates && linkedEstimates.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Linked Cost Estimates</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {linkedEstimates.length}
              </span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Version</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {linkedEstimates.map((est: any) => (
                <tr
                  key={est.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setSelectedEstimate(est)}
                >
                  <td className="px-5 py-3 font-medium text-foreground">{est.employee_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">v{est.version}</td>
                  <td className="px-5 py-3"><StatusBadge status={est.status === "active" ? "active" : "draft"} /></td>
                  <td className="px-5 py-3 text-right font-medium text-foreground tabular-nums">
                    {est.total_cost != null
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: est.display_currency || "USD", minimumFractionDigits: 0 }).format(est.total_cost)
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{format(new Date(est.created_at), "MMM d, yyyy")}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="View"
                        onClick={(e) => { e.stopPropagation(); setSelectedEstimate(est); }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Download PDF"
                        onClick={(e) => { e.stopPropagation(); downloadCostEstimatePdf(est); }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowAuditTrail(!showAuditTrail)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Override Audit Trail</h3>
            {auditLog && auditLog.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {auditLog.length}
              </span>
            )}
          </div>
          {showAuditTrail ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showAuditTrail && (
          <div className="border-t border-border">
            {!auditLog || auditLog.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <History className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No overrides recorded yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Changes to benefit amounts will be tracked here</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
                {auditLog.map((entry: any) => (
                  <div key={entry.id} className="px-5 py-3 flex items-center gap-4 hover:bg-muted/10 transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0 bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{entry.field_label}</span>
                        <span className="text-muted-foreground"> in </span>
                        <span className="font-medium">{entry.scenario_name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.old_value != null ? formatCurrency(entry.old_value, "USD") : "—"}
                        {" → "}
                        {entry.new_value != null ? formatCurrency(entry.new_value, "USD") : "—"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
                      {format(new Date(entry.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cost Estimate Detail Viewer */}
      <CostEstimateDetailViewer
        estimate={selectedEstimate}
        open={!!selectedEstimate}
        onOpenChange={(open) => { if (!open) setSelectedEstimate(null); }}
      />
      {/* Generate Cost Estimate Dialog */}
      <GenerateCostEstimateDialog
        open={showCEDialog}
        onOpenChange={setShowCEDialog}
        simulation={simulation}
      />
    </div>
  );
}
