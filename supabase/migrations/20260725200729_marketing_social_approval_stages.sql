-- Applied remotely as marketing_social_approval_stages (20260725200729).
-- Introduced approval_stage enum (internal|client), approval_requests.stage,
-- approval_requests.next_approver_ids, and social_approval_settings.requires_internal_review.
-- Local file was empty after the remote apply; content is reconstructed here for history.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_stage') THEN
    CREATE TYPE public.approval_stage AS ENUM ('internal', 'client');
  END IF;
END
$$;

ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS stage public.approval_stage NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS next_approver_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE TABLE IF NOT EXISTS public.social_approval_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenant(id) ON DELETE CASCADE,
  requires_internal_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
