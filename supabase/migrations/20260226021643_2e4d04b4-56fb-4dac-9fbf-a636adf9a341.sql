
-- Create simulation audit log table for tracking scenario overrides
CREATE TABLE public.simulation_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  scenario_name TEXT NOT NULL,
  field_id TEXT NOT NULL,
  field_label TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC,
  action TEXT NOT NULL DEFAULT 'override',
  changed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simulation_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies: follow same pattern as simulations
CREATE POLICY "Admins full access audit log"
  ON public.simulation_audit_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view audit log"
  ON public.simulation_audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM simulations s
    WHERE s.id = simulation_audit_log.simulation_id
    AND is_tenant_member(auth.uid(), s.tenant_id)
  ));

CREATE POLICY "Tenant members can insert audit log"
  ON public.simulation_audit_log FOR INSERT
  WITH CHECK (
    changed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM simulations s
      WHERE s.id = simulation_audit_log.simulation_id
      AND is_tenant_member(auth.uid(), s.tenant_id)
    )
  );

-- Index for fast lookups
CREATE INDEX idx_simulation_audit_log_sim_id ON public.simulation_audit_log(simulation_id);
