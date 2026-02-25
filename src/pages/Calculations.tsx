import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Search, Play, Edit, Copy, History, FunctionSquare } from "lucide-react";

const calculations = [
  { id: "CALC-001", name: "Standard Tax Gross-Up", type: "Tax", status: "active" as const, version: "v2.1", usedBy: 18, lastTested: "Feb 22, 2026", formula: "grossAmount = netAmount / (1 - taxRate)" },
  { id: "CALC-002", name: "COLA Index Differential", type: "Allowance", status: "active" as const, version: "v1.3", usedBy: 12, lastTested: "Feb 20, 2026", formula: "cola = baseSalary × (hostIndex / homeIndex - 1)" },
  { id: "CALC-003", name: "Housing Allowance by City Tier", type: "Allowance", status: "active" as const, version: "v3.0", usedBy: 15, lastTested: "Feb 21, 2026", formula: "housing = lookup(cityTier, familySize)" },
  { id: "CALC-004", name: "Hardship Premium Calculator", type: "Premium", status: "active" as const, version: "v1.1", usedBy: 6, lastTested: "Feb 19, 2026", formula: "premium = baseSalary × hardshipRate(country)" },
  { id: "CALC-005", name: "Education Reimbursement", type: "Benefit", status: "draft" as const, version: "v0.2", usedBy: 0, lastTested: "Feb 24, 2026", formula: "edu = min(actualCost, cap(country)) × children" },
  { id: "CALC-006", name: "Exchange Rate Conversion", type: "Utility", status: "active" as const, version: "v1.0", usedBy: 24, lastTested: "Feb 22, 2026", formula: "converted = amount × rate(from, to, date)" },
  { id: "CALC-007", name: "Relocation Bonus (Regional)", type: "Bonus", status: "active" as const, version: "v1.2", usedBy: 8, lastTested: "Feb 18, 2026", formula: "if region=EU then 10% else 5% of base" },
];

export default function Calculations() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calculations Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Define, test, and manage calculation rules and formulas</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Calculation
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-sm bg-card border border-border rounded-md px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Search calculations..." className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground" />
      </div>

      {/* Calculations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {calculations.map((calc) => (
          <div key={calc.id} className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FunctionSquare className="w-4 h-4 text-accent" />
                <span className="font-mono text-xs text-muted-foreground">{calc.id}</span>
              </div>
              <StatusBadge status={calc.status} />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">{calc.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">{calc.type} • {calc.version} • Used by {calc.usedBy} policies</p>
            <div className="bg-muted/50 rounded px-3 py-2 mb-3">
              <code className="text-xs font-mono text-foreground">{calc.formula}</code>
            </div>
            <div className="flex items-center gap-1 pt-2 border-t border-border">
              <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Test">
                <Play className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Edit">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Clone">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="History">
                <History className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
