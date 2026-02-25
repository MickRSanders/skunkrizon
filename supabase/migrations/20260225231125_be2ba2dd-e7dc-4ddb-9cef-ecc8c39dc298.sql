
-- Calculation fields: each field is a named component in a formula
CREATE TABLE public.calculation_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_id UUID NOT NULL REFERENCES public.calculations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'number', -- number, percentage, currency, text
  position INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calculation_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fields" ON public.calculation_fields
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Creators can manage fields" ON public.calculation_fields
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calculations c WHERE c.id = calculation_id AND c.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calculations c WHERE c.id = calculation_id AND c.created_by = auth.uid()));

CREATE POLICY "Admins can manage all fields" ON public.calculation_fields
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_calculation_fields_updated_at
  BEFORE UPDATE ON public.calculation_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Data sources: links a field to its data provider
CREATE TYPE public.data_source_type AS ENUM ('manual', 'api_connector', 'rate_file', 'lookup_table');

CREATE TABLE public.field_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES public.calculation_fields(id) ON DELETE CASCADE,
  source_type public.data_source_type NOT NULL DEFAULT 'manual',
  -- API connector config
  connector_name TEXT,
  connector_config JSONB DEFAULT '{}'::jsonb,
  -- Rate file reference
  rate_file_path TEXT,
  rate_file_name TEXT,
  -- Lookup table reference
  lookup_table_id UUID,
  lookup_key_column TEXT,
  lookup_value_column TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(field_id)
);

ALTER TABLE public.field_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view data sources" ON public.field_data_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Field owners can manage data sources" ON public.field_data_sources
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calculation_fields cf
    JOIN public.calculations c ON c.id = cf.calculation_id
    WHERE cf.id = field_id AND c.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calculation_fields cf
    JOIN public.calculations c ON c.id = cf.calculation_id
    WHERE cf.id = field_id AND c.created_by = auth.uid()
  ));

CREATE POLICY "Admins can manage all data sources" ON public.field_data_sources
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_field_data_sources_updated_at
  BEFORE UPDATE ON public.field_data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lookup tables: user-created reference tables
CREATE TABLE public.lookup_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name, type}]
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lookup_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lookup tables" ON public.lookup_tables
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Creators can manage own lookup tables" ON public.lookup_tables
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all lookup tables" ON public.lookup_tables
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_lookup_tables_updated_at
  BEFORE UPDATE ON public.lookup_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lookup table rows
CREATE TABLE public.lookup_table_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lookup_table_id UUID NOT NULL REFERENCES public.lookup_tables(id) ON DELETE CASCADE,
  row_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lookup_table_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lookup rows" ON public.lookup_table_rows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can manage lookup rows" ON public.lookup_table_rows
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lookup_tables lt WHERE lt.id = lookup_table_id AND lt.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lookup_tables lt WHERE lt.id = lookup_table_id AND lt.created_by = auth.uid()));

CREATE POLICY "Admins can manage all lookup rows" ON public.lookup_table_rows
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add FK from field_data_sources to lookup_tables
ALTER TABLE public.field_data_sources
  ADD CONSTRAINT field_data_sources_lookup_table_id_fkey
  FOREIGN KEY (lookup_table_id) REFERENCES public.lookup_tables(id) ON DELETE SET NULL;

-- Storage bucket for rate files
INSERT INTO storage.buckets (id, name, public) VALUES ('rate-files', 'rate-files', false);

CREATE POLICY "Auth users can upload rate files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rate-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users can view own rate files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'rate-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users can delete own rate files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'rate-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all rate files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'rate-files' AND has_role(auth.uid(), 'admin'::app_role));
