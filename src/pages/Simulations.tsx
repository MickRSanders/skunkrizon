import StatusBadge from "@/components/StatusBadge";
import SimulationForm from "@/components/SimulationForm";
import SimulationDetail from "@/components/SimulationDetail";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ArrowRight, Copy, Download, BarChart3, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSimulations, useCreateSimulation } from "@/hooks/useSimulations";
import type { SimulationFormData } from "@/components/SimulationForm";

const formatCurrency = (amount: number | null, currency = "USD") => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
};

export default function Simulations() {
  const [showForm, setShowForm] = useState(false);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const { data: simulations, isLoading } = useSimulations();
  const createSimulation = useCreateSimulation();

  const selectedSim = simulations?.find((s) => s.id === selectedSimId) ?? null;

  const handleCreate = async (formData: SimulationFormData) => {
    try {
      const totalCost =
        Number(formData.baseSalary) * (1 + Number(formData.colaPercent) / 100 + Number(formData.exchangeRateBuffer) / 100) +
        (Number(formData.housingCap || 0) * Number(formData.durationMonths)) +
        (formData.includeRelocationLumpSum ? Number(formData.relocationLumpSum || 0) : 0);

      await createSimulation.mutateAsync({
        employee_name: formData.scenarioName,
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
      toast.success(`Simulation "${formData.scenarioName}" created`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create simulation");
    }
  };

  // Show detail view if a simulation is selected
  if (selectedSim) {
    return <SimulationDetail simulation={selectedSim} onBack={() => setSelectedSimId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cost Simulations</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, manage, and compare relocation cost scenarios</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Simulation
        </Button>
      </div>

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
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenario</th>
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
                  <tr
                    key={sim.id}
                    className="data-table-row cursor-pointer"
                    onClick={() => setSelectedSimId(sim.id)}
                  >
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
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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

      {showForm && (
        <SimulationForm
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
