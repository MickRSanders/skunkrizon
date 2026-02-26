
-- Table to store tax configuration per tenant
CREATE TABLE public.tenant_tax_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tax_treatment TEXT NOT NULL DEFAULT 'equalized',
  gross_up_mode TEXT NOT NULL DEFAULT 'standard',
  include_social_security BOOLEAN NOT NULL DEFAULT true,
  include_housing_in_gross_up BOOLEAN NOT NULL DEFAULT true,
  include_education_in_gross_up BOOLEAN NOT NULL DEFAULT false,
  include_cola_in_gross_up BOOLEAN NOT NULL DEFAULT true,
  hypo_tax_method TEXT NOT NULL DEFAULT 'marginal',
  equalization_settlement TEXT NOT NULL DEFAULT 'annual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view tax settings"
  ON public.tenant_tax_settings FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can insert tax settings"
  ON public.tenant_tax_settings FOR INSERT
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can update tax settings"
  ON public.tenant_tax_settings FOR UPDATE
  USING (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Platform admins full access tax settings"
  ON public.tenant_tax_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tenant_tax_settings_updated_at
  BEFORE UPDATE ON public.tenant_tax_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
