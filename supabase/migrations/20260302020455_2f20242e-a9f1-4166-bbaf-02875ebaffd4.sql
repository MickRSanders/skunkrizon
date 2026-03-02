
-- Rate tables: metadata about each rate table
CREATE TABLE public.rate_tables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  sub_tenant_id uuid REFERENCES public.sub_tenants(id),
  name text NOT NULL,
  table_type text NOT NULL DEFAULT 'estimate_service',
  description text,
  customer_code text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Rate table columns/dimensions definition
CREATE TABLE public.rate_table_columns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_table_id uuid NOT NULL REFERENCES public.rate_tables(id) ON DELETE CASCADE,
  column_key text NOT NULL,
  column_label text NOT NULL,
  column_type text NOT NULL DEFAULT 'text',
  is_dimension boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rate table entries: actual rate data
CREATE TABLE public.rate_table_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_table_id uuid NOT NULL REFERENCES public.rate_tables(id) ON DELETE CASCADE,
  customer_code text,
  status text NOT NULL DEFAULT 'ACTIVE',
  valid_from timestamptz,
  valid_to timestamptz,
  origin_location_id text,
  origin_location_type text,
  destination_location_id text,
  destination_location_type text,
  location_id text,
  location_type text,
  amount numeric,
  currency text DEFAULT 'USD',
  time_span text,
  percentage numeric,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  scope_option_code text,
  scope_group text,
  not_required boolean NOT NULL DEFAULT false,
  frequency text,
  source_profile_item text,
  source_currency_profile_item text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rate_tables_tenant ON public.rate_tables(tenant_id);
CREATE INDEX idx_rate_tables_type ON public.rate_tables(table_type);
CREATE INDEX idx_rate_table_entries_table ON public.rate_table_entries(rate_table_id);
CREATE INDEX idx_rate_table_entries_status ON public.rate_table_entries(status);
CREATE INDEX idx_rate_table_entries_location ON public.rate_table_entries(location_id);
CREATE INDEX idx_rate_table_entries_dims ON public.rate_table_entries USING GIN(dimensions);
CREATE INDEX idx_rate_table_columns_table ON public.rate_table_columns(rate_table_id);

-- Updated_at triggers
CREATE TRIGGER update_rate_tables_updated_at
  BEFORE UPDATE ON public.rate_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rate_table_entries_updated_at
  BEFORE UPDATE ON public.rate_table_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.rate_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_table_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_table_entries ENABLE ROW LEVEL SECURITY;

-- rate_tables policies
CREATE POLICY "Admins full access rate_tables"
  ON public.rate_tables FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view rate_tables"
  ON public.rate_tables FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can create rate_tables"
  ON public.rate_tables FOR INSERT
  WITH CHECK (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Creators can update own rate_tables"
  ON public.rate_tables FOR UPDATE
  USING (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can update rate_tables"
  ON public.rate_tables FOR UPDATE
  USING (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can delete rate_tables"
  ON public.rate_tables FOR DELETE
  USING (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Sub-tenant members can view rate_tables"
  ON public.rate_tables FOR SELECT
  USING (is_sub_tenant_member(auth.uid(), tenant_id));

-- rate_table_columns policies
CREATE POLICY "Admins full access rate_table_columns"
  ON public.rate_table_columns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view rate_table_columns"
  ON public.rate_table_columns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rate_tables rt WHERE rt.id = rate_table_columns.rate_table_id
    AND is_tenant_member(auth.uid(), rt.tenant_id)
  ));

CREATE POLICY "Tenant members can manage rate_table_columns"
  ON public.rate_table_columns FOR ALL
  USING (EXISTS (
    SELECT 1 FROM rate_tables rt WHERE rt.id = rate_table_columns.rate_table_id
    AND (rt.created_by = auth.uid() OR is_tenant_admin(auth.uid(), rt.tenant_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM rate_tables rt WHERE rt.id = rate_table_columns.rate_table_id
    AND (rt.created_by = auth.uid() OR is_tenant_admin(auth.uid(), rt.tenant_id))
  ));

-- rate_table_entries policies
CREATE POLICY "Admins full access rate_table_entries"
  ON public.rate_table_entries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view rate_table_entries"
  ON public.rate_table_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rate_tables rt WHERE rt.id = rate_table_entries.rate_table_id
    AND is_tenant_member(auth.uid(), rt.tenant_id)
  ));

CREATE POLICY "Tenant members can manage rate_table_entries"
  ON public.rate_table_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM rate_tables rt WHERE rt.id = rate_table_entries.rate_table_id
    AND (rt.created_by = auth.uid() OR is_tenant_admin(auth.uid(), rt.tenant_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM rate_tables rt WHERE rt.id = rate_table_entries.rate_table_id
    AND (rt.created_by = auth.uid() OR is_tenant_admin(auth.uid(), rt.tenant_id))
  ));

CREATE POLICY "Sub-tenant members can view rate_table_entries"
  ON public.rate_table_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rate_tables rt WHERE rt.id = rate_table_entries.rate_table_id
    AND is_sub_tenant_member(auth.uid(), rt.tenant_id)
  ));

-- Add rate_tables module key
INSERT INTO public.tenant_modules (tenant_id, module_key, is_enabled)
SELECT t.id, 'rates', true FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_modules tm WHERE tm.tenant_id = t.id AND tm.module_key = 'rates'
);
