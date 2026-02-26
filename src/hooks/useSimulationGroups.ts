import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";

export function useSimulationGroups() {
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useQuery({
    queryKey: ["simulation_groups", activeTenant?.tenant_id, activeSubTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("simulation_groups" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (activeTenant) {
        query = query.eq("tenant_id", activeTenant.tenant_id);
      }
      if (activeSubTenant) {
        query = query.eq("sub_tenant_id", activeSubTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSimulationGroupWithSims(groupId: string | null) {
  return useQuery({
    queryKey: ["simulation_group_detail", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data: group, error: gErr } = await (supabase as any)
        .from("simulation_groups")
        .select("*")
        .eq("id", groupId!)
        .single();
      if (gErr) throw gErr;

      const { data: sims, error: sErr } = await (supabase as any)
        .from("simulations")
        .select("*, policies(name)")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: true });
      if (sErr) throw sErr;

      return { group: group as any, simulations: sims };
    },
  });
}

export function useCreateSimulationGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      origin_country?: string;
      origin_city?: string;
      destination_country?: string;
      destination_city?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase
        .from("simulation_groups" as any)
        .insert({
          ...input,
          created_by: user.id,
          tenant_id: activeTenant?.tenant_id ?? null,
          sub_tenant_id: activeSubTenant?.id ?? null,
        })
        .select()
        .single() as any);
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simulation_groups"] }),
  });
}

export function useUpdateSimulationGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await (supabase
        .from("simulation_groups" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simulation_groups"] });
      qc.invalidateQueries({ queryKey: ["simulation_group_detail"] });
    },
  });
}

export function useDeleteSimulationGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // First unlink simulations
      await (supabase as any).from("simulations").update({ group_id: null }).eq("group_id", id);
      const { error } = await (supabase as any).from("simulation_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simulation_groups"] });
      qc.invalidateQueries({ queryKey: ["simulations"] });
    },
  });
}
