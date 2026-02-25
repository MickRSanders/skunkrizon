
-- Add tenant_id to calculations
ALTER TABLE public.calculations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to policies
ALTER TABLE public.policies ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Drop old RLS policies on calculations
DROP POLICY IF EXISTS "Authenticated can view all calculations" ON public.calculations;
DROP POLICY IF EXISTS "Users can create calculations" ON public.calculations;
DROP POLICY IF EXISTS "Admins can update calculations" ON public.calculations;
DROP POLICY IF EXISTS "Creators can update own calculations" ON public.calculations;
DROP POLICY IF EXISTS "Admins can delete calculations" ON public.calculations;

-- Drop old RLS policies on policies
DROP POLICY IF EXISTS "Authenticated can view all policies" ON public.policies;
DROP POLICY IF EXISTS "Users can create policies" ON public.policies;
DROP POLICY IF EXISTS "Admins can update policies" ON public.policies;
DROP POLICY IF EXISTS "Creators can update own policies" ON public.policies;
DROP POLICY IF EXISTS "Admins can delete policies" ON public.policies;

-- Helper: check if user belongs to a tenant (any role)
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  )
$$;

-- Helper: check if user belongs to a sub-tenant of a given tenant
CREATE OR REPLACE FUNCTION public.is_sub_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users tu
    JOIN public.sub_tenants st ON st.id = tu.sub_tenant_id
    WHERE tu.user_id = _user_id AND st.tenant_id = _tenant_id
  )
$$;

-- ═══ CALCULATIONS RLS ═══

-- Platform admins: full access
CREATE POLICY "Admins full access calculations"
  ON public.calculations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tenant members can view their tenant's calculations
CREATE POLICY "Tenant members can view calculations"
  ON public.calculations FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));

-- Sub-tenant members can also view parent tenant's calculations
CREATE POLICY "Sub-tenant members can view calculations"
  ON public.calculations FOR SELECT TO authenticated
  USING (is_sub_tenant_member(auth.uid(), tenant_id));

-- Tenant members can create calculations for their tenant
CREATE POLICY "Tenant members can create calculations"
  ON public.calculations FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND is_tenant_member(auth.uid(), tenant_id)
  );

-- Creators can update own
CREATE POLICY "Creators can update own calculations"
  ON public.calculations FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- Tenant admins can update any in their tenant
CREATE POLICY "Tenant admins can update calculations"
  ON public.calculations FOR UPDATE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id));

-- Tenant admins can delete in their tenant
CREATE POLICY "Tenant admins can delete calculations"
  ON public.calculations FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id));

-- ═══ POLICIES RLS ═══

-- Platform admins: full access
CREATE POLICY "Admins full access policies"
  ON public.policies FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tenant members can view their tenant's policies
CREATE POLICY "Tenant members can view policies"
  ON public.policies FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));

-- Tenant members can create policies for their tenant
CREATE POLICY "Tenant members can create policies"
  ON public.policies FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND is_tenant_member(auth.uid(), tenant_id)
  );

-- Creators can update own
CREATE POLICY "Creators can update own policies"
  ON public.policies FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- Tenant admins can update any in their tenant
CREATE POLICY "Tenant admins can update policies"
  ON public.policies FOR UPDATE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id));

-- Tenant admins can delete in their tenant
CREATE POLICY "Tenant admins can delete policies"
  ON public.policies FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id));
