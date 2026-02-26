import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";

export type FieldLibraryItem = {
  id: string;
  tenant_id: string;
  sub_tenant_id: string | null;
  name: string;
  label: string;
  description: string | null;
  field_type: string;
  source_type: string;
  db_table: string | null;
  db_column: string | null;
  lookup_table_id: string | null;
  lookup_key_column: string | null;
  lookup_value_column: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useFieldLibrary() {
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useQuery({
    queryKey: ["field_library", activeTenant?.tenant_id, activeSubTenant?.id],
    enabled: !!activeTenant?.tenant_id,
    queryFn: async () => {
      let query = supabase
        .from("field_library" as any)
        .select("*")
        .eq("tenant_id", activeTenant!.tenant_id)
        .order("name");

      if (activeSubTenant) {
        query = query.eq("sub_tenant_id", activeSubTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FieldLibraryItem[];
    },
  });
}

export function useCreateFieldLibraryItem() {
  const qc = useQueryClient();
  const { activeTenant, activeSubTenant } = useTenantContext();

  return useMutation({
    mutationFn: async (item: Omit<FieldLibraryItem, "id" | "created_at" | "updated_at" | "tenant_id" | "sub_tenant_id">) => {
      const { data, error } = await supabase
        .from("field_library" as any)
        .insert({
          ...item,
          tenant_id: activeTenant!.tenant_id,
          sub_tenant_id: activeSubTenant?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FieldLibraryItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field_library"] }),
  });
}

export function useUpdateFieldLibraryItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FieldLibraryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("field_library" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FieldLibraryItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field_library"] }),
  });
}

export function useDeleteFieldLibraryItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("field_library" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field_library"] }),
  });
}
