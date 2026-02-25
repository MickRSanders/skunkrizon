import StatusBadge from "@/components/StatusBadge";
import SimulationForm from "@/components/SimulationForm";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ArrowRight, Copy, Download, BarChart3, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSimulations, useCreateSimulation } from "@/hooks/useSimulations";
import type { SimulationFormData } from "@/components/SimulationForm";

const compareItems = [
  { label: "Compensation", scenarioA: "$120,000", scenarioB: "$145,000", delta: "+$25,000" },
  { label: "Allowances", scenarioA: "$68,000", scenarioB: "$72,800", delta: "+$4,800" },
  { label: "Taxes & Social Costs", scenarioA: "$62,500", scenarioB: "$58,000", delta: "-$4,500" },
  { label: "Relocation Costs", scenarioA: "$34,000", scenarioB: "$37,000", delta: "+$3,000" },
  { label: "Total Cost", scenarioA: "$284,500", scenarioB: "$312,800", delta: "+$28,300" },
];

const formatCurrency = (amount: number | null, currency = "USD") => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
};

export default function Simulations() {
  const [view, setView] = useState<"list" | "compare">("list");
  const [showForm, setShowForm] = useState(false);
  const { data: simulations, isLoading } = useSimulations();
  const createSimulation = useCreateSimulation();

  const handleCreate = async (formData: SimulationFormData) => {
    try {
      const totalCost =
        Number(formData.baseSalary) * (1 + Number(formData.colaPercent) / 100 + Number(formData.exchangeRateBuffer) / 100) +
        (Number(formData.housingCap || 0) * Number(formData.durationMonths)) +
        (formData.includeRelocationLumpSum ? Number(formData.relocationLumpSum || 0) : 0);

      await createSimulation.mutateAsync({
        employee_name: formData.employeeName,
        employee_id: formData.employeeId || null,
        job_title: formData.jobTitle || null,
        department: formData.department || null,
        grade: formData.grade || null,
        base_salary: Number(formData.baseSalary),
        currency: formData.currency,
        origin_city: formData.originCity || null,
        origin_country: formData.originCountry,
        destination_city: formData.destinationCity || null,
        destination_country: formData.destinationCountry,
        assignment_type: formData.assignmentType,
        duration_months: Number(formData.durationMonths),
        start_date: formData.startDate || null,
        tax_approach: formData.taxApproach,
        housing_cap: formData.housingCap ? Number(formData.housingCap) : null,
        include_schooling: formData.includeSchooling,
        include_spouse_support: formData.includeSpouseSupport,
        include_relocation_lump_sum: formData.includeRelocationLumpSum,
        relocation_lump_sum: formData.relocationLumpSum ? Number(formData.relocationLumpSum) : null,
        cola_percent: formData.colaPercent,
        exchange_rate_buffer: formData.exchangeRateBuffer,
        total_cost: Math.round(totalCost),
        notes: formData.notes || null,
        status: "draft",
      });
      setShowForm(false);
      toast.success(`Simulation created for ${formData.employeeName}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create simulation");
    }
  };

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
        <div className="bg-card rounded-lg border border-border">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Scenario Comparison</h3>
            <p className="text-xs text-muted-foreground mt-1">Select two simulations to compare</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost Category</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenario A</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenario B</th>
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
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export PDF</Button>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export Excel</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-card border border-border rounded-md px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search simulations..." className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground" />
            </div>
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filters</Button>
          </div>

          <div className="bg-card rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cost</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-accent" />
                      </td>
                    </tr>
                  ) : simulations && simulations.length > 0 ? (
                    simulations.map((sim) => (
                      <tr key={sim.id} className="data-table-row">
                        <td className="px-5 py-3 font-mono text-xs text-accent">{sim.sim_code}</td>
                        <td className="px-5 py-3 font-medium text-foreground">{sim.employee_name}</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          <div className="flex items-center gap-1">
                            {sim.origin_city ? `${sim.origin_city}, ` : ""}{sim.origin_country}
                            <ArrowRight className="w-3 h-3 text-accent" />
                            {sim.destination_city ? `${sim.destination_city}, ` : ""}{sim.destination_country}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{sim.duration_months} months</td>
                        <td className="px-5 py-3 font-semibold text-foreground">{formatCurrency(sim.total_cost, sim.currency)}</td>
                        <td className="px-5 py-3"><StatusBadge status={sim.status} /></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Clone"><Copy className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Export"><Download className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                        No simulations yet. Click "New Simulation" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {showForm && (
        <SimulationForm
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
