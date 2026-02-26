
-- Add step-down schedule and proration configuration to calculations
ALTER TABLE public.calculations
  ADD COLUMN step_down_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN step_down_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN proration_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN proration_method text NOT NULL DEFAULT 'daily';

-- step_down_schedule stores an array like: [{"year":1,"percent":100},{"year":2,"percent":75},{"year":3,"percent":50}]
-- proration_method can be: 'daily', 'monthly', 'none'
COMMENT ON COLUMN public.calculations.step_down_schedule IS 'Array of {year, percent} objects defining year-over-year reduction schedule';
COMMENT ON COLUMN public.calculations.proration_method IS 'How to prorate partial periods: daily, monthly, or none';
