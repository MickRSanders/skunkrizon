import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Copy,
  Download,
  RefreshCw,
} from "lucide-react";

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

function generateBenefits(sim: any): BenefitLine[] {
  const baseSalary = Number(sim.base_salary) || 0;
  const cola = baseSalary * (Number(sim.cola_percent) || 0) / 100;
  const housingMonthly = Number(sim.housing_cap) || 0;
  const housingTotal = housingMonthly * (Number(sim.duration_months) || 24);
  const fxBuffer = baseSalary * (Number(sim.exchange_rate_buffer) || 0) / 100;
  const relocation = sim.include_relocation_lump_sum ? (Number(sim.relocation_lump_sum) || 0) : 0;
  const schooling = sim.include_schooling ? Math.round(baseSalary * 0.12) : 0;
  const spouseSupport = sim.include_spouse_support ? Math.round(baseSalary * 0.05) : 0;

  // Estimate tax cost based on approach
  let taxCost = 0;
  if (sim.tax_approach === "tax-equalization") {
    taxCost = Math.round(baseSalary * 0.35);
  } else if (sim.tax_approach === "tax-protection") {
    taxCost = Math.round(baseSalary * 0.28);
  } else {
    taxCost = Math.round(baseSalary * 0.22);
  }

  const lines: BenefitLine[] = [
    { id: "base", category: "Compensation", label: "Base Salary", amount: baseSalary, isOverridden: false, originalAmount: baseSalary },
    { id: "cola", category: "Compensation", label: "COLA Adjustment", amount: Math.round(cola), isOverridden: false, originalAmount: Math.round(cola) },
    { id: "fx", category: "Compensation", label: "FX Rate Buffer", amount: Math.round(fxBuffer), isOverridden: false, originalAmount: Math.round(fxBuffer) },
    { id: "housing", category: "Allowances", label: "Housing Allowance", amount: Math.round(housingTotal), isOverridden: false, originalAmount: Math.round(housingTotal) },
    { id: "tax", category: "Tax & Social", label: "Estimated Tax Costs", amount: taxCost, isOverridden: false, originalAmount: taxCost },
    { id: "relocation", category: "Relocation", label: "Relocation Lump Sum", amount: relocation, isOverridden: false, originalAmount: relocation },
  ];

  if (schooling > 0) {
    lines.push({ id: "schooling", category: "Allowances", label: "Schooling Allowance", amount: schooling, isOverridden: false, originalAmount: schooling });
  }
  if (spouseSupport > 0) {
    lines.push({ id: "spouse", category: "Allowances", label: "Spouse / Partner Support", amount: spouseSupport, isOverridden: false, originalAmount: spouseSupport });
  }

  return lines;
}

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

interface SimulationDetailProps {
  simulation: any;
  onBack: () => void;
}

