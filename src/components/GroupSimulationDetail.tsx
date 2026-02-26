import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Users, Globe, DollarSign, Download, TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";
import { useSimulationGroupWithSims } from "@/hooks/useSimulationGroups";
import { format } from "date-fns";
import * as XLSX from "@e965/xlsx";

const formatCurrency = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

interface Props {
  groupId: string;
  onBack: () => void;
}

interface BenefitLine {
  id: string;
  category: string;
  label: string;
  amount: number;
}

function extractBenefits(sim: any): BenefitLine[] {
  const saved = sim.cost_breakdown as any;
  if (saved?.scenarios?.[0]?.benefits) {
    return saved.scenarios[0].benefits;
  }
  // Fallback
  return [
    { id: "base", category: "Compensation", label: "Base Salary", amount: Number(sim.base_salary) || 0 },
    { id: "total", category: "Total", label: "Total Cost", amount: Number(sim.total_cost) || 0 },
  ];
}

export default function GroupSimulationDetail({ groupId, onBack }: Props) {
  const { data, isLoading } = useSimulationGroupWithSims(groupId);
  const [showComparison, setShowComparison] = useState(true);

  const group = data?.group;
  const sims = data?.simulations ?? [];

  const totalGroupCost = sims.reduce((s, sim) => s + (Number(sim.total_cost) || 0), 0);

  // Category rollup across all sims
  const categoryRollup = useMemo(() => {
    const rollup: Record<string, number> = {};
    sims.forEach((sim) => {
      const benefits = extractBenefits(sim);
      benefits.forEach((b) => {
        rollup[b.label] = (rollup[b.label] || 0) + b.amount;
      });
    });
    return Object.entries(rollup).sort((a, b) => b[1] - a[1]);
  }, [sims]);

  const handleExport = () => {
    if (!group || sims.length === 0) return;

    // Build comparison worksheet
    const headers = ["Category", ...sims.map((s) => s.employee_name || s.sim_code), "Total"];
    const allLabels = new Set<string>();
    sims.forEach((sim) => extractBenefits(sim).forEach((b) => allLabels.add(b.label)));

    const rows = Array.from(allLabels).map((label) => {
      const row: (string | number)[] = [label];
      let total = 0;
      sims.forEach((sim) => {
        const benefits = extractBenefits(sim);
        const amt = benefits.find((b) => b.label === label)?.amount ?? 0;
        row.push(amt);
        total += amt;
      });
      row.push(total);
      return row;
    });

    // Add total row
    const totals: (string | number)[] = ["TOTAL"];
    sims.forEach((sim) => totals.push(Number(sim.total_cost) || 0));
    totals.push(totalGroupCost);
    rows.push(totals);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Group Simulation");
    XLSX.writeFile(wb, `${group.name.replace(/\s+/g, "_")}_group_simulation.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/60 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--accent)/0.15),transparent_70%)]" />
        <div className="relative z-10">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-3 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Simulations
          </Button>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-primary-foreground/70" />
                <span className="text-[10px] uppercase tracking-wider text-primary-foreground/50 font-medium">Group Simulation</span>
              </div>
              <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">{group.name}</h1>
              {group.description && <p className="text-sm text-primary-foreground/60 mt-1">{group.description}</p>}
              <div className="flex items-center gap-6 mt-4 text-sm text-primary-foreground/70">
                {group.origin_country && group.destination_country && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{group.origin_city || group.origin_country} → {group.destination_city || group.destination_country}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{sims.length} member{sims.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="font-semibold text-primary-foreground">{formatCurrency(totalGroupCost)}</span>
                </div>
              </div>
            </div>
            <Button onClick={handleExport} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg">
              <Download className="w-4 h-4 mr-2" /> Export to Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Per-Category Rollup */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" /> Cost Rollup by Category
        </h2>
        <div className="space-y-2">
          {categoryRollup.map(([label, amount]) => {
            const pct = totalGroupCost > 0 ? (amount / totalGroupCost) * 100 : 0;
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-48 truncate">{label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent/70 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <span className="text-sm font-semibold text-foreground w-28 text-right">{formatCurrency(amount)}</span>
                <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
          <Separator />
          <div className="flex items-center gap-3 pt-1">
            <span className="text-sm font-bold text-foreground w-48">Total Group Cost</span>
            <div className="flex-1" />
            <span className="text-lg font-bold text-accent w-28 text-right">{formatCurrency(totalGroupCost)}</span>
            <span className="text-xs text-muted-foreground w-12 text-right">100%</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowComparison((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" /> Member Comparison
          </h2>
          {showComparison ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showComparison && sims.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/30">Category</th>
                  {sims.map((sim) => (
                    <th key={sim.id} className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[140px]">
                      {sim.employee_name || sim.sim_code}
                    </th>
                  ))}
                  <th className="text-right px-5 py-3 text-xs font-bold text-foreground uppercase tracking-wider min-w-[140px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allLabels = new Set<string>();
                  sims.forEach((sim) => extractBenefits(sim).forEach((b) => allLabels.add(b.label)));

                  return Array.from(allLabels).map((label) => {
                    let rowTotal = 0;
                    return (
                      <tr key={label} className="border-b border-border/50 hover:bg-muted/10">
                        <td className="px-5 py-2.5 text-muted-foreground sticky left-0 bg-card">{label}</td>
                        {sims.map((sim) => {
                          const benefits = extractBenefits(sim);
                          const amt = benefits.find((b) => b.label === label)?.amount ?? 0;
                          rowTotal += amt;
                          return (
                            <td key={sim.id} className="px-5 py-2.5 text-right font-medium text-foreground">
                              {formatCurrency(amt, sim.currency)}
                            </td>
                          );
                        })}
                        <td className="px-5 py-2.5 text-right font-bold text-accent">{formatCurrency(rowTotal)}</td>
                      </tr>
                    );
                  });
                })()}
                <tr className="bg-muted/20 border-t border-border">
                  <td className="px-5 py-3 font-bold text-foreground sticky left-0 bg-muted/20">Total</td>
                  {sims.map((sim) => (
                    <td key={sim.id} className="px-5 py-3 text-right font-bold text-foreground">
                      {formatCurrency(Number(sim.total_cost) || 0, sim.currency)}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right font-bold text-accent text-lg">{formatCurrency(totalGroupCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
