import { Navigate, useLocation } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useTenantModulesForTenant, ROUTE_TO_MODULE, isModuleEnabled } from "@/hooks/useTenantModules";

/**
 * Wraps protected routes and redirects to dashboard if the module
 * corresponding to the current route is disabled for the active tenant.
 */
export default function ModuleGuard({ children }: { children: React.ReactNode }) {
  const { activeTenant } = useTenantContext();
  const { data: modules } = useTenantModulesForTenant(activeTenant?.tenant_id);
  const location = useLocation();

  // Find the module key for the current path
  // Try exact match first, then prefix match for nested routes like /pre-travel/:id
  const moduleKey =
    ROUTE_TO_MODULE[location.pathname] ??
    Object.entries(ROUTE_TO_MODULE).find(
      ([route]) => route !== "/" && location.pathname.startsWith(route)
    )?.[1];

  // Dashboard and unknown routes are always accessible
  if (!moduleKey) return <>{children}</>;

  // While loading modules, render children (avoid flash)
  if (!modules) return <>{children}</>;

  if (!isModuleEnabled(modules, moduleKey)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
