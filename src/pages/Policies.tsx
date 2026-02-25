import { useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import PolicyUploadDialog from "@/components/PolicyUploadDialog";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Search, FileText, Settings, Eye, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePolicies, useCreatePolicy, type Policy } from "@/hooks/usePolicies";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { format } from "date-fns";

type BenefitComponent = {
  name: string;
  type: string;
  taxable: string;
  calcMethod: string;
  amount: string;
};

export default function Policies() {
  const { user } = useAuth();
  const currentTenant = useCurrentTenant();
  const tenantId = currentTenant.data?.tenant_id ?? null;
  const { data: policies, isLoading } = usePolicies();
  const createPolicy = useCreatePolicy();
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const filtered = (policies ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      });
      setShowUpload(false);
      toast.success(`Policy "${data.policyName || fileName}" saved`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save policy");
    }
  };

  const benefitComponents: BenefitComponent[] = selectedPolicy?.benefit_components
    ? (Array.isArray(selectedPolicy.benefit_components)
        ? selectedPolicy.benefit_components
        : []) as BenefitComponent[]
    : [];

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
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {searchQuery ? "No policies match your search" : "No policies yet. Upload a document or create one manually."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Policy</th>
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
                      <td className="px-5 py-3 text-muted-foreground capitalize">{p.tier}</td>
                      <td className="px-5 py-3 text-foreground">{benefits.length} items</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{p.tax_approach ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{format(new Date(p.updated_at), "MMM d, yyyy")}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="View"><Eye className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Configure"><Settings className="w-3.5 h-3.5" /></button>
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

      {/* Policy Detail Preview */}
      {selectedPolicy && benefitComponents.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">
                Policy Components – {selectedPolicy.name}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Benefit line items, taxability, and calculation methods</p>
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
                    <td className="px-5 py-3 text-xs text-muted-foreground">{c.calcMethod}</td>
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
    </div>
  );
}
