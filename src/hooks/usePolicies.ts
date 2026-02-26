import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Policy = Tables<"policies">;

export function usePolicies() {
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useQuery({
    queryKey: ["policies", activeTenant?.tenant_id, activeSubTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("policies")
        .select("*")
        .order("updated_at", { ascending: false });

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

export function usePublishedPolicies() {
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useQuery({
    queryKey: ["policies", "published", activeTenant?.tenant_id, activeSubTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("policies")
        .select("*")
        .eq("status", "published")
        .order("name");

      if (activeTenant) {
        query = query.eq("tenant_id", activeTenant.tenant_id);
      }
      if (activeSubTenant) {
        query = query.eq("sub_tenant_id", activeSubTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Policy[];
    },
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useMutation({
    mutationFn: async (policy: TablesInsert<"policies">) => {
      const { data, error } = await supabase
        .from("policies")
        .insert({
          ...policy,
          tenant_id: activeTenant?.tenant_id ?? policy.tenant_id,
          sub_tenant_id: activeSubTenant?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"policies"> & { id: string }) => {
      const { data, error } = await supabase
        .from("policies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}
