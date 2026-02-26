import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type TenantMembership = {
  tenant_id: string;
  sub_tenant_id: string | null;
  role: string;
  tenant_name: string | null;
  tenant_slug: string | null;
  tenant_logo_url: string | null;
};

type TenantContextValue = {
  tenants: TenantMembership[];
  activeTenant: TenantMembership | null;
  isLoading: boolean;
  switchTenant: (tenantId: string) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const ACTIVE_TENANT_KEY = "horizon_active_tenant_id";

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_TENANT_KEY)
  );

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["user_tenants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from("tenant_users")
        .select("tenant_id, sub_tenant_id, role")
        .eq("user_id", user!.id);

      if (error) throw error;
      if (!memberships?.length) return [];

      const tenantIds = [...new Set(memberships.map((m) => m.tenant_id))];
      const { data: tenantRows } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url")
        .in("id", tenantIds);

      const tenantMap = Object.fromEntries(
        (tenantRows ?? []).map((t) => [t.id, t])
      );

      return memberships.map((m) => ({
        ...m,
        tenant_name: tenantMap[m.tenant_id]?.name ?? null,
        tenant_slug: tenantMap[m.tenant_id]?.slug ?? null,
        tenant_logo_url: tenantMap[m.tenant_id]?.logo_url ?? null,
      })) as TenantMembership[];
    },
  });

  // Auto-select first tenant if none selected or selection is invalid
  useEffect(() => {
    if (!tenants.length) return;
    const valid = tenants.some((t) => t.tenant_id === activeTenantId);
    if (!valid) {
      setActiveTenantId(tenants[0].tenant_id);
      localStorage.setItem(ACTIVE_TENANT_KEY, tenants[0].tenant_id);
    }
  }, [tenants, activeTenantId]);

  const activeTenant = tenants.find((t) => t.tenant_id === activeTenantId) ?? tenants[0] ?? null;

  const switchTenant = useCallback(
    (tenantId: string) => {
      setActiveTenantId(tenantId);
      localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
      // Invalidate all tenant-scoped queries
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  return (
    <TenantContext.Provider value={{ tenants, activeTenant, isLoading, switchTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenantContext must be used within TenantProvider");
  return ctx;
}
