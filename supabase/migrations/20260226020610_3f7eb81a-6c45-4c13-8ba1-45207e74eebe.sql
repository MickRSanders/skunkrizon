
-- Reusable field library: standalone data fields with configurable data sources
CREATE TABLE public.field_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sub_tenant_id UUID REFERENCES public.sub_tenants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL DEFAULT 'number',
  -- Data source config
  source_type TEXT NOT NULL DEFAULT 'manual',  -- 'manual', 'database', 'lookup'
  -- Database source fields
  db_table TEXT,
  db_column TEXT,
  -- Lookup source fields
  lookup_table_id UUID REFERENCES public.lookup_tables(id) ON DELETE SET NULL,
  lookup_key_column TEXT,
  lookup_value_column TEXT,
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique name per tenant
CREATE UNIQUE INDEX idx_field_library_name_tenant ON public.field_library (tenant_id, name);
CREATE INDEX idx_field_library_tenant ON public.field_library (tenant_id);
CREATE INDEX idx_field_library_lookup ON public.field_library (lookup_table_id) WHERE lookup_table_id IS NOT NULL;

ALTER TABLE public.field_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view fields"
  ON public.field_library FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can create fields"
  ON public.field_library FOR INSERT
  WITH CHECK (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Creators can update own fields"
  ON public.field_library FOR UPDATE
  USING (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can update any field"
  ON public.field_library FOR UPDATE
  USING (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can delete fields"
  ON public.field_library FOR DELETE
  USING (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Platform admins full access field library"
  ON public.field_library FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_field_library_updated_at
  BEFORE UPDATE ON public.field_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
