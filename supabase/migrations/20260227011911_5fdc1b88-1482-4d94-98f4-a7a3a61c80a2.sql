
-- Add employee_id to cost_estimates for proper linking
ALTER TABLE public.cost_estimates 
ADD COLUMN employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX idx_cost_estimates_employee_id ON public.cost_estimates(employee_id);
