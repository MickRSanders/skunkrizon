
-- 1. Add "approved" to simulation_status enum
ALTER TYPE simulation_status ADD VALUE IF NOT EXISTS 'approved';

-- 2. LOA Templates
CREATE TABLE public.loa_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditional_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loa_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access loa_templates" ON public.loa_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant admins can manage loa_templates" ON public.loa_templates FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can view loa_templates" ON public.loa_templates FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- 3. LOA Documents (generated from approved sims)
CREATE TABLE public.loa_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.loa_templates(id),
  template_version INTEGER,
  employee_name TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  signature_status TEXT DEFAULT 'none',
  version INTEGER NOT NULL DEFAULT 1,
  generated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loa_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access loa_documents" ON public.loa_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant members can view loa_documents" ON public.loa_documents FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can create loa_documents" ON public.loa_documents FOR INSERT
  WITH CHECK (generated_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Owners can update loa_documents" ON public.loa_documents FOR UPDATE
  USING (generated_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- 4. Balance Sheets
CREATE TABLE public.balance_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  format_type TEXT NOT NULL DEFAULT 'home_host',
  home_currency TEXT NOT NULL DEFAULT 'USD',
  host_currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC,
  exchange_rate_date TIMESTAMPTZ,
  display_mode TEXT NOT NULL DEFAULT 'dual',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy_explanations JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  generated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access balance_sheets" ON public.balance_sheets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant members can view balance_sheets" ON public.balance_sheets FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can create balance_sheets" ON public.balance_sheets FOR INSERT
  WITH CHECK (generated_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Owners can update balance_sheets" ON public.balance_sheets FOR UPDATE
  USING (generated_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- 5. Pay Instructions
CREATE TABLE public.pay_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  cost_center TEXT,
  gl_code TEXT,
  payment_currency TEXT NOT NULL DEFAULT 'USD',
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  generated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pay_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access pay_instructions" ON public.pay_instructions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant members can view pay_instructions" ON public.pay_instructions FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can create pay_instructions" ON public.pay_instructions FOR INSERT
  WITH CHECK (generated_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Owners can update pay_instructions" ON public.pay_instructions FOR UPDATE
  USING (generated_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- 6. Field Mappings (integration framework)
CREATE TABLE public.field_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  source_system TEXT NOT NULL DEFAULT 'employee_directory',
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  transform_rule TEXT,
  fallback_value TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access field_mappings" ON public.field_mappings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant admins can manage field_mappings" ON public.field_mappings FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can view field_mappings" ON public.field_mappings FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- Triggers for updated_at
CREATE TRIGGER update_loa_templates_updated_at BEFORE UPDATE ON public.loa_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loa_documents_updated_at BEFORE UPDATE ON public.loa_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_balance_sheets_updated_at BEFORE UPDATE ON public.balance_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pay_instructions_updated_at BEFORE UPDATE ON public.pay_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_field_mappings_updated_at BEFORE UPDATE ON public.field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
