import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, GripVertical, Database, User, BarChart3, Table2, Sparkles, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Available data source fields ───────────────────────────
const SIMULATION_FIELDS = [
  { value: "employee_name", label: "Employee Name" },
  { value: "origin_country", label: "Origin Country" },
  { value: "origin_city", label: "Origin City" },
  { value: "destination_country", label: "Destination Country" },
  { value: "destination_city", label: "Destination City" },
  { value: "assignment_type", label: "Assignment Type" },
  { value: "duration_months", label: "Duration (Months)" },
  { value: "start_date", label: "Start Date" },
  { value: "base_salary", label: "Base Salary" },
  { value: "currency", label: "Currency" },
  { value: "cola_percent", label: "COLA %" },
  { value: "housing_cap", label: "Housing Cap" },
  { value: "relocation_lump_sum", label: "Relocation Lump Sum" },
  { value: "department", label: "Department" },
  { value: "grade", label: "Grade" },
  { value: "job_title", label: "Job Title" },
  { value: "tax_approach", label: "Tax Approach" },
  { value: "total_cost", label: "Total Cost" },
  { value: "sim_code", label: "Simulation Code" },
  { value: "status", label: "Status" },
  { value: "notes", label: "Notes" },
];

const EMPLOYEE_FIELDS = [
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "employee_code", label: "Employee Code" },
  { value: "job_title", label: "Job Title" },
  { value: "job_grade", label: "Job Grade" },
  { value: "division", label: "Division" },
  { value: "base_salary", label: "Base Salary" },
  { value: "currency", label: "Currency" },
  { value: "bonus_percent", label: "Bonus %" },
  { value: "bonus_amount", label: "Bonus Amount" },
  { value: "date_of_birth", label: "Date of Birth" },
  { value: "hire_date", label: "Hire Date" },
  { value: "city", label: "City" },
  { value: "country", label: "Country" },
  { value: "state_province", label: "State/Province" },
  { value: "address_line1", label: "Address Line 1" },
  { value: "address_line2", label: "Address Line 2" },
  { value: "postal_code", label: "Postal Code" },
  { value: "status", label: "Status" },
];

export interface PlaceholderMapping {
  key: string;
  source: "simulation" | "employee" | "lookup_table" | "static";
  field: string;
  lookup_table_id?: string;
  lookup_column?: string;
  static_value?: string;
  format?: string;
}

interface LookupTableOption {
  id: string;
  name: string;
  columns: { name: string }[];
}

interface Props {
  placeholders: PlaceholderMapping[];
  onChange: (placeholders: PlaceholderMapping[]) => void;
  lookupTables?: LookupTableOption[];
  templateContent?: any[];
  onAutoDetect?: () => void;
}

const SOURCE_ICONS: Record<string, any> = {
  simulation: BarChart3,
  employee: User,
  lookup_table: Table2,
  static: Database,
};

const SOURCE_LABELS: Record<string, string> = {
  simulation: "Simulation",
  employee: "Employee",
  lookup_table: "Lookup Table",
  static: "Static Value",
};

const SOURCE_COLORS: Record<string, string> = {
  simulation: "bg-accent/10 text-accent border-accent/20",
  employee: "bg-primary/10 text-primary border-primary/20",
  lookup_table: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  static: "bg-muted text-muted-foreground border-border",
};

