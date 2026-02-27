
-- Add foreign key from tenant_users.user_id to profiles.id so PostgREST can join them
ALTER TABLE public.tenant_users
  ADD CONSTRAINT tenant_users_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
