
-- Seed role_permissions for the employee role
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_update, can_delete)
VALUES
  ('employee', 'simulations', false, false, false, false),
  ('employee', 'policies', false, false, false, false),
  ('employee', 'calculations', false, false, false, false),
  ('employee', 'analytics', false, false, false, false),
  ('employee', 'lookup_tables', false, false, false, false),
  ('employee', 'field_library', false, false, false, false),
  ('employee', 'data_sources', false, false, false, false),
  ('employee', 'tax_engine', false, false, false, false),
  ('employee', 'settings', false, false, false, false),
  ('employee', 'user_management', false, false, false, false),
  ('employee', 'tenant_management', false, false, false, false)
ON CONFLICT DO NOTHING;
