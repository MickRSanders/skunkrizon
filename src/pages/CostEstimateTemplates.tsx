import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet, Plus, Search, Loader2, Settings2, Layers, Link2,
  Trash2, ChevronRight, DollarSign, Globe, Shield, ArrowLeft,
  Sparkles, BookTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useCostEstimateTemplates,
  useCreateCostEstimateTemplate,
  useDeleteCostEstimateTemplate,
  useCostEstimateVersions,
  useUpdateCostEstimateVersion,
  useCompensationItems,
  useUpsertCompensationItem,
  useDeleteCompensationItem,
  usePolicyMappings,
  useUpsertPolicyMapping,
  useCreateCostEstimateVersion,
} from "@/hooks/useCostEstimates";
import { usePolicies } from "@/hooks/usePolicies";

const TEMPLATE_TYPES = [
  { value: "move_host_based", label: "Move - Host Based" },
  { value: "stay_at_home", label: "Stay at Home" },
  { value: "local_host", label: "Local Host" },
];

const COMP_CATEGORIES = ["Salary", "Benefits", "Incentive Compensation", "Deferred Compensation", "Employer Contributions", "Allowances"];

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "SGD", "AUD", "CAD", "INR", "BRL"];

// ─── Novartis Template Blueprints ───────────────────────────
interface TemplateBlueprint {
  id: string;
  name: string;
  description: string;
  templates: {
    name: string;
    template_type: string;
    notes: string;
    display_currency: string;
    tax_calculation_method: string;
    include_tax_calculation: boolean;
    policy_type: string;
    compensation_items: {
      paycode: string;
      display_label: string;
      display_category: string;
      is_taxable: boolean;
      sort_order: number;
    }[];
  }[];
}

const BLUEPRINTS: TemplateBlueprint[] = [
  {
    id: "novartis",
    name: "Novartis Standard",
    description: "Pre-configured templates for Long Term, Short Term, and Permanent Transfer assignments with Salary, STI, LTI, and Pension ER compensation items. Tax equalization enabled.",
    templates: [
      {
        name: "Long Term Assignment",
        template_type: "move_host_based",
        notes: "Long term assignment cost estimate — display in host currency. Based on Novartis workshop specifications.",
        display_currency: "host",
        tax_calculation_method: "tax-equalization",
        include_tax_calculation: true,
        policy_type: "long_term_assignment",
        compensation_items: [
          { paycode: "BASE_SALARY", display_label: "Base Salary", display_category: "Salary", is_taxable: true, sort_order: 0 },
          { paycode: "STI", display_label: "Short-Term Incentive (STI)", display_category: "Incentive Compensation", is_taxable: true, sort_order: 1 },
          { paycode: "LTI", display_label: "Long-Term Incentive (LTI)", display_category: "Deferred Compensation", is_taxable: true, sort_order: 2 },
          { paycode: "PENSION_ER", display_label: "Employer Pension Contribution", display_category: "Employer Contributions", is_taxable: false, sort_order: 3 },
          { paycode: "COLA", display_label: "Cost of Living Allowance", display_category: "Allowances", is_taxable: true, sort_order: 4 },
          { paycode: "HOUSING", display_label: "Housing Allowance", display_category: "Allowances", is_taxable: true, sort_order: 5 },
          { paycode: "EDUCATION", display_label: "Education Allowance", display_category: "Benefits", is_taxable: true, sort_order: 6 },
          { paycode: "RELOCATION", display_label: "Relocation Lump Sum", display_category: "Benefits", is_taxable: true, sort_order: 7 },
        ],
      },
      {
        name: "Short Term Assignment",
        template_type: "move_host_based",
        notes: "Short term assignment cost estimate — display in home currency. Based on Novartis workshop specifications.",
        display_currency: "home",
        tax_calculation_method: "tax-equalization",
        include_tax_calculation: true,
        policy_type: "short_term_assignment",
        compensation_items: [
          { paycode: "BASE_SALARY", display_label: "Base Salary", display_category: "Salary", is_taxable: true, sort_order: 0 },
          { paycode: "STI", display_label: "Short-Term Incentive (STI)", display_category: "Incentive Compensation", is_taxable: true, sort_order: 1 },
          { paycode: "LTI", display_label: "Long-Term Incentive (LTI)", display_category: "Deferred Compensation", is_taxable: true, sort_order: 2 },
          { paycode: "PENSION_ER", display_label: "Employer Pension Contribution", display_category: "Employer Contributions", is_taxable: false, sort_order: 3 },
          { paycode: "COLA", display_label: "Cost of Living Allowance", display_category: "Allowances", is_taxable: true, sort_order: 4 },
          { paycode: "HOUSING", display_label: "Housing Allowance", display_category: "Allowances", is_taxable: true, sort_order: 5 },
        ],
      },
      {
        name: "Permanent Transfer",
        template_type: "move_host_based",
        notes: "Permanent transfer cost estimate — display in host currency. Based on Novartis workshop specifications.",
        display_currency: "host",
        tax_calculation_method: "tax-equalization",
        include_tax_calculation: true,
        policy_type: "permanent_transfer",
        compensation_items: [
          { paycode: "BASE_SALARY", display_label: "Base Salary", display_category: "Salary", is_taxable: true, sort_order: 0 },
          { paycode: "STI", display_label: "Short-Term Incentive (STI)", display_category: "Incentive Compensation", is_taxable: true, sort_order: 1 },
          { paycode: "LTI", display_label: "Long-Term Incentive (LTI)", display_category: "Deferred Compensation", is_taxable: true, sort_order: 2 },
          { paycode: "PENSION_ER", display_label: "Employer Pension Contribution", display_category: "Employer Contributions", is_taxable: false, sort_order: 3 },
          { paycode: "RELOCATION", display_label: "Relocation Lump Sum", display_category: "Benefits", is_taxable: true, sort_order: 4 },
        ],
      },
    ],
  },
];

