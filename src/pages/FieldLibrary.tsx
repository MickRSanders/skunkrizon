import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Database,
  TableIcon,
  Edit,
  Trash2,
  Loader2,
  BookOpen,
  Layers,
  FunctionSquare,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useFieldLibrary,
  useCreateFieldLibraryItem,
  useUpdateFieldLibraryItem,
  useDeleteFieldLibraryItem,
  type FieldLibraryItem,
} from "@/hooks/useFieldLibrary";
import { useLookupTables, type LookupTable } from "@/hooks/useCalculations";
import { useFieldUsageMap, type FieldUsage } from "@/hooks/useCrossReferences";
import type { Json } from "@/integrations/supabase/types";

const SOURCE_LABELS: Record<string, { label: string; icon: typeof Database; color: string }> = {
  manual: { label: "Manual", icon: Layers, color: "bg-muted text-muted-foreground" },
  database: { label: "Database", icon: Database, color: "bg-primary/10 text-primary" },
  lookup: { label: "Lookup Table", icon: TableIcon, color: "bg-accent/10 text-accent" },
};

const FIELD_TYPES = [
  { value: "number", label: "Number" },
  { value: "text", label: "Text" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes / No" },
];

const DB_TABLES = [
  { value: "simulations", label: "Simulations", columns: ["base_salary", "cola_percent", "housing_cap", "exchange_rate_buffer", "duration_months", "total_cost", "relocation_lump_sum"] },
  { value: "policies", label: "Policies", columns: ["tier", "tax_approach", "status"] },
  { value: "profiles", label: "Profiles", columns: ["display_name", "department", "job_title", "company"] },
];

export default function FieldLibrary() {
  const { user } = useAuth();
  const { data: fields, isLoading } = useFieldLibrary();
  const { data: lookupTables } = useLookupTables();
  const fieldUsageMap = useFieldUsageMap();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldLibraryItem | null>(null);

  const filtered = fields?.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingField(null);
    setDialogOpen(true);
  };

  const openEdit = (field: FieldLibraryItem) => {
    setEditingField(field);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Field Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define reusable data fields with configurable data sources
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> New Field
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm bg-card border border-border rounded-md px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search fields..."
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
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Field</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Source</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Used In</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  lookupTables={lookupTables || []}
                  usage={fieldUsageMap.get(field.name)}
                  onEdit={() => openEdit(field)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchTerm
              ? "No fields match your search"
              : "No fields yet. Create your first reusable data field."}
          </p>
        </div>
      )}

      <FieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingField={editingField}
        lookupTables={lookupTables || []}
        userId={user?.id || ""}
      />
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────

