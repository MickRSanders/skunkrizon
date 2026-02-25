import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useSimulations() {
  return useQuery({
    queryKey: ["simulations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSimulation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sim: Omit<TablesInsert<"simulations">, "owner_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("simulations")
        .insert({ ...sim, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["simulations"] }),
  });
}