export default function CostEstimateTemplates() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBlueprints, setShowBlueprints] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("move_host_based");
  const [newNotes, setNewNotes] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState(false);

  const { data: templates, isLoading } = useCostEstimateTemplates();
  const createTemplate = useCreateCostEstimateTemplate();
  const deleteTemplate = useDeleteCostEstimateTemplate();

  const selectedTemplate = templates?.find((t: any) => t.id === selectedTemplateId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createTemplate.mutateAsync({ name: newName, template_type: newType, notes: newNotes || undefined });
      setShowCreate(false);
      setNewName("");
      setNewType("move_host_based");
      setNewNotes("");
      toast.success("Cost estimate template created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create template");
    }
  };

  if (selectedTemplate) {
    return <TemplateDetail template={selectedTemplate} onBack={() => setSelectedTemplateId(null)} />;
  }

  const filtered = templates?.filter((t: any) => !search || t.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/60 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--accent)/0.15),transparent_70%)]" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">Cost Estimate Templates</h1>
          <p className="text-primary-foreground/70 mt-2 max-w-lg text-sm">
            Configure templates that define how cost estimates are calculated — including compensation items, tax settings, and policy mappings.
          </p>
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold text-primary-foreground">{templates?.length ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wider text-primary-foreground/50">Templates</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Create */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowBlueprints(true)}>
            <Sparkles className="w-4 h-4 mr-1" /> From Blueprint
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      {/* Template List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">Create your first cost estimate template or start from a pre-built blueprint.</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowBlueprints(true)}>
              <Sparkles className="w-4 h-4 mr-2" /> From Blueprint
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Template
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t: any) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className="text-left bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-accent/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {TEMPLATE_TYPES.find((tt) => tt.value === t.template_type)?.label ?? t.template_type}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {t.notes && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.notes}</p>}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <StatusBadge status={t.status === "active" ? "active" : "draft"} />
                <span className="text-[10px] text-muted-foreground">{format(new Date(t.created_at), "MMM d, yyyy")}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Cost Estimate Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Template Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Long Term Assignment - Standard" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Template Type *</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((tt) => (
                    <SelectItem key={tt.value} value={tt.value}>{tt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="When to use this template..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" disabled={!newName.trim() || createTemplate.isPending} onClick={handleCreate}>
              {createTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blueprint Dialog */}
      <BlueprintDialog
        open={showBlueprints}
        onOpenChange={setShowBlueprints}
        loading={blueprintLoading}
        onApply={async (blueprint) => {
          setBlueprintLoading(true);
          try {
            for (const tmpl of blueprint.templates) {
              await createTemplate.mutateAsync(
                { name: tmpl.name, template_type: tmpl.template_type, notes: tmpl.notes },
              );
            }
            setShowBlueprints(false);
            toast.success(`Created ${blueprint.templates.length} templates from "${blueprint.name}" blueprint. Open each to configure compensation items and policy mappings.`);
          } catch (err: any) {
            toast.error(err.message || "Failed to apply blueprint");
          } finally {
            setBlueprintLoading(false);
          }
        }}
      />
    </div>
  );
}

