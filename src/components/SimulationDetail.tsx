import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
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
  DollarSign,
  RefreshCw,
  ArrowRight,
  Globe,
  Clock,
  Layers,
  FileText,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTaxConfig, TAX_RATE_MAP } from "@/contexts/TaxConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSimulationAuditLog, useCreateAuditEntry, useUpdateSimulation } from "@/hooks/useSimulations";
import { format } from "date-fns";

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
  // Apply gross-up multiplier to the base tax cost
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
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const policyName = (simulation as any).policies?.name;

  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    // Restore saved scenarios from cost_breakdown if available
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

  // Auto-save scenarios to cost_breakdown whenever they change
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

  // Persist whenever scenarios state changes (skip initial mount with saved data)
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

  // Fetch exchange rates from lookup table
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  useEffect(() => {
    async function fetchRates() {
      // Find the Exchange Rates lookup table
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
    // Try inverse
    const inverse = exchangeRates[`${to}_${from}`];
    if (inverse) return 1 / inverse;
    // Try cross via USD
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
      if (rate === null || rate === 1) {
        return { ...s, currency: newCurrency };
      }

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

    // Log audit entry when value changes and is an override
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

  const groupByCategory = (benefits: BenefitLine[]) => {
    const groups: Record<string, BenefitLine[]> = {};
    benefits.forEach((b) => {
      if (!groups[b.category]) groups[b.category] = [];
      groups[b.category].push(b);
    });
    return groups;
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/60 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--accent)/0.15),transparent_70%)]" />
        <div className="relative z-10">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-3 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Simulations
          </Button>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-primary-foreground/50 font-mono text-xs tracking-wider mb-1">{simulation.sim_code}</p>
              <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">{simulation.employee_name}</h1>
              <div className="flex items-center gap-4 mt-3 text-sm text-primary-foreground/70">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{simulation.origin_country}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{simulation.destination_country}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{simulation.duration_months} months</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""}</span>
                </div>
                {policyName && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{policyName}</span>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={addScenario} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg">
              <Plus className="w-4 h-4 mr-2" /> Add Scenario
            </Button>
          </div>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className={`grid gap-5 ${scenarios.length === 1 ? "grid-cols-1 max-w-2xl" : scenarios.length === 2 ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-3"}`}>
        {scenarios.map((scenario) => {
          const grouped = groupByCategory(scenario.benefits);
          const total = scenario.benefits.reduce((sum, b) => sum + b.amount, 0);
          const hasOverrides = scenario.benefits.some((b) => b.isOverridden);

          return (
            <div key={scenario.id} className="bg-card rounded-xl border border-border flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
              {/* Scenario Header */}
              <div className="p-4 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
                <div className="flex items-center justify-between mb-2">
                  <Input
                    value={scenario.name}
                    onChange={(e) => updateScenarioName(scenario.id, e.target.value)}
                    className="text-sm font-bold h-8 max-w-[200px] bg-transparent border-none p-0 focus-visible:ring-0 text-foreground"
                  />
                  {scenarios.length > 1 && (
                    <button
                      onClick={() => removeScenario(scenario.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Currency</Label>
                  <Select value={scenario.currency} onValueChange={(v) => updateScenarioCurrency(scenario.id, v)}>
                    <SelectTrigger className="h-7 w-[80px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {hasOverrides && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                      Overrides
                    </span>
                  )}
                </div>
              </div>

              {/* Benefits Breakdown */}
              <div className="flex-1 p-4 space-y-4">
                {Object.entries(grouped).map(([category, items]) => {
                  const categoryTotal = items.reduce((s, b) => s + b.amount, 0);
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{category}</h4>
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{formatCurrency(categoryTotal, scenario.currency)}</span>
                      </div>
                      <div className="space-y-1">
                        {items.map((benefit) => (
                          <div
                            key={benefit.id}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all ${
                              benefit.isOverridden
                                ? "bg-warning/5 border border-warning/20 shadow-sm"
                                : "bg-muted/20 hover:bg-muted/40"
                            }`}
                          >
                            {benefit.category === "Custom" ? (
                              <Input
                                value={benefit.label}
                                onChange={(e) => updateBenefitLabel(scenario.id, benefit.id, e.target.value)}
                                className="h-6 text-[13px] bg-transparent border-none p-0 focus-visible:ring-0 flex-1 text-foreground tracking-tight"
                              />
                            ) : (
                              <span className="flex-1 text-foreground text-[13px] tracking-tight">{benefit.label}</span>
                            )}
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground/50 text-xs">{getCurrencySymbol(scenario.currency)}</span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(benefit.amount)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, "");
                                  updateBenefitAmount(scenario.id, benefit.id, Number(raw) || 0);
                                }}
                                className="h-6 w-[100px] text-[13px] text-right bg-transparent border-none p-0 focus-visible:ring-0 text-foreground tabular-nums tracking-tight"
                              />
                              {benefit.isOverridden && benefit.category !== "Custom" && (
                                <button
                                  onClick={() => resetBenefit(scenario.id, benefit.id)}
                                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Reset to calculated value"
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
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => addCustomBenefit(scenario.id)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-xs text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Benefit Line
                </button>
              </div>

              {/* Total */}
              <div className="p-4 border-t border-border bg-gradient-to-r from-accent/5 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Total Cost</span>
                  <span className="text-xl font-bold text-accent tabular-nums">{formatCurrency(total, scenario.currency)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {scenario.benefits.filter((b) => b.isOverridden).length} override{scenario.benefits.filter((b) => b.isOverridden).length !== 1 ? "s" : ""} applied
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      {scenarios.length > 1 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
            <h3 className="text-sm font-bold text-foreground">Scenario Comparison</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Side-by-side cost breakdown across scenarios</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                  {scenarios.map((s) => (
                    <th key={s.id} className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.name}</th>
                  ))}
                  {scenarios.length === 2 && (
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Delta</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allCategories = [...new Set(scenarios.flatMap((s) => s.benefits.map((b) => b.category)))];
                  return allCategories.map((cat) => {
                    const amounts = scenarios.map((s) => s.benefits.filter((b) => b.category === cat).reduce((sum, b) => sum + b.amount, 0));
                    return (
                      <tr key={cat} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 text-foreground font-medium">{cat}</td>
                        {amounts.map((amt, i) => (
                          <td key={i} className="px-5 py-3 text-right text-foreground tabular-nums">{formatCurrency(amt, scenarios[i].currency)}</td>
                        ))}
                        {scenarios.length === 2 && (
                          <td className={`px-5 py-3 text-right font-semibold tabular-nums ${amounts[1] - amounts[0] > 0 ? "text-destructive" : "text-success"}`}>
                            {amounts[1] - amounts[0] >= 0 ? "+" : ""}{formatCurrency(amounts[1] - amounts[0], scenarios[0].currency)}
                          </td>
                        )}
                      </tr>
                    );
                  });
                })()}
                <tr className="font-bold bg-muted/30">
                  <td className="px-5 py-3 text-foreground">Total</td>
                  {scenarios.map((s) => {
                    const total = s.benefits.reduce((sum, b) => sum + b.amount, 0);
                    return <td key={s.id} className="px-5 py-3 text-right text-foreground tabular-nums">{formatCurrency(total, s.currency)}</td>;
                  })}
                  {scenarios.length === 2 && (() => {
                    const t0 = scenarios[0].benefits.reduce((s, b) => s + b.amount, 0);
                    const t1 = scenarios[1].benefits.reduce((s, b) => s + b.amount, 0);
                    const diff = t1 - t0;
                    return (
                      <td className={`px-5 py-3 text-right font-bold tabular-nums ${diff > 0 ? "text-destructive" : "text-success"}`}>
                        {diff >= 0 ? "+" : ""}{formatCurrency(diff, scenarios[0].currency)}
                      </td>
                    );
                  })()}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowAuditTrail(!showAuditTrail)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-foreground">Override Audit Trail</h3>
            {auditLog && auditLog.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
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
                    <div className="w-2 h-2 rounded-full shrink-0 bg-accent" />
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
    </div>
  );
}
