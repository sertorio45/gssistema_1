-- Add closed_at to crm_lead (set when lead moves to won/lost stage)
ALTER TABLE crm_lead
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL;
