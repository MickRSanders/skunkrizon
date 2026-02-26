import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import {
  Plus,
  GripVertical,
  Trash2,
  Variable,
  Calculator,
  Database,
  X,
  TableIcon,
} from "lucide-react";
import type { CalculationField, LookupTable } from "@/hooks/useCalculations";
import type { FieldLibraryItem } from "@/hooks/useFieldLibrary";

// ─── Types ────────────────────────────────────────────────────

export interface FormulaBlock {
  id: string;
  type: "field" | "operator" | "constant" | "paren" | "lookup" | "func";
  value: string;
  fieldId?: string;
  label?: string;
  lookupMeta?: {
    tableId: string;
    tableName: string;
    keyColumn: string;
    valueColumn: string;
    keyFieldName: string;
  };
}

const OPERATORS = [
  { value: "+", label: "+" },
  { value: "-", label: "−" },
  { value: "*", label: "×" },
  { value: "/", label: "÷" },
  { value: "(", label: "(" },
  { value: ")", label: ")" },
  { value: ",", label: "," },
];

const COMPARISON_OPS = [
  { value: ">", label: ">" },
  { value: ">=", label: "≥" },
  { value: "<", label: "<" },
  { value: "<=", label: "≤" },
  { value: "==", label: "=" },
  { value: "!=", label: "≠" },
];

const FUNCTIONS = [
  { value: "IF", label: "IF()", hint: "IF(condition, then, else)" },
  { value: "MIN", label: "MIN()", hint: "MIN(a, b, ...)" },
  { value: "MAX", label: "MAX()", hint: "MAX(a, b, ...)" },
  { value: "ROUND", label: "ROUND()", hint: "ROUND(value, decimals)" },
];

interface FormulaBuilderProps {
  blocks: FormulaBlock[];
  onChange: (blocks: FormulaBlock[]) => void;
  fields: CalculationField[];
  allFields?: CalculationField[];
  lookupTables?: LookupTable[];
  libraryFields?: FieldLibraryItem[];
  onAddField: () => void;
  onEditField: (field: CalculationField) => void;
}

