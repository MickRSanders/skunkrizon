
-- Create role_permissions table for configurable CRUD permissions per role per module
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins/superadmins can manage permissions
CREATE POLICY "Admins can manage role_permissions"
  ON public.role_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view permissions (needed to enforce in UI)
CREATE POLICY "Authenticated can view role_permissions"
  ON public.role_permissions FOR SELECT
  USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default permissions for all roles across all modules
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_update, can_delete) VALUES
  -- superadmin: full access everywhere
  ('superadmin', 'simulations',       true, true, true, true),
  ('superadmin', 'policies',          true, true, true, true),
  ('superadmin', 'calculations',      true, true, true, true),
  ('superadmin', 'analytics',         true, true, true, true),
  ('superadmin', 'lookup_tables',     true, true, true, true),
  ('superadmin', 'field_library',     true, true, true, true),
  ('superadmin', 'data_sources',      true, true, true, true),
  ('superadmin', 'tax_engine',        true, true, true, true),
  ('superadmin', 'settings',          true, true, true, true),
  ('superadmin', 'user_management',   true, true, true, true),
  ('superadmin', 'tenant_management', true, true, true, true),

  -- admin: full access except tenant_management
  ('admin', 'simulations',       true, true, true, true),
  ('admin', 'policies',          true, true, true, true),
  ('admin', 'calculations',      true, true, true, true),
  ('admin', 'analytics',         true, true, true, true),
  ('admin', 'lookup_tables',     true, true, true, true),
  ('admin', 'field_library',     true, true, true, true),
  ('admin', 'data_sources',      true, true, true, true),
  ('admin', 'tax_engine',        true, true, true, true),
  ('admin', 'settings',          true, true, true, true),
  ('admin', 'user_management',   true, true, true, true),
  ('admin', 'tenant_management', true, false, false, false),

  -- analyst: view + create + update, limited delete
  ('analyst', 'simulations',       true, true, true, false),
  ('analyst', 'policies',          true, false, false, false),
  ('analyst', 'calculations',      true, true, true, false),
  ('analyst', 'analytics',         true, true, true, false),
  ('analyst', 'lookup_tables',     true, true, true, false),
  ('analyst', 'field_library',     true, true, true, false),
  ('analyst', 'data_sources',      true, true, true, false),
  ('analyst', 'tax_engine',        true, false, false, false),
  ('analyst', 'settings',          true, false, false, false),
  ('analyst', 'user_management',   false, false, false, false),
  ('analyst', 'tenant_management', false, false, false, false),

  -- viewer: view only
  ('viewer', 'simulations',       true, false, false, false),
  ('viewer', 'policies',          true, false, false, false),
  ('viewer', 'calculations',      true, false, false, false),
  ('viewer', 'analytics',         true, false, false, false),
  ('viewer', 'lookup_tables',     true, false, false, false),
  ('viewer', 'field_library',     true, false, false, false),
  ('viewer', 'data_sources',      true, false, false, false),
  ('viewer', 'tax_engine',        true, false, false, false),
  ('viewer', 'settings',          false, false, false, false),
  ('viewer', 'user_management',   false, false, false, false),
  ('viewer', 'tenant_management', false, false, false, false);
