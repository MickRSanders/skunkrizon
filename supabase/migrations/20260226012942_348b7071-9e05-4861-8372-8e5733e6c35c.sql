-- Add tenant_id to simulations
ALTER TABLE public.simulations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_simulations_tenant_id ON public.simulations(tenant_id);

-- Drop existing RLS policies on simulations
DROP POLICY IF EXISTS "Admins can delete simulations" ON public.simulations;
DROP POLICY IF EXISTS "Admins can update any simulation" ON public.simulations;
DROP POLICY IF EXISTS "Authenticated can view all simulations" ON public.simulations;
DROP POLICY IF EXISTS "Owners can update own simulations" ON public.simulations;
DROP POLICY IF EXISTS "Users can create own simulations" ON public.simulations;

-- Superadmins/admins full access
CREATE POLICY "Admins full access simulations"
  ON public.simulations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tenant members can view their tenant's simulations
CREATE POLICY "Tenant members can view simulations"
  ON public.simulations FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- Users can create simulations in their tenant
CREATE POLICY "Users can create simulations"
  ON public.simulations FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- Owners can update own simulations
CREATE POLICY "Owners can update own simulations"
  ON public.simulations FOR UPDATE
  USING (owner_id = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- Tenant admins can delete simulations
CREATE POLICY "Tenant admins can delete simulations"
  ON public.simulations FOR DELETE
  USING (is_tenant_admin(auth.uid(), tenant_id));

-- Sub-tenant members can view
CREATE POLICY "Sub-tenant members can view simulations"
  ON public.simulations FOR SELECT
  USING (is_sub_tenant_member(auth.uid(), tenant_id));