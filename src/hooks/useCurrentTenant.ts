import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the current user's tenant membership along with tenant details.
 * If the user belongs to a tenant directly → returns that tenant_id + tenant name.
 * If the user belongs via a sub-tenant → returns the parent tenant_id + sub_tenant_id.
 */
export function useCurrentTenant() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["current_tenant", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: membership, error } = await supabase
        .from("tenant_users")
        .select("tenant_id, sub_tenant_id, role")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!membership) return null;

      // Fetch tenant name
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name, slug, logo_url")
        .eq("id", membership.tenant_id)
        .single();

      return {
        ...membership,
        tenant_name: tenant?.name ?? null,
        tenant_slug: tenant?.slug ?? null,
        tenant_logo_url: tenant?.logo_url ?? null,
      };
    },
  });
}
