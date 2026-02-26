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
      return data;
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
