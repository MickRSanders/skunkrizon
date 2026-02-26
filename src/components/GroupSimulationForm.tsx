import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { X, Plus, Trash2, Users } from "lucide-react";

const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "Japan",
  "South Korea", "Singapore", "Australia", "Brazil", "India",
  "Switzerland", "Netherlands", "Ireland", "Spain", "Canada",
];

export interface GroupMember {
  role: string;
  baseSalary: string;
  currency: string;
  count: number;
}

export interface GroupSimulationFormData {
  name: string;
  description: string;
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  members: GroupMember[];
}

interface Props {
  onClose: () => void;
  onSubmit: (data: GroupSimulationFormData) => void;
}

export default function GroupSimulationForm({ onClose, onSubmit }: Props) {
  const [data, setData] = useState<GroupSimulationFormData>({
    name: "",
    description: "",
    originCity: "",
    originCountry: "",
    destinationCity: "",
    destinationCountry: "",
    members: [{ role: "", baseSalary: "", currency: "USD", count: 1 }],
  });

  const updateField = (field: keyof GroupSimulationFormData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateMember = (index: number, field: keyof GroupMember, value: any) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  const addMember = () => {
    setData((prev) => ({
      ...prev,
      members: [...prev.members, { role: "", baseSalary: "", currency: "USD", count: 1 }],
    }));
  };

  const removeMember = (index: number) => {
    if (data.members.length <= 1) return;
    setData((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  };

  const totalHeadcount = data.members.reduce((s, m) => s + m.count, 0);
  const canSubmit = data.name && data.originCountry && data.destinationCountry && data.members.every((m) => m.role && m.baseSalary);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" /> New Group Simulation
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Move multiple people on the same route and compare total costs
              </p>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Group info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Group Name *</Label>
              <Input value={data.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Singapore Office Expansion Q3" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</Label>
              <Textarea value={data.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Optional description..." rows={2} />
            </div>
          </div>

          <Separator />

          {/* Route */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Shared Route</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Origin City</Label>
                <Input value={data.originCity} onChange={(e) => updateField("originCity", e.target.value)} placeholder="e.g. London" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Origin Country *</Label>
                <Select value={data.originCountry} onValueChange={(v) => updateField("originCountry", v)}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Destination City</Label>
                <Input value={data.destinationCity} onChange={(e) => updateField("destinationCity", e.target.value)} placeholder="e.g. Singapore" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Destination Country *</Label>
                <Select value={data.destinationCountry} onValueChange={(v) => updateField("destinationCountry", v)}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Team Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Team Members
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({totalHeadcount} {totalHeadcount === 1 ? "person" : "people"})
                </span>
              </h3>
              <Button variant="outline" size="sm" onClick={addMember}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Role
              </Button>
            </div>

            <div className="space-y-3">
              {data.members.map((member, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_90px_80px_36px] gap-2 items-end">
                  <div>
                    <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">Role / Title *</Label>
                    <Input value={member.role} onChange={(e) => updateMember(i, "role", e.target.value)} placeholder="e.g. Marketing Executive" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">Base Salary *</Label>
                    <Input type="number" value={member.baseSalary} onChange={(e) => updateMember(i, "baseSalary", e.target.value)} placeholder="120000" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">Currency</Label>
                    <Select value={member.currency} onValueChange={(v) => updateMember(i, "currency", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["USD", "EUR", "GBP", "JPY", "CHF", "SGD", "AUD", "CAD"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">Count</Label>
                    <Input type="number" min={1} value={member.count} onChange={(e) => updateMember(i, "count", Math.max(1, Number(e.target.value)))} />
                  </div>
                  <button
                    onClick={() => removeMember(i)}
                    disabled={data.members.length <= 1}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSubmit} onClick={() => onSubmit(data)}>
            <Users className="w-4 h-4 mr-2" /> Create Group ({totalHeadcount} {totalHeadcount === 1 ? "person" : "people"})
          </Button>
        </div>
      </div>
    </div>
  );
}
