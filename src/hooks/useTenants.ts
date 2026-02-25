import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Tenant = Tables<"tenants">;
export type SubTenant = Tables<"sub_tenants">;
export type TenantUser = Tables<"tenant_users">;

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useSubTenants(tenantId: string | null) {
  return useQuery({
    queryKey: ["sub_tenants", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_tenants")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useTenantUsers(tenantId: string | null) {
  return useQuery({
    queryKey: ["tenant_users", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_users")
        .select("*, profiles(display_name, department)")
        .eq("tenant_id", tenantId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tenant: TablesInsert<"tenants">) => {
      const { data, error } = await supabase.from("tenants").insert(tenant).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"tenants"> & { id: string }) => {
      const { data, error } = await supabase.from("tenants").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useCreateSubTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sub: TablesInsert<"sub_tenants">) => {
      const { data, error } = await supabase.from("sub_tenants").insert(sub).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["sub_tenants", vars.tenant_id] }),
  });
}

export function useDeleteSubTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      const { error } = await supabase.from("sub_tenants").delete().eq("id", id);
      if (error) throw error;
      return tenantId;
    },
    onSuccess: (tenantId) => qc.invalidateQueries({ queryKey: ["sub_tenants", tenantId] }),
  });
}

export function useSearchProfiles(search: string) {
  return useQuery({
    queryKey: ["profiles_search", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, department")
        .ilike("display_name", `%${search}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}

export function useAssignTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { tenant_id: string; user_id: string; role: "tenant_admin" | "tenant_user"; sub_tenant_id?: string | null }) => {
      const { data, error } = await supabase.from("tenant_users").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["tenant_users", vars.tenant_id] }),
  });
}

export function useRemoveTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      const { error } = await supabase.from("tenant_users").delete().eq("id", id);
      if (error) throw error;
      return tenantId;
    },
    onSuccess: (tenantId) => qc.invalidateQueries({ queryKey: ["tenant_users", tenantId] }),
  });
}

export function useUpdateTenantUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role, tenantId }: { id: string; role: "tenant_admin" | "tenant_user"; tenantId: string }) => {
      const { data, error } = await supabase.from("tenant_users").update({ role }).eq("id", id).select().single();
      if (error) throw error;
      return { data, tenantId };
    },
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ["tenant_users", result.tenantId] }),
  });
}