export default function DocumentTemplateFieldEditor({
  placeholders,
  onChange,
  lookupTables = [],
  templateContent,
  onAutoDetect,
}: Props) {
  const [aiDetecting, setAiDetecting] = useState(false);

  const addPlaceholder = () => {
    onChange([...placeholders, { key: "", source: "simulation", field: "" }]);
  };

  const removePlaceholder = (index: number) => {
    onChange(placeholders.filter((_, i) => i !== index));
  };

  const updatePlaceholder = (index: number, updates: Partial<PlaceholderMapping>) => {
    const updated = [...placeholders];
    updated[index] = { ...updated[index], ...updates };
    // Reset dependent fields when source changes
    if (updates.source && updates.source !== placeholders[index].source) {
      updated[index].field = "";
      updated[index].lookup_table_id = undefined;
      updated[index].lookup_column = undefined;
      updated[index].static_value = undefined;
    }
    onChange(updated);
  };

  const getFieldOptions = (source: string) => {
    if (source === "simulation") return SIMULATION_FIELDS;
    if (source === "employee") return EMPLOYEE_FIELDS;
    return [];
  };

  const getLookupColumns = (tableId: string) => {
    const table = lookupTables.find((t) => t.id === tableId);
    return table?.columns ?? [];
  };

  // Detect placeholders from template content using pattern {{key}}
  const autoDetectPlaceholders = () => {
    if (!templateContent) return;
    const contentStr = JSON.stringify(templateContent);
    const matches = contentStr.match(/\{\{(\w+)\}\}/g);
    if (!matches) {
      toast.info("No {{placeholder}} patterns found in template content");
      return;
    }
    const keys = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
    const existingKeys = new Set(placeholders.map((p) => p.key));
    const newPlaceholders = keys
      .filter((k) => !existingKeys.has(k))
      .map((key) => {
        // Try to auto-match source
        const simField = SIMULATION_FIELDS.find((f) => f.value === key);
        const empField = EMPLOYEE_FIELDS.find((f) => f.value === key);
        return {
          key,
          source: (simField ? "simulation" : empField ? "employee" : "simulation") as PlaceholderMapping["source"],
          field: simField?.value || empField?.value || "",
        };
      });

    if (newPlaceholders.length === 0) {
      toast.info("All detected placeholders are already mapped");
      return;
    }
    onChange([...placeholders, ...newPlaceholders]);
    toast.success(`Added ${newPlaceholders.length} placeholder(s) from template`);
  };

  // AI-powered detection
  const handleAiDetect = async () => {
    if (!templateContent) return;
    setAiDetecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("You must be logged in"); return; }

      const prompt = `Analyze this document template content and suggest placeholder mappings. The template has these sections: ${JSON.stringify(templateContent).slice(0, 2000)}

For each placeholder you find (in {{key}} format), determine the best data source:
- "simulation" for assignment/relocation data (salary, countries, dates, etc.)
- "employee" for personal employee data (name, email, address, etc.)
- "lookup_table" for rate/reference data
- "static" for fixed text values

Return ONLY a JSON array of objects with: { "key": "placeholder_key", "source": "simulation|employee|lookup_table|static", "field": "matching_field_name" }`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      if (!resp.ok) { toast.error("AI detection failed"); return; }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Extract text content from SSE stream
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.text) fullText += parsed.text;
              } catch { /* skip non-JSON lines */ }
            }
          }
        }
      }

      // Try to extract JSON array from response
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const detected: PlaceholderMapping[] = JSON.parse(jsonMatch[0]);
        const existingKeys = new Set(placeholders.map((p) => p.key));
        const newOnes = detected.filter((d) => d.key && !existingKeys.has(d.key));
        if (newOnes.length > 0) {
          onChange([...placeholders, ...newOnes]);
          toast.success(`AI detected ${newOnes.length} new placeholder(s)`);
        } else {
          toast.info("AI found no new placeholders to add");
        }
      } else {
        toast.info("AI couldn't detect structured placeholders");
      }
    } catch (err: any) {
      toast.error(err.message || "AI detection failed");
    } finally {
      setAiDetecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold text-foreground">Field Mappings</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Map template placeholders to data sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          {templateContent && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={autoDetectPlaceholders}
                className="gap-1.5 text-xs"
              >
                <Database className="w-3.5 h-3.5" />
                Auto-detect
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiDetect}
                disabled={aiDetecting}
                className="gap-1.5 text-xs"
              >
                {aiDetecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiDetecting ? "Detecting..." : "AI Detect"}
              </Button>
            </>
          )}
          <Button size="sm" onClick={addPlaceholder} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Field
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      {placeholders.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(["simulation", "employee", "lookup_table", "static"] as const).map((src) => {
            const count = placeholders.filter((p) => p.source === src).length;
            if (count === 0) return null;
            const Icon = SOURCE_ICONS[src];
            return (
              <Badge key={src} variant="outline" className={`text-[10px] gap-1 ${SOURCE_COLORS[src]}`}>
                <Icon className="w-3 h-3" />
                {count} {SOURCE_LABELS[src]}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Field rows */}
      {placeholders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No field mappings yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add fields manually or auto-detect from template content
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {placeholders.map((p, idx) => {
            const Icon = SOURCE_ICONS[p.source] || Database;
            return (
              <div
                key={idx}
                className="group flex items-start gap-2 p-3 rounded-lg border border-border bg-card hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center pt-1.5 text-muted-foreground">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Placeholder Key */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    {/* Key */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Placeholder Key
                      </label>
                      <Input
                        value={p.key}
                        onChange={(e) => updatePlaceholder(idx, { key: e.target.value })}
                        placeholder="e.g. employee_name"
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    {/* Source */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Data Source
                      </label>
                      <Select
                        value={p.source}
                        onValueChange={(v) => updatePlaceholder(idx, { source: v as PlaceholderMapping["source"] })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simulation">
                            <span className="flex items-center gap-1.5">
                              <BarChart3 className="w-3 h-3" /> Simulation
                            </span>
                          </SelectItem>
                          <SelectItem value="employee">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3 h-3" /> Employee
                            </span>
                          </SelectItem>
                          <SelectItem value="lookup_table">
                            <span className="flex items-center gap-1.5">
                              <Table2 className="w-3 h-3" /> Lookup Table
                            </span>
                          </SelectItem>
                          <SelectItem value="static">
                            <span className="flex items-center gap-1.5">
                              <Database className="w-3 h-3" /> Static Value
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Field / Value */}
                    {p.source === "static" ? (
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Static Value
                        </label>
                        <Input
                          value={p.static_value || ""}
                          onChange={(e) => updatePlaceholder(idx, { static_value: e.target.value, field: e.target.value })}
                          placeholder="Enter fixed value..."
                          className="h-8 text-xs"
                        />
                      </div>
                    ) : p.source === "lookup_table" ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Lookup Table
                          </label>
                          <Select
                            value={p.lookup_table_id || ""}
                            onValueChange={(v) => updatePlaceholder(idx, { lookup_table_id: v, field: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select table..." />
                            </SelectTrigger>
                            <SelectContent>
                              {lookupTables.map((lt) => (
                                <SelectItem key={lt.id} value={lt.id}>
                                  {lt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Column
                          </label>
                          <Select
                            value={p.lookup_column || ""}
                            onValueChange={(v) => updatePlaceholder(idx, { lookup_column: v })}
                            disabled={!p.lookup_table_id}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              {p.lookup_table_id &&
                                getLookupColumns(p.lookup_table_id).map((col) => (
                                  <SelectItem key={col.name} value={col.name}>
                                    {col.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Field
                        </label>
                        <Select
                          value={p.field}
                          onValueChange={(v) => updatePlaceholder(idx, { field: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getFieldOptions(p.source).map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[p.source]}`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {SOURCE_LABELS[p.source]}
                    </Badge>
                    {p.key && (
                      <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                        {"{{" + p.key + "}}"}
                      </code>
                    )}
                    {p.field && p.source !== "static" && (
                      <span className="text-[10px] text-muted-foreground">
                        → {p.source === "lookup_table"
                          ? `${lookupTables.find((t) => t.id === p.lookup_table_id)?.name || "?"}.${p.lookup_column || "?"}`
                          : getFieldOptions(p.source).find((f) => f.value === p.field)?.label || p.field}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removePlaceholder(idx)}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove mapping"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
