import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "superadmin" | "admin" | "analyst" | "viewer";

export const ALL_MODULES = [
  "simulations",
  "policies",
  "calculations",
  "analytics",
  "lookup_tables",
  "field_library",
  "data_sources",
  "tax_engine",
  "settings",
  "user_management",
  "tenant_management",
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export const MODULE_LABELS: Record<AppModule, string> = {
  simulations: "Simulations",
  policies: "Policies",
  calculations: "Calculations",
  analytics: "Analytics",
  lookup_tables: "Lookup Tables",
  field_library: "Field Library",
  data_sources: "Data Sources",
  tax_engine: "Tax Engine",
  settings: "Settings",
  user_management: "User Management",
  tenant_management: "Organizations",
};

export interface RolePermission {
  id: string;
  role: AppRole;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

/** Fetch all role_permissions rows */
export function useRolePermissions() {
  return useQuery({
    queryKey: ["role_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("role")
        .order("module");
      if (error) throw error;
      return data as RolePermission[];
    },
  });
}

/** Update a single permission toggle */
export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: "can_view" | "can_create" | "can_update" | "can_delete";
      value: boolean;
    }) => {
      const { error } = await supabase
        .from("role_permissions")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role_permissions"] }),
  });
}

/** Get the current user's role */
export function useCurrentUserRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current_user_role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      // Prioritize highest role
      const roles = data.map((r) => r.role as AppRole);
      if (roles.includes("superadmin")) return "superadmin" as AppRole;
      if (roles.includes("admin")) return "admin" as AppRole;
      if (roles.includes("analyst")) return "analyst" as AppRole;
      return "viewer" as AppRole;
    },
  });
}

/** Hook to check a specific permission for the current user */
export function useHasPermission(
  module: AppModule,
  action: "can_view" | "can_create" | "can_update" | "can_delete"
) {
  const { data: role } = useCurrentUserRole();
  const { data: permissions } = useRolePermissions();

  if (!role || !permissions) return undefined; // loading

  const perm = permissions.find(
    (p) => p.role === role && p.module === module
  );
  return perm ? perm[action] : false;
}

/** Non-hook helper: build a permissions map for a role */
export function buildPermissionsMap(
  permissions: RolePermission[],
  role: AppRole
): Record<AppModule, { can_view: boolean; can_create: boolean; can_update: boolean; can_delete: boolean }> {
  const map = {} as Record<AppModule, { can_view: boolean; can_create: boolean; can_update: boolean; can_delete: boolean }>;
  for (const m of ALL_MODULES) {
    const p = permissions.find((r) => r.role === role && r.module === m);
    map[m] = p
      ? { can_view: p.can_view, can_create: p.can_create, can_update: p.can_update, can_delete: p.can_delete }
      : { can_view: false, can_create: false, can_update: false, can_delete: false };
  }
  return map;
}
