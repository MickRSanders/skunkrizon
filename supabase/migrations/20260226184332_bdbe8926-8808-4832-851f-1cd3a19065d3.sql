
-- Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  entity_type text,
  entity_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System (triggers) insert via security definer functions, so we need a permissive insert for the function
-- But we also allow admins to insert
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for fast user lookups
CREATE INDEX idx_notifications_user_id ON public.notifications (user_id, created_at DESC);

-- Function: notify tenant members when a simulation status changes
CREATE OR REPLACE FUNCTION public.notify_simulation_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
  _title text;
  _message text;
  _type text;
BEGIN
  -- Only fire when status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' THEN
    _title := 'Simulation Completed';
    _message := format('Cost simulation %s (%s) has finished processing.', NEW.sim_code, NEW.employee_name);
    _type := 'success';
  ELSIF NEW.status = 'running' THEN
    _title := 'Simulation Running';
    _message := format('Cost simulation %s (%s) is now running.', NEW.sim_code, NEW.employee_name);
    _type := 'info';
  ELSE
    RETURN NEW;
  END IF;

  -- Notify all members of the same tenant
  FOR _member IN
    SELECT DISTINCT user_id FROM tenant_users WHERE tenant_id = NEW.tenant_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (_member.user_id, _title, _message, _type, 'simulation', NEW.id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_simulation_status_notify
  AFTER UPDATE ON public.simulations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_simulation_status_change();

-- Function: notify tenant members when a policy is published or updated
CREATE OR REPLACE FUNCTION public.notify_policy_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
  _title text;
  _message text;
  _type text;
BEGIN
  -- New policy created
  IF TG_OP = 'INSERT' THEN
    _title := 'New Policy Created';
    _message := format('Policy "%s" has been created.', NEW.name);
    _type := 'info';
  -- Policy status changed to active/published
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active' THEN
    _title := 'Policy Published';
    _message := format('Policy "%s" has been published and is now active.', NEW.name);
    _type := 'success';
  -- Policy content updated
  ELSIF TG_OP = 'UPDATE' AND OLD.updated_at IS DISTINCT FROM NEW.updated_at AND OLD.status = NEW.status THEN
    _title := 'Policy Updated';
    _message := format('Policy "%s" has been updated.', NEW.name);
    _type := 'info';
  ELSE
    RETURN NEW;
  END IF;

  FOR _member IN
    SELECT DISTINCT user_id FROM tenant_users WHERE tenant_id = NEW.tenant_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (_member.user_id, _title, _message, _type, 'policy', NEW.id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_policy_change_notify
  AFTER INSERT OR UPDATE ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_policy_change();
