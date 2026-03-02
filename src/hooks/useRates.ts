import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";

export interface RateTable {
  id: string;
  tenant_id: string;
  sub_tenant_id: string | null;
  name: string;
  table_type: string;
  description: string | null;
  customer_code: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RateTableColumn {
  id: string;
  rate_table_id: string;
  column_key: string;
  column_label: string;
  column_type: string;
  is_dimension: boolean;
  sort_order: number;
  created_at: string;
}

export interface RateTableEntry {
  id: string;
  rate_table_id: string;
  customer_code: string | null;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
  origin_location_id: string | null;
  origin_location_type: string | null;
  destination_location_id: string | null;
  destination_location_type: string | null;
  location_id: string | null;
  location_type: string | null;
  amount: number | null;
  currency: string | null;
  time_span: string | null;
  percentage: number | null;
  dimensions: Record<string, any>;
  scope_option_code: string | null;
  scope_group: string | null;
  not_required: boolean;
  frequency: string | null;
  source_profile_item: string | null;
  source_currency_profile_item: string | null;
  created_at: string;
  updated_at: string;
}

export const RATE_TABLE_TYPES = [
  { value: "estimate_service", label: "Mobility Service Rates", description: "Rates for shipping, housing, airfare, etc." },
  { value: "estimate_cash", label: "Policy Cash Allowance", description: "Cash amounts based on variables like family size" },
  { value: "factor_cash_percentage", label: "Policy Percentage Factor", description: "Percentage-based calculations on profile items" },
  { value: "factor_cash_scope", label: "Policy Scope", description: "Scope options for non-cash benefits" },
  { value: "data_provider", label: "Data Provider Rates", description: "COLA indices, hardship, per diem from providers" },
] as const;

export function useRateTables() {
  const { activeTenant, activeSubTenant } = useTenantContext();
  const tenantId = activeTenant?.tenant_id;

  return useQuery({
    queryKey: ["rate_tables", tenantId, activeSubTenant?.id],
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from("rate_tables" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");

      if (activeSubTenant) {
        query = query.or(`sub_tenant_id.eq.${activeSubTenant.id},sub_tenant_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as RateTable[];
    },
  });
}

export function useRateTableColumns(rateTableId: string | undefined) {
  return useQuery({
    queryKey: ["rate_table_columns", rateTableId],
    enabled: !!rateTableId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_table_columns" as any)
        .select("*")
        .eq("rate_table_id", rateTableId!)
        .order("sort_order");
      if (error) throw error;
      return (data as any[]) as RateTableColumn[];
    },
  });
}

export function useRateTableEntries(rateTableId: string | undefined) {
  return useQuery({
    queryKey: ["rate_table_entries", rateTableId],
    enabled: !!rateTableId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_table_entries" as any)
        .select("*")
        .eq("rate_table_id", rateTableId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as RateTableEntry[];
    },
  });
}

export function useCreateRateTable() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useMutation({
    mutationFn: async (input: { name: string; table_type: string; description?: string; customer_code?: string }) => {
      const { data, error } = await supabase
        .from("rate_tables" as any)
        .insert({
          ...input,
          tenant_id: activeTenant!.tenant_id,
          sub_tenant_id: activeSubTenant?.id || null,
          created_by: user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as any as RateTable;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rate_tables"] });
    },
  });
}

export function useDeleteRateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_tables" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rate_tables"] });
    },
  });
}

export function useUpsertRateTableColumns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rateTableId, columns }: { rateTableId: string; columns: Omit<RateTableColumn, "id" | "created_at">[] }) => {
      // Delete existing then insert
      await supabase.from("rate_table_columns" as any).delete().eq("rate_table_id", rateTableId);
      if (columns.length > 0) {
        const { error } = await supabase.from("rate_table_columns" as any).insert(columns as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rate_table_columns", vars.rateTableId] });
    },
  });
}

export function useBulkInsertRateEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rateTableId, entries }: { rateTableId: string; entries: Partial<RateTableEntry>[] }) => {
      const rows = entries.map((e) => ({ ...e, rate_table_id: rateTableId }));
      // Insert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("rate_table_entries" as any).insert(batch as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rate_table_entries", vars.rateTableId] });
    },
  });
}

export function useDeleteRateEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rateTableId, entryIds }: { rateTableId: string; entryIds?: string[] }) => {
      if (entryIds) {
        const { error } = await supabase.from("rate_table_entries" as any).delete().in("id", entryIds);
        if (error) throw error;
      } else {
        // Delete all entries for the table
        const { error } = await supabase.from("rate_table_entries" as any).delete().eq("rate_table_id", rateTableId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rate_table_entries", vars.rateTableId] });
    },
  });
}
