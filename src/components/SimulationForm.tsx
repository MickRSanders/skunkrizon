import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  FileText,
  Settings2,
  ChevronRight,
  ChevronLeft,
  Calculator,
  X,
  Wallet,
  Check,
} from "lucide-react";

interface SimulationFormProps {
  onClose: () => void;
  onSubmit: (data: SimulationFormData) => void;
}

export interface SimulationFormData {
  scenarioName: string;
  baseSalary: string;
  currency: string;
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  assignmentType: string;
  durationMonths: string;
  startDate: string;
  policy: string;
  colaPercent: number;
  housingCap: string;
  taxApproach: string;
  includeSchooling: boolean;
  includeSpouseSupport: boolean;
  includeRelocationLumpSum: boolean;
  relocationLumpSum: string;
  exchangeRateBuffer: number;
  notes: string;
}

const STEPS = [
  { id: "scenario", label: "Scenario", icon: Wallet },
  { id: "assignment", label: "Assignment", icon: MapPin },
  { id: "policy", label: "Policy", icon: FileText },
  { id: "assumptions", label: "Assumptions", icon: Settings2 },
] as const;

const initialData: SimulationFormData = {
  scenarioName: "",
  baseSalary: "",
  currency: "USD",
  originCity: "",
  originCountry: "",
  destinationCity: "",
  destinationCountry: "",
  assignmentType: "",
  durationMonths: "24",
  startDate: "",
  policy: "",
  colaPercent: 15,
  housingCap: "",
  taxApproach: "tax-equalization",
  includeSchooling: false,
  includeSpouseSupport: false,
  includeRelocationLumpSum: true,
  relocationLumpSum: "5000",
  exchangeRateBuffer: 3,
  notes: "",
};

const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "Japan",
  "South Korea", "Singapore", "Australia", "Brazil", "India",
  "Switzerland", "Netherlands", "Ireland", "Spain", "Canada",
];

