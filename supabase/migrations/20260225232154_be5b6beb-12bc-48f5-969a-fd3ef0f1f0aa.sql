-- Replace the overly permissive tenant creation policy with admin-only
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

CREATE POLICY "Admins can create tenants"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));