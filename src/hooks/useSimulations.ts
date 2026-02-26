import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useSimulations() {
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useQuery({
    queryKey: ["simulations", activeTenant?.tenant_id, activeSubTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("simulations")
        .select("*, policies(name)")
        .order("created_at", { ascending: false });

      if (activeTenant) {
        query = query.eq("tenant_id", activeTenant.tenant_id);
      }
      if (activeSubTenant) {
        query = query.eq("sub_tenant_id", activeSubTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSimulationAuditLog(simulationId: string) {
  return useQuery({
    queryKey: ["simulation_audit_log", simulationId],
    enabled: !!simulationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_audit_log" as any)
        .select("*")
        .eq("simulation_id", simulationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateAuditEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      simulation_id: string;
      scenario_id: string;
      scenario_name: string;
      field_id: string;
      field_label: string;
      old_value: number | null;
      new_value: number | null;
      action: string;
      changed_by: string;
    }) => {
      const { error } = await supabase
        .from("simulation_audit_log" as any)
        .insert(entry as any);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["simulation_audit_log", variables.simulation_id] });
    },
  });
}

export function useCreateSimulation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useMutation({
    mutationFn: async (sim: Omit<TablesInsert<"simulations">, "owner_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("simulations")
        .insert({
          ...sim,
          owner_id: user.id,
          tenant_id: activeTenant?.tenant_id ?? sim.tenant_id,
          sub_tenant_id: activeSubTenant?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["simulations"] }),
  });
}

export function useUpdateSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"simulations">>) => {
      const { data, error } = await supabase
        .from("simulations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simulations"] }),
  });
}
