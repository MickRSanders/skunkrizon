import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus, Trash2, GripVertical, Type, AlignLeft, List, BarChart3,
  User, Table2, Database, ChevronDown, ChevronRight, Bold, Italic,
  Underline, DollarSign, Calendar, Hash, Percent, Code2, Move,
  Search, Eye, EyeOff,
} from "lucide-react";
import type { PlaceholderMapping } from "@/components/DocumentTemplateFieldEditor";

// ─── Types ──────────────────────────────────────────────────
interface TemplateSection {
  type: "heading" | "paragraph" | "section" | "benefit_row";
  text?: string;
  title?: string;
  fields?: string[];
  label?: string;
  calc_method?: string;
  amount?: string;
  taxable?: string;
}

interface PreviewData {
  id: string;
  label: string;
  values: Record<string, any>;
}

interface Props {
  content: TemplateSection[];
  placeholders: PlaceholderMapping[];
  onContentChange: (content: TemplateSection[]) => void;
  onPlaceholdersChange: (placeholders: PlaceholderMapping[]) => void;
  lookupTables?: { id: string; name: string; columns: { name: string }[] }[];
  previewDataSources?: PreviewData[];
}

// ─── Available fields for drag/drop ─────────────────────────
const SIMULATION_FIELDS = [
  { value: "employee_name", label: "Employee Name", icon: User },
  { value: "origin_country", label: "Origin Country", icon: BarChart3 },
  { value: "origin_city", label: "Origin City", icon: BarChart3 },
  { value: "destination_country", label: "Destination Country", icon: BarChart3 },
  { value: "destination_city", label: "Destination City", icon: BarChart3 },
  { value: "assignment_type", label: "Assignment Type", icon: BarChart3 },
  { value: "duration_months", label: "Duration (Months)", icon: Hash },
  { value: "start_date", label: "Start Date", icon: Calendar },
  { value: "base_salary", label: "Base Salary", icon: DollarSign },
  { value: "currency", label: "Currency", icon: DollarSign },
  { value: "cola_percent", label: "COLA %", icon: Percent },
  { value: "housing_cap", label: "Housing Cap", icon: DollarSign },
  { value: "relocation_lump_sum", label: "Relocation Lump Sum", icon: DollarSign },
  { value: "department", label: "Department", icon: BarChart3 },
  { value: "grade", label: "Grade", icon: BarChart3 },
  { value: "job_title", label: "Job Title", icon: BarChart3 },
  { value: "tax_approach", label: "Tax Approach", icon: BarChart3 },
  { value: "total_cost", label: "Total Cost", icon: DollarSign },
  { value: "sim_code", label: "Simulation Code", icon: Hash },
];

const EMPLOYEE_FIELDS = [
  { value: "first_name", label: "First Name", icon: User },
  { value: "last_name", label: "Last Name", icon: User },
  { value: "email", label: "Email", icon: User },
  { value: "phone", label: "Phone", icon: User },
  { value: "employee_code", label: "Employee Code", icon: Hash },
  { value: "job_title", label: "Job Title", icon: User },
  { value: "job_grade", label: "Job Grade", icon: User },
  { value: "division", label: "Division", icon: User },
  { value: "base_salary", label: "Base Salary", icon: DollarSign },
  { value: "currency", label: "Currency", icon: DollarSign },
  { value: "date_of_birth", label: "Date of Birth", icon: Calendar },
  { value: "hire_date", label: "Hire Date", icon: Calendar },
  { value: "city", label: "City", icon: User },
  { value: "country", label: "Country", icon: User },
];

const FORMAT_OPTIONS = [
  { value: "none", label: "No format" },
  { value: "currency", label: "Currency ($1,234)" },
  { value: "percent", label: "Percentage (12%)" },
  { value: "date", label: "Date (Jan 1, 2025)" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "capitalize", label: "Capitalize" },
  { value: "number", label: "Number (1,234)" },
];

const SOURCE_COLORS: Record<string, string> = {
  simulation: "bg-accent/15 text-accent border-accent/30 hover:bg-accent/25",
  employee: "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25",
  lookup_table: "bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/25",
  static: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
};

