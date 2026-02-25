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
  User,
  MapPin,
  FileText,
  Settings2,
  ChevronRight,
  ChevronLeft,
  Calculator,
  X,
} from "lucide-react";

interface SimulationFormProps {
  onClose: () => void;
  onSubmit: (data: SimulationFormData) => void;
}

export interface SimulationFormData {
  employeeName: string;
  employeeId: string;
  jobTitle: string;
  department: string;
  grade: string;
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
  { id: "employee", label: "Employee Info", icon: User },
  { id: "assignment", label: "Assignment Details", icon: MapPin },
  { id: "policy", label: "Policy & Benefits", icon: FileText },
  { id: "assumptions", label: "Assumptions", icon: Settings2 },
] as const;

const initialData: SimulationFormData = {
  employeeName: "",
  employeeId: "",
  jobTitle: "",
  department: "",
  grade: "",
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

export default function SimulationForm({ onClose, onSubmit }: SimulationFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SimulationFormData>(initialData);

  const update = (field: keyof SimulationFormData, value: string | number | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 0) return data.employeeName && data.baseSalary;
    if (step === 1) return data.originCountry && data.destinationCountry && data.assignmentType;
    if (step === 2) return data.policy;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-card rounded-xl border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">New Cost Simulation</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {step + 1} of {STEPS.length} — {STEPS[step].label}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center px-6 pt-4 gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => i <= step && setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : isDone
                      ? "text-accent/70 hover:bg-muted"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-border flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === 0 && (
            <>
              <SectionTitle>Employee Information</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name *">
                  <Input value={data.employeeName} onChange={(e) => update("employeeName", e.target.value)} placeholder="e.g. Sarah Chen" />
                </Field>
                <Field label="Employee ID">
                  <Input value={data.employeeId} onChange={(e) => update("employeeId", e.target.value)} placeholder="e.g. EMP-10482" />
                </Field>
                <Field label="Job Title">
                  <Input value={data.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} placeholder="e.g. Senior Engineer" />
                </Field>
                <Field label="Department">
                  <Select value={data.department} onValueChange={(v) => update("department", v)}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {["Engineering", "Finance", "Marketing", "Operations", "Sales", "HR", "Legal"].map((d) => (
                        <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Grade / Level">
                  <Select value={data.grade} onValueChange={(v) => update("grade", v)}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {["L3 — Associate", "L4 — Mid-Level", "L5 — Senior", "L6 — Lead", "L7 — Director", "L8 — VP"].map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Separator />
              <SectionTitle>Compensation</SectionTitle>
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
                      {["United States", "United Kingdom", "Germany", "France", "Japan", "South Korea", "Singapore", "Australia", "Brazil", "India", "Switzerland", "Netherlands", "Ireland", "Spain", "Canada"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
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
                      {["United States", "United Kingdom", "Germany", "France", "Japan", "South Korea", "Singapore", "Australia", "Brazil", "India", "Switzerland", "Netherlands", "Ireland", "Spain", "Canada"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
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
              <div className="space-y-4">
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
                <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Schooling Allowance</p>
                    <p className="text-xs text-muted-foreground">Include dependent education costs</p>
                  </div>
                  <Switch checked={data.includeSchooling} onCheckedChange={(v) => update("includeSchooling", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Spouse / Partner Support</p>
                    <p className="text-xs text-muted-foreground">Career assistance and language training</p>
                  </div>
                  <Switch checked={data.includeSpouseSupport} onCheckedChange={(v) => update("includeSpouseSupport", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Relocation Lump Sum</p>
                    <p className="text-xs text-muted-foreground">One-time settling-in payment</p>
                  </div>
                  <Switch checked={data.includeRelocationLumpSum} onCheckedChange={(v) => update("includeRelocationLumpSum", v)} />
                </div>
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Cost of Living Adjustment (COLA)</Label>
                    <span className="text-sm font-semibold text-accent">{data.colaPercent}%</span>
                  </div>
                  <Slider
                    value={[data.colaPercent]}
                    onValueChange={([v]) => update("colaPercent", v)}
                    min={0}
                    max={50}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Applied on top of base salary to account for destination cost differences</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Exchange Rate Buffer</Label>
                    <span className="text-sm font-semibold text-accent">{data.exchangeRateBuffer}%</span>
                  </div>
                  <Slider
                    value={[data.exchangeRateBuffer]}
                    onValueChange={([v]) => update("exchangeRateBuffer", v)}
                    min={0}
                    max={15}
                    step={0.5}
                  />
                  <p className="text-xs text-muted-foreground">Safety margin for currency fluctuation risk</p>
                </div>
              </div>

              <Separator />

              <SectionTitle>Estimated Preview</SectionTitle>
              <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2">
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
                <Separator />
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-foreground">Rough Estimate</span>
                  <span className="text-accent">
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={step === 0 ? onClose : () => setStep(step - 1)}>
            {step === 0 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </>
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
