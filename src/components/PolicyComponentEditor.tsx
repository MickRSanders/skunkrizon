import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  GripVertical,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCalculations,
  useCreateCalculation,
  useCreateField,
  type Calculation,
} from "@/hooks/useCalculations";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

export type BenefitComponent = {
  name: string;
  type: string;
  taxable: string;
  calcMethod: string;
  amount: string;
  calculationId?: string | null;
};

const BENEFIT_TYPES = ["Allowance", "Benefit", "One-time", "Tax", "Deduction"];
const TAXABILITY_OPTIONS = ["Host only", "Both", "Non-taxable", "Home only", "N/A"];
const FIELD_TYPES = ["number", "text", "percentage", "currency", "boolean"];

interface PolicyComponentEditorProps {
  policyName: string;
  components: BenefitComponent[];
  onSave: (components: BenefitComponent[]) => Promise<void>;
  onClose: () => void;
}

export default function PolicyComponentEditor({
  policyName,
  components: initialComponents,
  onSave,
  onClose,
}: PolicyComponentEditorProps) {
  const { user } = useAuth();
  const currentTenant = useCurrentTenant();
  const tenantId = currentTenant.data?.tenant_id ?? null;
  const { data: calculations, refetch: refetchCalcs } = useCalculations();
  const createCalculation = useCreateCalculation();
  const createField = useCreateField();

  const [components, setComponents] = useState<BenefitComponent[]>(
    initialComponents.map((c) => ({ ...c }))
  );
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Inline creation state
  const [showNewCalc, setShowNewCalc] = useState<number | null>(null);
  const [newCalcName, setNewCalcName] = useState("");
  const [newCalcFormula, setNewCalcFormula] = useState("");
  const [newCalcDescription, setNewCalcDescription] = useState("");
  const [creatingCalc, setCreatingCalc] = useState(false);

  const [showNewField, setShowNewField] = useState<{ compIdx: number; calcId: string } | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("number");
  const [newFieldDefault, setNewFieldDefault] = useState("");
  const [creatingField, setCreatingField] = useState(false);

  const calcNameMap = new Map((calculations ?? []).map((c) => [c.id, c.name]));

  const updateComponent = (index: number, field: keyof BenefitComponent, value: string) => {
    setComponents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addComponent = () => {
    const newComp: BenefitComponent = {
      name: "",
      type: "Allowance",
      taxable: "Non-taxable",
      calcMethod: "",
      amount: "",
      calculationId: null,
    };
    setComponents((prev) => [...prev, newComp]);
    setExpandedIdx(components.length);
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
    if (expandedIdx === index) setExpandedIdx(null);
    else if (expandedIdx !== null && expandedIdx > index) setExpandedIdx(expandedIdx - 1);
  };

  const handleSave = async () => {
    if (components.some((c) => !c.name.trim())) {
      toast.error("All components must have a name");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(components);
      toast.success("Policy components updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCalculation = async (compIdx: number) => {
    if (!newCalcName.trim() || !newCalcFormula.trim() || !user) return;
    setCreatingCalc(true);
    try {
      const result = await createCalculation.mutateAsync({
        name: newCalcName,
        formula: newCalcFormula,
        description: newCalcDescription || null,
        created_by: user.id,
        tenant_id: tenantId,
      });
      await refetchCalcs();
      updateComponent(compIdx, "calculationId" as any, result.id);
      setShowNewCalc(null);
      setNewCalcName("");
      setNewCalcFormula("");
      setNewCalcDescription("");
      toast.success(`Calculation "${result.name}" created and linked`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create calculation");
    } finally {
      setCreatingCalc(false);
    }
  };

  const handleCreateField = async () => {
    if (!showNewField || !newFieldName.trim() || !newFieldLabel.trim()) return;
    setCreatingField(true);
    try {
      await createField.mutateAsync({
        calculation_id: showNewField.calcId,
        name: newFieldName,
        label: newFieldLabel,
        field_type: newFieldType,
        default_value: newFieldDefault || null,
      });
      setShowNewField(null);
      setNewFieldName("");
      setNewFieldLabel("");
      setNewFieldType("number");
      setNewFieldDefault("");
      toast.success("Field added to calculation");
    } catch (err: any) {
      toast.error(err.message || "Failed to create field");
    } finally {
      setCreatingField(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold text-foreground tracking-tight">
                  Policy Components
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {policyName} — {components.length} component{components.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {components.length === 0 && (
            <div className="text-center py-12">
              <Layers className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No components yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first benefit component below.</p>
            </div>
          )}

          {components.map((comp, i) => {
            const isExpanded = expandedIdx === i;
            const linkedCalcName = comp.calculationId ? calcNameMap.get(comp.calculationId) : null;

            return (
              <div
                key={i}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? "border-accent/30 shadow-md bg-accent/[0.02]"
                    : "border-border hover:border-accent/20 hover:shadow-sm"
                }`}
              >
                {/* Row Summary */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                >
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {comp.name || <span className="italic text-muted-foreground">Untitled Component</span>}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                        {comp.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{comp.taxable}</span>
                      {linkedCalcName && (
                        <span className="text-xs text-accent inline-flex items-center gap-1">
                          <Calculator className="w-3 h-3" />
                          {linkedCalcName}
                        </span>
                      )}
                      {comp.amount && (
                        <span className="text-xs font-medium text-foreground">{comp.amount}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeComponent(i);
                    }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Expanded Editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Component Name *</Label>
                        <Input
                          value={comp.name}
                          onChange={(e) => updateComponent(i, "name", e.target.value)}
                          placeholder="e.g. Housing Allowance"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Amount / Limit</Label>
                        <Input
                          value={comp.amount}
                          onChange={(e) => updateComponent(i, "amount", e.target.value)}
                          placeholder="e.g. $4,000/mo"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <Select value={comp.type} onValueChange={(v) => updateComponent(i, "type", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BENEFIT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Taxability</Label>
                        <Select value={comp.taxable} onValueChange={(v) => updateComponent(i, "taxable", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TAXABILITY_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Calc Method / Notes</Label>
                      <Input
                        value={comp.calcMethod}
                        onChange={(e) => updateComponent(i, "calcMethod", e.target.value)}
                        placeholder="e.g. % of base salary, flat rate, etc."
                      />
                    </div>

                    {/* Calculation Linking */}
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5 text-accent" />
                          Linked Calculation
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-accent hover:text-accent"
                          onClick={() => {
                            setShowNewCalc(showNewCalc === i ? null : i);
                            setNewCalcName(comp.name || "");
                            setNewCalcFormula("");
                            setNewCalcDescription("");
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {showNewCalc === i ? "Cancel" : "New Calculation"}
                        </Button>
                      </div>

                      <Select
                        value={comp.calculationId || "none"}
                        onValueChange={(v) => updateComponent(i, "calculationId" as any, v === "none" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No calculation linked" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No calculation</SelectItem>
                          {(calculations ?? []).map((calc) => (
                            <SelectItem key={calc.id} value={calc.id}>{calc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Inline New Calculation Form */}
                      {showNewCalc === i && (
                        <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-4 space-y-3 mt-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-accent" />
                            <p className="text-xs font-semibold text-foreground">Create New Calculation</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Name *</Label>
                              <Input
                                value={newCalcName}
                                onChange={(e) => setNewCalcName(e.target.value)}
                                placeholder="e.g. Housing Calc"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Formula *</Label>
                              <Input
                                value={newCalcFormula}
                                onChange={(e) => setNewCalcFormula(e.target.value)}
                                placeholder="e.g. base_salary * 0.3"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <Textarea
                              value={newCalcDescription}
                              onChange={(e) => setNewCalcDescription(e.target.value)}
                              placeholder="Optional description..."
                              rows={2}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowNewCalc(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={!newCalcName.trim() || !newCalcFormula.trim() || creatingCalc}
                              onClick={() => handleCreateCalculation(i)}
                            >
                              {creatingCalc ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 mr-1" />
                              )}
                              Create & Link
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Add Field to linked calculation */}
                      {comp.calculationId && comp.calculationId !== "none" && showNewCalc !== i && (
                        <div className="mt-2">
                          {showNewField?.compIdx === i ? (
                            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                              <p className="text-xs font-semibold text-foreground">
                                Add Field to "{calcNameMap.get(comp.calculationId) || "Calculation"}"
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Field Name *</Label>
                                  <Input
                                    value={newFieldName}
                                    onChange={(e) => setNewFieldName(e.target.value)}
                                    placeholder="e.g. base_salary"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Label *</Label>
                                  <Input
                                    value={newFieldLabel}
                                    onChange={(e) => setNewFieldLabel(e.target.value)}
                                    placeholder="e.g. Base Salary"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Type</Label>
                                  <Select value={newFieldType} onValueChange={setNewFieldType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {FIELD_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Default Value</Label>
                                  <Input
                                    value={newFieldDefault}
                                    onChange={(e) => setNewFieldDefault(e.target.value)}
                                    placeholder="Optional"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setShowNewField(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={!newFieldName.trim() || !newFieldLabel.trim() || creatingField}
                                  onClick={handleCreateField}
                                >
                                  {creatingField ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                  )}
                                  Add Field
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => {
                                setShowNewField({ compIdx: i, calcId: comp.calculationId! });
                                setNewFieldName("");
                                setNewFieldLabel("");
                                setNewFieldType("number");
                                setNewFieldDefault("");
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add Field to Calculation
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Component Button */}
          <button
            onClick={addComponent}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Component
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
