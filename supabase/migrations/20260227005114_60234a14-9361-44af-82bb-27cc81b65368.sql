
-- Cost Estimate Templates (parent entity)
CREATE TABLE public.cost_estimate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'move_host_based', -- move_host_based, stay_at_home, local_host
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- derived: draft, pending_activation, active, pending_deactivation, inactive
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cost Estimate Template Versions
CREATE TABLE public.cost_estimate_template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.cost_estimate_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_activation, active, pending_deactivation, inactive
  effective_from DATE,
  effective_to DATE,
  -- General settings
  display_currency TEXT NOT NULL DEFAULT 'USD', -- home, host, or ISO code
  inflation_rate NUMERIC, -- nullable = no inflation
  include_tax_calculation BOOLEAN NOT NULL DEFAULT true,
  tax_calculation_method TEXT DEFAULT 'tax-equalization',
  hypo_tax_country TEXT,
  hypo_tax_region TEXT,
  hypo_tax_city TEXT,
  hypo_social_tax_country TEXT,
  hypo_social_tax_city TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template Policy Mappings (which policies use which template)
CREATE TABLE public.cost_estimate_policy_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.cost_estimate_templates(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL DEFAULT 'policy_type', -- policy_type or policy_id
  policy_type TEXT, -- e.g. LONG_TERM_ASSIGNMENT, SHORT_TERM_ASSIGNMENT
  policy_id UUID REFERENCES public.policies(id),
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compensation items per template version
CREATE TABLE public.cost_estimate_compensation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.cost_estimate_template_versions(id) ON DELETE CASCADE,
  paycode TEXT NOT NULL,
  display_label TEXT NOT NULL,
  display_category TEXT NOT NULL DEFAULT 'Salary', -- Salary, Benefits, Incentive Compensation, Deferred Compensation
  home_country TEXT, -- ISO3, nullable = all countries
  host_country TEXT, -- ISO3, nullable = all countries
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  default_value NUMERIC,
  calculation_formula TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tax settings per template version (country-specific)
CREATE TABLE public.cost_estimate_tax_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.cost_estimate_template_versions(id) ON DELETE CASCADE,
  tax_setting_code TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  country TEXT, -- nullable = global
  country_type TEXT, -- HOME, HOST, HYPO
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detail fields shown in the CE header/details section (per template, not version)
CREATE TABLE public.cost_estimate_detail_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.cost_estimate_templates(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  display_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated Cost Estimates
CREATE TABLE public.cost_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  simulation_id UUID NOT NULL REFERENCES public.simulations(id),
  template_id UUID NOT NULL REFERENCES public.cost_estimate_templates(id),
  template_version_id UUID NOT NULL REFERENCES public.cost_estimate_template_versions(id),
  employee_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, final, archived
  version INTEGER NOT NULL DEFAULT 1,
  display_currency TEXT NOT NULL DEFAULT 'USD',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  details_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  tax_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_cost NUMERIC,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cost_estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimate_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimate_policy_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimate_compensation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimate_tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimate_detail_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimates ENABLE ROW LEVEL SECURITY;

-- RLS policies for cost_estimate_templates
CREATE POLICY "Admins full access ce_templates" ON public.cost_estimate_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant admins can manage ce_templates" ON public.cost_estimate_templates FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can view ce_templates" ON public.cost_estimate_templates FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- RLS for template versions (cascade through template)
CREATE POLICY "Admins full access ce_versions" ON public.cost_estimate_template_versions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant members can manage ce_versions" ON public.cost_estimate_template_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM cost_estimate_templates t WHERE t.id = cost_estimate_template_versions.template_id AND is_tenant_member(auth.uid(), t.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM cost_estimate_templates t WHERE t.id = cost_estimate_template_versions.template_id AND is_tenant_member(auth.uid(), t.tenant_id)));

-- RLS for policy mappings
CREATE POLICY "Admins full access ce_mappings" ON public.cost_estimate_policy_mappings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant members can manage ce_mappings" ON public.cost_estimate_policy_mappings FOR ALL
  USING (EXISTS (SELECT 1 FROM cost_estimate_templates t WHERE t.id = cost_estimate_policy_mappings.template_id AND is_tenant_member(auth.uid(), t.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM cost_estimate_templates t WHERE t.id = cost_estimate_policy_mappings.template_id AND is_tenant_member(auth.uid(), t.tenant_id)));

-- RLS for compensation items
CREATE POLICY "Admins full access ce_comp_items" ON public.cost_estimate_compensation_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant members can manage ce_comp_items" ON public.cost_estimate_compensation_items FOR ALL
  USING (EXISTS (SELECT 1 FROM cost_estimate_template_versions v JOIN cost_estimate_templates t ON t.id = v.template_id WHERE v.id = cost_estimate_compensation_items.version_id AND is_tenant_member(auth.uid(), t.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM cost_estimate_template_versions v JOIN cost_estimate_templates t ON t.id = v.template_id WHERE v.id = cost_estimate_compensation_items.version_id AND is_tenant_member(auth.uid(), t.tenant_id)));

-- RLS for tax settings
CREATE POLICY "Admins full access ce_tax_settings" ON public.cost_estimate_tax_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant members can manage ce_tax_settings" ON public.cost_estimate_tax_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM cost_estimate_template_versions v JOIN cost_estimate_templates t ON t.id = v.template_id WHERE v.id = cost_estimate_tax_settings.version_id AND is_tenant_member(auth.uid(), t.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM cost_estimate_template_versions v JOIN cost_estimate_templates t ON t.id = v.template_id WHERE v.id = cost_estimate_tax_settings.version_id AND is_tenant_member(auth.uid(), t.tenant_id)));

-- RLS for detail fields
CREATE POLICY "Admins full access ce_detail_fields" ON public.cost_estimate_detail_fields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant members can manage ce_detail_fields" ON public.cost_estimate_detail_fields FOR ALL
  USING (EXISTS (SELECT 1 FROM cost_estimate_templates t WHERE t.id = cost_estimate_detail_fields.template_id AND is_tenant_member(auth.uid(), t.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM cost_estimate_templates t WHERE t.id = cost_estimate_detail_fields.template_id AND is_tenant_member(auth.uid(), t.tenant_id)));

-- RLS for cost estimates
CREATE POLICY "Admins full access cost_estimates" ON public.cost_estimates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant members can create cost_estimates" ON public.cost_estimates FOR INSERT
  WITH CHECK (generated_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can view cost_estimates" ON public.cost_estimates FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Owners can update cost_estimates" ON public.cost_estimates FOR UPDATE
  USING (generated_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- Updated_at triggers
CREATE TRIGGER update_ce_templates_updated_at BEFORE UPDATE ON public.cost_estimate_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ce_versions_updated_at BEFORE UPDATE ON public.cost_estimate_template_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cost_estimates_updated_at BEFORE UPDATE ON public.cost_estimates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
