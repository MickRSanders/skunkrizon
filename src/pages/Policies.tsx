import { useState, useEffect, useCallback } from "react";
import StatusBadge from "@/components/StatusBadge";
import PolicyUploadDialog from "@/components/PolicyUploadDialog";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Search, FileText, Settings, Eye, Edit, Loader2, Save, X, Trash2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { usePolicies, useCreatePolicy, useUpdatePolicy, type Policy } from "@/hooks/usePolicies";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BenefitComponent = {
  name: string;
  type: string;
  taxable: string;
  calcMethod: string;
  amount: string;
};

const BENEFIT_TYPES = ["Allowance", "Benefit", "One-time", "Tax", "Deduction"];
const TAXABILITY_OPTIONS = ["Host only", "Both", "Non-taxable", "Home only", "N/A"];

function EditableCell({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-8 text-sm bg-background ${className}`}
    />
  );
}

function SelectCell({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-sm bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Policies() {
  const { user } = useAuth();
  const currentTenant = useCurrentTenant();
  const tenantId = currentTenant.data?.tenant_id ?? null;
  const { data: policies, isLoading } = usePolicies();
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [editingComponents, setEditingComponents] = useState<BenefitComponent[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync selectedPolicy with latest data from query
  useEffect(() => {
    if (selectedPolicy && policies) {
      const updated = policies.find((p) => p.id === selectedPolicy.id);
      if (updated) setSelectedPolicy(updated);
    }
  }, [policies]);

  const isEditing = editingComponents !== null;

  const benefitComponents: BenefitComponent[] = selectedPolicy?.benefit_components
    ? (Array.isArray(selectedPolicy.benefit_components)
        ? selectedPolicy.benefit_components
        : []) as BenefitComponent[]
    : [];

  const startEditing = () => {
    setEditingComponents([...benefitComponents.map((c) => ({ ...c }))]);
  };

  const cancelEditing = () => setEditingComponents(null);

  const updateComponent = (index: number, field: keyof BenefitComponent, value: string) => {
    setEditingComponents((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addComponent = () => {
    setEditingComponents((prev) => [
      ...(prev ?? []),
      { name: "", type: "Allowance", taxable: "Non-taxable", calcMethod: "", amount: "" },
    ]);
  };

  const removeComponent = (index: number) => {
    setEditingComponents((prev) => prev ? prev.filter((_, i) => i !== index) : prev);
  };

  const saveComponents = async () => {
    if (!selectedPolicy || !editingComponents) return;
    // Validate: all must have a name
    if (editingComponents.some((c) => !c.name.trim())) {
      toast.error("All components must have a name");
      return;
    }
    setIsSaving(true);
    try {
      await updatePolicy.mutateAsync({
        id: selectedPolicy.id,
        benefit_components: editingComponents as any,
      });
      setEditingComponents(null);
      toast.success("Benefit components updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

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

  const displayComponents = isEditing ? editingComponents! : benefitComponents;

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
                      onClick={() => { setSelectedPolicy(p); setEditingComponents(null); }}
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
      {selectedPolicy && (benefitComponents.length > 0 || isEditing) && (
        <div className="bg-card rounded-lg border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">
                  Policy Components – {selectedPolicy.name}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isEditing ? "Click cells to edit. Save when done." : "Benefit line items, taxability, and calculation methods"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={isSaving}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={saveComponents} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Edit className="w-4 h-4 mr-1" /> Edit Components
                </Button>
              )}
            </div>
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
                  {isEditing && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {displayComponents.map((c, i) => (
                  <tr key={i} className="data-table-row">
                    {isEditing ? (
                      <>
                        <td className="px-4 py-2">
                          <EditableCell value={c.name} onChange={(v) => updateComponent(i, "name", v)} placeholder="Component name" />
                        </td>
                        <td className="px-4 py-2">
                          <SelectCell value={c.type} onChange={(v) => updateComponent(i, "type", v)} options={BENEFIT_TYPES} />
                        </td>
                        <td className="px-4 py-2">
                          <SelectCell value={c.taxable} onChange={(v) => updateComponent(i, "taxable", v)} options={TAXABILITY_OPTIONS} />
                        </td>
                        <td className="px-4 py-2">
                          <EditableCell value={c.calcMethod} onChange={(v) => updateComponent(i, "calcMethod", v)} placeholder="Calc method" />
                        </td>
                        <td className="px-4 py-2">
                          <EditableCell value={c.amount} onChange={(v) => updateComponent(i, "amount", v)} placeholder="Amount" />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => removeComponent(i)}
                            className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{c.type}</td>
                        <td className="px-5 py-3 text-muted-foreground">{c.taxable}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{c.calcMethod}</td>
                        <td className="px-5 py-3 font-medium text-foreground">{c.amount}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isEditing && (
            <div className="p-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={addComponent}>
                <PlusCircle className="w-4 h-4 mr-1" /> Add Component
              </Button>
            </div>
          )}
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
