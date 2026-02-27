import { Navigate, useLocation } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useTenantModulesForTenant, ROUTE_TO_MODULE, isModuleEnabled } from "@/hooks/useTenantModules";
import { useCurrentUserRole } from "@/hooks/usePermissions";

const EMPLOYEE_ALLOWED_ROUTES = new Set(["/pre-travel", "/remote-work", "/documents"]);

/**
 * Wraps protected routes and redirects to dashboard if the module
 * corresponding to the current route is disabled for the active tenant,
 * or if the user's role doesn't permit the route.
 */
export default function ModuleGuard({ children }: { children: React.ReactNode }) {
  const { activeTenant } = useTenantContext();
  const { data: modules } = useTenantModulesForTenant(activeTenant?.tenant_id);
  const { data: role } = useCurrentUserRole();
  const location = useLocation();

  // Employee role restriction: only allow specific routes
  if (role === "employee") {
    const allowed = Array.from(EMPLOYEE_ALLOWED_ROUTES).some(
      (route) => location.pathname === route || location.pathname.startsWith(route + "/")
    );
    if (!allowed) return <Navigate to="/" replace />;
  }

  // Find the module key for the current path
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
