import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Calculation = Tables<"calculations">;
export type CalculationField = Tables<"calculation_fields">;
export type FieldDataSource = Tables<"field_data_sources">;
export type LookupTable = Tables<"lookup_tables">;
export type LookupTableRow = Tables<"lookup_table_rows">;

// ─── Calculations ──────────────────────────────────────────────

export function useCalculations() {
  return useQuery({
    queryKey: ["calculations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (calc: TablesInsert<"calculations">) => {
      const { data, error } = await supabase.from("calculations").insert(calc).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calculations"] }),
  });
}

export function useUpdateCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"calculations"> & { id: string }) => {
      const { data, error } = await supabase.from("calculations").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calculations"] }),
  });
}

export function useDeleteCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calculations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calculations"] }),
  });
}

// ─── Calculation Fields ────────────────────────────────────────

export function useAllCalculationFields() {
  return useQuery({
    queryKey: ["calculation_fields", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculation_fields")
        .select("*, field_data_sources(*)")
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useCalculationFields(calculationId: string | null) {
  return useQuery({
    queryKey: ["calculation_fields", calculationId],
    enabled: !!calculationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculation_fields")
        .select("*, field_data_sources(*)")
        .eq("calculation_id", calculationId!)
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (field: TablesInsert<"calculation_fields">) => {
      const { data, error } = await supabase.from("calculation_fields").insert(field).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["calculation_fields", vars.calculation_id] }),
  });
}

export function useUpdateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, calculationId, ...updates }: TablesUpdate<"calculation_fields"> & { id: string; calculationId: string }) => {
      const { data, error } = await supabase.from("calculation_fields").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return { data, calculationId };
    },
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ["calculation_fields", result.calculationId] }),
  });
}

export function useDeleteField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, calculationId }: { id: string; calculationId: string }) => {
      const { error } = await supabase.from("calculation_fields").delete().eq("id", id);
      if (error) throw error;
      return calculationId;
    },
    onSuccess: (calcId) => qc.invalidateQueries({ queryKey: ["calculation_fields", calcId] }),
  });
}

export function useUpsertDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ calculationId, ...source }: TablesInsert<"field_data_sources"> & { calculationId: string }) => {
      const { data, error } = await supabase
        .from("field_data_sources")
        .upsert(source, { onConflict: "field_id" })
        .select()
        .single();
      if (error) throw error;
      return { data, calculationId };
    },
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ["calculation_fields", result.calculationId] }),
  });
}

// ─── Lookup Tables ─────────────────────────────────────────────

export function useLookupTables() {
  return useQuery({
    queryKey: ["lookup_tables"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lookup_tables").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLookupTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (table: TablesInsert<"lookup_tables">) => {
      const { data, error } = await supabase.from("lookup_tables").insert(table).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lookup_tables"] }),
  });
}

export function useLookupTableRows(tableId: string | null) {
  return useQuery({
    queryKey: ["lookup_table_rows", tableId],
    enabled: !!tableId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lookup_table_rows")
        .select("*")
        .eq("lookup_table_id", tableId!)
        .order("row_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useBulkInsertRows() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tableId, rows }: { tableId: string; rows: TablesInsert<"lookup_table_rows">[] }) => {
      const { error } = await supabase.from("lookup_table_rows").insert(rows);
      if (error) throw error;
      return tableId;
    },
    onSuccess: (tableId) => qc.invalidateQueries({ queryKey: ["lookup_table_rows", tableId] }),
  });
}
