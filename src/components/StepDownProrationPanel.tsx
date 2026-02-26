import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, TrendingDown, Clock, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface StepDownEntry {
  year: number;
  percent: number;
}

export interface StepDownProrationConfig {
  step_down_enabled: boolean;
  step_down_schedule: StepDownEntry[];
  proration_enabled: boolean;
  proration_method: string;
}

interface Props {
  config: StepDownProrationConfig;
  onSave: (config: StepDownProrationConfig) => Promise<void>;
  isSaving?: boolean;
}

export default function StepDownProrationPanel({ config, onSave, isSaving }: Props) {
  const [stepDownEnabled, setStepDownEnabled] = useState(config.step_down_enabled);
  const [schedule, setSchedule] = useState<StepDownEntry[]>(
    config.step_down_schedule.length > 0
      ? config.step_down_schedule
      : [{ year: 1, percent: 100 }]
  );
  const [prorationEnabled, setProrationEnabled] = useState(config.proration_enabled);
  const [prorationMethod, setProrationMethod] = useState(config.proration_method || "daily");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(true);
  }, [stepDownEnabled, schedule, prorationEnabled, prorationMethod]);

  const addYear = () => {
    const nextYear = schedule.length > 0 ? Math.max(...schedule.map((s) => s.year)) + 1 : 1;
    const lastPercent = schedule.length > 0 ? schedule[schedule.length - 1].percent : 100;
    const newPercent = Math.max(0, lastPercent - 25);
    setSchedule([...schedule, { year: nextYear, percent: newPercent }]);
  };

  const updateEntry = (index: number, field: "year" | "percent", value: number) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], [field]: value };
    setSchedule(updated);
  };

  const removeEntry = (index: number) => {
    if (schedule.length <= 1) return;
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await onSave({
      step_down_enabled: stepDownEnabled,
      step_down_schedule: schedule,
      proration_enabled: prorationEnabled,
      proration_method: prorationMethod,
    });
    setDirty(false);
  };

  return (
    <div className="space-y-5">
      {/* Step-Down Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-foreground">Step-Down Schedule</h3>
          </div>
          <Switch checked={stepDownEnabled} onCheckedChange={setStepDownEnabled} />
        </div>
        <p className="text-xs text-muted-foreground">
          Reduce this benefit year over year. Define the percentage of the calculated amount applied each year.
        </p>

        {stepDownEnabled && (
          <div className="space-y-2 pl-1">
            <div className="grid grid-cols-[60px_1fr_32px] gap-2 items-center">
              <Label className="text-[10px] text-muted-foreground uppercase">Year</Label>
              <Label className="text-[10px] text-muted-foreground uppercase">% of Calculated Amount</Label>
              <span />
            </div>
            {schedule.map((entry, i) => (
              <div key={i} className="grid grid-cols-[60px_1fr_32px] gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  value={entry.year}
                  onChange={(e) => updateEntry(i, "year", parseInt(e.target.value) || 1)}
                  className="h-8 text-xs font-mono text-center"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={entry.percent}
                    onChange={(e) => updateEntry(i, "percent", parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  {/* Visual bar */}
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, entry.percent))}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeEntry(i)}
                  disabled={schedule.length <= 1}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addYear} className="text-xs mt-1">
              <Plus className="w-3 h-3 mr-1" /> Add Year
            </Button>
          </div>
        )}
      </div>

      {/* Proration Section */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-foreground">Proration</h3>
          </div>
          <Switch checked={prorationEnabled} onCheckedChange={setProrationEnabled} />
        </div>
        <p className="text-xs text-muted-foreground">
          Automatically adjust the calculated amount for partial assignment periods based on start/end dates.
        </p>

        {prorationEnabled && (
          <div className="space-y-2 pl-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Method</Label>
            <Select value={prorationMethod} onValueChange={setProrationMethod}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  <span className="flex flex-col">
                    <span className="font-medium">Daily</span>
                  </span>
                </SelectItem>
                <SelectItem value="monthly">
                  <span className="flex flex-col">
                    <span className="font-medium">Monthly</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {prorationMethod === "daily"
                ? "Calculated as: annual_amount × (days_in_period / 365)"
                : "Calculated as: annual_amount × (months_in_period / 12)"}
            </p>
          </div>
        )}
      </div>

      {/* Save */}
      {dirty && (
        <div className="pt-2">
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="text-xs gap-1.5">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </Button>
        </div>
      )}
    </div>
  );
}
