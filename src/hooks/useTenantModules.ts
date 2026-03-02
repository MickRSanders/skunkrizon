import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ALL_MODULE_KEYS = [
  "simulations",
  "pre_travel",
  "remote_work",
  "employees",
  "policies",
  "analytics",
  "calculations",
  "lookup_tables",
  "rates",
  "field_library",
  "field_mappings",
  "data_sources",
  "settings",
  "documents",
  "cost_estimate_templates",
  "roles_permissions",
  "tax_engine",
  "user_management",
  "tenant_management",
  "audit_log",
] as const;

export type ModuleKey = (typeof ALL_MODULE_KEYS)[number];

export const MODULE_KEY_LABELS: Record<ModuleKey, string> = {
  simulations: "Cost Simulations",
  pre_travel: "Pre-Travel",
  remote_work: "Remote Work",
  employees: "Employees",
  policies: "Policy Agent",
  analytics: "Analytics",
  calculations: "Calculations",
  lookup_tables: "Lookup Tables",
  rates: "Rates",
  field_library: "Field Library",
  field_mappings: "Field Mappings",
  data_sources: "Data Sources",
  settings: "General Settings",
  documents: "Documents",
  cost_estimate_templates: "Cost Estimate Templates",
  roles_permissions: "Roles & Permissions",
  tax_engine: "Tax Engine",
  user_management: "User Management",
  tenant_management: "Organizations",
  audit_log: "Audit Log",
};

/** Map route paths to module keys */
export const ROUTE_TO_MODULE: Record<string, ModuleKey> = {
  "/simulations": "simulations",
  "/pre-travel": "pre_travel",
  "/remote-work": "remote_work",
  "/employees": "employees",
  "/policies": "policies",
  "/analytics": "analytics",
  "/calculations": "calculations",
  "/lookup-tables": "rates",
  "/rates": "rates",
  "/field-library": "field_library",
  "/field-mappings": "field_mappings",
  "/data-sources": "data_sources",
  "/settings": "settings",
  "/documents": "documents",
  "/cost-estimate-templates": "cost_estimate_templates",
  "/settings/roles": "roles_permissions",
  "/tax-engine": "tax_engine",
  "/users": "user_management",
  "/tenants": "tenant_management",
  "/audit-log": "audit_log",
};

export interface TenantModule {
  id: string;
  tenant_id: string;
  module_key: string;
  is_enabled: boolean;
}

/** Fetch modules for a specific tenant */
export function useTenantModulesForTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant_modules", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_modules" as any)
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return (data as any[]) as TenantModule[];
    },
  });
}

/** Toggle a module on/off */
export function useToggleTenantModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tenantId,
      moduleKey,
      isEnabled,
    }: {
      tenantId: string;
      moduleKey: string;
      isEnabled: boolean;
    }) => {
      // Upsert
      const { error } = await supabase
        .from("tenant_modules" as any)
        .upsert(
          { tenant_id: tenantId, module_key: moduleKey, is_enabled: isEnabled } as any,
          { onConflict: "tenant_id,module_key" }
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tenant_modules", vars.tenantId] });
    },
  });
}

/** Check if a module key is enabled for the current tenant */
export function isModuleEnabled(
  modules: TenantModule[] | undefined,
  moduleKey: ModuleKey
): boolean {
  if (!modules) return true; // default: enabled while loading
  const m = modules.find((mod) => mod.module_key === moduleKey);
  return m ? m.is_enabled : true; // default enabled if no row exists
}
