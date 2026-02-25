
-- ==========================================
-- TENANTS (Client companies)
-- ==========================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  domain TEXT,
  -- SSO configuration (visual config, not wired to live auth yet)
  sso_enabled BOOLEAN DEFAULT false,
  sso_provider TEXT, -- 'saml' | 'oidc' | null
  sso_config JSONB DEFAULT '{}',
  -- metadata
  contact_name TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SUB-TENANTS (Reseller's clients)
-- ==========================================
CREATE TABLE public.sub_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  domain TEXT,
  -- Sub-tenants can have their own SSO config
  sso_enabled BOOLEAN DEFAULT false,
  sso_provider TEXT,
  sso_config JSONB DEFAULT '{}',
  contact_name TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
ALTER TABLE public.sub_tenants ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TENANT USERS (maps users to tenants with roles)
-- ==========================================
CREATE TYPE public.tenant_role AS ENUM ('tenant_admin', 'tenant_user');

CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sub_tenant_id UUID REFERENCES public.sub_tenants(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role tenant_role NOT NULL DEFAULT 'tenant_user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Check if user is a tenant admin for a specific tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = 'tenant_admin'
  )
$$;

-- ==========================================
-- TRIGGERS
-- ==========================================
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sub_tenants_updated_at BEFORE UPDATE ON public.sub_tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Tenants: platform admins see all, tenant admins see their own
CREATE POLICY "Platform admins can do everything with tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant admins can view own tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), id));

CREATE POLICY "Tenant admins can update own tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), id));

-- Sub-tenants: platform admins see all, tenant admins manage their own
CREATE POLICY "Platform admins can do everything with sub-tenants"
  ON public.sub_tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant admins can view own sub-tenants"
  ON public.sub_tenants FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can create sub-tenants"
  ON public.sub_tenants FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can update own sub-tenants"
  ON public.sub_tenants FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can delete own sub-tenants"
  ON public.sub_tenants FOR DELETE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- Tenant users: platform admins manage all, tenant admins manage their tenant's users
CREATE POLICY "Platform admins can do everything with tenant users"
  ON public.tenant_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant admins can view own tenant users"
  ON public.tenant_users FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can add users to own tenant"
  ON public.tenant_users FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can update own tenant users"
  ON public.tenant_users FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can remove users from own tenant"
  ON public.tenant_users FOR DELETE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- Users can see their own tenant membership
CREATE POLICY "Users can view own tenant memberships"
  ON public.tenant_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());
