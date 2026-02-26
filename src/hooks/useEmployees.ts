import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  job_title: string | null;
  job_grade: string | null;
  division: string | null;
  base_salary: number;
  currency: string;
  bonus_percent: number | null;
  bonus_amount: number | null;
  city: string | null;
  country: string | null;
  status: string;
}

export function useEmployees(options?: { activeOnly?: boolean }) {
  const { activeTenant } = useTenantContext();
  const tenantId = activeTenant?.tenant_id;
  const activeOnly = options?.activeOnly ?? false;

  return useQuery({
    queryKey: ["employees", tenantId, activeOnly],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("employees")
        .select("id, employee_code, first_name, last_name, email, phone, date_of_birth, job_title, job_grade, division, base_salary, currency, bonus_percent, bonus_amount, city, country, status")
        .eq("tenant_id", tenantId)
        .order("last_name")
        .limit(1000) as any;
      if (activeOnly) q = q.eq("status", "active");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
    enabled: !!tenantId,
  });
}
