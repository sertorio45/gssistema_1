-- Meta Conversions API (CAPI) for CRM: attribution fields + event queue

ALTER TABLE public.crm_lead
  ADD COLUMN IF NOT EXISTS meta_lead_id text,
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS fbclid text;

COMMENT ON COLUMN public.crm_lead.meta_lead_id IS 'Meta Lead Ads leadgen ID for CRM Conversion Leads matching';
COMMENT ON COLUMN public.crm_lead.fbc IS 'Meta _fbc cookie / click id (fb.1.<ts>.<fbclid>)';
COMMENT ON COLUMN public.crm_lead.fbp IS 'Meta _fbp browser cookie';
COMMENT ON COLUMN public.crm_lead.fbclid IS 'Raw Meta click id from ads landing URLs';

CREATE TABLE IF NOT EXISTS public.crm_meta_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant (id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.crm_lead (id) ON DELETE CASCADE,
  event_name text NOT NULL CHECK (event_name IN ('Lead', 'Purchase')),
  event_id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_time timestamptz NOT NULL DEFAULT now(),
  action_source text NOT NULL DEFAULT 'system_generated',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  payload_snapshot jsonb,
  meta_response jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_meta_conversion_events_tenant_lead_event_unique
    UNIQUE (tenant_id, lead_id, event_name)
);

CREATE INDEX IF NOT EXISTS crm_meta_conversion_events_queue_idx
  ON public.crm_meta_conversion_events (status, next_attempt_at, tenant_id)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS crm_meta_conversion_events_tenant_created_idx
  ON public.crm_meta_conversion_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_meta_conversion_events_lead_idx
  ON public.crm_meta_conversion_events (lead_id);

ALTER TABLE public.crm_meta_conversion_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.crm_meta_conversion_events;
CREATE POLICY tenant_isolation ON public.crm_meta_conversion_events
  FOR ALL TO authenticated
  USING (private.user_has_tenant_access(tenant_id))
  WITH CHECK (private.user_has_tenant_access(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_meta_conversion_events TO authenticated;
GRANT ALL ON public.crm_meta_conversion_events TO service_role;
