import StatusBadge from "@/components/StatusBadge";
import SimulationForm from "@/components/SimulationForm";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ArrowRight, Copy, Download, BarChart3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const simulations = [
  { id: "SIM-2847", employee: "Sarah Chen", origin: "New York, US", destination: "London, UK", policy: "Gold Tier", totalCost: "$284,500", status: "completed" as const, date: "Feb 24, 2026", duration: "24 months", breakdown: { compensation: "$120,000", allowances: "$68,000", taxes: "$62,500", relocation: "$34,000" } },
  { id: "SIM-2846", employee: "James Park", origin: "Seoul, KR", destination: "Singapore, SG", policy: "Silver Tier", totalCost: "$167,200", status: "running" as const, date: "Feb 24, 2026", duration: "12 months", breakdown: { compensation: "$85,000", allowances: "$38,200", taxes: "$28,000", relocation: "$16,000" } },
  { id: "SIM-2845", employee: "Maria González", origin: "Madrid, ES", destination: "São Paulo, BR", policy: "Gold Tier", totalCost: "$312,800", status: "completed" as const, date: "Feb 23, 2026", duration: "36 months", breakdown: { compensation: "$145,000", allowances: "$72,800", taxes: "$58,000", relocation: "$37,000" } },
  { id: "SIM-2844", employee: "Alex Thompson", origin: "Chicago, US", destination: "Tokyo, JP", policy: "Silver Tier", totalCost: "$198,400", status: "draft" as const, date: "Feb 23, 2026", duration: "24 months", breakdown: { compensation: "$95,000", allowances: "$48,400", taxes: "$35,000", relocation: "$20,000" } },
  { id: "SIM-2843", employee: "Priya Sharma", origin: "Mumbai, IN", destination: "Zurich, CH", policy: "Gold Tier", totalCost: "$425,100", status: "completed" as const, date: "Feb 22, 2026", duration: "36 months", breakdown: { compensation: "$198,000", allowances: "$98,100", taxes: "$89,000", relocation: "$40,000" } },
  { id: "SIM-2842", employee: "Liam O'Brien", origin: "Dublin, IE", destination: "Sydney, AU", policy: "Bronze Tier", totalCost: "$142,800", status: "completed" as const, date: "Feb 21, 2026", duration: "12 months", breakdown: { compensation: "$72,000", allowances: "$32,800", taxes: "$24,000", relocation: "$14,000" } },
  { id: "SIM-2841", employee: "Yuki Tanaka", origin: "Tokyo, JP", destination: "Amsterdam, NL", policy: "Gold Tier", totalCost: "$278,900", status: "pending" as const, date: "Feb 21, 2026", duration: "24 months", breakdown: { compensation: "$130,000", allowances: "$64,900", taxes: "$54,000", relocation: "$30,000" } },
];

const compareItems = [
  { label: "Compensation", scenarioA: "$120,000", scenarioB: "$145,000", delta: "+$25,000" },
  { label: "Allowances", scenarioA: "$68,000", scenarioB: "$72,800", delta: "+$4,800" },
  { label: "Taxes & Social Costs", scenarioA: "$62,500", scenarioB: "$58,000", delta: "-$4,500" },
  { label: "Relocation Costs", scenarioA: "$34,000", scenarioB: "$37,000", delta: "+$3,000" },
  { label: "Total Cost", scenarioA: "$284,500", scenarioB: "$312,800", delta: "+$28,300" },
];

export default function Simulations() {
  const [view, setView] = useState<"list" | "compare">("list");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cost Simulations</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, manage, and compare relocation cost scenarios</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "compare" ? "default" : "outline"}
            size="sm"
            onClick={() => setView(view === "list" ? "compare" : "list")}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Compare
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Simulation
          </Button>
        </div>
      </div>

      {view === "compare" ? (
        /* Comparison View */
        <div className="bg-card rounded-lg border border-border">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Scenario Comparison</h3>
            <p className="text-xs text-muted-foreground mt-1">SIM-2847 (London) vs SIM-2845 (São Paulo)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost Category</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenario A (London)</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenario B (São Paulo)</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Delta</th>
                </tr>
              </thead>
              <tbody>
                {compareItems.map((item, i) => (
                  <tr key={item.label} className={`data-table-row ${i === compareItems.length - 1 ? "font-bold bg-muted/20" : ""}`}>
                    <td className="px-5 py-3 text-foreground">{item.label}</td>
                    <td className="px-5 py-3 text-right text-foreground">{item.scenarioA}</td>
                    <td className="px-5 py-3 text-right text-foreground">{item.scenarioB}</td>
                    <td className={`px-5 py-3 text-right font-medium ${item.delta.startsWith("+") ? "text-destructive" : "text-success"}`}>
                      {item.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border flex gap-2 justify-end">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> Export PDF
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> Export Excel
            </Button>
          </div>
        </div>
      ) : (
        /* List View */
        <>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-card border border-border rounded-md px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search simulations..." className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground" />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-1" /> Filters
            </Button>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Policy</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cost</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {simulations.map((sim) => (
                    <tr key={sim.id} className="data-table-row">
                      <td className="px-5 py-3 font-mono text-xs text-accent">{sim.id}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{sim.employee}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        <div className="flex items-center gap-1">
                          {sim.origin} <ArrowRight className="w-3 h-3 text-accent" /> {sim.destination}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{sim.policy}</td>
                      <td className="px-5 py-3 text-muted-foreground">{sim.duration}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{sim.totalCost}</td>
                      <td className="px-5 py-3"><StatusBadge status={sim.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Clone">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Export">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {showForm && (
        <SimulationForm
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            setShowForm(false);
            toast.success(`Simulation created for ${data.employeeName}`);
          }}
        />
      )}
    </div>
  );
}
