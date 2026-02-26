
-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  sub_tenant_id UUID REFERENCES public.sub_tenants(id),
  employee_code TEXT NOT NULL DEFAULT ('EMP-' || floor(random() * 90000 + 10000)::text),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  job_title TEXT,
  job_grade TEXT,
  division TEXT,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  bonus_percent NUMERIC DEFAULT 0,
  bonus_amount NUMERIC DEFAULT 0,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT,
  postal_code TEXT,
  hire_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create employee_dependents table
CREATE TABLE public.employee_dependents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_dependents ENABLE ROW LEVEL SECURITY;

-- RLS for employees
CREATE POLICY "Admins full access employees" ON public.employees FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view employees" ON public.employees FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can create employees" ON public.employees FOR INSERT
  WITH CHECK (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Owners can update employees" ON public.employees FOR UPDATE
  USING (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can delete employees" ON public.employees FOR DELETE
  USING (is_tenant_admin(auth.uid(), tenant_id));

-- RLS for dependents (inherit from employee)
CREATE POLICY "Admins full access dependents" ON public.employee_dependents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view dependents" ON public.employee_dependents FOR SELECT
  USING (EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_dependents.employee_id AND is_tenant_member(auth.uid(), e.tenant_id)));

CREATE POLICY "Tenant members can manage dependents" ON public.employee_dependents FOR ALL
  USING (EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_dependents.employee_id AND e.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_dependents.employee_id AND e.created_by = auth.uid()));

-- Timestamps trigger
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX idx_employees_division ON public.employees(division);
CREATE INDEX idx_employee_dependents_employee ON public.employee_dependents(employee_id);
