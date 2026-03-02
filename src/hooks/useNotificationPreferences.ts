import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationPreference {
  id: string;
  user_id: string;
  entity_type: string;
  enabled: boolean;
}

const NOTIFICATION_TYPES = [
  { key: "simulation", label: "Simulation Updates", description: "Status changes and completions" },
  { key: "policy", label: "Policy Changes", description: "New policies and modifications" },
] as const;

export { NOTIFICATION_TYPES };

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification_preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as NotificationPreference[];
    },
  });
}

export function useToggleNotificationPreference() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ entityType, enabled }: { entityType: string; enabled: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      // Upsert preference
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: user.id, entity_type: entityType, enabled, updated_at: new Date().toISOString() },
          { onConflict: "user_id,entity_type" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification_preferences", user?.id] });
    },
  });
}

/** Returns a set of disabled entity_types for quick filtering */
export function useDisabledNotificationTypes(): Set<string> {
  const { data: prefs } = useNotificationPreferences();
  const disabled = new Set<string>();
  prefs?.forEach((p) => {
    if (!p.enabled) disabled.add(p.entity_type);
  });
  return disabled;
}
