-- Social approval workflow v2 — part 1: new enums only.
-- New values on existing enums cannot be used until after commit (PG rule).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_editorial_status') THEN
    CREATE TYPE public.social_editorial_status AS ENUM (
      'draft',
      'internal_review',
      'client_review',
      'changes_requested',
      'approved',
      'rejected',
      'cancelled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_publication_status') THEN
    CREATE TYPE public.social_publication_status AS ENUM (
      'not_scheduled',
      'scheduled',
      'publishing',
      'published',
      'partially_published',
      'failed',
      'deletion_pending',
      'deleted'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_workflow_stage_type') THEN
    CREATE TYPE public.social_workflow_stage_type AS ENUM ('internal', 'client', 'custom');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_workflow_stage_mode') THEN
    CREATE TYPE public.social_workflow_stage_mode AS ENUM ('any', 'all', 'minimum');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_approval_run_status') THEN
    CREATE TYPE public.social_approval_run_status AS ENUM (
      'pending',
      'approved',
      'changes_requested',
      'rejected',
      'cancelled',
      'superseded'
    );
  END IF;
END
$$;

-- Extend legacy approval_status with rejected (usable after this migration commits).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'approval_status' AND e.enumlabel = 'rejected'
  ) THEN
    ALTER TYPE public.approval_status ADD VALUE 'rejected';
  END IF;
END
$$;

-- Ensure approval_stage exists (remote may already have it from an earlier empty local file).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_stage') THEN
    CREATE TYPE public.approval_stage AS ENUM ('internal', 'client');
  END IF;
END
$$;
