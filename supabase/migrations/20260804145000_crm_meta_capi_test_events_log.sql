-- Allow CRM Meta CAPI test events without a real lead (log still visible in UI).
ALTER TABLE public.crm_meta_conversion_events
  ALTER COLUMN lead_id DROP NOT NULL;

ALTER TABLE public.crm_meta_conversion_events
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.crm_meta_conversion_events.is_test IS 'True for Events Manager test_event_code pings (no crm_lead)';