// ─── Blueprint Dialog ───────────────────────────────────────
function BlueprintDialog({ open, onOpenChange, loading, onApply }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onApply: (blueprint: TemplateBlueprint) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Template Blueprints
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Blueprints create pre-configured templates with compensation items, tax settings, and policy mappings based on proven workshop configurations.
        </p>
        <div className="space-y-4 mt-2">
          {BLUEPRINTS.map((bp) => (
            <div key={bp.id} className="rounded-xl border border-border bg-card p-5 hover:border-accent/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    {bp.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-lg">{bp.description}</p>
                </div>
                <Button
                  size="sm"
                  disabled={loading}
                  onClick={() => onApply(bp)}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                  Apply
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                {bp.templates.map((tmpl, idx) => (
                  <div key={idx} className="rounded-lg bg-muted/40 border border-border/50 p-3">
                    <h4 className="text-xs font-semibold text-foreground mb-2">{tmpl.name}</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        <span>Display: {tmpl.display_currency === "host" ? "Host Currency" : tmpl.display_currency === "home" ? "Home Currency" : tmpl.display_currency}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Globe className="w-3 h-3" />
                        <span>Tax: {tmpl.tax_calculation_method.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Shield className="w-3 h-3" />
                        <span>{tmpl.compensation_items.length} comp items</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tmpl.compensation_items.map((ci, ciIdx) => (
                        <Badge key={ciIdx} variant="secondary" className="text-[9px] px-1.5 py-0">
                          {ci.display_label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Detail ────────────────────────────────────────
function TemplateDetail({ template, onBack }: { template: any; onBack: () => void }) {
  const [tab, setTab] = useState("versions");
  const { data: versions, isLoading: loadingVersions } = useCostEstimateVersions(template.id);
  const { data: policies } = usePolicies();
  const activeVersion = versions?.find((v: any) => v.status === "active") ?? versions?.[0];
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const currentVersion = versions?.find((v: any) => v.id === selectedVersionId) ?? activeVersion;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/60 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--accent)/0.15),transparent_70%)]" />
        <div className="relative z-10">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-3 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Templates
          </Button>
          <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">{template.name}</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">
            {TEMPLATE_TYPES.find((tt) => tt.value === template.template_type)?.label}
            {template.notes && ` — ${template.notes}`}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <Badge variant="outline" className="text-primary-foreground border-primary-foreground/30">
              {versions?.length ?? 0} version{(versions?.length ?? 0) !== 1 ? "s" : ""}
            </Badge>
            <StatusBadge status={template.status === "active" ? "active" : "draft"} />
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="versions" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Versions & Settings</TabsTrigger>
          <TabsTrigger value="comp-items" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Compensation Items</TabsTrigger>
          <TabsTrigger value="mappings" className="gap-1.5"><Link2 className="w-3.5 h-3.5" /> Policy Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="space-y-4">
          <VersionsTab versions={versions} loading={loadingVersions} templateId={template.id} selectedVersionId={selectedVersionId} onSelectVersion={setSelectedVersionId} />
        </TabsContent>

        <TabsContent value="comp-items" className="space-y-4">
          {currentVersion ? (
            <CompItemsTab versionId={currentVersion.id} />
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">No version available. Create one first.</p>
          )}
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <PolicyMappingsTab templateId={template.id} policies={policies ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Versions Tab ───────────────────────────────────────────
function VersionsTab({ versions, loading, templateId, selectedVersionId, onSelectVersion }: any) {
  const updateVersion = useUpdateCostEstimateVersion();
  const createVersion = useCreateCostEstimateVersion();

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>;

  const handleNewVersion = async () => {
    const nextNum = (versions?.length ?? 0) + 1;
    try {
      await createVersion.mutateAsync({ template_id: templateId, version_number: nextNum });
      toast.success(`Version ${nextNum} created`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={handleNewVersion} disabled={createVersion.isPending}>
          <Plus className="w-4 h-4 mr-1" /> New Version
        </Button>
      </div>
      {(!versions || versions.length === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-10">No versions created yet.</p>
      ) : (
        <div className="space-y-3">
          {versions.map((v: any) => (
            <VersionCard
              key={v.id}
              version={v}
              isSelected={v.id === selectedVersionId || (!selectedVersionId && v === versions[0])}
              onSelect={() => onSelectVersion(v.id)}
              onUpdate={async (updates: any) => {
                try {
                  await updateVersion.mutateAsync({ id: v.id, ...updates });
                  toast.success("Version updated");
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VersionCard({ version, isSelected, onSelect, onUpdate }: any) {
  const [editing, setEditing] = useState(false);
  const [currency, setCurrency] = useState(version.display_currency || "USD");
  const [inflRate, setInflRate] = useState(version.inflation_rate?.toString() ?? "");
  const [taxMethod, setTaxMethod] = useState(version.tax_calculation_method || "tax-equalization");
  const [includeTax, setIncludeTax] = useState(version.include_tax_calculation ?? true);

  const handleSave = () => {
    onUpdate({
      display_currency: currency,
      inflation_rate: inflRate ? parseFloat(inflRate) : null,
      tax_calculation_method: taxMethod,
      include_tax_calculation: includeTax,
    });
    setEditing(false);
  };

  return (
    <div
      className={`bg-card rounded-xl border p-5 transition-all cursor-pointer ${
        isSelected ? "border-accent shadow-md" : "border-border hover:border-accent/30"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">v{version.version_number}</Badge>
          <StatusBadge status={version.status === "active" ? "active" : "draft"} />
        </div>
        <div className="flex items-center gap-2">
          {version.status === "draft" && (
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onUpdate({ status: "active" }); }}>
              Activate
            </Button>
          )}
          {version.status === "active" && (
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onUpdate({ status: "inactive" }); }}>
              Deactivate
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditing(!editing); }}>
            <Settings2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Display Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Home Currency</SelectItem>
                <SelectItem value="host">Host Currency</SelectItem>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Inflation Rate (%)</Label>
            <Input type="number" step="0.01" value={inflRate} onChange={(e) => setInflRate(e.target.value)} placeholder="e.g. 2.5" className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tax Calculation Method</Label>
            <Select value={taxMethod} onValueChange={setTaxMethod}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tax-equalization">Tax Equalization</SelectItem>
                <SelectItem value="tax-protection">Tax Protection</SelectItem>
                <SelectItem value="tax-gross-up">Tax Gross-Up</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 flex items-end">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} className="rounded" />
              Include Tax Calculation
            </label>
          </div>
          <div className="col-span-2 flex justify-end">
            <Button size="sm" onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {version.display_currency}</span>
        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {version.tax_calculation_method || "—"}</span>
        {version.effective_from && <span>From: {format(new Date(version.effective_from), "MMM d, yyyy")}</span>}
        <span className="ml-auto">{format(new Date(version.created_at), "MMM d, yyyy")}</span>
      </div>
    </div>
  );
}

// ─── Compensation Items Tab ─────────────────────────────────
function CompItemsTab({ versionId }: { versionId: string }) {
  const { data: items, isLoading } = useCompensationItems(versionId);
  const upsert = useUpsertCompensationItem();
  const remove = useDeleteCompensationItem();
  const [showAdd, setShowAdd] = useState(false);
  const [paycode, setPaycode] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Salary");

  const handleAdd = async () => {
    if (!paycode.trim() || !label.trim()) return;
    try {
      await upsert.mutateAsync({ version_id: versionId, paycode, display_label: label, display_category: category, sort_order: (items?.length ?? 0) });
      setShowAdd(false);
      setPaycode("");
      setLabel("");
      toast.success("Compensation item added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Configure compensation line items included in cost estimates.</p>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
      </div>

      {(!items || items.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <DollarSign className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No compensation items configured</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Paycode</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Label</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxable</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Home</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Host</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-foreground">{item.paycode}</td>
                  <td className="px-5 py-3 text-foreground">{item.display_label}</td>
                  <td className="px-5 py-3"><Badge variant="secondary" className="text-[10px]">{item.display_category}</Badge></td>
                  <td className="px-5 py-3 text-muted-foreground">{item.is_taxable ? "Yes" : "No"}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{item.home_country || "All"}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{item.host_country || "All"}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => remove.mutate(item.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Compensation Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Paycode *</Label>
              <Input value={paycode} onChange={(e) => setPaycode(e.target.value)} placeholder="e.g. BASE_SALARY" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Display Label *</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Base Salary" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMP_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" disabled={!paycode.trim() || !label.trim() || upsert.isPending} onClick={handleAdd}>
              {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Policy Mappings Tab ────────────────────────────────────
function PolicyMappingsTab({ templateId, policies }: { templateId: string; policies: any[] }) {
  const { data: mappings, isLoading } = usePolicyMappings(templateId);
  const upsert = useUpsertPolicyMapping();
  const [showAdd, setShowAdd] = useState(false);
  const [mappingType, setMappingType] = useState("policy_type");
  const [policyType, setPolicyType] = useState("");
  const [policyId, setPolicyId] = useState("");

  const handleAdd = async () => {
    try {
      await upsert.mutateAsync({
        template_id: templateId,
        mapping_type: mappingType,
        policy_type: mappingType === "policy_type" ? policyType : undefined,
        policy_id: mappingType === "policy_id" ? policyId : undefined,
      });
      setShowAdd(false);
      setPolicyType("");
      setPolicyId("");
      toast.success("Policy mapping added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Map this template to policies or policy types.</p>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Mapping</Button>
      </div>

      {(!mappings || mappings.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Link2 className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No policy mappings configured</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mappings.map((m: any) => (
            <div key={m.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
              <div>
                <Badge variant="outline" className="text-xs mr-2">{m.mapping_type === "policy_type" ? "Policy Type" : "Policy ID"}</Badge>
                <span className="text-sm text-foreground font-medium">{m.policy_type || policies.find((p: any) => p.id === m.policy_id)?.name || m.policy_id}</span>
              </div>
              <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), "MMM d, yyyy")}</span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Policy Mapping</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mapping Type</Label>
              <Select value={mappingType} onValueChange={setMappingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy_type">Policy Type</SelectItem>
                  <SelectItem value="policy_id">Specific Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mappingType === "policy_type" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Policy Type</Label>
                <Select value={policyType} onValueChange={setPolicyType}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long_term_assignment">Long Term Assignment</SelectItem>
                    <SelectItem value="short_term_assignment">Short Term Assignment</SelectItem>
                    <SelectItem value="permanent_transfer">Permanent Transfer</SelectItem>
                    <SelectItem value="commuter">Commuter</SelectItem>
                    <SelectItem value="extended_business_travel">Extended Business Travel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Policy</Label>
                <Select value={policyId} onValueChange={setPolicyId}>
                  <SelectTrigger><SelectValue placeholder="Select policy..." /></SelectTrigger>
                  <SelectContent>
                    {policies.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" disabled={upsert.isPending || (mappingType === "policy_type" && !policyType) || (mappingType === "policy_id" && !policyId)} onClick={handleAdd}>
              Add Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
