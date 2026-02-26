import { useState, useEffect } from "react";
import PolicyUploadDialog from "@/components/PolicyUploadDialog";
import PolicyComponentEditor, { type BenefitComponent } from "@/components/PolicyComponentEditor";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Search, FileText, Eye, Edit, Loader2, Calculator, Layers, Send, FilePenLine } from "lucide-react";
import { toast } from "sonner";
import { usePolicies, useCreatePolicy, useUpdatePolicy, type Policy } from "@/hooks/usePolicies";
import { useCalculations } from "@/hooks/useCalculations";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { format } from "date-fns";

export default function Policies() {
  const { user } = useAuth();
  const currentTenant = useCurrentTenant();
  const tenantId = currentTenant.data?.tenant_id ?? null;
  const { data: policies, isLoading } = usePolicies();
  const { data: calculations } = useCalculations();
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");

  const calcNameMap = new Map((calculations ?? []).map((c) => [c.id, c.name]));

  useEffect(() => {
    if (selectedPolicy && policies) {
      const updated = policies.find((p) => p.id === selectedPolicy.id);
      if (updated) setSelectedPolicy(updated);
    }
  }, [policies]);

  const benefitComponents: BenefitComponent[] = selectedPolicy?.benefit_components
    ? (Array.isArray(selectedPolicy.benefit_components) ? selectedPolicy.benefit_components : []) as BenefitComponent[]
    : [];

  const filtered = (policies ?? []).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const status = (p as any).status ?? "draft";
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveParsed = async (data: any, fileName: string) => {
    if (!user) return;
    try {
      const benefits: BenefitComponent[] = data.benefitComponents ?? [];
      await createPolicy.mutateAsync({
        name: data.policyName || fileName,
        description: data.description ?? null,
        tier: data.tier || "custom",
        tax_approach: data.taxApproach ?? "tax-equalization",
        benefit_components: benefits as any,
        created_by: user.id,
        tenant_id: tenantId ?? null,
        status: "draft",
      } as any);
      setShowUpload(false);
      toast.success(`Policy "${data.policyName || fileName}" saved as draft`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save policy");
    }
  };

  const handleSaveComponents = async (components: BenefitComponent[]) => {
    if (!editingPolicy) return;
    await updatePolicy.mutateAsync({
      id: editingPolicy.id,
      benefit_components: components as any,
    });
    setEditingPolicy(null);
  };

  const handleToggleStatus = async (policy: Policy) => {
    const currentStatus = (policy as any).status ?? "draft";
    const newStatus = currentStatus === "published" ? "draft" : "published";
    try {
      await updatePolicy.mutateAsync({
        id: policy.id,
        status: newStatus,
      } as any);
      toast.success(
        newStatus === "published"
          ? `"${policy.name}" published — now available for simulations`
          : `"${policy.name}" reverted to draft`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Policy Agent</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered policy ingestion, configuration, and management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="w-4 h-4 mr-1" /> Upload Policy Doc
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" /> New Policy
          </Button>
        </div>
      </div>

      {/* Policy List */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-background border border-border rounded-md px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {(["all", "draft", "published"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {s === "all" ? "All" : s === "draft" ? "Drafts" : "Published"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {searchQuery || statusFilter !== "all"
                ? "No policies match your filters"
                : "No policies yet. Upload a document or create one manually."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Policy</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tier</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Benefits</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax Approach</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Updated</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const benefits = Array.isArray(p.benefit_components) ? p.benefit_components : [];
                  const status = (p as any).status ?? "draft";
                  return (
                    <tr
                      key={p.id}
                      className={`data-table-row cursor-pointer ${selectedPolicy?.id === p.id ? "bg-accent/10" : ""}`}
                      onClick={() => setSelectedPolicy(p)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            status === "published"
                              ? "bg-green-500/10 text-green-600 border border-green-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {status === "published" ? (
                            <Send className="w-2.5 h-2.5" />
                          ) : (
                            <FilePenLine className="w-2.5 h-2.5" />
                          )}
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground capitalize">{p.tier}</td>
                      <td className="px-5 py-3 text-foreground">{benefits.length} items</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{p.tax_approach ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{format(new Date(p.updated_at), "MMM d, yyyy")}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleStatus(p)}
                            className={`p-1.5 rounded hover:bg-muted transition-colors ${
                              status === "published"
                                ? "text-green-600 hover:text-amber-600"
                                : "text-amber-600 hover:text-green-600"
                            }`}
                            title={status === "published" ? "Revert to Draft" : "Publish"}
                          >
                            {status === "published" ? (
                              <FilePenLine className="w-3.5 h-3.5" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => setSelectedPolicy(p)}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPolicy(p)}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit Components"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Policy Detail Preview (read-only) */}
      {selectedPolicy && benefitComponents.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">
                  Policy Components – {selectedPolicy.name}
                </h3>
                {(() => {
                  const status = (selectedPolicy as any).status ?? "draft";
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        status === "published"
                          ? "bg-green-500/10 text-green-600 border border-green-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {status}
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Benefit line items, taxability, and linked calculations
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditingPolicy(selectedPolicy)}>
              <Edit className="w-4 h-4 mr-1" /> Edit Components
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Component</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxability</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Calculation</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount / Limit</th>
                </tr>
              </thead>
              <tbody>
                {benefitComponents.map((c, i) => (
                  <tr key={i} className="data-table-row">
                    <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.type}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.taxable}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {c.calculationId ? (
                        <span className="inline-flex items-center gap-1 text-accent">
                          <Calculator className="w-3 h-3" />
                          {calcNameMap.get(c.calculationId) || "Unknown"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">None</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{c.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUpload && (
        <PolicyUploadDialog
          onClose={() => setShowUpload(false)}
          onSave={handleSaveParsed}
        />
      )}

      {editingPolicy && (
        <PolicyComponentEditor
          policyName={editingPolicy.name}
          components={
            Array.isArray(editingPolicy.benefit_components)
              ? (editingPolicy.benefit_components as BenefitComponent[])
              : []
          }
          onSave={handleSaveComponents}
          onClose={() => setEditingPolicy(null)}
        />
      )}
    </div>
  );
}
