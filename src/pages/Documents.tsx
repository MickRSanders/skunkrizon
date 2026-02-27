import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import CostEstimateDetailViewer from "@/components/CostEstimateDetailViewer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Plus, ScrollText, CreditCard, Receipt, Search,
  FileCheck, Loader2, Download, Eye, ArrowRight, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLoaTemplates, useCreateLoaTemplate, useLoaDocuments, useBalanceSheets, usePayInstructions } from "@/hooks/useDocuments";
import { useCostEstimates } from "@/hooks/useCostEstimates";
import { useSimulations } from "@/hooks/useSimulations";

export default function Documents() {
  const [tab, setTab] = useState("loa-templates");
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);

  const { data: templates, isLoading: loadingTemplates } = useLoaTemplates();
  const { data: loaDocs, isLoading: loadingDocs } = useLoaDocuments();
  const { data: balanceSheets, isLoading: loadingBS } = useBalanceSheets();
  const { data: payInstructions, isLoading: loadingPI } = usePayInstructions();
  const { data: costEstimates, isLoading: loadingCE } = useCostEstimates();
  const { data: simulations } = useSimulations();
  const createTemplate = useCreateLoaTemplate();

  const approvedSims = simulations?.filter((s) => s.status === "approved") ?? [];

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      await createTemplate.mutateAsync({
        name: templateName,
        description: templateDesc || undefined,
        content: [
          { type: "heading", text: "Letter of Assignment" },
          { type: "paragraph", text: "Dear {{employee_name}}," },
          { type: "paragraph", text: "We are pleased to confirm your assignment from {{origin_country}} to {{destination_country}}." },
          { type: "section", title: "Assignment Details", fields: ["assignment_type", "duration_months", "start_date"] },
          { type: "section", title: "Compensation", fields: ["base_salary", "currency", "cola_percent"] },
          { type: "section", title: "Benefits", fields: ["housing_cap", "relocation_lump_sum"] },
          { type: "paragraph", text: "This letter supersedes all previous agreements regarding this assignment." },
        ],
        placeholders: [
          { key: "employee_name", source: "simulation", field: "employee_name" },
          { key: "origin_country", source: "simulation", field: "origin_country" },
          { key: "destination_country", source: "simulation", field: "destination_country" },
          { key: "assignment_type", source: "simulation", field: "assignment_type" },
          { key: "duration_months", source: "simulation", field: "duration_months" },
          { key: "start_date", source: "simulation", field: "start_date" },
          { key: "base_salary", source: "simulation", field: "base_salary" },
          { key: "currency", source: "simulation", field: "currency" },
          { key: "cola_percent", source: "simulation", field: "cola_percent" },
          { key: "housing_cap", source: "simulation", field: "housing_cap" },
          { key: "relocation_lump_sum", source: "simulation", field: "relocation_lump_sum" },
        ],
      });
      setShowNewTemplate(false);
      setTemplateName("");
      setTemplateDesc("");
      toast.success("LOA template created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create template");
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/60 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--accent)/0.15),transparent_70%)]" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">Documents</h1>
          <p className="text-primary-foreground/70 mt-2 max-w-lg text-sm">
            Generate Letters of Assignment, Balance Sheets, and Pay Instructions from approved projections.
          </p>
          <div className="flex items-center gap-4 mt-5">
            <StatPill icon={ScrollText} label="LOA Templates" value={templates?.length ?? 0} />
            <StatPill icon={FileCheck} label="LOA Documents" value={loaDocs?.length ?? 0} />
            <StatPill icon={CreditCard} label="Balance Sheets" value={balanceSheets?.length ?? 0} />
            <StatPill icon={Receipt} label="Pay Instructions" value={payInstructions?.length ?? 0} />
            <StatPill icon={FileSpreadsheet} label="Cost Estimates" value={costEstimates?.length ?? 0} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="loa-templates" className="gap-1.5"><ScrollText className="w-3.5 h-3.5" /> LOA Templates</TabsTrigger>
          <TabsTrigger value="loa-documents" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> LOA Documents</TabsTrigger>
          <TabsTrigger value="balance-sheets" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Balance Sheets</TabsTrigger>
          <TabsTrigger value="pay-instructions" className="gap-1.5"><Receipt className="w-3.5 h-3.5" /> Pay Instructions</TabsTrigger>
          <TabsTrigger value="cost-estimates" className="gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Cost Estimates</TabsTrigger>
        </TabsList>

        {/* LOA Templates Tab */}
        <TabsContent value="loa-templates" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowNewTemplate(true)}><Plus className="w-4 h-4 mr-1" /> New Template</Button>
          </div>
          {loadingTemplates ? (
            <LoadingState />
          ) : !templates || templates.length === 0 ? (
            <EmptyState icon={ScrollText} title="No LOA templates yet" description="Create your first template to start generating Letters of Assignment." action={() => setShowNewTemplate(true)} actionLabel="Create Template" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.filter((t: any) => !search || t.name.toLowerCase().includes(search.toLowerCase())).map((t: any) => (
                <div key={t.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-accent/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{t.name}</h3>
                      {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">v{t.version}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{((t.content as any[]) || []).length} sections</span>
                    <span>·</span>
                    <span>{((t.placeholders as any[]) || []).length} placeholders</span>
                    <span>·</span>
                    <span>{((t.conditional_rules as any[]) || []).length} rules</span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <StatusBadge status={t.status === "active" ? "active" : "draft"} />
                    <span className="text-[10px] text-muted-foreground">{format(new Date(t.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* LOA Documents Tab */}
        <TabsContent value="loa-documents" className="space-y-4">
          {approvedSims.length > 0 && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
              <p className="text-sm font-medium text-foreground mb-2">{approvedSims.length} approved simulation{approvedSims.length !== 1 ? "s" : ""} ready for LOA generation</p>
              <div className="flex flex-wrap gap-2">
                {approvedSims.slice(0, 5).map((s) => (
                  <Badge key={s.id} variant="secondary" className="text-xs">{s.sim_code} — {s.employee_name}</Badge>
                ))}
              </div>
            </div>
          )}
          {loadingDocs ? <LoadingState /> : !loaDocs || loaDocs.length === 0 ? (
            <EmptyState icon={FileText} title="No LOA documents yet" description="Generate LOAs from approved simulations." />
          ) : (
            <DocumentTable items={loaDocs} type="loa" />
          )}
        </TabsContent>

        {/* Balance Sheets Tab */}
        <TabsContent value="balance-sheets" className="space-y-4">
          {loadingBS ? <LoadingState /> : !balanceSheets || balanceSheets.length === 0 ? (
            <EmptyState icon={CreditCard} title="No balance sheets yet" description="Generate balance sheets from approved simulations." />
          ) : (
            <DocumentTable items={balanceSheets} type="balance_sheet" />
          )}
        </TabsContent>

        {/* Pay Instructions Tab */}
        <TabsContent value="pay-instructions" className="space-y-4">
          {loadingPI ? <LoadingState /> : !payInstructions || payInstructions.length === 0 ? (
            <EmptyState icon={Receipt} title="No pay instructions yet" description="Generate pay instructions from approved simulations." />
          ) : (
            <DocumentTable items={payInstructions} type="pay_instruction" />
          )}
        </TabsContent>

        {/* Cost Estimates Tab */}
        <TabsContent value="cost-estimates" className="space-y-4">
          {loadingCE ? <LoadingState /> : !costEstimates || costEstimates.length === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="No cost estimates yet" description="Generate cost estimates from approved simulations using the Generate button." />
          ) : (
            <DocumentTable items={costEstimates} type="cost_estimate" onView={(item) => setSelectedEstimate(item)} />
          )}
        </TabsContent>
      </Tabs>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New LOA Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Template Name *</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Standard Long-Term Assignment" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="Optional description..." rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">A default template structure with common sections and placeholders will be generated. You can customize it after creation.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewTemplate(false)}>Cancel</Button>
            <Button size="sm" disabled={!templateName.trim() || createTemplate.isPending} onClick={handleCreateTemplate}>
              {createTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Cost Estimate Detail Viewer */}
      <CostEstimateDetailViewer
        estimate={selectedEstimate}
        open={!!selectedEstimate}
        onOpenChange={(open) => { if (!open) setSelectedEstimate(null); }}
      />
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────
function StatPill({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary-foreground" />
      </div>
      <div>
        <p className="text-xl font-bold text-primary-foreground">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-primary-foreground/50">{label}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-accent" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action, actionLabel }: { icon: any; title: string; description: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      {action && actionLabel && (
        <Button onClick={action}><Plus className="w-4 h-4 mr-2" /> {actionLabel}</Button>
      )}
    </div>
  );
}

function DocumentTable({ items, type, onView }: { items: any[]; type: string; onView?: (item: any) => void }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
            <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Version</th>
            <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            {type === "cost_estimate" && (
              <th className="text-right px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
            )}
            <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
            <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any) => (
            <tr
              key={item.id}
              className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${onView ? "cursor-pointer" : ""}`}
              onClick={() => onView?.(item)}
            >
              <td className="px-5 py-3.5 font-medium text-foreground">{item.employee_name}</td>
              <td className="px-5 py-3.5 text-muted-foreground">v{item.version}</td>
              <td className="px-5 py-3.5"><StatusBadge status={item.status === "active" ? "active" : "draft"} /></td>
              {type === "cost_estimate" && (
                <td className="px-5 py-3.5 text-right font-medium text-foreground">
                  {item.total_cost != null
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: item.display_currency || "USD", minimumFractionDigits: 0 }).format(item.total_cost)
                    : "—"}
                </td>
              )}
              <td className="px-5 py-3.5 text-muted-foreground text-xs">{format(new Date(item.created_at), "MMM d, yyyy")}</td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="View"
                    onClick={(e) => { e.stopPropagation(); onView?.(item); }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Export"><Download className="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
