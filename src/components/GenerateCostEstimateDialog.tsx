import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useEmployees } from "@/hooks/useEmployees";
import { useCostEstimateTemplates, useCostEstimateVersions, useCompensationItems, useCreateCostEstimate } from "@/hooks/useCostEstimates";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  simulation: {
    id: string;
    employee_name: string;
    employee_id?: string | null;
    base_salary: number;
    currency: string;
    origin_country: string;
    destination_country: string;
    assignment_type: string;
    total_cost: number | null;
    sim_code: string;
  };
}

export default function GenerateCostEstimateDialog({ open, onOpenChange, simulation }: Props) {
  const { data: employees = [] } = useEmployees({ activeOnly: true });
  const { data: templates = [] } = useCostEstimateTemplates();
  const { user } = useAuth();
  const { activeTenant } = useTenantContext();
  const createEstimate = useCreateCostEstimate();

  const [employeeId, setEmployeeId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate employee from simulation
  useEffect(() => {
    if (open && simulation.employee_id) {
      setEmployeeId(simulation.employee_id);
    } else if (open) {
      // Try to match by name
      const match = employees.find(
        (e) => `${e.first_name} ${e.last_name}`.toLowerCase() === simulation.employee_name.toLowerCase()
      );
      if (match) setEmployeeId(match.id);
    }
  }, [open, simulation, employees]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setEmployeeId("");
      setTemplateId("");
    }
  }, [open]);

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const selectedTemplate = templates.find((t: any) => t.id === templateId);

  const handleGenerate = async () => {
    if (!employeeId || !templateId || !user || !activeTenant) return;
    setSubmitting(true);
    try {
      // Get the active version for this template
      const { data: versions, error: vErr } = await supabase
        .from("cost_estimate_template_versions" as any)
        .select("*")
        .eq("template_id", templateId)
        .eq("status", "active")
        .order("version_number", { ascending: false })
        .limit(1);
      if (vErr) throw vErr;

      // Fallback to latest draft if no active version
      let version = versions?.[0];
      if (!version) {
        const { data: drafts, error: dErr } = await supabase
          .from("cost_estimate_template_versions" as any)
          .select("*")
          .eq("template_id", templateId)
          .order("version_number", { ascending: false })
          .limit(1);
        if (dErr) throw dErr;
        version = drafts?.[0];
      }
      if (!version) throw new Error("No template version found");

      // Get compensation items for this version
      const { data: compItems, error: cErr } = await supabase
        .from("cost_estimate_compensation_items" as any)
        .select("*")
        .eq("version_id", (version as any).id)
        .order("sort_order");
      if (cErr) throw cErr;

      const employee = employees.find((e) => e.id === employeeId)!;
      const employeeName = `${employee.first_name} ${employee.last_name}`;

      // Build line items from compensation items
      const lineItems = (compItems || []).map((item: any) => ({
        paycode: item.paycode,
        label: item.display_label,
        category: item.display_category,
        amount: item.default_value || 0,
        is_taxable: item.is_taxable,
      }));

      const totalCost = lineItems.reduce((sum: number, li: any) => sum + (li.amount || 0), 0);

      const sourceSnapshot = {
        simulation_id: simulation.id,
        sim_code: simulation.sim_code,
        employee_id: employeeId,
        employee_name: employeeName,
        base_salary: employee.base_salary,
        currency: employee.currency,
        origin_country: simulation.origin_country,
        destination_country: simulation.destination_country,
        assignment_type: simulation.assignment_type,
      };

      const detailsSnapshot = {
        employee_code: employee.employee_code,
        job_title: employee.job_title,
        job_grade: employee.job_grade,
        division: employee.division,
        location: [employee.city, employee.country].filter(Boolean).join(", "),
      };

      await createEstimate.mutateAsync({
        simulation_id: simulation.id,
        template_id: templateId,
        template_version_id: (version as any).id,
        employee_name: employeeName,
        employee_id: employeeId,
        display_currency: (version as any).display_currency || employee.currency,
        line_items: lineItems,
        details_snapshot: detailsSnapshot,
        tax_snapshot: {},
        total_cost: totalCost,
        source_snapshot: sourceSnapshot,
      });

      // Create in-app notification for the simulation owner
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Cost Estimate Generated",
        message: `Cost estimate for ${employeeName} (${simulation.sim_code}) has been generated using template "${(selectedTemplate as any)?.name}".`,
        type: "success",
        entity_type: "cost_estimate",
        entity_id: simulation.id,
      } as any);

      toast.success(`Cost estimate generated for ${employeeName}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate cost estimate");
    } finally {
      setSubmitting(false);
    }
  };

  const activeTemplates = templates.filter((t: any) => t.status === "active" || t.status === "draft");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Generate Cost Estimate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Simulation</p>
            <p className="text-sm font-medium text-foreground">{simulation.sim_code}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {simulation.origin_country} → {simulation.destination_country} · {simulation.assignment_type}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee…" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[200] max-h-60">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEmployee && (
              <p className="text-xs text-muted-foreground">
                {selectedEmployee.job_title || "No title"} · {selectedEmployee.currency} {selectedEmployee.base_salary.toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Cost Estimate Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template…" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[200] max-h-60">
                {activeTemplates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">
                Type: {(selectedTemplate as any).template_type?.replace(/_/g, " ")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!employeeId || !templateId || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
