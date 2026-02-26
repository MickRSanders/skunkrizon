ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(status);