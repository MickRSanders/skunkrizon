
-- Add prospect and demo baseline flags to sub_tenants
ALTER TABLE public.sub_tenants 
  ADD COLUMN is_prospect boolean NOT NULL DEFAULT false,
  ADD COLUMN is_demo_baseline boolean NOT NULL DEFAULT false,
  ADD COLUMN demo_user_email text,
  ADD COLUMN demo_user_id uuid;

-- Create Demo Baseline sub-tenant under TopiaDemo
INSERT INTO public.sub_tenants (name, slug, tenant_id, is_demo_baseline, is_active)
VALUES ('Demo Baseline', 'baseline', '827aede6-1358-4c7d-b581-ffba8cc0bcaf', true, true);
