
-- Add unique constraint on name per tenant
CREATE UNIQUE INDEX idx_lookup_tables_name_tenant
ON public.lookup_tables (tenant_id, name);