export default function SimulationDetail({ simulation, onBack }: SimulationDetailProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => [
    {
      id: "primary",
      name: simulation.employee_name || "Primary Scenario",
      currency: simulation.currency || "USD",
      benefits: generateBenefits(simulation),
    },
  ]);

  const addScenario = () => {
    const base = scenarios[0];
    const newScenario: Scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${scenarios.length + 1}`,
      currency: base.currency,
      benefits: base.benefits.map((b) => ({ ...b, id: b.id, isOverridden: false, amount: b.originalAmount })),
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

  const updateScenarioCurrency = (scenarioId: string, currency: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, currency } : s)));
  };

  const updateBenefitAmount = (scenarioId: string, benefitId: string, amount: number) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              benefits: s.benefits.map((b) =>
                b.id === benefitId ? { ...b, amount, isOverridden: amount !== b.originalAmount } : b
              ),
            }
          : s
      )
    );
  };

  const resetBenefit = (scenarioId: string, benefitId: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              benefits: s.benefits.map((b) =>
                b.id === benefitId ? { ...b, amount: b.originalAmount, isOverridden: false } : b
              ),
            }
          : s
      )
    );
  };

  const addCustomBenefit = (scenarioId: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              benefits: [
                ...s.benefits,
                {
                  id: crypto.randomUUID(),
                  category: "Custom",
                  label: "New Benefit",
                  amount: 0,
                  isOverridden: true,
                  originalAmount: 0,
                },
              ],
            }
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

  // Group benefits by category for display
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{simulation.employee_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {simulation.sim_code} · {simulation.origin_country} → {simulation.destination_country} · {simulation.duration_months} months
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addScenario}>
            <Plus className="w-4 h-4 mr-1" /> Add Scenario
          </Button>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className={`grid gap-6 ${scenarios.length === 1 ? "grid-cols-1" : scenarios.length === 2 ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-3"}`}>
        {scenarios.map((scenario) => {
          const grouped = groupByCategory(scenario.benefits);
          const total = scenario.benefits.reduce((sum, b) => sum + b.amount, 0);
          const hasOverrides = scenario.benefits.some((b) => b.isOverridden);

          return (
            <div key={scenario.id} className="bg-card rounded-lg border border-border flex flex-col">
              {/* Scenario Header */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={scenario.name}
                    onChange={(e) => updateScenarioName(scenario.id, e.target.value)}
                    className="text-sm font-semibold h-8 max-w-[200px] bg-transparent border-none p-0 focus-visible:ring-0 text-foreground"
                  />
                  {scenarios.length > 1 && (
                    <button
                      onClick={() => removeScenario(scenario.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Currency</Label>
                  <Select value={scenario.currency} onValueChange={(v) => updateScenarioCurrency(scenario.id, v)}>
                    <SelectTrigger className="h-7 w-[90px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasOverrides && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                      Overrides applied
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
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</h4>
                        <span className="text-xs font-medium text-foreground">{formatCurrency(categoryTotal, scenario.currency)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((benefit) => (
                          <div key={benefit.id} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${benefit.isOverridden ? "bg-amber-500/5 border border-amber-500/20" : "bg-muted/30"}`}>
                            {benefit.category === "Custom" ? (
                              <Input
                                value={benefit.label}
                                onChange={(e) => updateBenefitLabel(scenario.id, benefit.id, e.target.value)}
                                className="h-6 text-xs bg-transparent border-none p-0 focus-visible:ring-0 flex-1 text-foreground"
                              />
                            ) : (
                              <span className="flex-1 text-foreground text-sm">{benefit.label}</span>
                            )}
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-muted-foreground" />
                              <Input
                                type="number"
                                value={benefit.amount}
                                onChange={(e) => updateBenefitAmount(scenario.id, benefit.id, Number(e.target.value) || 0)}
                                className="h-6 w-[100px] text-xs text-right bg-transparent border-none p-0 focus-visible:ring-0 font-mono text-foreground"
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
                  className="w-full flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Benefit Line
                </button>
              </div>

              {/* Total */}
              <div className="p-4 border-t border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Total Cost</span>
                  <span className="text-lg font-bold text-accent">{formatCurrency(total, scenario.currency)}</span>
                </div>
                {scenario.benefits.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {scenario.benefits.filter((b) => b.isOverridden).length} override{scenario.benefits.filter((b) => b.isOverridden).length !== 1 ? "s" : ""} applied
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison summary when multiple scenarios */}
      {scenarios.length > 1 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Scenario Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Category</th>
                  {scenarios.map((s) => (
                    <th key={s.id} className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">{s.name}</th>
                  ))}
                  {scenarios.length === 2 && (
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Delta</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allCategories = [...new Set(scenarios.flatMap((s) => s.benefits.map((b) => b.category)))];
                  return allCategories.map((cat) => {
                    const amounts = scenarios.map((s) => s.benefits.filter((b) => b.category === cat).reduce((sum, b) => sum + b.amount, 0));
                    return (
                      <tr key={cat} className="border-b border-border/50">
                        <td className="px-4 py-2 text-foreground">{cat}</td>
                        {amounts.map((amt, i) => (
                          <td key={i} className="px-4 py-2 text-right text-foreground">{formatCurrency(amt, scenarios[i].currency)}</td>
                        ))}
                        {scenarios.length === 2 && (
                          <td className={`px-4 py-2 text-right font-medium ${amounts[1] - amounts[0] > 0 ? "text-destructive" : "text-green-600"}`}>
                            {amounts[1] - amounts[0] >= 0 ? "+" : ""}{formatCurrency(amounts[1] - amounts[0], scenarios[0].currency)}
                          </td>
                        )}
                      </tr>
                    );
                  });
                })()}
                <tr className="font-bold bg-muted/20">
                  <td className="px-4 py-2 text-foreground">Total</td>
                  {scenarios.map((s) => {
                    const total = s.benefits.reduce((sum, b) => sum + b.amount, 0);
                    return <td key={s.id} className="px-4 py-2 text-right text-foreground">{formatCurrency(total, s.currency)}</td>;
                  })}
                  {scenarios.length === 2 && (() => {
                    const t0 = scenarios[0].benefits.reduce((s, b) => s + b.amount, 0);
                    const t1 = scenarios[1].benefits.reduce((s, b) => s + b.amount, 0);
                    const diff = t1 - t0;
                    return (
                      <td className={`px-4 py-2 text-right font-medium ${diff > 0 ? "text-destructive" : "text-green-600"}`}>
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
    </div>
  );
}
