import StatusBadge from "@/components/StatusBadge";
import SimulationForm from "@/components/SimulationForm";
import SimulationDetail from "@/components/SimulationDetail";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  ArrowRight,
  Copy,
  Download,
  Loader2,
  Globe,
  Clock,
  TrendingUp,
  LayoutGrid,
  List,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSimulations, useCreateSimulation } from "@/hooks/useSimulations";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import type { SimulationFormData } from "@/components/SimulationForm";
import { format } from "date-fns";

const formatCurrency = (amount: number | null, currency = "USD") => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
};

export default function Simulations() {
  const [showForm, setShowForm] = useState(false);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { data: simulations, isLoading } = useSimulations();
  const createSimulation = useCreateSimulation();
  const currentTenant = useCurrentTenant();
  const tenantId = currentTenant.data?.tenant_id ?? null;

  const selectedSim = simulations?.find((s) => s.id === selectedSimId) ?? null;

  const filtered = (simulations ?? []).filter(
    (s) =>
      s.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sim_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origin_country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination_country.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        policy_id: formData.policy || null,
        tenant_id: tenantId,
      } as any);
      setShowForm(false);
      toast.success(`Simulation "${formData.scenarioName}" created`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create simulation");
    }
  };

  if (selectedSim) {
    return <SimulationDetail simulation={selectedSim} onBack={() => setSelectedSimId(null)} />;
  }

  const totalSims = simulations?.length ?? 0;
  const draftCount = simulations?.filter((s) => s.status === "draft").length ?? 0;
  const completedCount = simulations?.filter((s) => s.status === "completed").length ?? 0;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/60 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--accent)/0.15),transparent_70%)]" />
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">Cost Simulations</h1>
            <p className="text-primary-foreground/70 mt-2 max-w-lg text-sm">
              Model relocation cost scenarios, compare side-by-side, and optimize your global mobility spend.
            </p>
            <div className="flex items-center gap-6 mt-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-primary-foreground">{totalSims}</p>
                  <p className="text-[10px] uppercase tracking-wider text-primary-foreground/50">Total</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-primary-foreground">{draftCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-primary-foreground/50">Drafts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-primary-foreground">{completedCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-primary-foreground/50">Completed</p>
                </div>
              </div>
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => setShowForm(true)}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Simulation
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, code, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Globe className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery ? "No simulations match your search" : "No simulations yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            {searchQuery
              ? "Try adjusting your search terms."
              : "Create your first cost simulation to start modeling relocation scenarios."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Simulation
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((sim) => (
            <div
              key={sim.id}
              onClick={() => setSelectedSimId(sim.id)}
              className="group bg-card rounded-xl border border-border p-5 cursor-pointer transition-all hover:shadow-lg hover:border-accent/30 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] text-muted-foreground tracking-wider mb-1">{sim.sim_code}</p>
                  <h3 className="text-base font-semibold text-foreground truncate">{sim.employee_name}</h3>
                </div>
                <StatusBadge status={sim.status} />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                <span className="truncate">{sim.origin_city ? `${sim.origin_city}, ` : ""}{sim.origin_country}</span>
                <ArrowRight className="w-3 h-3 text-accent shrink-0" />
                <span className="truncate">{sim.destination_city ? `${sim.destination_city}, ` : ""}{sim.destination_country}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Total Cost</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(sim.total_cost, sim.currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Duration</p>
                  <p className="text-sm font-medium text-foreground">{sim.duration_months}mo</p>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Clone">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Export">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {format(new Date(sim.updated_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenario</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cost</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sim) => (
                <tr
                  key={sim.id}
                  className="data-table-row cursor-pointer"
                  onClick={() => setSelectedSimId(sim.id)}
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-accent">{sim.sim_code}</td>
                  <td className="px-5 py-3.5 font-medium text-foreground">{sim.employee_name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    <div className="flex items-center gap-1">
                      {sim.origin_city ? `${sim.origin_city}, ` : ""}{sim.origin_country}
                      <ArrowRight className="w-3 h-3 text-accent" />
                      {sim.destination_city ? `${sim.destination_city}, ` : ""}{sim.destination_country}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{sim.duration_months}mo</td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">{formatCurrency(sim.total_cost, sim.currency)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={sim.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Clone"><Copy className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Export"><Download className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
