
-- Comprehensive audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT'
  category text NOT NULL DEFAULT 'data', -- 'data', 'config', 'status', 'auth', 'admin'
  table_name text,
  record_id uuid,
  tenant_id uuid,
  summary text NOT NULL, -- Human-readable summary
  old_data jsonb,
  new_data jsonb,
  changed_fields text[], -- List of fields that changed
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_category ON public.audit_log (category);
CREATE INDEX idx_audit_log_table_name ON public.audit_log (table_name);
CREATE INDEX idx_audit_log_tenant_id ON public.audit_log (tenant_id);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Superadmins and admins can view all audit logs
CREATE POLICY "Superadmins can view all audit_log"
  ON public.audit_log FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can view all audit_log"
  ON public.audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert (via triggers which run as SECURITY DEFINER)
-- No direct user inserts needed

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _tenant_id uuid;
  _record_id uuid;
  _summary text;
  _changed text[];
  _category text := 'data';
  _old_data jsonb;
  _new_data jsonb;
  _action text;
  _record_name text;
BEGIN
  -- Get current user
  _user_id := auth.uid();
  
  -- Determine action
  _action := TG_OP;
  
  -- Get record ID and tenant_id based on operation
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id;
    _old_data := to_jsonb(OLD);
    _tenant_id := CASE WHEN TG_TABLE_NAME IN ('notifications', 'profiles', 'superadmin_audit_log') THEN NULL
                       ELSE (to_jsonb(OLD)->>'tenant_id')::uuid END;
  ELSE
    _record_id := NEW.id;
    _new_data := to_jsonb(NEW);
    _tenant_id := CASE WHEN TG_TABLE_NAME IN ('notifications', 'profiles', 'superadmin_audit_log') THEN NULL
                       ELSE (to_jsonb(NEW)->>'tenant_id')::uuid END;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    _old_data := to_jsonb(OLD);
    -- Detect changed fields
    SELECT array_agg(key) INTO _changed
    FROM jsonb_each(to_jsonb(NEW)) AS n(key, val)
    WHERE n.val IS DISTINCT FROM (to_jsonb(OLD)->n.key)
      AND n.key NOT IN ('updated_at', 'created_at');
    
    -- Detect status changes
    IF (to_jsonb(OLD)->>'status') IS DISTINCT FROM (to_jsonb(NEW)->>'status') THEN
      _action := 'STATUS_CHANGE';
      _category := 'status';
    END IF;
  END IF;
  
  -- Determine category for config tables
  IF TG_TABLE_NAME IN ('loa_templates', 'cost_estimate_templates', 'cost_estimate_template_versions', 
                         'tenant_tax_settings', 'pta_module_config', 'role_permissions', 
                         'field_mappings', 'tenant_modules') THEN
    _category := 'config';
  END IF;
  
  -- Build human-readable summary
  _record_name := COALESCE(
    (CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'name',
    (CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'employee_name',
    (CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'title',
    (CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'sim_code',
    (CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'request_code',
    _record_id::text
  );
  
  IF _action = 'STATUS_CHANGE' THEN
    _summary := format('%s status changed from "%s" to "%s"', 
      _record_name, 
      (to_jsonb(OLD)->>'status'), 
      (to_jsonb(NEW)->>'status'));
  ELSIF TG_OP = 'INSERT' THEN
    _summary := format('%s created in %s', _record_name, TG_TABLE_NAME);
  ELSIF TG_OP = 'UPDATE' THEN
    _summary := format('%s updated in %s (%s fields)', _record_name, TG_TABLE_NAME, COALESCE(array_length(_changed, 1), 0));
  ELSIF TG_OP = 'DELETE' THEN
    _summary := format('%s deleted from %s', _record_name, TG_TABLE_NAME);
  END IF;
  
  -- Insert audit record
  INSERT INTO public.audit_log (user_id, action, category, table_name, record_id, tenant_id, summary, old_data, new_data, changed_fields)
  VALUES (_user_id, _action, _category, TG_TABLE_NAME, _record_id, _tenant_id, _summary, _old_data, _new_data, _changed);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers to all key tables

-- Simulations
CREATE TRIGGER audit_simulations
  AFTER INSERT OR UPDATE OR DELETE ON public.simulations
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Employees
CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Policies
CREATE TRIGGER audit_policies
  AFTER INSERT OR UPDATE OR DELETE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Calculations
CREATE TRIGGER audit_calculations
  AFTER INSERT OR UPDATE OR DELETE ON public.calculations
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- LOA Templates
CREATE TRIGGER audit_loa_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.loa_templates
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- LOA Documents
CREATE TRIGGER audit_loa_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.loa_documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Cost Estimate Templates
CREATE TRIGGER audit_cost_estimate_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.cost_estimate_templates
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Cost Estimates
CREATE TRIGGER audit_cost_estimates
  AFTER INSERT OR UPDATE OR DELETE ON public.cost_estimates
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Remote Work Requests
CREATE TRIGGER audit_remote_work_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.remote_work_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Trips
CREATE TRIGGER audit_trips
  AFTER INSERT OR UPDATE OR DELETE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Lookup Tables
CREATE TRIGGER audit_lookup_tables
  AFTER INSERT OR UPDATE OR DELETE ON public.lookup_tables
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Field Library
CREATE TRIGGER audit_field_library
  AFTER INSERT OR UPDATE OR DELETE ON public.field_library
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Field Mappings
CREATE TRIGGER audit_field_mappings
  AFTER INSERT OR UPDATE OR DELETE ON public.field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Simulation Groups
CREATE TRIGGER audit_simulation_groups
  AFTER INSERT OR UPDATE OR DELETE ON public.simulation_groups
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Balance Sheets
CREATE TRIGGER audit_balance_sheets
  AFTER INSERT OR UPDATE OR DELETE ON public.balance_sheets
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Pay Instructions
CREATE TRIGGER audit_pay_instructions
  AFTER INSERT OR UPDATE OR DELETE ON public.pay_instructions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- PTA Module Config
CREATE TRIGGER audit_pta_module_config
  AFTER INSERT OR UPDATE OR DELETE ON public.pta_module_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Tenant Tax Settings
CREATE TRIGGER audit_tenant_tax_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_tax_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Tenant Modules
CREATE TRIGGER audit_tenant_modules
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_modules
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Role Permissions
CREATE TRIGGER audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Also migrate existing superadmin_audit_log entries into the new audit_log
INSERT INTO public.audit_log (user_id, action, category, table_name, summary, metadata, created_at)
SELECT 
  user_id, 
  action, 
  'admin', 
  'tenants',
  format('Switched from %s to %s', 
    details->>'from_tenant_name', 
    details->>'to_tenant_name'),
  details,
  created_at
FROM public.superadmin_audit_log;