function FieldRow({
  field,
  lookupTables,
  usage,
  onEdit,
}: {
  field: FieldLibraryItem;
  lookupTables: LookupTable[];
  usage?: FieldUsage;
  onEdit: () => void;
}) {
  const deleteField = useDeleteFieldLibraryItem();
  const source = SOURCE_LABELS[field.source_type] || SOURCE_LABELS.manual;
  const Icon = source.icon;

  const handleDelete = async () => {
    try {
      await deleteField.mutateAsync(field.id);
      toast.success(`Field "${field.label}" deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const hasUsage = usage && (usage.calculations.length > 0 || usage.policyBenefits.length > 0);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-5 py-3">
        <div>
          <span className="font-medium text-foreground">{field.label}</span>
          <span className="ml-2 font-mono text-xs text-muted-foreground">{field.name}</span>
        </div>
        {field.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
        )}
      </td>
      <td className="px-5 py-3">
        <Badge variant="outline" className="text-xs capitalize">{field.field_type}</Badge>
      </td>
      <td className="px-5 py-3">
        <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${source.color}`}>
          <Icon className="w-3 h-3" />
          {source.label}
        </div>
      </td>
      <td className="px-5 py-3">
        {hasUsage ? (
          <div className="flex flex-wrap gap-1">
            {usage!.calculations.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
                <FunctionSquare className="w-2.5 h-2.5" />
                {c.name}
              </span>
            ))}
            {usage!.policyBenefits.map((p, i) => (
              <span key={`${p.id}-${i}`} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                <FileText className="w-2.5 h-2.5" />
                {p.policyName}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteField.isPending}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Create / Edit Dialog ─────────────────────────────────────

function FieldDialog({
  open,
  onOpenChange,
  editingField,
  lookupTables,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editingField: FieldLibraryItem | null;
  lookupTables: LookupTable[];
  userId: string;
}) {
  const createField = useCreateFieldLibraryItem();
  const updateField = useUpdateFieldLibraryItem();

  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [fieldType, setFieldType] = useState("number");
  const [sourceType, setSourceType] = useState("manual");
  const [dbTable, setDbTable] = useState("");
  const [dbColumn, setDbColumn] = useState("");
  const [lookupTableId, setLookupTableId] = useState("");
  const [lookupKeyColumn, setLookupKeyColumn] = useState("");
  const [lookupValueColumn, setLookupValueColumn] = useState("");

  // Reset form when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      if (editingField) {
        setName(editingField.name);
        setLabel(editingField.label);
        setDescription(editingField.description || "");
        setFieldType(editingField.field_type);
        setSourceType(editingField.source_type);
        setDbTable(editingField.db_table || "");
        setDbColumn(editingField.db_column || "");
        setLookupTableId(editingField.lookup_table_id || "");
        setLookupKeyColumn(editingField.lookup_key_column || "");
        setLookupValueColumn(editingField.lookup_value_column || "");
      } else {
        setName("");
        setLabel("");
        setDescription("");
        setFieldType("number");
        setSourceType("manual");
        setDbTable("");
        setDbColumn("");
        setLookupTableId("");
        setLookupKeyColumn("");
        setLookupValueColumn("");
      }
    }
    onOpenChange(o);
  };

  // Auto-generate name from label
  const handleLabelChange = (v: string) => {
    setLabel(v);
    if (!editingField) {
      setName(v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
    }
  };

  const selectedDbTable = DB_TABLES.find((t) => t.value === dbTable);
  const selectedLookup = lookupTables.find((t) => t.id === lookupTableId);
  const lookupColumns = selectedLookup
    ? (Array.isArray(selectedLookup.columns) ? selectedLookup.columns : []).map((c: any) => (typeof c === "string" ? c : c?.name || ""))
    : [];

  const handleSave = async () => {
    if (!label.trim()) return toast.error("Label is required");
    if (!name.trim()) return toast.error("Name is required");

    const payload = {
      name,
      label,
      description: description || null,
      field_type: fieldType,
      source_type: sourceType,
      db_table: sourceType === "database" ? dbTable || null : null,
      db_column: sourceType === "database" ? dbColumn || null : null,
      lookup_table_id: sourceType === "lookup" ? lookupTableId || null : null,
      lookup_key_column: sourceType === "lookup" ? lookupKeyColumn || null : null,
      lookup_value_column: sourceType === "lookup" ? lookupValueColumn || null : null,
      created_by: userId,
    };

    try {
      if (editingField) {
        await updateField.mutateAsync({ id: editingField.id, ...payload });
        toast.success(`Field "${label}" updated`);
      } else {
        await createField.mutateAsync(payload);
        toast.success(`Field "${label}" created`);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save field");
    }
  };

  const isSaving = createField.isPending || updateField.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingField ? "Edit Field" : "New Data Field"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Label & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Label *</Label>
              <Input
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g. Base Salary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name (key)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="base_salary"
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this field represent?"
            />
          </div>

          {/* Field Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Field Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Source */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Data Source</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="database">Database Field</SelectItem>
                <SelectItem value="lookup">Lookup Table Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Database source config */}
          {sourceType === "database" && (
            <div className="space-y-3 rounded-md border border-border p-3 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Database Source
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Table</Label>
                  <Select value={dbTable} onValueChange={(v) => { setDbTable(v); setDbColumn(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select table..." /></SelectTrigger>
                    <SelectContent>
                      {DB_TABLES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Column</Label>
                  <Select value={dbColumn} onValueChange={setDbColumn} disabled={!dbTable}>
                    <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                    <SelectContent>
                      {selectedDbTable?.columns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Lookup source config */}
          {sourceType === "lookup" && (
            <div className="space-y-3 rounded-md border border-border p-3 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5" /> Lookup Table Source
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Lookup Table</Label>
                  <Select value={lookupTableId} onValueChange={(v) => { setLookupTableId(v); setLookupKeyColumn(""); setLookupValueColumn(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select lookup table..." /></SelectTrigger>
                    <SelectContent>
                      {lookupTables.map((lt) => (
                        <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {lookupTableId && lookupColumns.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Key Column</Label>
                      <Select value={lookupKeyColumn} onValueChange={setLookupKeyColumn}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {lookupColumns.filter(Boolean).map((c: string) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Value Column</Label>
                      <Select value={lookupValueColumn} onValueChange={setLookupValueColumn}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {lookupColumns.filter(Boolean).map((c: string) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {editingField ? "Save Changes" : "Create Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
