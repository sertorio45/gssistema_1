-- Approval UX: comment visibility + change request categorization.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_comment_visibility') THEN
    CREATE TYPE public.social_comment_visibility AS ENUM ('internal', 'shared');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_change_category') THEN
    CREATE TYPE public.approval_change_category AS ENUM (
      'art',
      'copy',
      'date',
      'platform',
      'incorrect_info',
      'other'
    );
  END IF;
END
$$;

ALTER TABLE public.social_comments
  ADD COLUMN IF NOT EXISTS visibility public.social_comment_visibility NOT NULL DEFAULT 'shared';

COMMENT ON COLUMN public.social_comments.visibility IS
  'internal: agency-only. shared: visible to client approvers. Never leak internal to client roles.';

ALTER TABLE public.approval_decisions
  ADD COLUMN IF NOT EXISTS change_category public.approval_change_category;

CREATE INDEX IF NOT EXISTS social_comments_post_visibility_idx
  ON public.social_comments (post_id, visibility, created_at DESC);
