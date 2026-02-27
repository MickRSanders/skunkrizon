import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight, Plus, Database, Link2, Loader2, CheckCircle2,
  AlertTriangle, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useFieldMappings, useUpsertFieldMapping } from "@/hooks/useDocuments";

const SOURCE_FIELDS = [
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "job_title", label: "Job Title" },
  { value: "job_grade", label: "Job Grade / Level" },
  { value: "division", label: "Division / Department" },
  { value: "base_salary", label: "Base Salary" },
  { value: "currency", label: "Currency" },
  { value: "bonus_percent", label: "Bonus %" },
  { value: "bonus_amount", label: "Bonus Amount" },
  { value: "city", label: "City" },
  { value: "country", label: "Country" },
  { value: "date_of_birth", label: "Date of Birth" },
  { value: "hire_date", label: "Hire Date" },
  { value: "status", label: "Employment Status" },
  { value: "phone", label: "Phone" },
];

const TARGET_FIELDS = [
  { value: "employee_name", label: "Scenario Name / Employee Name" },
  { value: "base_salary", label: "Base Salary" },
  { value: "currency", label: "Currency" },
  { value: "origin_country", label: "Origin Country" },
  { value: "origin_city", label: "Origin City" },
  { value: "job_title", label: "Job Title" },
  { value: "department", label: "Department" },
  { value: "grade", label: "Grade / Level" },
];

export default function FieldMappings() {
  const { data: mappings, isLoading } = useFieldMappings();
  const upsertMapping = useUpsertFieldMapping();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ source_field: "", target_field: "", fallback_value: "", is_required: false, transform_rule: "" });

  const handleSave = async () => {
    if (!form.source_field || !form.target_field) return;
    try {
      await upsertMapping.mutateAsync({
        source_system: "employee_directory",
        source_field: form.source_field,
        target_field: form.target_field,
        fallback_value: form.fallback_value || undefined,
        is_required: form.is_required,
        transform_rule: form.transform_rule || undefined,
      });
      setShowAdd(false);
      setForm({ source_field: "", target_field: "", fallback_value: "", is_required: false, transform_rule: "" });
      toast.success("Field mapping created");
    } catch (err: any) {
      toast.error(err.message || "Failed to save mapping");
    }
  };

  const mappedTargets = new Set((mappings ?? []).map((m: any) => m.target_field));
  const unmappedTargets = TARGET_FIELDS.filter((t) => !mappedTargets.has(t.value));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/60 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--accent)/0.15),transparent_70%)]" />
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">Person Profile Integration</h1>
            <p className="text-primary-foreground/70 mt-2 max-w-lg text-sm">
              Map employee profile fields to simulation inputs. When an employee is selected, their data auto-populates the projection.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-primary-foreground">{mappings?.length ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-primary-foreground/50">Mapped</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-primary-foreground">{unmappedTargets.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-primary-foreground/50">Unmapped</p>
                </div>
              </div>
            </div>
          </div>
          <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Mapping
          </Button>
        </div>
      </div>

      {/* Current source */}
      <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
        <Database className="w-5 h-5 text-accent" />
        <div>
          <p className="text-sm font-medium text-foreground">Source: Employee Directory</p>
          <p className="text-xs text-muted-foreground">Using internal employee records as interim data source. External API integration can be configured later.</p>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">Active</Badge>
      </div>

      {/* Mappings */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="space-y-4">
          {/* Active Mappings */}
          {mappings && mappings.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-muted/30">
                <h3 className="text-sm font-bold text-foreground">Active Mappings</h3>
              </div>
              <div className="divide-y divide-border/50">
                {mappings.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="secondary" className="text-xs font-mono">{m.source_field}</Badge>
                      <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                      <Badge className="text-xs font-mono bg-accent/10 text-accent">{m.target_field}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                      {m.fallback_value && <Badge variant="outline" className="text-[10px]">Fallback: {m.fallback_value}</Badge>}
                      {m.transform_rule && (
                        <span title={m.transform_rule}><Settings2 className="w-3.5 h-3.5 text-muted-foreground" /></span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "MMM d")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unmapped targets */}
          {unmappedTargets.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-warning/5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Unmapped Simulation Fields
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">These fields will use manual entry or fallback values.</p>
              </div>
              <div className="divide-y divide-border/50">
                {unmappedTargets.map((t) => (
                  <div key={t.value} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-warning/50" />
                      <span className="text-sm text-foreground">{t.label}</span>
                      <span className="text-xs font-mono text-muted-foreground">({t.value})</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setForm({ ...form, target_field: t.value }); setShowAdd(true); }}>
                      Map Field
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!mappings || mappings.length === 0) && unmappedTargets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 className="w-16 h-16 text-accent/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">All fields mapped!</h3>
            </div>
          )}
        </div>
      )}

      {/* Add Mapping Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Field Mapping</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Source Field (Employee) *</Label>
                <Select value={form.source_field} onValueChange={(v) => setForm({ ...form, source_field: v })}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Target Field (Simulation) *</Label>
                <Select value={form.target_field} onValueChange={(v) => setForm({ ...form, target_field: v })}>
                  <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
                  <SelectContent>
                    {TARGET_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fallback Value</Label>
              <Input value={form.fallback_value} onChange={(e) => setForm({ ...form, fallback_value: e.target.value })} placeholder="Value when source is empty" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Transform Rule</Label>
              <Input value={form.transform_rule} onChange={(e) => setForm({ ...form, transform_rule: e.target.value })} placeholder='e.g. CONCAT(first_name, " ", last_name)' />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Required Field</p>
                <p className="text-xs text-muted-foreground">Simulation cannot run without this field</p>
              </div>
              <Switch checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" disabled={!form.source_field || !form.target_field || upsertMapping.isPending} onClick={handleSave}>
              {upsertMapping.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
