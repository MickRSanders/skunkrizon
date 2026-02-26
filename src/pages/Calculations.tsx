import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  type Calculation,
  type CalculationField,
} from "@/hooks/useCalculations";
import type { Json } from "@/integrations/supabase/types";

export default function Calculations() {
  const { user } = useAuth();
  const { data: currentTenant } = useCurrentTenant();
  const { data: calculations, isLoading } = useCalculations();
  const [editingCalc, setEditingCalc] = useState<Calculation | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = calculations?.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Calculations Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define, test, and manage calculation rules and formulas
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Calculation
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm bg-card border border-border rounded-md px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search calculations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
        />
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
              onEdit={() => setEditingCalc(calc)}
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
  onEdit,
}: {
  calc: Calculation;
  onEdit: () => void;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FunctionSquare className="w-4 h-4 text-accent" />
          <span className="text-xs text-muted-foreground font-medium">
            {calc.category || "General"}
          </span>
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
      <div className="flex items-center gap-1 pt-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs gap-1">
          <Edit className="w-3.5 h-3.5" /> Edit Formula
        </Button>
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

// ─── Calculation Editor ────────────────────────────────────────

function CalculationEditor({
  calculation,
  onBack,
}: {
  calculation: Calculation;
  onBack: () => void;
}) {
  const { data: fieldsData, isLoading: loadingFields } = useCalculationFields(calculation.id);
  const { data: allFieldsData } = useAllCalculationFields();
  const { data: allCalcs } = useCalculations();
  const createField = useCreateField();
  const deleteField = useDeleteField();
  const updateCalc = useUpdateCalculation();
  const upsertSource = useUpsertDataSource();

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

  // Build a map of calculation names for grouping
  const calcNameMap = new Map<string, string>();
  allCalcs?.forEach((c) => calcNameMap.set(c.id, c.name));

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
      .map((b) => (b.type === "field" ? b.value : b.value))
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
              onAddField={() => setShowAddField(true)}
              onEditField={(field) => setShowDataSource(field)}
            />
          )}
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
  readOnly,
}: {
  field: any;
  onDataSource: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
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
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
