
-- Notification preferences per user
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'simulation', 'policy', etc.
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON public.notification_preferences FOR DELETE
USING (auth.uid() = user_id);

-- Seed default preferences for existing users
INSERT INTO public.notification_preferences (user_id, entity_type, enabled)
SELECT p.id, et.entity_type, true
FROM public.profiles p
CROSS JOIN (VALUES ('simulation'), ('policy')) AS et(entity_type)
ON CONFLICT DO NOTHING;
