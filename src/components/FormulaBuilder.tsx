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
} from "lucide-react";
import type { CalculationField } from "@/hooks/useCalculations";

// ─── Types ────────────────────────────────────────────────────

export interface FormulaBlock {
  id: string;
  type: "field" | "operator" | "constant" | "paren";
  value: string;
  fieldId?: string; // links to calculation_field
  label?: string;
}

const OPERATORS = [
  { value: "+", label: "+" },
  { value: "-", label: "−" },
  { value: "*", label: "×" },
  { value: "/", label: "÷" },
  { value: "(", label: "(" },
  { value: ")", label: ")" },
];

interface FormulaBuilderProps {
  blocks: FormulaBlock[];
  onChange: (blocks: FormulaBlock[]) => void;
  fields: CalculationField[];
  onAddField: () => void;
  onEditField: (field: CalculationField) => void;
}

export default function FormulaBuilder({
  blocks,
  onChange,
  fields,
  onAddField,
  onEditField,
}: FormulaBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const addBlock = (type: FormulaBlock["type"], value: string, fieldId?: string, label?: string) => {
    onChange([
      ...blocks,
      { id: crypto.randomUUID(), type, value, fieldId, label },
    ]);
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const activeBlock = blocks.find((b) => b.id === activeId);

  // Build formula string preview
  const formulaPreview = blocks
    .map((b) => (b.type === "field" ? b.label || b.value : b.value))
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

      {/* Operator Palette */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Operators</Label>
        <div className="flex gap-2">
          {OPERATORS.map((op) => (
            <button
              key={op.value}
              onClick={() => addBlock(op.value === "(" || op.value === ")" ? "paren" : "operator", op.value)}
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
      </div>

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

  if (block.type === "operator") {
    return (
      <span className={`${base} bg-muted text-foreground font-bold text-sm ${isDragging ? "shadow-lg" : ""}`}>
        {block.value === "*" ? "×" : block.value === "/" ? "÷" : block.value}
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
