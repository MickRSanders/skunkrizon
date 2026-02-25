import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the current user's tenant membership.
 * If the user belongs to a tenant directly → returns that tenant_id.
 * If the user belongs via a sub-tenant → returns the parent tenant_id + sub_tenant_id.
 */
export function useCurrentTenant() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["current_tenant", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_users")
        .select("tenant_id, sub_tenant_id, role")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data; // null if user has no tenant
    },
  });
}
