
-- Create simulation_groups table
CREATE TABLE public.simulation_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  tenant_id UUID REFERENCES public.tenants(id),
  sub_tenant_id UUID REFERENCES public.sub_tenants(id),
  created_by UUID NOT NULL,
  origin_country TEXT,
  origin_city TEXT,
  destination_country TEXT,
  destination_city TEXT,
  total_cost NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add group_id to simulations
ALTER TABLE public.simulations ADD COLUMN group_id UUID REFERENCES public.simulation_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.simulation_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins full access simulation_groups"
  ON public.simulation_groups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view simulation_groups"
  ON public.simulation_groups FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can create simulation_groups"
  ON public.simulation_groups FOR INSERT
  WITH CHECK (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Owners can update own simulation_groups"
  ON public.simulation_groups FOR UPDATE
  USING (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can delete simulation_groups"
  ON public.simulation_groups FOR DELETE
  USING (is_tenant_admin(auth.uid(), tenant_id));

-- Timestamp trigger
CREATE TRIGGER update_simulation_groups_updated_at
  BEFORE UPDATE ON public.simulation_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
