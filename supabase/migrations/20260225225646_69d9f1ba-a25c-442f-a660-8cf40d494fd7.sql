
-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');
CREATE TYPE public.simulation_status AS ENUM ('draft', 'running', 'completed', 'pending');

-- ==========================================
-- 2. BASE TABLES
-- ==========================================

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  department TEXT,
  job_title TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies (relocation policy templates)
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'custom',
  description TEXT,
  benefit_components JSONB DEFAULT '{}',
  tax_approach TEXT DEFAULT 'tax-equalization',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Simulations
CREATE TABLE public.simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sim_code TEXT NOT NULL DEFAULT 'SIM-' || floor(random() * 9000 + 1000)::TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- employee info
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  job_title TEXT,
  department TEXT,
  grade TEXT,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  -- assignment
  origin_city TEXT,
  origin_country TEXT NOT NULL,
  destination_city TEXT,
  destination_country TEXT NOT NULL,
  assignment_type TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 24,
  start_date DATE,
  -- policy & benefits
  policy_id UUID REFERENCES public.policies(id),
  tax_approach TEXT DEFAULT 'tax-equalization',
  housing_cap NUMERIC,
  include_schooling BOOLEAN DEFAULT false,
  include_spouse_support BOOLEAN DEFAULT false,
  include_relocation_lump_sum BOOLEAN DEFAULT true,
  relocation_lump_sum NUMERIC DEFAULT 5000,
  -- assumptions
  cola_percent NUMERIC DEFAULT 15,
  exchange_rate_buffer NUMERIC DEFAULT 3,
  -- results
  cost_breakdown JSONB DEFAULT '{}',
  total_cost NUMERIC,
  status simulation_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

-- Calculations (formula library)
CREATE TABLE public.calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  formula TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. HELPER FUNCTIONS (security definer)
-- ==========================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ==========================================
-- 4. TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_simulations_updated_at BEFORE UPDATE ON public.simulations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calculations_updated_at BEFORE UPDATE ON public.calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  -- Default role: viewer
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 5. RLS POLICIES
-- ==========================================

-- Profiles: everyone can read all profiles, users can update own, admins can update all
CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User Roles: admins manage, users can read own
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Simulations: all authenticated can read, owner/admin can write
CREATE POLICY "Authenticated can view all simulations"
  ON public.simulations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own simulations"
  ON public.simulations FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update own simulations"
  ON public.simulations FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "Admins can update any simulation"
  ON public.simulations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete simulations"
  ON public.simulations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies: all authenticated can read, creator/admin can write
CREATE POLICY "Authenticated can view all policies"
  ON public.policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create policies"
  ON public.policies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can update policies"
  ON public.policies FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators can update own policies"
  ON public.policies FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Admins can delete policies"
  ON public.policies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Calculations: all authenticated can read, creator/admin can write
CREATE POLICY "Authenticated can view all calculations"
  ON public.calculations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create calculations"
  ON public.calculations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can update calculations"
  ON public.calculations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators can update own calculations"
  ON public.calculations FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Admins can delete calculations"
  ON public.calculations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
