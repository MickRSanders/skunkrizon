import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import CostEstimateDetailViewer from "@/components/CostEstimateDetailViewer";
import DocumentTemplateFieldEditor, { type PlaceholderMapping } from "@/components/DocumentTemplateFieldEditor";
import VisualTemplateEditor from "@/components/VisualTemplateEditor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Plus, ScrollText, CreditCard, Receipt, Search,
  FileCheck, Loader2, Download, Eye, ArrowRight, FileSpreadsheet,
  Pencil, Sparkles, Upload, Code2, LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { downloadCostEstimatePdf } from "@/lib/generateCostEstimatePdf";
import {
  useLoaTemplates, useCreateLoaTemplate, useUpdateLoaTemplate,
  useLoaDocuments, useUpdateLoaDocument,
  useBalanceSheets, useUpdateBalanceSheet,
  usePayInstructions, useUpdatePayInstruction,
} from "@/hooks/useDocuments";
import { useCostEstimates } from "@/hooks/useCostEstimates";
import { useSimulations } from "@/hooks/useSimulations";
import { useLookupTables } from "@/hooks/useCalculations";
import { supabase } from "@/integrations/supabase/client";

export default function Documents() {
  const [tab, setTab] = useState("loa-templates");
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [uploadParsing, setUploadParsing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);

  // Edit LOA template state
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPlaceholders, setEditPlaceholders] = useState<PlaceholderMapping[]>([]);
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [editorMode, setEditorMode] = useState<"visual" | "json">("visual");

  // Generic document edit state
  const [editDoc, setEditDoc] = useState<any>(null);
  const [editDocType, setEditDocType] = useState<"loa" | "balance_sheet" | "pay_instruction" | null>(null);
  const [editDocJson, setEditDocJson] = useState("");
  const [editDocJson2, setEditDocJson2] = useState("");

  const { data: templates, isLoading: loadingTemplates } = useLoaTemplates();
  const { data: loaDocs, isLoading: loadingDocs } = useLoaDocuments();
  const { data: balanceSheets, isLoading: loadingBS } = useBalanceSheets();
  const { data: payInstructions, isLoading: loadingPI } = usePayInstructions();
  const { data: costEstimates, isLoading: loadingCE } = useCostEstimates();
  const { data: simulations } = useSimulations();
  const { data: lookupTables } = useLookupTables();
  const createTemplate = useCreateLoaTemplate();
  const updateTemplate = useUpdateLoaTemplate();
  const updateLoaDoc = useUpdateLoaDocument();
  const updateBalanceSheet = useUpdateBalanceSheet();
  const updatePayInstruction = useUpdatePayInstruction();

  const approvedSims = simulations?.filter((s) => s.status === "approved") ?? [];

  // ─── Upload & parse document template ──────────────────────
  const handleUploadAndParse = async (file: File) => {
    setUploadParsing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("You must be logged in"); return null; }

      // Upload file to storage
      const { data: { session: sess } } = await supabase.auth.getSession();
      const userId = sess?.user?.id;
      if (!userId) { toast.error("You must be logged in"); return null; }
      const filePath = `${userId}/templates/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("policy-documents")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      // Parse via edge function
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-policy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ filePath, fileName: file.name }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to parse document");
      }

      const { parsed } = await resp.json();
      return parsed;
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      return null;
    } finally {
      setUploadParsing(false);
    }
  };

  // ─── LOA Template handlers ────────────────────────────────
  const handleCreateTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      let content: any;
      let placeholders: any;

      if (templateFile) {
        // Parse uploaded file
        const parsed = await handleUploadAndParse(templateFile);
        if (!parsed) return;

        // Convert parsed policy data into template content & placeholders
        const sections: any[] = [];
        const phs: any[] = [];

        sections.push({ type: "heading", text: parsed.policyName || templateName });
        if (parsed.description) {
          sections.push({ type: "paragraph", text: parsed.description });
        }
        sections.push({ type: "paragraph", text: "Dear {{employee_name}}," });
        phs.push({ key: "employee_name", source: "simulation", field: "employee_name" });

        if (parsed.eligibility) {
          sections.push({ type: "section", title: "Eligibility", text: parsed.eligibility });
        }
        if (parsed.duration) {
          sections.push({ type: "section", title: "Assignment Duration", text: parsed.duration });
        }
        sections.push({
          type: "paragraph",
          text: "This assignment is from {{origin_country}} to {{destination_country}}, commencing {{start_date}}.",
        });
        phs.push(
          { key: "origin_country", source: "simulation", field: "origin_country" },
          { key: "destination_country", source: "simulation", field: "destination_country" },
          { key: "start_date", source: "simulation", field: "start_date" },
        );

        if (parsed.benefitComponents?.length) {
          const benefitSection: any = {
            type: "section",
            title: "Compensation & Benefits",
            fields: [],
          };
          parsed.benefitComponents.forEach((bc: any) => {
            const key = bc.name?.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, "") || "benefit";
            benefitSection.fields.push(key);
            sections.push({
              type: "benefit_row",
              label: bc.name,
              calc_method: bc.calcMethod || "",
              amount: bc.amount || "",
              taxable: bc.taxable || "N/A",
            });
          });
          sections.splice(sections.length - parsed.benefitComponents.length, 0, benefitSection);
        }

        if (parsed.taxApproach) {
          sections.push({ type: "section", title: "Tax Approach", text: `Tax approach: ${parsed.taxApproach}` });
        }
        if (parsed.notes) {
          sections.push({ type: "section", title: "Additional Notes", text: parsed.notes });
        }

        // Standard closing
        sections.push({ type: "paragraph", text: "This letter supersedes all previous agreements regarding this assignment." });

        // Add standard simulation placeholders
        const standardKeys = ["assignment_type", "duration_months", "base_salary", "currency", "cola_percent", "housing_cap"];
        standardKeys.forEach((k) => {
          if (!phs.some((p: any) => p.key === k)) {
            phs.push({ key: k, source: "simulation", field: k });
          }
        });

        content = sections;
        placeholders = phs;
      } else {
        // Default template
        content = [
          { type: "heading", text: "Letter of Assignment" },
          { type: "paragraph", text: "Dear {{employee_name}}," },
          { type: "paragraph", text: "We are pleased to confirm your assignment from {{origin_country}} to {{destination_country}}." },
          { type: "section", title: "Assignment Details", fields: ["assignment_type", "duration_months", "start_date"] },
          { type: "section", title: "Compensation", fields: ["base_salary", "currency", "cola_percent"] },
          { type: "section", title: "Benefits", fields: ["housing_cap", "relocation_lump_sum"] },
          { type: "paragraph", text: "This letter supersedes all previous agreements regarding this assignment." },
        ];
        placeholders = [
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
        ];
      }

      const newTemplate = await createTemplate.mutateAsync({
        name: templateName,
        description: templateDesc || undefined,
        content,
        placeholders,
      });
      setShowNewTemplate(false);
      setTemplateName("");
      setTemplateDesc("");
      setTemplateFile(null);
      toast.success(templateFile ? "Template created from uploaded document" : "LOA template created");
      // Redirect into the editor for the newly created template
      if (newTemplate && typeof newTemplate === 'object') {
        openEditDialog({
          ...(newTemplate as Record<string, any>),
          content,
          placeholders,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create template");
    }
  };

  const openEditDialog = (t: any) => {
    setEditTemplate(t);
    setEditName(t.name);
    setEditDesc(t.description || "");
    setEditContent(JSON.stringify(t.content, null, 2));
    setEditPlaceholders(Array.isArray(t.placeholders) ? t.placeholders : []);
  };

  const handleUpdateTemplate = async () => {
    if (!editTemplate || !editName.trim()) return;
    try {
      let parsedContent: any;
      try { parsedContent = JSON.parse(editContent); } catch { toast.error("Invalid JSON in content"); return; }
      await updateTemplate.mutateAsync({
        id: editTemplate.id,
        name: editName,
        description: editDesc || null,
        content: parsedContent,
        placeholders: editPlaceholders,
      });
      setEditTemplate(null);
      toast.success("Template updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update template");
    }
  };

  // ─── Generic document edit handlers ───────────────────────
  const openDocEdit = (item: any, type: "loa" | "balance_sheet" | "pay_instruction") => {
    setEditDoc(item);
    setEditDocType(type);
    if (type === "loa") {
      setEditDocJson(JSON.stringify(item.content, null, 2));
      setEditDocJson2(JSON.stringify(item.source_snapshot, null, 2));
    } else if (type === "balance_sheet") {
      setEditDocJson(JSON.stringify(item.line_items, null, 2));
      setEditDocJson2(JSON.stringify(item.policy_explanations, null, 2));
    } else {
      setEditDocJson(JSON.stringify(item.line_items, null, 2));
      setEditDocJson2("");
    }
  };

  const handleUpdateDoc = async () => {
    if (!editDoc || !editDocType) return;
    try {
      let parsed1: any;
      try { parsed1 = JSON.parse(editDocJson); } catch { toast.error("Invalid JSON in primary field"); return; }
      let parsed2: any;
      if (editDocJson2) {
        try { parsed2 = JSON.parse(editDocJson2); } catch { toast.error("Invalid JSON in secondary field"); return; }
      }

      if (editDocType === "loa") {
        await updateLoaDoc.mutateAsync({ id: editDoc.id, content: parsed1, source_snapshot: parsed2 || editDoc.source_snapshot });
      } else if (editDocType === "balance_sheet") {
        await updateBalanceSheet.mutateAsync({ id: editDoc.id, line_items: parsed1, policy_explanations: parsed2 || editDoc.policy_explanations });
      } else {
        await updatePayInstruction.mutateAsync({ id: editDoc.id, line_items: parsed1 });
      }
      setEditDoc(null);
      setEditDocType(null);
      toast.success("Document updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update document");
    }
  };

  const docTypeLabels: Record<string, { title: string; field1: string; field2?: string }> = {
    loa: { title: "LOA Document", field1: "Content (JSON)", field2: "Source Snapshot (JSON)" },
    balance_sheet: { title: "Balance Sheet", field1: "Line Items (JSON)", field2: "Policy Explanations (JSON)" },
    pay_instruction: { title: "Pay Instruction", field1: "Line Items (JSON)" },
  };

  // ─── AI regeneration ──────────────────────────────────────
  const handleAiRegenerate = async (type: "loa_template" | "loa_document" | "balance_sheet" | "pay_instruction") => {
    const targetId = type === "loa_template" ? editTemplate?.id : editDoc?.id;
    const targetName = type === "loa_template" ? editName : editDoc?.employee_name;
    if (!targetId) return;
    setAiRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("You must be logged in"); return; }

      let prompt = "";
      let toolName = "";
      if (type === "loa_template") {
        toolName = "update_loa_template";
        prompt = `Please regenerate and improve this LOA template called "${editName}". Description: "${editDesc}". Current content: ${editContent}. Current placeholders: ${JSON.stringify(editPlaceholders)}. Use the update_loa_template tool with template id "${targetId}" to save the improved version. Make the letter more professional while preserving placeholders.`;
      } else if (type === "loa_document") {
        toolName = "update_loa_document";
        prompt = `Please improve this LOA document for employee "${targetName}". Current content: ${editDocJson}. Current source snapshot: ${editDocJson2}. Use the update_loa_document tool with document id "${targetId}" to save improvements. Make it more professional and comprehensive.`;
      } else if (type === "balance_sheet") {
        toolName = "update_balance_sheet";
        prompt = `Please improve this Balance Sheet for employee "${targetName}". Current line items: ${editDocJson}. Current policy explanations: ${editDocJson2}. Use the update_balance_sheet tool with document id "${targetId}" to improve the line items and explanations. Ensure professional formatting.`;
      } else {
        toolName = "update_pay_instruction";
        prompt = `Please improve this Pay Instruction for employee "${targetName}". Current line items: ${editDocJson}. Use the update_pay_instruction tool with document id "${targetId}" to improve the line items. Ensure professional formatting.`;
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], includeContext: true }),
      });

      if (!resp.ok) { toast.error("AI request failed"); return; }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let docUpdated = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk.includes("event: document_updated") || chunk.includes("event: template_updated")) {
            docUpdated = true;
          }
          // consume stream
        }
      }

      if (docUpdated) {
        toast.success("Document regenerated by AI!");
        // Refresh data
        if (type === "loa_template") {
          const { data: refreshed } = await (supabase.from("loa_templates" as any) as any).select("*").eq("id", targetId).single();
          if (refreshed) {
            setEditContent(JSON.stringify(refreshed.content, null, 2));
            setEditPlaceholders(Array.isArray(refreshed.placeholders) ? refreshed.placeholders : []);
            setEditName(refreshed.name);
            setEditDesc(refreshed.description || "");
          }
        } else if (type === "loa_document") {
          const { data: refreshed } = await (supabase.from("loa_documents" as any) as any).select("*").eq("id", targetId).single();
          if (refreshed) {
            setEditDocJson(JSON.stringify(refreshed.content, null, 2));
            setEditDocJson2(JSON.stringify(refreshed.source_snapshot, null, 2));
          }
        } else if (type === "balance_sheet") {
          const { data: refreshed } = await (supabase.from("balance_sheets" as any) as any).select("*").eq("id", targetId).single();
          if (refreshed) {
            setEditDocJson(JSON.stringify(refreshed.line_items, null, 2));
            setEditDocJson2(JSON.stringify(refreshed.policy_explanations, null, 2));
          }
        } else {
          const { data: refreshed } = await (supabase.from("pay_instructions" as any) as any).select("*").eq("id", targetId).single();
          if (refreshed) {
            setEditDocJson(JSON.stringify(refreshed.line_items, null, 2));
          }
        }
      } else {
        toast.info("AI provided suggestions. Review and save manually if needed.");
      }
    } catch (err: any) {
      toast.error(err.message || "AI regeneration failed");
    } finally {
      setAiRegenerating(false);
    }
  };

  const isSaving = updateTemplate.isPending || updateLoaDoc.isPending || updateBalanceSheet.isPending || updatePayInstruction.isPending;

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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{format(new Date(t.created_at), "MMM d, yyyy")}</span>
                      <button
                        onClick={() => openEditDialog(t)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Edit template"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
            <DocumentTable items={loaDocs} type="loa" onEdit={(item) => openDocEdit(item, "loa")} />
          )}
        </TabsContent>

        {/* Balance Sheets Tab */}
        <TabsContent value="balance-sheets" className="space-y-4">
          {loadingBS ? <LoadingState /> : !balanceSheets || balanceSheets.length === 0 ? (
            <EmptyState icon={CreditCard} title="No balance sheets yet" description="Generate balance sheets from approved simulations." />
          ) : (
            <DocumentTable items={balanceSheets} type="balance_sheet" onEdit={(item) => openDocEdit(item, "balance_sheet")} />
          )}
        </TabsContent>

        {/* Pay Instructions Tab */}
        <TabsContent value="pay-instructions" className="space-y-4">
          {loadingPI ? <LoadingState /> : !payInstructions || payInstructions.length === 0 ? (
            <EmptyState icon={Receipt} title="No pay instructions yet" description="Generate pay instructions from approved simulations." />
          ) : (
            <DocumentTable items={payInstructions} type="pay_instruction" onEdit={(item) => openDocEdit(item, "pay_instruction")} />
          )}
        </TabsContent>

        {/* Cost Estimates Tab */}
        <TabsContent value="cost-estimates" className="space-y-4">
          {loadingCE ? <LoadingState /> : !costEstimates || costEstimates.length === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="No cost estimates yet" description="Generate cost estimates from approved simulations using the Generate button." />
          ) : (
            <DocumentTable
              items={costEstimates}
              type="cost_estimate"
              onView={(item) => setSelectedEstimate(item)}
              onDownload={(item) => {
                downloadCostEstimatePdf(item);
                toast.success(`PDF downloaded for ${item.employee_name}`);
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplate} onOpenChange={(open) => { if (!open) { setShowNewTemplate(false); setTemplateFile(null); } else setShowNewTemplate(true); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New LOA Template</DialogTitle></DialogHeader>
          <div className="space-y-4 overflow-hidden">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Template Name *</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Standard Long-Term Assignment" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="Optional description..." rows={2} />
            </div>

            {/* File Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Upload Document (optional)</Label>
              <div className="relative">
                {templateFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5">
                    <FileText className="w-5 h-5 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{templateFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(templateFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setTemplateFile(null)} className="text-xs h-7 px-2">
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed border-border hover:border-accent/40 bg-muted/30 cursor-pointer transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Drop a <strong>DOCX</strong> or <strong>PDF</strong> file here, or click to browse
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setTemplateFile(f);
                          if (!templateName.trim()) {
                            setTemplateName(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {templateFile
                  ? "The AI will parse this document and extract sections, benefits, and placeholders automatically."
                  : "Upload an existing document to auto-populate the template, or leave empty for a default structure."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowNewTemplate(false); setTemplateFile(null); }}>Cancel</Button>
            <Button size="sm" disabled={!templateName.trim() || createTemplate.isPending || uploadParsing} onClick={handleCreateTemplate}>
              {(createTemplate.isPending || uploadParsing) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : templateFile ? <Upload className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {uploadParsing ? "Parsing Document..." : templateFile ? "Upload & Create" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit LOA Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) setEditTemplate(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Edit LOA Template
              </DialogTitle>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    editorMode === "visual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => {
                    if (editorMode === "json") {
                      // Sync JSON back to structured data
                      try {
                        const parsed = JSON.parse(editContent);
                        setEditorMode("visual");
                      } catch {
                        // keep in json mode if invalid
                      }
                    } else {
                      setEditorMode("visual");
                    }
                  }}
                >
                  <LayoutTemplate className="w-3.5 h-3.5" /> Visual
                </button>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    editorMode === "json" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setEditorMode("json")}
                >
                  <Code2 className="w-3.5 h-3.5" /> JSON
                </button>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Template Name *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Optional description" />
              </div>
            </div>

            {editorMode === "visual" ? (
              <VisualTemplateEditor
                content={(() => { try { return JSON.parse(editContent); } catch { return []; } })()}
                placeholders={editPlaceholders}
                onContentChange={(c) => setEditContent(JSON.stringify(c, null, 2))}
                onPlaceholdersChange={setEditPlaceholders}
                lookupTables={(lookupTables ?? []).map((lt: any) => ({
                  id: lt.id,
                  name: lt.name,
                  columns: Array.isArray(lt.columns) ? lt.columns : [],
                }))}
              />
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Content (JSON)</Label>
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={12} className="font-mono text-xs" />
                </div>
                <DocumentTemplateFieldEditor
                  placeholders={editPlaceholders}
                  onChange={setEditPlaceholders}
                  lookupTables={(lookupTables ?? []).map((lt: any) => ({
                    id: lt.id,
                    name: lt.name,
                    columns: Array.isArray(lt.columns) ? lt.columns : [],
                  }))}
                  templateContent={(() => { try { return JSON.parse(editContent); } catch { return undefined; } })()}
                />
              </>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => handleAiRegenerate("loa_template")} disabled={aiRegenerating || isSaving} className="gap-1.5">
              {aiRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiRegenerating ? "AI Regenerating..." : "Regenerate with AI"}
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setEditTemplate(null)}>Cancel</Button>
              <Button size="sm" disabled={!editName.trim() || isSaving} onClick={handleUpdateTemplate}>
                {updateTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog (LOA Docs, Balance Sheets, Pay Instructions) */}
      <Dialog open={!!editDoc} onOpenChange={(open) => { if (!open) { setEditDoc(null); setEditDocType(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit {editDocType ? docTypeLabels[editDocType]?.title : "Document"} — {editDoc?.employee_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{editDocType ? docTypeLabels[editDocType]?.field1 : "Data"}</Label>
              <Textarea value={editDocJson} onChange={(e) => setEditDocJson(e.target.value)} rows={14} className="font-mono text-xs" />
            </div>
            {editDocType && docTypeLabels[editDocType]?.field2 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{docTypeLabels[editDocType]?.field2}</Label>
                <Textarea value={editDocJson2} onChange={(e) => setEditDocJson2(e.target.value)} rows={8} className="font-mono text-xs" />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => editDocType && handleAiRegenerate(editDocType === "loa" ? "loa_document" : editDocType)}
              disabled={aiRegenerating || isSaving}
              className="gap-1.5"
            >
              {aiRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiRegenerating ? "AI Regenerating..." : "Regenerate with AI"}
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => { setEditDoc(null); setEditDocType(null); }}>Cancel</Button>
              <Button size="sm" disabled={isSaving} onClick={handleUpdateDoc}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
                Save Changes
              </Button>
            </div>
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

function DocumentTable({ items, type, onView, onDownload, onEdit }: { items: any[]; type: string; onView?: (item: any) => void; onDownload?: (item: any) => void; onEdit?: (item: any) => void }) {
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
                  {onEdit && (
                    <button
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Edit"
                      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onView && (
                    <button
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="View"
                      onClick={(e) => { e.stopPropagation(); onView(item); }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDownload && (
                    <button
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Download PDF"
                      onClick={(e) => { e.stopPropagation(); onDownload(item); }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
