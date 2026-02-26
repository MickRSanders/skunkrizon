-- Add tenant_id to lookup_tables
ALTER TABLE public.lookup_tables ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_lookup_tables_tenant_id ON public.lookup_tables(tenant_id);

-- Drop existing RLS policies on lookup_tables
DROP POLICY IF EXISTS "Admins can manage all lookup tables" ON public.lookup_tables;
DROP POLICY IF EXISTS "Authenticated can view lookup tables" ON public.lookup_tables;
DROP POLICY IF EXISTS "Creators can manage own lookup tables" ON public.lookup_tables;

-- Superadmins see all lookup tables
CREATE POLICY "Superadmins full access lookup tables"
  ON public.lookup_tables FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Admins full access
CREATE POLICY "Admins full access lookup tables"
  ON public.lookup_tables FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tenant members can view their tenant's lookup tables
CREATE POLICY "Tenant members can view lookup tables"
  ON public.lookup_tables FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- Tenant members can create lookup tables for their tenant
CREATE POLICY "Tenant members can create lookup tables"
  ON public.lookup_tables FOR INSERT
  WITH CHECK (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- Creators can update own lookup tables
CREATE POLICY "Creators can update own lookup tables"
  ON public.lookup_tables FOR UPDATE
  USING (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

-- Tenant admins can delete lookup tables
CREATE POLICY "Tenant admins can delete lookup tables"
  ON public.lookup_tables FOR DELETE
  USING (is_tenant_admin(auth.uid(), tenant_id));

-- Sub-tenant members can view parent tenant's lookup tables
CREATE POLICY "Sub-tenant members can view lookup tables"
  ON public.lookup_tables FOR SELECT
  USING (is_sub_tenant_member(auth.uid(), tenant_id));

-- Update lookup_table_rows policies to inherit from parent table
DROP POLICY IF EXISTS "Admins can manage all lookup rows" ON public.lookup_table_rows;
DROP POLICY IF EXISTS "Authenticated can view lookup rows" ON public.lookup_table_rows;
DROP POLICY IF EXISTS "Owners can manage lookup rows" ON public.lookup_table_rows;

CREATE POLICY "Superadmins full access lookup rows"
  ON public.lookup_table_rows FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins full access lookup rows"
  ON public.lookup_table_rows FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view lookup rows"
  ON public.lookup_table_rows FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lookup_tables lt
    WHERE lt.id = lookup_table_rows.lookup_table_id
      AND is_tenant_member(auth.uid(), lt.tenant_id)
  ));

CREATE POLICY "Creators can manage lookup rows"
  ON public.lookup_table_rows FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.lookup_tables lt
    WHERE lt.id = lookup_table_rows.lookup_table_id
      AND lt.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lookup_tables lt
    WHERE lt.id = lookup_table_rows.lookup_table_id
      AND lt.created_by = auth.uid()
  ));

CREATE POLICY "Tenant admins can manage lookup rows"
  ON public.lookup_table_rows FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.lookup_tables lt
    WHERE lt.id = lookup_table_rows.lookup_table_id
      AND is_tenant_admin(auth.uid(), lt.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lookup_tables lt
    WHERE lt.id = lookup_table_rows.lookup_table_id
      AND is_tenant_admin(auth.uid(), lt.tenant_id)
  ));

CREATE POLICY "Sub-tenant members can view lookup rows"
  ON public.lookup_table_rows FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lookup_tables lt
    WHERE lt.id = lookup_table_rows.lookup_table_id
      AND is_sub_tenant_member(auth.uid(), lt.tenant_id)
  ));