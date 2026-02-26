import { useState, useCallback } from "react";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import FormulaBuilder, { type FormulaBlock } from "@/components/FormulaBuilder";
import FieldDataSourceEditor from "@/components/FieldDataSourceEditor";
import {
  Plus,
  Search,
  Edit,
  FunctionSquare,
  Loader2,
  ArrowLeft,
  Trash2,
  Save,
  Variable,
  Database,
  Play,
  CheckCircle2,
  AlertCircle,
  TableIcon,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import {
  useCalculations,
  useCreateCalculation,
  useUpdateCalculation,
  useDeleteCalculation,
  useCalculationFields,
  useAllCalculationFields,
  useCreateField,
  useUpdateField,
  useDeleteField,
  useUpsertDataSource,
  useLookupTables,
  isInheritedCalc,
  isOverriddenCalc,
  type Calculation,
  type CalculationField,
} from "@/hooks/useCalculations";
import { useTenantContext } from "@/contexts/TenantContext";
import type { Json } from "@/integrations/supabase/types";
import { evaluateFormula, type EvalResult } from "@/lib/formulaEngine";
import { useFieldLibrary, useCreateFieldLibraryItem, type FieldLibraryItem } from "@/hooks/useFieldLibrary";
import { useCalcUsageMap } from "@/hooks/useCrossReferences";

export default function Calculations() {
  const { user } = useAuth();
  const { data: currentTenant } = useCurrentTenant();
  const { activeSubTenant } = useTenantContext();
  const { data: calculations, isLoading } = useCalculations();
  const createCalc = useCreateCalculation();
  const calcUsageMap = useCalcUsageMap();
  const [editingCalc, setEditingCalc] = useState<Calculation | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  // Compute counts for filter options (based on search + opposite filter only)
  const countByType = (type: string) =>
    (calculations || []).filter((c) => {
      const cat = (c.category || "").toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.includes(searchTerm.toLowerCase());
      const matchesStageF =
        stageFilter === "all" || cat.includes(stageFilter.toLowerCase());
      if (!matchesSearch || !matchesStageF) return false;
      if (type === "all") return true;
      if (type === "cash") return cat.startsWith("cash");
      if (type === "non-cash") return cat.startsWith("non-cash");
      if (type === "either") return cat.startsWith("either");
      return false;
    }).length;

  const countByStage = (stage: string) =>
    (calculations || []).filter((c) => {
      const cat = (c.category || "").toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.includes(searchTerm.toLowerCase());
      const matchesTypeF =
        typeFilter === "all" ||
        (typeFilter === "cash" && cat.startsWith("cash")) ||
        (typeFilter === "non-cash" && cat.startsWith("non-cash")) ||
        (typeFilter === "either" && cat.startsWith("either"));
      if (!matchesSearch || !matchesTypeF) return false;
      if (stage === "all") return true;
      return cat.includes(stage.toLowerCase());
    }).length;

  const filtered = calculations?.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(searchTerm.toLowerCase());
    const cat = (c.category || "").toLowerCase();
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "cash" && cat.startsWith("cash")) ||
      (typeFilter === "non-cash" && cat.startsWith("non-cash")) ||
      (typeFilter === "either" && cat.startsWith("either"));
    const matchesStage =
      stageFilter === "all" ||
      cat.includes(stageFilter.toLowerCase());
    return matchesSearch && matchesType && matchesStage;
  });
  if (editingCalc) {
    return (
      <CalculationEditor
        calculation={editingCalc}
        onBack={() => setEditingCalc(null)}
      />
    );
  }

  if (showCreate && user) {
    return (
      <CreateCalculation
        userId={user.id}
        tenantId={currentTenant?.tenant_id ?? null}
        onBack={() => setShowCreate(false)}
        onCreated={(calc) => {
          setShowCreate(false);
          setEditingCalc(calc);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Calculations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define, test, and manage calculation rules and formulas
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Calculation
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search calculations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Benefit type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types ({countByType("all")})</SelectItem>
            <SelectItem value="cash">Cash ({countByType("cash")})</SelectItem>
            <SelectItem value="non-cash">Non-Cash ({countByType("non-cash")})</SelectItem>
            <SelectItem value="either">Either ({countByType("either")})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Move stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages ({countByStage("all")})</SelectItem>
            <SelectItem value="relocation">Relocation ({countByStage("relocation")})</SelectItem>
            <SelectItem value="ongoing">Ongoing ({countByStage("ongoing")})</SelectItem>
            <SelectItem value="end of assignment">End of Assignment ({countByStage("end of assignment")})</SelectItem>
          </SelectContent>
        </Select>
        {(searchTerm || typeFilter !== "all" || stageFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => { setSearchTerm(""); setTypeFilter("all"); setStageFilter("all"); }}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Reset Filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((calc) => (
            <CalcCard
              key={calc.id}
              calc={calc}
              usage={calcUsageMap.get(calc.id)}
              onEdit={() => setEditingCalc(calc)}
              activeSubTenantId={activeSubTenant?.id ?? null}
              onCustomize={async (parentCalc) => {
                if (!user) return;
                try {
                  const override = await createCalc.mutateAsync({
                    name: parentCalc.name,
                    category: parentCalc.category,
                    description: parentCalc.description,
                    formula: parentCalc.formula,
                    created_by: user.id,
                    tenant_id: parentCalc.tenant_id,
                    sub_tenant_id: activeSubTenant?.id ?? null,
                  });
                  toast.success(`Created override for "${parentCalc.name}"`);
                  setEditingCalc(override);
                } catch (err: any) {
                  toast.error(err.message || "Failed to create override");
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <FunctionSquare className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchTerm
              ? "No calculations match your search"
              : "No calculations yet. Create your first one!"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Calculation Card ──────────────────────────────────────────

function CalcCard({
  calc,
  usage,
  onEdit,
  activeSubTenantId,
  onCustomize,
}: {
  calc: Calculation;
  usage?: import("@/hooks/useCrossReferences").CalcUsage;
  onEdit: () => void;
  activeSubTenantId: string | null;
  onCustomize: (parentCalc: Calculation) => void;
}) {
  const deleteCalc = useDeleteCalculation();
  const inherited = isInheritedCalc(calc, activeSubTenantId);
  const overridden = isOverriddenCalc(calc, activeSubTenantId);
  const uniquePolicies = usage
    ? [...new Map(usage.policies.map((p) => [p.id, p])).values()]
    : [];

  return (
    <div className={`bg-card rounded-lg border p-5 hover:shadow-md transition-shadow ${inherited ? "border-border/60 opacity-90" : overridden ? "border-primary/40" : "border-border"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <FunctionSquare className="w-4 h-4 text-accent shrink-0" />
          {(() => {
            const cat = calc.category || "";
            const [typePart, stagesPart] = cat.split("|").map((s) => s.trim());
            const stages = stagesPart ? stagesPart.split(",").map((s) => s.trim()).filter(Boolean) : [];
            const typeColors: Record<string, string> = {
              "cash": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              "non-cash": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
              "either": "bg-sky-500/10 text-sky-700 dark:text-sky-400",
            };
            const typeClass = typeColors[typePart.toLowerCase()] || "bg-muted text-muted-foreground";
            return (
              <>
                {typePart && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeClass}`}>
                    {typePart}
                  </span>
                )}
                {stages.map((stage) => (
                  <span key={stage} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {stage}
                  </span>
                ))}
                {!typePart && !stages.length && (
                  <span className="text-xs text-muted-foreground font-medium">General</span>
                )}
              </>
            );
          })()}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {inherited && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              Inherited
            </span>
          )}
          {overridden && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
              Customized
            </span>
          )}
        </div>
      </div>
      <h3 className="font-semibold text-foreground text-sm mb-1">
        {calc.name}
      </h3>
      {calc.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {calc.description}
        </p>
      )}
      <div className="bg-muted/50 rounded px-3 py-2 mb-3">
        <code className="text-xs font-mono text-foreground break-all">
          {calc.formula || "No formula defined"}
        </code>
      </div>
      {uniquePolicies.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {uniquePolicies.map((p) => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <Link to="/policies" className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors cursor-pointer">
                  <FileText className="w-2.5 h-2.5" />
                  {p.policyName}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-semibold">Policy: {p.policyName}</p>
                <p className="text-muted-foreground">Component: {p.componentName}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 pt-2 border-t border-border">
        {inherited ? (
          <Button variant="ghost" size="sm" onClick={() => onCustomize(calc)} className="text-xs gap-1">
            <Edit className="w-3.5 h-3.5" /> Customize
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs gap-1">
            <Edit className="w-3.5 h-3.5" /> Edit Formula
          </Button>
        )}
        {overridden && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-destructive hover:text-destructive"
            onClick={async () => {
              try {
                await deleteCalc.mutateAsync(calc.id);
                toast.success(`Reset "${calc.name}" to inherited version`);
              } catch (err: any) {
                toast.error(err.message || "Failed to reset");
              }
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Reset to Inherited
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Create Calculation ────────────────────────────────────────

function CreateCalculation({
  userId,
  tenantId,
  onBack,
  onCreated,
}: {
  userId: string;
  tenantId: string | null;
  onBack: () => void;
  onCreated: (calc: Calculation) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const createCalc = useCreateCalculation();

  const handleCreate = async () => {
    if (!name) return toast.error("Name is required");
    try {
      const calc = await createCalc.mutateAsync({
        name,
        category: category || null,
        description: description || null,
        formula: "",
        created_by: userId,
        tenant_id: tenantId,
      });
      toast.success(`Calculation "${name}" created`);
      onCreated(calc);
    } catch (err: any) {
      toast.error(err.message || "Failed to create calculation");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">New Calculation</h1>
      </div>

      <div className="max-w-lg bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tax Gross-Up" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Choose category..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Tax">Tax</SelectItem>
              <SelectItem value="Allowance">Allowance</SelectItem>
              <SelectItem value="Premium">Premium</SelectItem>
              <SelectItem value="Benefit">Benefit</SelectItem>
              <SelectItem value="Utility">Utility</SelectItem>
              <SelectItem value="Bonus">Bonus</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this calculation do?" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={createCalc.isPending}>
            {createCalc.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Create & Edit Formula
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Formula Test Runner ───────────────────────────────────────

function FormulaTestRunner({
  blocks,
  fields,
  allFields,
  libraryFields,
}: {
  blocks: FormulaBlock[];
  fields: CalculationField[];
  allFields: CalculationField[];
  libraryFields: FieldLibraryItem[];
}) {
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EvalResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const referencedFieldNames = blocks
    .filter((b) => b.type === "field")
    .map((b) => b.value);

  const lookupKeyFields = blocks
    .filter((b) => b.type === "lookup" && b.lookupMeta)
    .map((b) => b.lookupMeta!.keyFieldName);

  const allReferencedNames = [...new Set([...referencedFieldNames, ...lookupKeyFields])];

  const allFieldsList = allFields.length > 0 ? allFields : fields;
  const fieldLabelMap = new Map(allFieldsList.map((f) => [f.name, f.label]));
  libraryFields.forEach((f) => fieldLabelMap.set(f.name, f.label));

  const buildFormula = () =>
    blocks
      .map((b) => {
        if (b.type === "lookup" && b.lookupMeta) {
          return `LOOKUP("${b.lookupMeta.tableName}", "${b.lookupMeta.keyColumn}", "${b.lookupMeta.valueColumn}", ${b.lookupMeta.keyFieldName})`;
        }
        return b.value;
      })
      .join(" ");

  const handleRun = async () => {
    const formula = buildFormula();
    if (!formula.trim()) return;
    setIsRunning(true);
    const variables: Record<string, number> = {};
    allReferencedNames.forEach((name) => {
      variables[name] = parseFloat(testInputs[name] || "0") || 0;
    });
    const evalResult = await evaluateFormula(formula, variables);
    setResult(evalResult);
    setIsRunning(false);
  };

  if (blocks.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <Play className="w-4 h-4 text-accent" />
        Test Formula
      </h2>

      {allReferencedNames.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Input Values</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allReferencedNames.map((name) => (
              <div key={name} className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">
                  {fieldLabelMap.get(name) || name}
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={testInputs[name] || ""}
                  onChange={(e) => setTestInputs({ ...testInputs, [name]: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleRun} disabled={isRunning} className="gap-1.5">
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run
        </Button>

        {result && !result.error && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent/10 border border-accent/20">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold font-mono text-accent">
              {typeof result.value === "number" ? result.value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : result.value}
            </span>
          </div>
        )}

        {result?.error && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-xs text-destructive">{result.error}</span>
          </div>
        )}
      </div>

      {result && result.lookupCalls.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Lookup Results</Label>
          {result.lookupCalls.map((lc, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] font-mono bg-muted/30 rounded px-2.5 py-1.5">
              <TableIcon className="w-3 h-3 text-primary shrink-0" />
              <span className="text-muted-foreground">
                {lc.tableName}.{lc.valueColumn} where {lc.keyColumn}="{lc.keyValue}"
              </span>
              <span className="ml-auto font-bold">
                {lc.error ? (
                  <span className="text-destructive">{lc.error}</span>
                ) : (
                  <span className="text-accent">→ {lc.result}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Calculation Editor ────────────────────────────────────────

function CalculationEditor({
  calculation,
  onBack,
}: {
  calculation: Calculation;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { data: fieldsData, isLoading: loadingFields } = useCalculationFields(calculation.id);
  const { data: allFieldsData } = useAllCalculationFields();
  const { data: allCalcs } = useCalculations();
  const { data: lookupTables } = useLookupTables();
  const { data: libraryFields } = useFieldLibrary();
  const createField = useCreateField();
  const deleteField = useDeleteField();
  const updateCalc = useUpdateCalculation();
  const upsertSource = useUpsertDataSource();
  const createLibraryItem = useCreateFieldLibraryItem();

  const [blocks, setBlocks] = useState<FormulaBlock[]>(() => {
    if (!calculation.formula) return [];
    return [];
  });

  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<CalculationField | null>(null);
  const [showDataSource, setShowDataSource] = useState<CalculationField | null>(null);

  const fields = fieldsData || [];
  const allFields = allFieldsData || [];
  const otherFields = allFields.filter((f) => f.calculation_id !== calculation.id);

  // Track which field names already exist in the library
  const libraryFieldNames = new Set((libraryFields || []).map((f) => f.name));

  // Build a map of calculation names for grouping
  const calcNameMap = new Map<string, string>();
  allCalcs?.forEach((c) => calcNameMap.set(c.id, c.name));

  const handleSaveToLibrary = async (field: CalculationField) => {
    try {
      // Extract data source config if present (joined via field_data_sources(*))
      const ds = (field as any).field_data_sources?.[0] || (field as any).field_data_source;
      const sourceType = ds?.source_type || "manual";
      await createLibraryItem.mutateAsync({
        name: field.name,
        label: field.label,
        description: null,
        field_type: field.field_type,
        source_type: sourceType,
        db_table: ds?.connector_config?.db_table ?? null,
        db_column: ds?.connector_config?.db_column ?? null,
        lookup_table_id: ds?.lookup_table_id ?? null,
        lookup_key_column: ds?.lookup_key_column ?? null,
        lookup_value_column: ds?.lookup_value_column ?? null,
        created_by: user?.id || "",
      });
      toast.success(`"${field.label}" saved to Field Library`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save to library");
    }
  };

  const handleAddField = async (name: string, label: string, fieldType: string) => {
    try {
      await createField.mutateAsync({
        calculation_id: calculation.id,
        name: name.toLowerCase().replace(/\s+/g, "_"),
        label,
        field_type: fieldType,
        position: fields.length,
      });
      setShowAddField(false);
      toast.success(`Field "${label}" added`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add field");
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      await deleteField.mutateAsync({ id: fieldId, calculationId: calculation.id });
      setBlocks(blocks.filter((b) => b.fieldId !== fieldId));
      toast.success("Field removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete field");
    }
  };

  const handleSaveFormula = async () => {
    const formula = blocks
      .map((b) => {
        if (b.type === "lookup" && b.lookupMeta) {
          return `LOOKUP("${b.lookupMeta.tableName}", "${b.lookupMeta.keyColumn}", "${b.lookupMeta.valueColumn}", ${b.lookupMeta.keyFieldName})`;
        }
        return b.type === "field" ? b.value : b.value;
      })
      .join(" ");
    try {
      await updateCalc.mutateAsync({ id: calculation.id, formula });
      toast.success("Formula saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save formula");
    }
  };

  const handleSaveDataSource = async (source: any) => {
    try {
      await upsertSource.mutateAsync({
        ...source,
        calculationId: calculation.id,
      });
      setShowDataSource(null);
      toast.success("Data source configured");
    } catch (err: any) {
      toast.error(err.message || "Failed to save data source");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {calculation.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {calculation.category || "General"}{" "}
              {calculation.description && `· ${calculation.description}`}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleSaveFormula} disabled={updateCalc.isPending}>
          {updateCalc.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save Formula
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Formula Builder */}
        <div className="col-span-8 bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <FunctionSquare className="w-4 h-4 text-accent" />
            Formula Builder
          </h2>

          {loadingFields ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : (
            <FormulaBuilder
              blocks={blocks}
              onChange={setBlocks}
              fields={fields}
              allFields={allFields}
               lookupTables={lookupTables || []}
               libraryFields={libraryFields || []}
              onAddField={() => setShowAddField(true)}
              onEditField={(field) => setShowDataSource(field)}
            />
          )}
        </div>

        {/* Formula Test Runner */}
        <div className="col-span-8">
          <FormulaTestRunner blocks={blocks} fields={fields} allFields={allFields} libraryFields={libraryFields || []} />
        </div>

        {/* Fields Panel */}
        <div className="col-span-4 space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Variable className="w-4 h-4 text-accent" />
                This Calculation
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddField(true)}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No fields yet. Add one to start building your formula.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((f: any) => (
                  <FieldItem
                    key={f.id}
                    field={f}
                    onDataSource={() => setShowDataSource(f)}
                    onDelete={() => handleDeleteField(f.id)}
                    onSaveToLibrary={() => handleSaveToLibrary(f)}
                    isInLibrary={libraryFieldNames.has(f.name)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Other Calculations' Fields */}
          {otherFields.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Database className="w-4 h-4 text-accent" />
                All Fields
              </h2>
              <div className="space-y-3">
                {Array.from(new Set(otherFields.map((f) => f.calculation_id))).map((calcId) => {
                  const calcFields = otherFields.filter((f) => f.calculation_id === calcId);
                  return (
                    <div key={calcId}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                        {calcNameMap.get(calcId) || "Unknown"}
                      </p>
                      <div className="space-y-1.5">
                        {calcFields.map((f: any) => (
                          <FieldItem
                            key={f.id}
                            field={f}
                            onDataSource={() => setShowDataSource(f)}
                            readOnly
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Data Source Editor */}
          {showDataSource && (
            <div className="bg-card border border-border rounded-lg p-5">
              <FieldDataSourceEditor
                field={showDataSource}
                currentSource={
                  (showDataSource as any).field_data_sources?.[0] || null
                }
                onSave={handleSaveDataSource}
                onClose={() => setShowDataSource(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Field Dialog */}
      {showAddField && (
        <AddFieldDialog
          onAdd={handleAddField}
          onClose={() => setShowAddField(false)}
          isPending={createField.isPending}
        />
      )}
    </div>
  );
}

// ─── Field Item ────────────────────────────────────────────────

function FieldItem({
  field,
  onDataSource,
  onDelete,
  onSaveToLibrary,
  readOnly,
  isInLibrary,
}: {
  field: any;
  onDataSource: () => void;
  onDelete?: () => void;
  onSaveToLibrary?: () => void;
  readOnly?: boolean;
  isInLibrary?: boolean;
}) {
  const source = field.field_data_sources?.[0];
  return (
    <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/10 group">
      <div>
        <p className="text-xs font-medium text-foreground">{field.label}</p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
          <span className="font-mono">{field.name}</span>
          <span>·</span>
          <span>{field.field_type}</span>
          {source && (
            <>
              <span>·</span>
              <Database className="w-2.5 h-2.5" />
              <span className="capitalize">{source.source_type.replace("_", " ")}</span>
            </>
          )}
          {isInLibrary && (
            <>
              <span>·</span>
              <BookOpen className="w-2.5 h-2.5 text-primary" />
              <span className="text-primary">Library</span>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!readOnly && onSaveToLibrary && !isInLibrary && (
          <button
            onClick={onSaveToLibrary}
            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
            title="Save to Field Library"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onDataSource}
          className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent"
          title="Configure data source"
        >
          <Database className="w-3.5 h-3.5" />
        </button>
        {!readOnly && onDelete && (
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Delete field"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add Field Dialog ──────────────────────────────────────────

function AddFieldDialog({
  onAdd,
  onClose,
  isPending,
}: {
  onAdd: (name: string, label: string, fieldType: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("number");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Add Field</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Label *</Label>
            <Input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (!name) setName(e.target.value.toLowerCase().replace(/\s+/g, "_"));
              }}
              placeholder="e.g. Base Salary"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Variable Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. base_salary"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onAdd(name, label, fieldType)} disabled={!label || !name || isPending}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Add Field
          </Button>
        </div>
      </div>
    </div>
  );
}
