-- Store proposal amounts as JSON array; keep value as scalar for won metrics.
ALTER TABLE public.crm_lead
  ADD COLUMN IF NOT EXISTS values jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.crm_lead.values IS 'Proposal amount options (JSON number array). Card shows min-max range when length > 1.';

UPDATE public.crm_lead
SET values = jsonb_build_array(value)
WHERE (values = '[]'::jsonb OR values IS NULL)
  AND value IS NOT NULL
  AND value > 0;

ALTER TABLE public.crm_lead
  DROP CONSTRAINT IF EXISTS crm_lead_values_is_array;

ALTER TABLE public.crm_lead
  ADD CONSTRAINT crm_lead_values_is_array
  CHECK (jsonb_typeof(values) = 'array');
