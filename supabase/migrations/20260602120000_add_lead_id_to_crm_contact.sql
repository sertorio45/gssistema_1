-- Link contacts to leads (primary contact per lead in pipeline flow)
ALTER TABLE public.crm_contact
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.crm_lead (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contact_lead_id ON public.crm_contact (lead_id);

COMMENT ON COLUMN public.crm_contact.lead_id IS 'Lead this contact belongs to (pipeline primary contact)';