export default function FormulaBuilder({
  blocks,
  onChange,
  fields,
  allFields,
  lookupTables,
  libraryFields,
  onAddField,
  onEditField,
}: FormulaBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showLookupBuilder, setShowLookupBuilder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const updated = [...blocks];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);
    onChange(updated);
  };

  const addBlock = (type: FormulaBlock["type"], value: string, fieldId?: string, label?: string, lookupMeta?: FormulaBlock["lookupMeta"]) => {
    onChange([
      ...blocks,
      { id: crypto.randomUUID(), type, value, fieldId, label, lookupMeta },
    ]);
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const activeBlock = blocks.find((b) => b.id === activeId);
  const availableFields = allFields && allFields.length > 0 ? allFields : fields;

  // Build formula string preview
  const formulaPreview = blocks
    .map((b) => {
      if (b.type === "lookup" && b.lookupMeta) {
        return `LOOKUP("${b.lookupMeta.tableName}", "${b.lookupMeta.keyColumn}", "${b.lookupMeta.valueColumn}", ${b.lookupMeta.keyFieldName})`;
      }
      if (b.type === "field") return b.label || b.value;
      if (b.type === "func") return b.value;
      return b.value;
    })
    .join(" ");

  return (
    <div className="space-y-4">
      {/* Field Palette */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Available Fields</Label>
        <div className="flex flex-wrap gap-2">
          {fields.map((f) => (
            <button
              key={f.id}
              onClick={() => addBlock("field", f.name, f.id, f.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-accent/30 bg-accent/5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
            >
              <Variable className="w-3 h-3" />
              {f.label}
            </button>
          ))}
          <button
            onClick={onAddField}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent transition-colors"
          >
            <Plus className="w-3 h-3" /> New Field
          </button>
        </div>
      </div>

      {/* Library Fields Palette */}
      {libraryFields && libraryFields.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Library Fields</Label>
          <div className="flex flex-wrap gap-2">
            {libraryFields.map((f) => (
              <button
                key={f.id}
                onClick={() => addBlock("field", f.name, undefined, f.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/30 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Database className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Operator Palette */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Operators & Functions</Label>
        <div className="flex flex-wrap gap-2">
          {OPERATORS.map((op) => (
            <button
              key={op.value}
              onClick={() => addBlock(op.value === "(" || op.value === ")" ? "paren" : "operator", op.value)}
              className="w-9 h-9 rounded-md border border-border bg-muted/30 flex items-center justify-center text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              {op.label}
            </button>
          ))}
          {COMPARISON_OPS.map((op) => (
            <button
              key={op.value}
              onClick={() => addBlock("operator", op.value)}
              className="w-9 h-9 rounded-md border border-border bg-muted/30 flex items-center justify-center text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              {op.label}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <Input
              placeholder="Constant..."
              className="w-24 h-9 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    addBlock("constant", val);
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
            />
            <span className="text-xs text-muted-foreground">↵</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {FUNCTIONS.map((fn) => (
            <button
              key={fn.value}
              onClick={() => addBlock("func", fn.value)}
              title={fn.hint}
              className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-chart-3/30 bg-chart-3/5 text-xs font-bold text-chart-3 hover:bg-chart-3/10 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              {fn.label}
            </button>
          ))}
          {lookupTables && lookupTables.length > 0 && (
            <button
              onClick={() => setShowLookupBuilder(!showLookupBuilder)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-primary/30 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <TableIcon className="w-3.5 h-3.5" />
              LOOKUP()
            </button>
          )}
        </div>
      </div>

      {/* Lookup Builder */}
      {showLookupBuilder && lookupTables && (
        <LookupBlockBuilder
          lookupTables={lookupTables}
          fields={availableFields}
          onAdd={(block) => {
            addBlock("lookup", block.value, undefined, block.label, block.lookupMeta);
            setShowLookupBuilder(false);
          }}
          onClose={() => setShowLookupBuilder(false)}
        />
      )}

      {/* Formula Canvas */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Formula</Label>
        <div className="min-h-[64px] rounded-lg border-2 border-dashed border-border bg-muted/10 p-3 flex flex-wrap items-center gap-2">
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Click fields and operators above to build your formula
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={blocks.map((b) => b.id)} strategy={horizontalListSortingStrategy}>
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    onRemove={() => removeBlock(block.id)}
                    onEditField={block.fieldId ? () => {
                      const field = fields.find((f) => f.id === block.fieldId);
                      if (field) onEditField(field);
                    } : undefined}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeBlock ? <BlockChip block={activeBlock} isDragging /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* Preview */}
      {blocks.length > 0 && (
        <div className="bg-card border border-border rounded-md px-4 py-2.5">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <code className="block text-sm font-mono text-foreground mt-1">{formulaPreview}</code>
        </div>
      )}
    </div>
  );
}

// ─── Lookup Block Builder ──────────────────────────────────────

function LookupBlockBuilder({
  lookupTables,
  fields,
  onAdd,
  onClose,
}: {
  lookupTables: LookupTable[];
  fields: CalculationField[];
  onAdd: (block: Pick<FormulaBlock, "value" | "label" | "lookupMeta">) => void;
  onClose: () => void;
}) {
  const [selectedTableId, setSelectedTableId] = useState("");
  const [keyColumn, setKeyColumn] = useState("");
  const [valueColumn, setValueColumn] = useState("");
  const [keyFieldId, setKeyFieldId] = useState("");

  const selectedTable = lookupTables.find((t) => t.id === selectedTableId);
  const columns = selectedTable
    ? (selectedTable.columns as Array<{ name: string; type: string }>) || []
    : [];

  const selectedField = fields.find((f) => f.id === keyFieldId);

  const canAdd = selectedTableId && keyColumn && valueColumn && keyFieldId && selectedField;

  const handleAdd = () => {
    if (!canAdd || !selectedTable || !selectedField) return;
    const formulaStr = `LOOKUP("${selectedTable.name}", "${keyColumn}", "${valueColumn}", ${selectedField.name})`;
    onAdd({
      value: formulaStr,
      label: `LOOKUP(${selectedTable.name}.${valueColumn})`,
      lookupMeta: {
        tableId: selectedTable.id,
        tableName: selectedTable.name,
        keyColumn,
        valueColumn,
        keyFieldName: selectedField.name,
      },
    });
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <TableIcon className="w-3.5 h-3.5 text-primary" />
          Build LOOKUP() Expression
        </h3>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        LOOKUP(table, key_column, value_column, key_field) — Returns the value from a lookup table row where key_column matches the key_field value.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Lookup Table</Label>
          <Select value={selectedTableId} onValueChange={(v) => { setSelectedTableId(v); setKeyColumn(""); setValueColumn(""); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select table..." /></SelectTrigger>
            <SelectContent>
              {lookupTables.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Key Field (input)</Label>
          <Select value={keyFieldId} onValueChange={setKeyFieldId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field..." /></SelectTrigger>
            <SelectContent>
              {fields.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Match Column (key)</Label>
          <Select value={keyColumn} onValueChange={setKeyColumn} disabled={columns.length === 0}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select column..." /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name} <span className="text-muted-foreground ml-1">({c.type})</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Return Column (value)</Label>
          <Select value={valueColumn} onValueChange={setValueColumn} disabled={columns.length === 0}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select column..." /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name} <span className="text-muted-foreground ml-1">({c.type})</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        {canAdd && selectedTable ? (
          <code className="text-[10px] font-mono text-muted-foreground">
            LOOKUP("{selectedTable.name}", "{keyColumn}", "{valueColumn}", {selectedField?.name})
          </code>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Fill all fields to preview</span>
        )}
        <Button size="sm" onClick={handleAdd} disabled={!canAdd} className="text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Add to Formula
        </Button>
      </div>
    </div>
  );
}

// ─── Sortable Block ────────────────────────────────────────────

function SortableBlock({
  block,
  onRemove,
  onEditField,
}: {
  block: FormulaBlock;
  onRemove: () => void;
  onEditField?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="flex items-center">
        <span {...attributes} {...listeners} className="cursor-grab p-0.5 text-muted-foreground/50 hover:text-muted-foreground">
          <GripVertical className="w-3 h-3" />
        </span>
        <BlockChip block={block} onClick={onEditField} />
        <button
          onClick={onRemove}
          className="ml-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Block Chip ────────────────────────────────────────────────

function BlockChip({
  block,
  isDragging,
  onClick,
}: {
  block: FormulaBlock;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const base = "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium select-none transition-colors";

  if (block.type === "field") {
    return (
      <span
        onClick={onClick}
        className={`${base} bg-accent/10 text-accent border border-accent/20 ${
          onClick ? "cursor-pointer hover:bg-accent/20" : ""
        } ${isDragging ? "shadow-lg ring-2 ring-accent/30" : ""}`}
      >
        <Variable className="w-3 h-3" />
        {block.label || block.value}
      </span>
    );
  }

  if (block.type === "lookup") {
    return (
      <span
        className={`${base} bg-primary/10 text-primary border border-primary/20 ${isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}`}
        title={block.value}
      >
        <TableIcon className="w-3 h-3" />
        {block.label || block.value}
      </span>
    );
  }

  if (block.type === "func") {
    return (
      <span
        className={`${base} bg-chart-3/10 text-chart-3 border border-chart-3/20 font-bold ${isDragging ? "shadow-lg ring-2 ring-chart-3/30" : ""}`}
      >
        <Calculator className="w-3 h-3" />
        {block.value}
      </span>
    );
  }

  if (block.type === "operator") {
    const displayMap: Record<string, string> = { "*": "×", "/": "÷", ">=": "≥", "<=": "≤", "==": "=", "!=": "≠" };
    return (
      <span className={`${base} bg-muted text-foreground font-bold text-sm ${isDragging ? "shadow-lg" : ""}`}>
        {displayMap[block.value] || block.value}
      </span>
    );
  }

  if (block.type === "paren") {
    return (
      <span className={`${base} bg-transparent text-foreground font-bold text-lg ${isDragging ? "shadow-lg" : ""}`}>
        {block.value}
      </span>
    );
  }

  // constant
  return (
    <span className={`${base} bg-secondary/50 text-secondary-foreground border border-secondary/30 font-mono ${isDragging ? "shadow-lg" : ""}`}>
      {block.value}
    </span>
  );
}
