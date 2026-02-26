import { useTenantContext } from "@/contexts/TenantContext";

/**
 * Returns the current user's active tenant membership.
 * Wraps TenantContext for backward compatibility.
 */
export function useCurrentTenant() {
  const { activeTenant, isLoading } = useTenantContext();

  return {
    data: activeTenant,
    isLoading,
  };
}
