
-- Table to store which modules are enabled/disabled per tenant
CREATE TABLE public.tenant_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, module_key)
);

-- Enable RLS
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- Superadmins/admins can manage
CREATE POLICY "Admins full access tenant_modules"
  ON public.tenant_modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tenant admins can manage their own tenant modules
CREATE POLICY "Tenant admins can manage tenant_modules"
  ON public.tenant_modules FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

-- Tenant members can view
CREATE POLICY "Tenant members can view tenant_modules"
  ON public.tenant_modules FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_tenant_modules_updated_at
  BEFORE UPDATE ON public.tenant_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed all modules as enabled for existing tenants
INSERT INTO public.tenant_modules (tenant_id, module_key, is_enabled)
SELECT t.id, m.key, true
FROM public.tenants t
CROSS JOIN (VALUES
  ('simulations'), ('pre_travel'), ('employees'), ('policies'), ('analytics'),
  ('calculations'), ('lookup_tables'), ('field_library'), ('field_mappings'), ('data_sources'),
  ('settings'), ('documents'), ('cost_estimate_templates'), ('roles_permissions'),
  ('tax_engine'), ('user_management'), ('tenant_management'), ('audit_log')
) AS m(key)
ON CONFLICT DO NOTHING;
