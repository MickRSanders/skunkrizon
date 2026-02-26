import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Dependent {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  date_of_birth: string | null;
}

export function useEmployeeDependents(employeeId: string | null) {
  return useQuery({
    queryKey: ["employee_dependents", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("employee_dependents")
        .select("*")
        .eq("employee_id", employeeId)
        .order("relationship") as any;
      if (error) throw error;
      return (data ?? []) as Dependent[];
    },
    enabled: !!employeeId,
  });
}
