
-- Audit log for superadmin actions like org switching
CREATE TABLE public.superadmin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.superadmin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only superadmins/admins can view
CREATE POLICY "Admins can view audit log"
  ON public.superadmin_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert allowed for superadmins (they log their own actions)
CREATE POLICY "Superadmins can insert audit log"
  ON public.superadmin_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX idx_superadmin_audit_log_user ON public.superadmin_audit_log (user_id, created_at DESC);
