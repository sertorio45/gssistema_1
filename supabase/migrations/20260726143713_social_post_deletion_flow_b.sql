-- Expand deletion_jobs into full attempt ledger
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Expand enum safely (IF NOT EXISTS for each label).
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deletion_job_status') THEN
    ALTER TYPE public.deletion_job_status ADD VALUE IF NOT EXISTS 'deleted';
    ALTER TYPE public.deletion_job_status ADD VALUE IF NOT EXISTS 'already_absent';
    ALTER TYPE public.deletion_job_status ADD VALUE IF NOT EXISTS 'unsupported';
    ALTER TYPE public.deletion_job_status ADD VALUE IF NOT EXISTS 'manual_action_required';
    ALTER TYPE public.deletion_job_status ADD VALUE IF NOT EXISTS 'skipped';
  ELSE
    CREATE TYPE public.deletion_job_status AS ENUM (
      'pending',
      'processing',
      'done',
      'deleted',
      'already_absent',
      'failed',
      'unsupported',
      'manual_action_required',
      'skipped'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.deletion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.social_post_variants(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  status public.deletion_job_status NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error_code text,
  last_error_message text,
  locked_at timestamptz,
  locked_by text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_jobs
  ADD COLUMN IF NOT EXISTS platform public.social_platform,
  ADD COLUMN IF NOT EXISTS format public.social_post_format,
  ADD COLUMN IF NOT EXISTS external_object_id text,
  ADD COLUMN IF NOT EXISTS external_object_type text,
  ADD COLUMN IF NOT EXISTS external_permalink text,
  ADD COLUMN IF NOT EXISTS provider_code text,
  ADD COLUMN IF NOT EXISTS provider_message text,
  ADD COLUMN IF NOT EXISTS response_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS retryable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_action_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- Unique idempotency per tenant (create if missing).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deletion_jobs_tenant_idempotency_key'
  ) THEN
    ALTER TABLE public.deletion_jobs
      ADD CONSTRAINT deletion_jobs_tenant_idempotency_key UNIQUE (tenant_id, idempotency_key);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS deletion_jobs_post_status_idx
  ON public.deletion_jobs (tenant_id, post_id, status);

CREATE INDEX IF NOT EXISTS deletion_jobs_retry_idx
  ON public.deletion_jobs (tenant_id, status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.deletion_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deletion_jobs_select ON public.deletion_jobs;
CREATE POLICY deletion_jobs_select ON public.deletion_jobs
  FOR SELECT TO authenticated
  USING (public.user_has_tenant_access(tenant_id));

REVOKE INSERT, UPDATE, DELETE ON public.deletion_jobs FROM authenticated;
GRANT SELECT ON public.deletion_jobs TO authenticated;
GRANT ALL ON public.deletion_jobs TO service_role;

COMMENT ON TABLE public.deletion_jobs IS
  'Per-variant remote deletion attempts. Idempotent via (tenant_id, idempotency_key). Sanitized provider responses only — never store access tokens.';

-- ---------------------------------------------------------------------------
