import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";

// ─── LOA Templates ──────────────────────────────────────────
export function useLoaTemplates() {
  const { activeTenant } = useTenantContext();
  return useQuery({
    queryKey: ["loa_templates", activeTenant?.tenant_id],
    enabled: !!activeTenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loa_templates" as any)
        .select("*")
        .eq("tenant_id", activeTenant!.tenant_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateLoaTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenantContext();
  return useMutation({
    mutationFn: async (template: { name: string; description?: string; content?: any; conditional_rules?: any; placeholders?: any }) => {
      if (!user || !activeTenant) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("loa_templates" as any)
        .insert({ ...template, tenant_id: activeTenant.tenant_id, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loa_templates"] }),
  });
}

export function useUpdateLoaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase
        .from("loa_templates" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loa_templates"] }),
  });
}

// ─── LOA Documents ──────────────────────────────────────────
export function useLoaDocuments(simulationId?: string) {
  const { activeTenant } = useTenantContext();
  return useQuery({
    queryKey: ["loa_documents", activeTenant?.tenant_id, simulationId],
    enabled: !!activeTenant,
    queryFn: async () => {
      let q = (supabase.from("loa_documents" as any) as any)
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

export function useCreateLoaDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenantContext();
  return useMutation({
    mutationFn: async (doc: { simulation_id: string; template_id?: string; template_version?: number; employee_name: string; content: any; source_snapshot: any }) => {
      if (!user || !activeTenant) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("loa_documents" as any)
        .insert({ ...doc, tenant_id: activeTenant.tenant_id, generated_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loa_documents"] }),
  });
}

// ─── Balance Sheets ─────────────────────────────────────────
export function useBalanceSheets(simulationId?: string) {
  const { activeTenant } = useTenantContext();
  return useQuery({
    queryKey: ["balance_sheets", activeTenant?.tenant_id, simulationId],
    enabled: !!activeTenant,
    queryFn: async () => {
      let q = (supabase.from("balance_sheets" as any) as any)
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

export function useCreateBalanceSheet() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenantContext();
  return useMutation({
    mutationFn: async (sheet: {
      simulation_id: string; employee_name: string; format_type?: string;
      home_currency: string; host_currency: string; exchange_rate?: number;
      display_mode?: string; line_items: any; policy_explanations?: any; source_snapshot: any;
    }) => {
      if (!user || !activeTenant) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("balance_sheets" as any)
        .insert({ ...sheet, tenant_id: activeTenant.tenant_id, generated_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["balance_sheets"] }),
  });
}

// ─── Pay Instructions ───────────────────────────────────────
export function usePayInstructions(simulationId?: string) {
  const { activeTenant } = useTenantContext();
  return useQuery({
    queryKey: ["pay_instructions", activeTenant?.tenant_id, simulationId],
    enabled: !!activeTenant,
    queryFn: async () => {
      let q = (supabase.from("pay_instructions" as any) as any)
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

export function useCreatePayInstruction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenantContext();
  return useMutation({
    mutationFn: async (instruction: {
      simulation_id: string; employee_name: string; line_items: any;
      cost_center?: string; gl_code?: string; payment_currency: string; source_snapshot: any;
    }) => {
      if (!user || !activeTenant) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("pay_instructions" as any)
        .insert({ ...instruction, tenant_id: activeTenant.tenant_id, generated_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pay_instructions"] }),
  });
}

// ─── Field Mappings ─────────────────────────────────────────
export function useFieldMappings() {
  const { activeTenant } = useTenantContext();
  return useQuery({
    queryKey: ["field_mappings", activeTenant?.tenant_id],
    enabled: !!activeTenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_mappings" as any)
        .select("*")
        .eq("tenant_id", activeTenant!.tenant_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertFieldMapping() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenantContext();
  return useMutation({
    mutationFn: async (mapping: { id?: string; source_system?: string; source_field: string; target_field: string; transform_rule?: string; fallback_value?: string; is_required?: boolean }) => {
      if (!user || !activeTenant) throw new Error("Not authenticated");
      if (mapping.id) {
        const { id, ...updates } = mapping;
        const { data, error } = await supabase
          .from("field_mappings" as any)
          .update(updates as any)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("field_mappings" as any)
        .insert({ ...mapping, tenant_id: activeTenant.tenant_id, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field_mappings"] }),
  });
}
