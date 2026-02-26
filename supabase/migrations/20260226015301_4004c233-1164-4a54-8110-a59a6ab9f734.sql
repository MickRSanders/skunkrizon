
-- Add sub_tenant_id to simulations, policies, calculations, lookup_tables
ALTER TABLE public.simulations ADD COLUMN sub_tenant_id uuid REFERENCES public.sub_tenants(id) ON DELETE SET NULL;
ALTER TABLE public.policies ADD COLUMN sub_tenant_id uuid REFERENCES public.sub_tenants(id) ON DELETE SET NULL;
ALTER TABLE public.calculations ADD COLUMN sub_tenant_id uuid REFERENCES public.sub_tenants(id) ON DELETE SET NULL;
ALTER TABLE public.lookup_tables ADD COLUMN sub_tenant_id uuid REFERENCES public.sub_tenants(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_simulations_sub_tenant ON public.simulations(sub_tenant_id) WHERE sub_tenant_id IS NOT NULL;
CREATE INDEX idx_policies_sub_tenant ON public.policies(sub_tenant_id) WHERE sub_tenant_id IS NOT NULL;
CREATE INDEX idx_calculations_sub_tenant ON public.calculations(sub_tenant_id) WHERE sub_tenant_id IS NOT NULL;
CREATE INDEX idx_lookup_tables_sub_tenant ON public.lookup_tables(sub_tenant_id) WHERE sub_tenant_id IS NOT NULL;
