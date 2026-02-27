
-- Remote Work Requests table
CREATE TABLE public.remote_work_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  sub_tenant_id uuid REFERENCES public.sub_tenants(id),
  created_by uuid NOT NULL,
  employee_id uuid REFERENCES public.employees(id),

  -- Request type: 'employee_remote' (Epic A) or 'virtual_assignment' (Epic B)
  request_type text NOT NULL DEFAULT 'employee_remote',
  request_code text NOT NULL DEFAULT ('RW-' || floor(random() * 90000 + 10000)::text),

  -- Employee / traveler info
  employee_name text NOT NULL,
  employee_email text,
  job_title text,
  department text,
  
  -- Location
  home_country text NOT NULL,
  home_city text,
  host_country text NOT NULL,
  host_city text,
  
  -- Dates & duration
  start_date date NOT NULL,
  end_date date,
  duration_type text NOT NULL DEFAULT 'short_term', -- short_term, extended, indefinite
  work_pattern text, -- e.g. 'full_time_remote', 'hybrid', 'periodic'
  
  -- Purpose & details
  purpose text,
  business_justification text,
  deliverables text,
  
  -- Virtual assignment specifics (Epic B)
  business_sponsor text,
  is_precursor_to_relocation boolean DEFAULT false,
  
  -- Risk summary (populated after assessment)
  overall_risk_level text DEFAULT 'pending', -- pending, low, medium, high, blocker
  
  -- Status
  status text NOT NULL DEFAULT 'draft', -- draft, submitted, under_review, approved, declined, active, completed, cancelled
  
  -- Metadata
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.remote_work_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins full access remote_work_requests"
  ON public.remote_work_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view remote_work_requests"
  ON public.remote_work_requests FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can create remote_work_requests"
  ON public.remote_work_requests FOR INSERT
  WITH CHECK (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Owners can update remote_work_requests"
  ON public.remote_work_requests FOR UPDATE
  USING (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can update remote_work_requests"
  ON public.remote_work_requests FOR UPDATE
  USING (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can delete remote_work_requests"
  ON public.remote_work_requests FOR DELETE
  USING (is_tenant_admin(auth.uid(), tenant_id));

-- Risk assessments for remote work
CREATE TABLE public.remote_work_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.remote_work_requests(id) ON DELETE CASCADE,
  category text NOT NULL, -- immigration, tax, social_security, employer_obligations, health_safety, cultural
  risk_level text NOT NULL DEFAULT 'low', -- low, medium, high, blocker
  summary text,
  recommendations text,
  rule_references jsonb DEFAULT '[]'::jsonb,
  assessed_by uuid,
  assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.remote_work_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access rw_risk"
  ON public.remote_work_risk_assessments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view rw_risk"
  ON public.remote_work_risk_assessments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM remote_work_requests r
    WHERE r.id = remote_work_risk_assessments.request_id
    AND is_tenant_member(auth.uid(), r.tenant_id)
  ));

CREATE POLICY "Tenant members can manage rw_risk"
  ON public.remote_work_risk_assessments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM remote_work_requests r
    WHERE r.id = remote_work_risk_assessments.request_id
    AND is_tenant_member(auth.uid(), r.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM remote_work_requests r
    WHERE r.id = remote_work_risk_assessments.request_id
    AND is_tenant_member(auth.uid(), r.tenant_id)
  ));

-- Approval workflow steps
CREATE TABLE public.remote_work_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.remote_work_requests(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  approval_type text NOT NULL, -- manager, hr, legal, tax, mobility
  approver_id uuid,
  approver_name text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, declined, skipped
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.remote_work_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access rw_approvals"
  ON public.remote_work_approvals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view rw_approvals"
  ON public.remote_work_approvals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM remote_work_requests r
    WHERE r.id = remote_work_approvals.request_id
    AND is_tenant_member(auth.uid(), r.tenant_id)
  ));

CREATE POLICY "Tenant members can manage rw_approvals"
  ON public.remote_work_approvals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM remote_work_requests r
    WHERE r.id = remote_work_approvals.request_id
    AND is_tenant_member(auth.uid(), r.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM remote_work_requests r
    WHERE r.id = remote_work_approvals.request_id
    AND is_tenant_member(auth.uid(), r.tenant_id)
  ));

-- Updated_at triggers
CREATE TRIGGER update_remote_work_requests_updated_at
  BEFORE UPDATE ON public.remote_work_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_remote_work_risk_updated_at
  BEFORE UPDATE ON public.remote_work_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
