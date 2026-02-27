import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";

// ─── Cost Estimate Templates ────────────────────────────────
export function useCostEstimateTemplates() {
  const { activeTenant } = useTenantContext();
  return useQuery({
    queryKey: ["cost_estimate_templates", activeTenant?.tenant_id],
    enabled: !!activeTenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_estimate_templates" as any)
        .select("*")
        .eq("tenant_id", activeTenant!.tenant_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateCostEstimateTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenantContext();
  return useMutation({
    mutationFn: async (template: { name: string; template_type: string; notes?: string }) => {
      if (!user || !activeTenant) throw new Error("Not authenticated");
      // Create the template
      const { data: tmpl, error: tmplErr } = await supabase
        .from("cost_estimate_templates" as any)
        .insert({ ...template, tenant_id: activeTenant.tenant_id, created_by: user.id } as any)
        .select()
        .single();
      if (tmplErr) throw tmplErr;

      // Create the first version
      const { error: verErr } = await supabase
        .from("cost_estimate_template_versions" as any)
        .insert({
          template_id: (tmpl as any).id,
          version_number: 1,
          created_by: user.id,
        } as any);
      if (verErr) throw verErr;

      return tmpl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_estimate_templates"] }),
  });
}

export function useUpdateCostEstimateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase
        .from("cost_estimate_templates" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_estimate_templates"] }),
  });
}

export function useDeleteCostEstimateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cost_estimate_templates" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_estimate_templates"] }),
  });
}

// ─── Template Versions ──────────────────────────────────────
export function useCostEstimateVersions(templateId?: string) {
  return useQuery({
    queryKey: ["cost_estimate_versions", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_estimate_template_versions" as any)
        .select("*")
        .eq("template_id", templateId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpdateCostEstimateVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase
        .from("cost_estimate_template_versions" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_estimate_versions"] }),
  });
}

export function useCreateCostEstimateVersion() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (version: { template_id: string; version_number: number; version_notes?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("cost_estimate_template_versions" as any)
        .insert({ ...version, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_estimate_versions"] }),
  });
}

// ─── Compensation Items ─────────────────────────────────────
export function useCompensationItems(versionId?: string) {
  return useQuery({
    queryKey: ["cost_estimate_comp_items", versionId],
    enabled: !!versionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_estimate_compensation_items" as any)
        .select("*")
        .eq("version_id", versionId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertCompensationItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { id?: string; version_id: string; paycode: string; display_label: string; display_category: string; home_country?: string; host_country?: string; sort_order?: number; is_taxable?: boolean; default_value?: number; calculation_formula?: string }) => {
      if (item.id) {
        const { id, ...updates } = item;
        const { data, error } = await supabase
          .from("cost_estimate_compensation_items" as any)
          .update(updates as any)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("cost_estimate_compensation_items" as any)
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_estimate_comp_items"] }),
  });
}

export function useDeleteCompensationItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cost_estimate_compensation_items" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_estimate_comp_items"] }),
  });
}

// ─── Policy Mappings ────────────────────────────────────────
export function usePolicyMappings(templateId?: string) {
  return useQuery({
    queryKey: ["cost_estimate_policy_mappings", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_estimate_policy_mappings" as any)
        .select("*")
        .eq("template_id", templateId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertPolicyMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mapping: { id?: string; template_id: string; mapping_type: string; policy_type?: string; policy_id?: string; effective_from?: string; effective_to?: string }) => {
      if (mapping.id) {
        const { id, ...updates } = mapping;
        const { data, error } = await supabase
          .from("cost_estimate_policy_mappings" as any)
          .update(updates as any)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("cost_estimate_policy_mappings" as any)
        .insert(mapping as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_estimate_policy_mappings"] }),
  });
}

// ─── Generated Cost Estimates ───────────────────────────────
export function useCostEstimates(simulationId?: string) {
  const { activeTenant } = useTenantContext();
  return useQuery({
    queryKey: ["cost_estimates", activeTenant?.tenant_id, simulationId],
    enabled: !!activeTenant,
    queryFn: async () => {
      let q = (supabase.from("cost_estimates" as any) as any)
        .select("*")
        .eq("tenant_id", activeTenant!.tenant_id)
        .order("created_at", { ascending: false });
      if (simulationId) q = q.eq("simulation_id", simulationId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateCostEstimate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenantContext();
  return useMutation({
    mutationFn: async (estimate: {
      simulation_id: string;
      template_id: string;
      template_version_id: string;
      employee_name: string;
      employee_id?: string;
      display_currency: string;
      line_items: any;
      details_snapshot: any;
      tax_snapshot: any;
      total_cost: number;
      source_snapshot: any;
    }) => {
      if (!user || !activeTenant) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("cost_estimates" as any)
        .insert({ ...estimate, tenant_id: activeTenant.tenant_id, generated_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost_estimates"] }),
  });
}

// ─── Cost Estimates by Employee ─────────────────────────────
export function useEmployeeCostEstimates(employeeId?: string) {
  const { activeTenant } = useTenantContext();
  return useQuery({
    queryKey: ["cost_estimates", "employee", employeeId],
    enabled: !!activeTenant && !!employeeId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("cost_estimates" as any) as any)
        .select("*")
        .eq("tenant_id", activeTenant!.tenant_id)
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}