const SOURCE_DRAG_COLORS: Record<string, string> = {
  simulation: "border-accent/40 bg-accent/5",
  employee: "border-primary/40 bg-primary/5",
};

// ─── Format a value for preview ─────────────────────────────
function formatPreviewValue(value: any, format?: string): string {
  if (value === null || value === undefined) return "—";
  const str = String(value);
  if (!format || format === "none") return str;
  if (format === "currency") {
    const num = Number(value);
    return isNaN(num) ? str : num.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  if (format === "percent") {
    const num = Number(value);
    return isNaN(num) ? str : `${num}%`;
  }
  if (format === "date") {
    try {
      return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch { return str; }
  }
  if (format === "uppercase") return str.toUpperCase();
  if (format === "capitalize") return str.replace(/\b\w/g, (c) => c.toUpperCase());
  if (format === "number") {
    const num = Number(value);
    return isNaN(num) ? str : num.toLocaleString("en-US");
  }
  return str;
}

// ─── Component ──────────────────────────────────────────────
export default function VisualTemplateEditor({
  content,
  placeholders,
  onContentChange,
  onPlaceholdersChange,
  lookupTables = [],
  previewDataSources = [],
}: Props) {
  const [expandedPalette, setExpandedPalette] = useState<string | null>("simulation");
  const [draggedField, setDraggedField] = useState<{ value: string; source: string } | null>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null);
  const [fieldSearch, setFieldSearch] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>("");
  const documentRef = useRef<HTMLDivElement>(null);

  // Get preview data values
  const previewValues = useMemo(() => {
    if (!previewMode || !selectedPreviewId) return null;
    return previewDataSources.find((d) => d.id === selectedPreviewId)?.values ?? null;
  }, [previewMode, selectedPreviewId, previewDataSources]);

  // Filter fields by search
  const filteredSimFields = useMemo(() => {
    if (!fieldSearch) return SIMULATION_FIELDS;
    const q = fieldSearch.toLowerCase();
    return SIMULATION_FIELDS.filter((f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q));
  }, [fieldSearch]);

  const filteredEmpFields = useMemo(() => {
    if (!fieldSearch) return EMPLOYEE_FIELDS;
    const q = fieldSearch.toLowerCase();
    return EMPLOYEE_FIELDS.filter((f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q));
  }, [fieldSearch]);

  // ─── Section CRUD ───────────────────────────────────────
  const updateSection = (index: number, updates: Partial<TemplateSection>) => {
    const updated = [...content];
    updated[index] = { ...updated[index], ...updates };
    onContentChange(updated);
  };

  const removeSection = (index: number) => {
    onContentChange(content.filter((_, i) => i !== index));
  };

  const addSection = (type: TemplateSection["type"], afterIndex?: number) => {
    const newSection: TemplateSection = type === "heading"
      ? { type: "heading", text: "New Heading" }
      : type === "section"
        ? { type: "section", title: "New Section", fields: [] }
        : type === "benefit_row"
          ? { type: "benefit_row", label: "New Benefit", calc_method: "", amount: "", taxable: "N/A" }
          : { type: "paragraph", text: "New paragraph text..." };

    const updated = [...content];
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : updated.length;
    updated.splice(insertAt, 0, newSection);
    onContentChange(updated);
    setEditingSection(insertAt);
  };

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= content.length) return;
    const updated = [...content];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onContentChange(updated);
  };

  // ─── Placeholder insertion ──────────────────────────────
  const insertPlaceholderIntoText = (sectionIndex: number, fieldValue: string, source: string) => {
    const key = fieldValue;
    const section = content[sectionIndex];
    const textField = section.text || section.title || "";
    const updatedText = textField + ` {{${key}}}`;

    if (section.type === "section") {
      updateSection(sectionIndex, { title: updatedText });
    } else {
      updateSection(sectionIndex, { text: updatedText });
    }

    if (!placeholders.some((p) => p.key === key)) {
      onPlaceholdersChange([
        ...placeholders,
        { key, source: source as PlaceholderMapping["source"], field: fieldValue },
      ]);
    }
  };

  // ─── Drag handlers ─────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, field: { value: string }, source: string) => {
    setDraggedField({ value: field.value, source });
    e.dataTransfer.setData("text/plain", `{{${field.value}}}`);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e: React.DragEvent, sectionIndex: number) => {
    e.preventDefault();
    if (draggedField) {
      insertPlaceholderIntoText(sectionIndex, draggedField.value, draggedField.source);
    }
    setDraggedField(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // ─── Update placeholder ────────────────────────────────
  const updatePlaceholderFormat = (key: string, format: string) => {
    const updated = placeholders.map((p) =>
      p.key === key ? { ...p, format: format === "none" ? undefined : format } : p
    );
    onPlaceholdersChange(updated);
  };

  const updatePlaceholderSource = (key: string, source: PlaceholderMapping["source"]) => {
    const updated = placeholders.map((p) =>
      p.key === key ? { ...p, source, field: source === "static" ? p.static_value || "" : "" } : p
    );
    onPlaceholdersChange(updated);
  };

  const updatePlaceholderField = (key: string, field: string) => {
    const updated = placeholders.map((p) =>
      p.key === key ? { ...p, field } : p
    );
    onPlaceholdersChange(updated);
  };

  const removePlaceholder = (key: string) => {
    onPlaceholdersChange(placeholders.filter((p) => p.key !== key));
  };

  // ─── Resolve placeholder to preview value or token ─────
  const resolveValue = (key: string): string | null => {
    if (!previewValues) return null;
    const mapping = placeholders.find((p) => p.key === key);
    const fieldName = mapping?.field || key;
    const val = previewValues[fieldName];
    return val !== undefined ? formatPreviewValue(val, mapping?.format) : null;
  };

  // ─── Render placeholder token ──────────────────────────
  const renderPlaceholderToken = (key: string) => {
    // In preview mode, show resolved value
    if (previewMode) {
      const resolved = resolveValue(key);
      if (resolved !== null) {
        return (
          <span key={key} className="font-semibold text-foreground underline decoration-accent/40 decoration-dotted underline-offset-2">
            {resolved}
          </span>
        );
      }
      return (
        <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border border-dashed border-destructive/40 bg-destructive/5 text-destructive mx-0.5">
          <Code2 className="w-3 h-3" />
          {key} (no data)
        </span>
      );
    }

    const mapping = placeholders.find((p) => p.key === key);
    const source = mapping?.source || "simulation";
    const colorClass = SOURCE_COLORS[source] || SOURCE_COLORS.simulation;

    return (
      <Popover key={key}>
        <PopoverTrigger asChild>
          <button
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-all cursor-pointer mx-0.5 ${colorClass} ${selectedPlaceholder === key ? "ring-2 ring-ring ring-offset-1" : ""}`}
            onClick={() => setSelectedPlaceholder(key)}
          >
            <Code2 className="w-3 h-3" />
            {key}
            {mapping?.format && (
              <span className="text-[9px] opacity-70 ml-0.5">({mapping.format})</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-3" align="start">
          <div className="text-xs font-semibold text-foreground">Configure: {`{{${key}}}`}</div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Source</label>
            <Select value={source} onValueChange={(v) => updatePlaceholderSource(key, v as PlaceholderMapping["source"])}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="simulation">Simulation</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="lookup_table">Lookup Table</SelectItem>
                <SelectItem value="static">Static Value</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {source !== "static" && source !== "lookup_table" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Field</label>
              <Select value={mapping?.field || ""} onValueChange={(v) => updatePlaceholderField(key, v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field..." /></SelectTrigger>
                <SelectContent>
                  {(source === "simulation" ? SIMULATION_FIELDS : EMPLOYEE_FIELDS).map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {source === "lookup_table" && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Lookup Table</label>
                <Select value={mapping?.lookup_table_id || ""} onValueChange={(v) => {
                  const updated = placeholders.map((p) => p.key === key ? { ...p, lookup_table_id: v, field: v } : p);
                  onPlaceholdersChange(updated);
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select table..." /></SelectTrigger>
                  <SelectContent>
                    {lookupTables.map((lt) => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Column</label>
                <Select value={mapping?.lookup_column || ""} onValueChange={(v) => {
                  const updated = placeholders.map((p) => p.key === key ? { ...p, lookup_column: v } : p);
                  onPlaceholdersChange(updated);
                }} disabled={!mapping?.lookup_table_id}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select column..." /></SelectTrigger>
                  <SelectContent>
                    {mapping?.lookup_table_id && lookupTables.find((t) => t.id === mapping.lookup_table_id)?.columns.map((col) => (
                      <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {source === "static" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Value</label>
              <Input
                value={mapping?.static_value || ""}
                onChange={(e) => {
                  const updated = placeholders.map((p) => p.key === key ? { ...p, static_value: e.target.value, field: e.target.value } : p);
                  onPlaceholdersChange(updated);
                }}
                className="h-8 text-xs"
                placeholder="Enter value..."
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Format</label>
            <Select value={mapping?.format || "none"} onValueChange={(v) => updatePlaceholderFormat(key, v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="destructive" size="sm" className="w-full text-xs h-7" onClick={() => removePlaceholder(key)}>
            <Trash2 className="w-3 h-3 mr-1" /> Remove Placeholder
          </Button>
        </PopoverContent>
      </Popover>
    );
  };

  // ─── Render text with inline placeholders ──────────────
  const renderTextWithPlaceholders = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/^\{\{([^}]+)\}\}$/);
      if (match) {
        return renderPlaceholderToken(match[1]);
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ─── Render section ────────────────────────────────────
  const renderSection = (section: TemplateSection, index: number) => {
    const isEditing = editingSection === index && !previewMode;
    const isDragTarget = !!draggedField;

    return (
      <div
        key={index}
        className={`group relative rounded-lg border transition-all ${
          isDragTarget ? "border-dashed border-accent/50 bg-accent/5" : "border-transparent hover:border-border"
        } ${isEditing ? "border-accent/30 bg-accent/5" : ""}`}
        onDrop={(e) => !previewMode && handleDrop(e, index)}
        onDragOver={!previewMode ? handleDragOver : undefined}
      >
        {/* Section toolbar - hidden in preview */}
        {!previewMode && (
          <>
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5">
              <button className="p-1 rounded hover:bg-muted text-muted-foreground" onClick={() => moveSection(index, index - 1)} title="Move up">
                <ChevronDown className="w-3.5 h-3.5 rotate-180" />
              </button>
              <button className="p-1 text-muted-foreground cursor-grab" title="Drag to reorder">
                <GripVertical className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded hover:bg-muted text-muted-foreground" onClick={() => moveSection(index, index + 1)} title="Move down">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="absolute -right-9 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5">
              <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => setEditingSection(isEditing ? null : index)} title="Edit">
                <Type className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" onClick={() => removeSection(index)} title="Remove">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        <div className="px-4 py-2">
          {section.type === "heading" && (
            isEditing ? (
              <Input
                value={section.text || ""}
                onChange={(e) => updateSection(index, { text: e.target.value })}
                className="text-xl font-bold border-none shadow-none px-0 focus-visible:ring-0"
                onBlur={() => setEditingSection(null)}
                autoFocus
              />
            ) : (
              <h2
                className="text-xl font-bold text-foreground cursor-text"
                onClick={() => !previewMode && setEditingSection(index)}
              >
                {renderTextWithPlaceholders(section.text || "Untitled")}
              </h2>
            )
          )}

          {section.type === "paragraph" && (
            isEditing ? (
              <Textarea
                value={section.text || ""}
                onChange={(e) => updateSection(index, { text: e.target.value })}
                className="text-sm border-none shadow-none px-0 resize-none focus-visible:ring-0 min-h-[60px]"
                onBlur={() => setEditingSection(null)}
                autoFocus
              />
            ) : (
              <p
                className="text-sm text-foreground/80 leading-relaxed cursor-text whitespace-pre-wrap"
                onClick={() => !previewMode && setEditingSection(index)}
              >
                {renderTextWithPlaceholders(section.text || "Click to edit...")}
              </p>
            )
          )}

          {section.type === "section" && (
            <div className="space-y-2">
              {isEditing ? (
                <Input
                  value={section.title || ""}
                  onChange={(e) => updateSection(index, { title: e.target.value })}
                  className="text-base font-semibold border-none shadow-none px-0 focus-visible:ring-0"
                  onBlur={() => setEditingSection(null)}
                  autoFocus
                />
              ) : (
                <h3
                  className="text-base font-semibold text-foreground border-b border-border/50 pb-1 cursor-text"
                  onClick={() => !previewMode && setEditingSection(index)}
                >
                  {renderTextWithPlaceholders(section.title || "Section")}
                </h3>
              )}
              {section.fields && section.fields.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-2">
                  {section.fields.map((field) => renderPlaceholderToken(field))}
                </div>
              )}
              {section.text && (
                <p className="text-sm text-foreground/70 pl-2">
                  {renderTextWithPlaceholders(section.text)}
                </p>
              )}
            </div>
          )}

          {section.type === "benefit_row" && (
            <div className="flex items-center gap-4 px-3 py-2 bg-muted/30 rounded-md border border-border/50">
              {isEditing ? (
                <div className="flex-1 grid grid-cols-4 gap-2">
                  <Input value={section.label || ""} onChange={(e) => updateSection(index, { label: e.target.value })} placeholder="Benefit name" className="h-7 text-xs" />
                  <Input value={section.calc_method || ""} onChange={(e) => updateSection(index, { calc_method: e.target.value })} placeholder="Calc method" className="h-7 text-xs" />
                  <Input value={section.amount || ""} onChange={(e) => updateSection(index, { amount: e.target.value })} placeholder="Amount" className="h-7 text-xs" />
                  <Select value={section.taxable || "N/A"} onValueChange={(v) => updateSection(index, { taxable: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Taxable</SelectItem>
                      <SelectItem value="No">Non-taxable</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div
                  className="flex-1 flex items-center justify-between cursor-text"
                  onClick={() => !previewMode && setEditingSection(index)}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{section.label || "Benefit"}</span>
                    {section.calc_method && (
                      <span className="text-xs text-muted-foreground italic">({section.calc_method})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {section.amount && (
                      <span className="text-sm font-mono text-foreground">{renderTextWithPlaceholders(section.amount)}</span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {section.taxable === "Yes" ? "Taxable" : section.taxable === "No" ? "Non-taxable" : "N/A"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Insert buttons between sections - hidden in preview */}
        {!previewMode && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-medium shadow-sm hover:shadow-md transition-shadow">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1.5" align="center">
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors" onClick={() => addSection("heading", index)}>
                  <Type className="w-3.5 h-3.5" /> Heading
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors" onClick={() => addSection("paragraph", index)}>
                  <AlignLeft className="w-3.5 h-3.5" /> Paragraph
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors" onClick={() => addSection("section", index)}>
                  <List className="w-3.5 h-3.5" /> Section
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors" onClick={() => addSection("benefit_row", index)}>
                  <DollarSign className="w-3.5 h-3.5" /> Benefit Row
                </button>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    );
  };

  // ─── Field palette category ────────────────────────────
  const renderPaletteCategory = (
    id: string,
    label: string,
    icon: React.ReactNode,
    fields: { value: string; label: string; icon: any }[],
    source: string,
  ) => {
    const isOpen = expandedPalette === id;
    if (fields.length === 0 && fieldSearch) return null;
    return (
      <div key={id} className="border-b border-border/50 last:border-0">
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
          onClick={() => setExpandedPalette(isOpen ? null : id)}
        >
          {icon}
          <span className="flex-1 text-left">{label}</span>
          <span className="text-[10px] text-muted-foreground mr-1">{fields.length}</span>
          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
        </button>
        {isOpen && (
          <div className="px-2 pb-2 space-y-0.5">
            {fields.map((f) => {
              const alreadyUsed = placeholders.some((p) => p.key === f.value);
              return (
                <div
                  key={f.value}
                  draggable
                  onDragStart={(e) => handleDragStart(e, f, source)}
                  onDragEnd={() => setDraggedField(null)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-grab active:cursor-grabbing transition-colors ${
                    alreadyUsed
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "hover:bg-muted text-foreground/70 border border-transparent"
                  }`}
                >
                  <Move className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{f.label}</span>
                  {alreadyUsed && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* ─── Document Preview ────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <AlignLeft className="w-3.5 h-3.5" />
          {previewMode ? "Document Preview" : "Document Editor"}
          <span className="text-[10px] text-muted-foreground/60 ml-auto">
            {previewMode ? "Showing live data" : "Click to edit · Drag fields from palette"}
          </span>
        </div>

        {/* Preview mode banner */}
        {previewMode && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent/5 text-xs">
            <Eye className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="text-muted-foreground">Preview with:</span>
            <Select value={selectedPreviewId} onValueChange={setSelectedPreviewId}>
              <SelectTrigger className="h-7 text-xs flex-1 max-w-xs">
                <SelectValue placeholder="Select a cost estimate..." />
              </SelectTrigger>
              <SelectContent>
                {previewDataSources.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id}>{ds.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div
          ref={documentRef}
          className={`bg-card border border-border rounded-xl p-8 space-y-1 shadow-sm relative min-h-[350px] ${previewMode ? "ring-2 ring-accent/20" : ""}`}
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {content.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Type className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Empty document</p>
              <p className="text-xs text-muted-foreground mb-4">Add sections to build your template</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => addSection("heading")}>
                  <Type className="w-3 h-3 mr-1" /> Add Heading
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => addSection("paragraph")}>
                  <AlignLeft className="w-3 h-3 mr-1" /> Add Paragraph
                </Button>
              </div>
            </div>
          ) : (
            content.map((section, index) => renderSection(section, index))
          )}
        </div>
      </div>

      {/* ─── Field Palette Sidebar ───────────────────────── */}
      <div className="w-56 shrink-0">
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <Database className="w-3.5 h-3.5" />
          Field Palette
          {/* Preview toggle */}
          {previewDataSources.length > 0 && (
            <button
              className={`ml-auto p-1 rounded transition-colors ${previewMode ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              onClick={() => {
                setPreviewMode(!previewMode);
                if (!previewMode && previewDataSources.length > 0 && !selectedPreviewId) {
                  setSelectedPreviewId(previewDataSources[0].id);
                }
              }}
              title={previewMode ? "Exit preview" : "Preview with data"}
            >
              {previewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-4">
          {/* Search input */}
          <div className="px-2 pt-2 pb-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search fields..."
                className="w-full h-7 pl-7 pr-2 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>
          </div>

          {renderPaletteCategory(
            "simulation",
            "Simulation",
            <BarChart3 className="w-3.5 h-3.5 text-accent" />,
            filteredSimFields,
            "simulation",
          )}
          {renderPaletteCategory(
            "employee",
            "Employee",
            <User className="w-3.5 h-3.5 text-primary" />,
            filteredEmpFields,
            "employee",
          )}
          {lookupTables.length > 0 && (
            <div className="border-b border-border/50 last:border-0">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedPalette(expandedPalette === "lookup" ? null : "lookup")}
              >
                <Table2 className="w-3.5 h-3.5 text-orange-500" />
                <span className="flex-1 text-left">Lookup Tables</span>
                <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expandedPalette === "lookup" ? "rotate-90" : ""}`} />
              </button>
              {expandedPalette === "lookup" && (
                <div className="px-2 pb-2 space-y-1">
                  {lookupTables.map((lt) => (
                    <div key={lt.id} className="text-xs text-foreground/70 px-2 py-1 rounded hover:bg-muted">
                      <Table2 className="w-3 h-3 inline mr-1.5" />
                      {lt.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Placeholder summary */}
          {placeholders.length > 0 && (
            <div className="px-3 py-2 border-t border-border/50">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Active ({placeholders.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {placeholders.map((p) => (
                  <button
                    key={p.key}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${SOURCE_COLORS[p.source]}`}
                    onClick={() => setSelectedPlaceholder(p.key)}
                    title={`${p.source}: ${p.field}`}
                  >
                    {p.key}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
