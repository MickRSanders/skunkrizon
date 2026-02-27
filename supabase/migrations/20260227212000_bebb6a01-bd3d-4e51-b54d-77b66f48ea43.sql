
-- Drop the overly broad SELECT policy
DROP POLICY IF EXISTS "Tenant members can view employees" ON public.employees;

-- Admin, analyst, and viewer roles can view all employees within their tenant
CREATE POLICY "Privileged roles can view all employees"
ON public.employees FOR SELECT
USING (
  is_tenant_member(auth.uid(), tenant_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'analyst'::app_role)
    OR has_role(auth.uid(), 'viewer'::app_role)
  )
);

-- Employees can view their own record (matched by created_by or email)
CREATE POLICY "Employees can view own record"
ON public.employees FOR SELECT
USING (
  created_by = auth.uid()
);