export default function SimulationForm({ onClose, onSubmit }: SimulationFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SimulationFormData>(initialData);

  const update = (field: keyof SimulationFormData, value: string | number | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 0) return data.scenarioName && data.baseSalary;
    if (step === 1) return data.originCountry && data.destinationCountry && data.assignmentType;
    if (step === 2) return data.policy;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">New Cost Simulation</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Configure your relocation scenario in {STEPS.length} steps
              </p>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator — pill-style */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => i <= step && setStep(i)}
                  className={`group relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md shadow-accent/20"
                      : isDone
                      ? "bg-accent/10 text-accent hover:bg-accent/20"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                  {!isActive && i < STEPS.length - 1 && (
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-px bg-border" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {step === 0 && (
            <>
              <SectionTitle>Scenario</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Scenario Name *">
                  <Input value={data.scenarioName} onChange={(e) => update("scenarioName", e.target.value)} placeholder="e.g. US-to-UK Long-Term" />
                </Field>
              </div>
              <Separator />
              <SectionTitle>Compensation Assumptions</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Base Salary *">
                  <Input type="number" value={data.baseSalary} onChange={(e) => update("baseSalary", e.target.value)} placeholder="e.g. 120000" />
                </Field>
                <Field label="Currency">
                  <Select value={data.currency} onValueChange={(v) => update("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["USD", "EUR", "GBP", "JPY", "CHF", "SGD", "AUD", "CAD", "INR", "BRL"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <SectionTitle>Origin Location</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City">
                  <Input value={data.originCity} onChange={(e) => update("originCity", e.target.value)} placeholder="e.g. New York" />
                </Field>
                <Field label="Country *">
                  <Select value={data.originCountry} onValueChange={(v) => update("originCountry", v)}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Separator />
              <SectionTitle>Destination Location</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City">
                  <Input value={data.destinationCity} onChange={(e) => update("destinationCity", e.target.value)} placeholder="e.g. London" />
                </Field>
                <Field label="Country *">
                  <Select value={data.destinationCountry} onValueChange={(v) => update("destinationCountry", v)}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Separator />
              <SectionTitle>Assignment Details</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Assignment Type *">
                  <Select value={data.assignmentType} onValueChange={(v) => update("assignmentType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short-term">Short-Term (&lt; 12 months)</SelectItem>
                      <SelectItem value="long-term">Long-Term (1–5 years)</SelectItem>
                      <SelectItem value="permanent">Permanent Transfer</SelectItem>
                      <SelectItem value="commuter">Commuter / Rotational</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Duration (months)">
                  <Input type="number" value={data.durationMonths} onChange={(e) => update("durationMonths", e.target.value)} placeholder="24" />
                </Field>
                <Field label="Estimated Start Date">
                  <Input type="date" value={data.startDate} onChange={(e) => update("startDate", e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle>Policy Selection</SectionTitle>
              <Field label="Relocation Policy *">
                <Select value={data.policy} onValueChange={(v) => update("policy", v)}>
                  <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold Tier — Full benefits package</SelectItem>
                    <SelectItem value="silver">Silver Tier — Standard benefits</SelectItem>
                    <SelectItem value="bronze">Bronze Tier — Core benefits only</SelectItem>
                    <SelectItem value="custom">Custom — Build from scratch</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Separator />
              <SectionTitle>Benefit Components</SectionTitle>
              <div className="space-y-3">
                <Field label="Tax Approach">
                  <Select value={data.taxApproach} onValueChange={(v) => update("taxApproach", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tax-equalization">Tax Equalization</SelectItem>
                      <SelectItem value="tax-protection">Tax Protection</SelectItem>
                      <SelectItem value="actual-tax">Actual Tax (No Assistance)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Housing Allowance Cap (monthly)">
                  <Input type="number" value={data.housingCap} onChange={(e) => update("housingCap", e.target.value)} placeholder="e.g. 4000" />
                </Field>

                <ToggleRow
                  title="Schooling Allowance"
                  description="Include dependent education costs"
                  checked={data.includeSchooling}
                  onChange={(v) => update("includeSchooling", v)}
                />
                <ToggleRow
                  title="Spouse / Partner Support"
                  description="Career assistance and language training"
                  checked={data.includeSpouseSupport}
                  onChange={(v) => update("includeSpouseSupport", v)}
                />
                <ToggleRow
                  title="Relocation Lump Sum"
                  description="One-time settling-in payment"
                  checked={data.includeRelocationLumpSum}
                  onChange={(v) => update("includeRelocationLumpSum", v)}
                />
                {data.includeRelocationLumpSum && (
                  <Field label="Lump Sum Amount">
                    <Input type="number" value={data.relocationLumpSum} onChange={(e) => update("relocationLumpSum", e.target.value)} placeholder="5000" />
                  </Field>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle>Configurable Assumptions</SectionTitle>
              <div className="space-y-6">
                <SliderField
                  label="Cost of Living Adjustment (COLA)"
                  value={data.colaPercent}
                  onChange={(v) => update("colaPercent", v)}
                  min={0} max={50} step={1}
                  description="Applied on top of base salary to account for destination cost differences"
                />
                <SliderField
                  label="Exchange Rate Buffer"
                  value={data.exchangeRateBuffer}
                  onChange={(v) => update("exchangeRateBuffer", v)}
                  min={0} max={15} step={0.5}
                  description="Safety margin for currency fluctuation risk"
                />
              </div>

              <Separator />

              <SectionTitle>Estimated Preview</SectionTitle>
              <div className="rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border p-5 space-y-3">
                {[
                  { label: "Base Compensation", value: data.baseSalary ? `${data.currency} ${Number(data.baseSalary).toLocaleString()}` : "—" },
                  { label: "COLA Adjustment", value: data.baseSalary ? `${data.currency} ${Math.round(Number(data.baseSalary) * data.colaPercent / 100).toLocaleString()}` : "—" },
                  { label: "Housing (est.)", value: data.housingCap ? `${data.currency} ${(Number(data.housingCap) * Number(data.durationMonths)).toLocaleString()}` : "—" },
                  { label: "FX Buffer", value: data.baseSalary ? `${data.currency} ${Math.round(Number(data.baseSalary) * data.exchangeRateBuffer / 100).toLocaleString()}` : "—" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Rough Estimate</span>
                  <span className="text-xl font-bold text-accent">
                    {data.baseSalary
                      ? `${data.currency} ${Math.round(
                          Number(data.baseSalary) * (1 + data.colaPercent / 100 + data.exchangeRateBuffer / 100) +
                          (Number(data.housingCap || 0) * Number(data.durationMonths)) +
                          (data.includeRelocationLumpSum ? Number(data.relocationLumpSum || 0) : 0)
                        ).toLocaleString()}`
                      : "—"}
                  </span>
                </div>
              </div>

              <Separator />
              <Field label="Notes / Special Instructions">
                <Textarea
                  value={data.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Any additional context for this simulation..."
                  rows={3}
                />
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" onClick={step === 0 ? onClose : () => setStep(step - 1)}>
            {step === 0 ? (
              "Cancel"
            ) : (
              <><ChevronLeft className="w-4 h-4 mr-1" /> Back</>
            )}
          </Button>
          <div className="flex gap-2">
            {step < STEPS.length - 1 ? (
              <Button size="sm" disabled={!canProceed()} onClick={() => setStep(step + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => onSubmit(data)}>
                  Save as Draft
                </Button>
                <Button size="sm" onClick={() => onSubmit(data)}>
                  <Calculator className="w-4 h-4 mr-1" /> Run Simulation
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground tracking-tight">{children}</h3>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/30">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step, description }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; description: string;
}) {
  return (
    <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/50">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-bold text-accent tabular-nums">{value}%</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
