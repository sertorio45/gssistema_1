-- Social post deletion flow: soft-delete tombstone, remote attempt tracking,
-- expanded capabilities, and RPC that no longer hard-deletes immediately.
-- Future hard-delete policy: purge tombstones older than 365 days via scheduled
-- job after legal/ops review — NOT implemented automatically in this migration.

-- ---------------------------------------------------------------------------
-- Capabilities
-- ---------------------------------------------------------------------------

INSERT INTO public.capabilities (key, description)
VALUES
  ('marketing.social.delete.force', 'Finalizar exclusão local apesar de falha remota'),
  ('marketing.social.delete.retry', 'Repetir exclusões remotas com falha')
ON CONFLICT (key) DO UPDATE SET description = excluded.description;

-- Owner / agency admin / marketing manager / manage roles get force + retry.
INSERT INTO public.organization_role_capabilities (role_id, capability)
SELECT r.id, c.capability
FROM public.organization_roles r
CROSS JOIN (
  VALUES
    ('marketing.social.delete.force'),
    ('marketing.social.delete.retry'),
    ('marketing.social.delete.remote')
) AS c(capability)
WHERE r.is_system
  AND r.organization_type IN ('agency', 'direct', 'platform')
  AND r.slug IN ('owner', 'agency_admin', 'marketing_manager')
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('cliente', 'marketing.social.delete.force'),
    ('cliente', 'marketing.social.delete.retry'),
    ('admin', 'marketing.social.delete.force'),
    ('admin', 'marketing.social.delete.retry'),
    ('funcionario', 'marketing.social.delete.retry')
) AS v(role_name, capability)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Post tombstone columns
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_deletion_mode') THEN
    CREATE TYPE public.social_deletion_mode AS ENUM (
      'cancel_draft',
      'system_and_remote',
      'system_only',
      'retry_remote'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_deletion_status') THEN
    CREATE TYPE public.social_deletion_status AS ENUM (
      'none',
      'requested',
      'remote_in_progress',
      'remote_partial',
      'completed',
      'failed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_remote_deletion_status') THEN
    CREATE TYPE public.social_remote_deletion_status AS ENUM (
      'not_applicable',
      'pending',
      'in_progress',
      'completed',
      'partial',
      'failed',
      'manual_action_required',
      'skipped'
    );
  END IF;
END
$$;

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_mode public.social_deletion_mode,
  ADD COLUMN IF NOT EXISTS deletion_status public.social_deletion_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deletion_reason text,
  ADD COLUMN IF NOT EXISTS remote_deletion_status public.social_remote_deletion_status NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS deletion_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_locked_by text;

CREATE INDEX IF NOT EXISTS social_posts_active_idx
  ON public.social_posts (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS social_posts_deleted_idx
  ON public.social_posts (tenant_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.social_posts.deleted_at IS
  'Soft-delete tombstone. Common listings must filter WHERE deleted_at IS NULL. Hard purge is a future scheduled policy (365d+), not automatic.';

-- ---------------------------------------------------------------------------
-- Variant remote identity enrichment (backward compatible)
-- ---------------------------------------------------------------------------

ALTER TABLE public.social_post_variants
  ADD COLUMN IF NOT EXISTS external_object_type text,
  ADD COLUMN IF NOT EXISTS external_container_id text,
  ADD COLUMN IF NOT EXISTS external_media_id text,
  ADD COLUMN IF NOT EXISTS external_permalink text,
  ADD COLUMN IF NOT EXISTS remote_identifiers jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.social_post_variants.external_post_id IS
  'Canonical published object ID used for remote delete. Never store a temporary creation/container ID here when a published media ID exists.';

-- ---------------------------------------------------------------------------
