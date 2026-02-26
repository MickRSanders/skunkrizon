import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type SubTenant = {
  id: string;
  name: string;
  slug: string;
};

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
  activeSubTenant: SubTenant | null;
  subTenants: SubTenant[];
  isLoading: boolean;
  isSuperadmin: boolean;
  switchTenant: (tenantId: string) => void;
  switchSubTenant: (subTenantId: string | null) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const ACTIVE_TENANT_KEY = "horizon_active_tenant_id";
const ACTIVE_SUB_TENANT_KEY = "horizon_active_sub_tenant_id";

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_TENANT_KEY)
  );
  const [activeSubTenantId, setActiveSubTenantId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_SUB_TENANT_KEY)
  );

  // Check if user is superadmin
  const { data: isSuperadmin = false } = useQuery({
    queryKey: ["is_superadmin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "superadmin");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["user_tenants", user?.id, isSuperadmin],
    enabled: !!user,
    queryFn: async () => {
      if (isSuperadmin) {
        // Superadmins can see ALL organizations
        const { data: allTenants, error } = await supabase
          .from("tenants")
          .select("id, name, slug, logo_url")
          .eq("is_active", true)
          .order("name");
        if (error) throw error;
        return (allTenants ?? []).map((t) => ({
          tenant_id: t.id,
          sub_tenant_id: null,
          role: "superadmin",
          tenant_name: t.name,
          tenant_slug: t.slug,
          tenant_logo_url: t.logo_url,
        })) as TenantMembership[];
      }

      // Regular users: only their memberships
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

  // Fetch sub-tenants for the active tenant
  const { data: subTenants = [] } = useQuery({
    queryKey: ["sub_tenants_for_tenant", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_tenants")
        .select("id, name, slug")
        .eq("tenant_id", activeTenantId!)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data ?? []) as SubTenant[];
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

  // Clear sub-tenant if it doesn't belong to the active tenant
  useEffect(() => {
    if (!activeSubTenantId) return;
    if (subTenants.length && !subTenants.some((s) => s.id === activeSubTenantId)) {
      setActiveSubTenantId(null);
      localStorage.removeItem(ACTIVE_SUB_TENANT_KEY);
    }
  }, [subTenants, activeSubTenantId]);

  const activeTenant = tenants.find((t) => t.tenant_id === activeTenantId) ?? tenants[0] ?? null;
  const activeSubTenant = subTenants.find((s) => s.id === activeSubTenantId) ?? null;

  const switchTenant = useCallback(
    (tenantId: string) => {
      setActiveTenantId(tenantId);
      localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
      // Clear sub-tenant when switching tenant
      setActiveSubTenantId(null);
      localStorage.removeItem(ACTIVE_SUB_TENANT_KEY);
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  const switchSubTenant = useCallback(
    (subTenantId: string | null) => {
      setActiveSubTenantId(subTenantId);
      if (subTenantId) {
        localStorage.setItem(ACTIVE_SUB_TENANT_KEY, subTenantId);
      } else {
        localStorage.removeItem(ACTIVE_SUB_TENANT_KEY);
      }
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  return (
    <TenantContext.Provider value={{ tenants, activeTenant, activeSubTenant, subTenants, isLoading, isSuperadmin, switchTenant, switchSubTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenantContext must be used within TenantProvider");
  return ctx;
}
