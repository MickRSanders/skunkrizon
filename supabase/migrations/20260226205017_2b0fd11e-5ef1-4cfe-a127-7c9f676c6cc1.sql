
-- =============================================
-- PTA Module: Pre-Travel Assessment Tables
-- =============================================

-- Trip status enum
CREATE TYPE public.trip_status AS ENUM (
  'draft', 'confirmed', 'assessed', 'monitoring', 'needs_info', 'attention', 'escalate', 'closed'
);

-- Assessment outcome enum
CREATE TYPE public.assessment_outcome AS ENUM (
  'green', 'amber', 'red', 'pending'
);

-- Provenance enum
CREATE TYPE public.input_provenance AS ENUM (
  'ai_derived', 'user_provided', 'api_ingested', 'system_generated'
);

-- =============================================
-- 1. TRIPS (Trip DNA)
-- =============================================
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  sub_tenant_id UUID REFERENCES public.sub_tenants(id),
  created_by UUID NOT NULL,
  
  -- Traveler info
  traveler_name TEXT NOT NULL,
  traveler_email TEXT,
  employee_id TEXT,
  passport_country TEXT,
  citizenship TEXT,
  residency_country TEXT,
  
  -- Trip metadata
  trip_code TEXT NOT NULL DEFAULT ('PTA-' || floor(random() * 9000 + 1000)::text),
  status trip_status NOT NULL DEFAULT 'draft',
  purpose TEXT,
  notes TEXT,
  
  -- Provenance tracking
  provenance JSONB DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Shadow assessment (Phase 2)
  is_shadow BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for trips
CREATE POLICY "Admins full access trips" ON public.trips FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view trips" ON public.trips FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can create trips" ON public.trips FOR INSERT
  WITH CHECK (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Owners can update own trips" ON public.trips FOR UPDATE
  USING (created_by = auth.uid() AND is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can delete trips" ON public.trips FOR DELETE
  USING (is_tenant_admin(auth.uid(), tenant_id));

-- =============================================
-- 2. TRIP SEGMENTS (Multi-destination)
-- =============================================
CREATE TABLE public.trip_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  segment_order INTEGER NOT NULL DEFAULT 0,
  
  -- Location
  origin_country TEXT NOT NULL,
  origin_city TEXT,
  destination_country TEXT NOT NULL,
  destination_city TEXT,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date) STORED,
  
  -- Activity
  activity_type TEXT NOT NULL DEFAULT 'business_meeting',
  activity_description TEXT,
  
  -- Documents
  immigration_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Provenance
  provenance input_provenance NOT NULL DEFAULT 'user_provided',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_segments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_trip_segments_updated_at
  BEFORE UPDATE ON public.trip_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for trip_segments (via trip ownership)
CREATE POLICY "Admins full access trip_segments" ON public.trip_segments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view trip_segments" ON public.trip_segments FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_segments.trip_id AND is_tenant_member(auth.uid(), t.tenant_id)));

CREATE POLICY "Trip owners can manage segments" ON public.trip_segments FOR ALL
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_segments.trip_id AND t.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_segments.trip_id AND t.created_by = auth.uid()));

-- =============================================
-- 3. TRIP ASSESSMENTS (per segment)
-- =============================================
CREATE TABLE public.trip_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES public.trip_segments(id) ON DELETE CASCADE,
  
  -- Assessment type
  module TEXT NOT NULL, -- 'immigration', 'schengen', 'pwd', 'social_security', 'withholding', 'pe'
  
  -- Outcome
  outcome assessment_outcome NOT NULL DEFAULT 'pending',
  statutory_outcome TEXT, -- e.g. 'free_travel', 'visa_waiver', 'visa_required', 'work_permit_required', 'banned'
  
  -- Details
  reasoning TEXT,
  rule_references JSONB DEFAULT '[]'::jsonb,
  raw_api_response JSONB DEFAULT '{}'::jsonb,
  
  -- Customer overrides (Epic 4)
  override_outcome assessment_outcome,
  override_reason TEXT,
  override_wording TEXT,
  next_steps TEXT,
  
  -- Risk flags
  risk_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  risk_flags JSONB DEFAULT '[]'::jsonb,
  
  -- Version
  version INTEGER NOT NULL DEFAULT 1,
  assessed_at TIMESTAMPTZ,
  assessed_by TEXT, -- 'system', 'permiso', 'monaeo', 'manual'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_assessments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_trip_assessments_updated_at
  BEFORE UPDATE ON public.trip_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for trip_assessments
CREATE POLICY "Admins full access trip_assessments" ON public.trip_assessments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view trip_assessments" ON public.trip_assessments FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_assessments.trip_id AND is_tenant_member(auth.uid(), t.tenant_id)));

CREATE POLICY "Trip owners can manage assessments" ON public.trip_assessments FOR ALL
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_assessments.trip_id AND t.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_assessments.trip_id AND t.created_by = auth.uid()));

-- =============================================
-- 4. PTA MODULE CONFIG (per tenant)
-- =============================================
CREATE TABLE public.pta_module_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) UNIQUE,
  
  -- Module enablement
  immigration_enabled BOOLEAN NOT NULL DEFAULT true,
  schengen_enabled BOOLEAN NOT NULL DEFAULT true,
  pwd_enabled BOOLEAN NOT NULL DEFAULT true,
  social_security_enabled BOOLEAN NOT NULL DEFAULT false,
  withholding_enabled BOOLEAN NOT NULL DEFAULT false,
  pe_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- AI / Language
  tone TEXT NOT NULL DEFAULT 'formal', -- 'formal', 'friendly'
  confidence_threshold NUMERIC NOT NULL DEFAULT 0.8,
  
  -- Activity mapping overrides
  activity_aliases JSONB DEFAULT '{}'::jsonb,
  suppressed_activities JSONB DEFAULT '{}'::jsonb,
  
  -- Outcome overrides
  outcome_wording_overrides JSONB DEFAULT '{}'::jsonb,
  risk_mapping_rules JSONB DEFAULT '{}'::jsonb,
  routing_rules JSONB DEFAULT '{}'::jsonb,
  
  -- Phase 2
  shadow_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  bookings_api_enabled BOOLEAN NOT NULL DEFAULT false,
  monaeo_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Sensitive fields (Phase 2)
  hidden_fields JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pta_module_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_pta_module_config_updated_at
  BEFORE UPDATE ON public.pta_module_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for pta_module_config
CREATE POLICY "Admins full access pta_config" ON public.pta_module_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant admins can manage pta_config" ON public.pta_module_config FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can view pta_config" ON public.pta_module_config FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- =============================================
-- 5. TRIP VERSION HISTORY (Epic 6)
-- =============================================
CREATE TABLE public.trip_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL, -- full Trip DNA + assessments snapshot
  changed_by UUID NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access trip_versions" ON public.trip_versions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant members can view trip_versions" ON public.trip_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_versions.trip_id AND is_tenant_member(auth.uid(), t.tenant_id)));

CREATE POLICY "Trip owners can insert trip_versions" ON public.trip_versions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_versions.trip_id AND t.created_by = auth.uid()));
