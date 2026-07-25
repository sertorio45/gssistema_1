-- Marketing Social editorial, approval, publishing and observability domain.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_post_status') THEN
    CREATE TYPE public.social_post_status AS ENUM (
      'draft',
      'pending_approval',
      'changes_requested',
      'approved',
      'scheduled',
      'publishing',
      'published',
      'failed',
      'archived'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_platform') THEN
    CREATE TYPE public.social_platform AS ENUM ('facebook', 'instagram', 'linkedin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE public.approval_status AS ENUM (
      'pending',
      'approved',
      'changes_requested',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publication_job_status') THEN
    CREATE TYPE public.publication_job_status AS ENUM (
      'pending',
      'processing',
      'retrying',
      'published',
      'failed',
      'cancelled'
    );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  name text NOT NULL,
  bucket text NOT NULL DEFAULT 'marketing-assets',
  object_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  width integer,
  height integer,
  duration_seconds numeric,
  checksum text,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'ready', 'processing', 'failed', 'archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, object_path)
);

CREATE TABLE IF NOT EXISTS public.media_asset_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('thumbnail', 'crop', 'transcode', 'platform')),
  platform public.social_platform,
  object_path text NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, kind, platform, object_path)
);

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  provider text NOT NULL CHECK (provider IN ('meta', 'linkedin')),
  integration_id uuid,
  external_account_id text NOT NULL,
  name text NOT NULL,
  username text,
  avatar_url text,
  capabilities text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  token_expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, platform, external_account_id)
);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  status public.social_post_status NOT NULL DEFAULT 'draft',
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  approval_policy text NOT NULL DEFAULT 'any' CHECK (approval_policy IN ('any', 'all', 'minimum')),
  minimum_approvals integer NOT NULL DEFAULT 1 CHECK (minimum_approvals > 0),
  scheduled_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  published_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_version_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_post_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE RESTRICT,
  platform public.social_platform NOT NULL,
  caption text NOT NULL DEFAULT '',
  link_url text,
  hashtags text[] NOT NULL DEFAULT '{}',
  platform_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_post_id text,
  external_post_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, account_id)
);

CREATE TABLE IF NOT EXISTS public.social_post_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.social_post_variants(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, variant_id, asset_id)
);

CREATE TABLE IF NOT EXISTS public.content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  snapshot jsonb NOT NULL,
  checksum text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, version)
);

ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_approved_version_fkey
  FOREIGN KEY (approved_version_id)
  REFERENCES public.content_versions(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.content_versions(id) ON DELETE RESTRICT,
  status public.approval_status NOT NULL DEFAULT 'pending',
  policy text NOT NULL DEFAULT 'any' CHECK (policy IN ('any', 'all', 'minimum')),
  minimum_approvals integer NOT NULL DEFAULT 1 CHECK (minimum_approvals > 0),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS approval_requests_one_pending_idx
  ON public.approval_requests (post_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.approval_request_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approved', 'changes_requested')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, approver_id)
);

CREATE TABLE IF NOT EXISTS public.social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.content_versions(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  parent_id uuid REFERENCES public.social_comments(id) ON DELETE CASCADE,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publication_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.social_post_variants(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.content_versions(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE RESTRICT,
  status public.publication_job_status NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz NOT NULL,
  priority smallint NOT NULL DEFAULT 100,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  next_attempt_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  idempotency_key text NOT NULL UNIQUE,
  last_error_code text,
  last_error_message text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publication_jobs_due_idx
  ON public.publication_jobs (status, COALESCE(next_attempt_at, scheduled_at), priority)
  WHERE status IN ('pending', 'retrying');

CREATE TABLE IF NOT EXISTS public.publication_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.publication_jobs(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  status text NOT NULL CHECK (status IN ('processing', 'published', 'retrying', 'failed')),
  request_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_post_id text,
  error_code text,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.social_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('meta', 'linkedin')),
  external_event_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'dead_letter')),
  attempts integer NOT NULL DEFAULT 0,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_event_id)
);

CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('meta', 'linkedin', 'google_ads', 'google_analytics')),
  state_hash text NOT NULL UNIQUE,
  redirect_path text NOT NULL DEFAULT '/marketing/integrations',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  action_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  whatsapp boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, event_type)
);

CREATE TABLE IF NOT EXISTS public.dead_letter_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('publication_job', 'webhook')),
  source_id uuid,
  reason text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Composite constraints prevent cross-tenant references even when callers use
-- the service role and therefore bypass RLS.
ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE public.social_post_variants
  ADD CONSTRAINT social_post_variants_id_post_tenant_unique UNIQUE (id, post_id, tenant_id);
ALTER TABLE public.content_versions
  ADD CONSTRAINT content_versions_id_post_tenant_unique UNIQUE (id, post_id, tenant_id);
ALTER TABLE public.approval_requests
  ADD CONSTRAINT approval_requests_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE public.social_comments
  ADD CONSTRAINT social_comments_id_post_tenant_unique UNIQUE (id, post_id, tenant_id);
ALTER TABLE public.publication_jobs
  ADD CONSTRAINT publication_jobs_id_tenant_unique UNIQUE (id, tenant_id);

ALTER TABLE public.media_asset_variants
  ADD CONSTRAINT media_asset_variants_asset_tenant_fkey
  FOREIGN KEY (asset_id, tenant_id)
  REFERENCES public.media_assets(id, tenant_id);
ALTER TABLE public.social_post_variants
  ADD CONSTRAINT social_post_variants_post_tenant_fkey
  FOREIGN KEY (post_id, tenant_id)
  REFERENCES public.social_posts(id, tenant_id),
  ADD CONSTRAINT social_post_variants_account_tenant_fkey
  FOREIGN KEY (account_id, tenant_id)
  REFERENCES public.social_accounts(id, tenant_id);
ALTER TABLE public.social_post_assets
  ADD CONSTRAINT social_post_assets_post_tenant_fkey
  FOREIGN KEY (post_id, tenant_id)
  REFERENCES public.social_posts(id, tenant_id),
  ADD CONSTRAINT social_post_assets_variant_post_tenant_fkey
  FOREIGN KEY (variant_id, post_id, tenant_id)
  REFERENCES public.social_post_variants(id, post_id, tenant_id),
  ADD CONSTRAINT social_post_assets_asset_tenant_fkey
  FOREIGN KEY (asset_id, tenant_id)
  REFERENCES public.media_assets(id, tenant_id);
ALTER TABLE public.content_versions
  ADD CONSTRAINT content_versions_post_tenant_fkey
  FOREIGN KEY (post_id, tenant_id)
  REFERENCES public.social_posts(id, tenant_id);
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_approved_version_post_tenant_fkey
  FOREIGN KEY (approved_version_id, id, tenant_id)
  REFERENCES public.content_versions(id, post_id, tenant_id);
ALTER TABLE public.approval_requests
  ADD CONSTRAINT approval_requests_post_tenant_fkey
  FOREIGN KEY (post_id, tenant_id)
  REFERENCES public.social_posts(id, tenant_id),
  ADD CONSTRAINT approval_requests_version_post_tenant_fkey
  FOREIGN KEY (version_id, post_id, tenant_id)
  REFERENCES public.content_versions(id, post_id, tenant_id);
ALTER TABLE public.approval_request_approvers
  ADD CONSTRAINT approval_request_approvers_request_tenant_fkey
  FOREIGN KEY (request_id, tenant_id)
  REFERENCES public.approval_requests(id, tenant_id);
ALTER TABLE public.approval_decisions
  ADD CONSTRAINT approval_decisions_request_tenant_fkey
  FOREIGN KEY (request_id, tenant_id)
  REFERENCES public.approval_requests(id, tenant_id);
ALTER TABLE public.social_comments
  ADD CONSTRAINT social_comments_post_tenant_fkey
  FOREIGN KEY (post_id, tenant_id)
  REFERENCES public.social_posts(id, tenant_id),
  ADD CONSTRAINT social_comments_version_post_tenant_fkey
  FOREIGN KEY (version_id, post_id, tenant_id)
  REFERENCES public.content_versions(id, post_id, tenant_id),
  ADD CONSTRAINT social_comments_parent_post_tenant_fkey
  FOREIGN KEY (parent_id, post_id, tenant_id)
  REFERENCES public.social_comments(id, post_id, tenant_id);
ALTER TABLE public.publication_jobs
  ADD CONSTRAINT publication_jobs_post_tenant_fkey
  FOREIGN KEY (post_id, tenant_id)
  REFERENCES public.social_posts(id, tenant_id),
  ADD CONSTRAINT publication_jobs_variant_post_tenant_fkey
  FOREIGN KEY (variant_id, post_id, tenant_id)
  REFERENCES public.social_post_variants(id, post_id, tenant_id),
  ADD CONSTRAINT publication_jobs_version_post_tenant_fkey
  FOREIGN KEY (version_id, post_id, tenant_id)
  REFERENCES public.content_versions(id, post_id, tenant_id),
  ADD CONSTRAINT publication_jobs_account_tenant_fkey
  FOREIGN KEY (account_id, tenant_id)
  REFERENCES public.social_accounts(id, tenant_id);
ALTER TABLE public.publication_attempts
  ADD CONSTRAINT publication_attempts_job_tenant_fkey
  FOREIGN KEY (job_id, tenant_id)
  REFERENCES public.publication_jobs(id, tenant_id);

CREATE INDEX IF NOT EXISTS audit_events_entity_idx
  ON public.audit_events (tenant_id, entity_type, entity_id, created_at DESC);

-- Common tenant indexes.
CREATE INDEX IF NOT EXISTS media_assets_tenant_created_idx ON public.media_assets (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_accounts_tenant_idx ON public.social_accounts (tenant_id, platform, is_active);
CREATE INDEX IF NOT EXISTS social_posts_tenant_status_idx ON public.social_posts (tenant_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS social_post_variants_post_idx ON public.social_post_variants (post_id);
CREATE INDEX IF NOT EXISTS social_post_assets_post_idx ON public.social_post_assets (post_id, position);
CREATE INDEX IF NOT EXISTS content_versions_post_idx ON public.content_versions (post_id, version DESC);
CREATE INDEX IF NOT EXISTS approval_requests_tenant_status_idx ON public.approval_requests (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS approval_approvers_user_idx ON public.approval_request_approvers (user_id, request_id);
CREATE INDEX IF NOT EXISTS social_comments_post_idx ON public.social_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS publication_attempts_job_idx ON public.publication_attempts (job_id, attempt_number);

-- Keep mutable records timestamped consistently.
DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'media_assets',
    'media_asset_variants',
    'social_accounts',
    'social_posts',
    'social_post_variants',
    'social_post_assets',
    'content_versions',
    'approval_requests',
    'approval_request_approvers',
    'approval_decisions',
    'social_comments',
    'publication_jobs',
    'publication_attempts',
    'social_webhook_events',
    'oauth_states',
    'notifications',
    'notification_preferences',
    'dead_letter_events'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', v_table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.set_updated_at()',
      v_table_name
    );
  END LOOP;
END
$$;

-- RLS: content reads share one tenant boundary; writes require capabilities.
DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'media_assets',
    'media_asset_variants',
    'social_accounts',
    'social_posts',
    'social_post_variants',
    'social_post_assets',
    'content_versions',
    'approval_requests',
    'approval_request_approvers',
    'approval_decisions',
    'social_comments',
    'publication_jobs',
    'publication_attempts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);
    EXECUTE format(
      'CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id))',
      v_table_name
    );
  END LOOP;
END
$$;

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_states_own ON public.oauth_states
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND private.user_has_tenant_access(tenant_id))
  WITH CHECK (user_id = auth.uid() AND private.user_has_tenant_access(tenant_id));

CREATE POLICY social_content_create ON public.social_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND private.user_has_capability(tenant_id, 'marketing.social.create')
  );
CREATE POLICY social_content_update ON public.social_posts
  FOR UPDATE TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.create'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.create'));
CREATE POLICY social_content_delete ON public.social_posts
  FOR DELETE TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.manage'));

DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'media_assets',
    'media_asset_variants',
    'social_accounts',
    'social_post_variants',
    'social_post_assets',
    'content_versions',
    'approval_requests',
    'approval_request_approvers',
    'social_comments'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY social_manage ON public.%I FOR ALL TO authenticated USING (private.user_has_capability(tenant_id, %L)) WITH CHECK (private.user_has_capability(tenant_id, %L))',
      v_table_name,
      'marketing.social.create',
      'marketing.social.create'
    );
  END LOOP;
END
$$;

CREATE POLICY approval_decisions_insert ON public.approval_decisions
  FOR INSERT TO authenticated
  WITH CHECK (
    approver_id = auth.uid()
    AND (
      private.user_has_capability(tenant_id, 'marketing.social.approve')
      OR EXISTS (
        SELECT 1
        FROM public.approval_request_approvers ara
        WHERE ara.request_id = approval_decisions.request_id
          AND ara.user_id = auth.uid()
      )
    )
  );

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND private.user_has_tenant_access(tenant_id))
  WITH CHECK (user_id = auth.uid() AND private.user_has_tenant_access(tenant_id));

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND private.user_has_tenant_access(tenant_id));

CREATE POLICY notification_preferences_own ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND private.user_has_tenant_access(tenant_id))
  WITH CHECK (user_id = auth.uid() AND private.user_has_tenant_access(tenant_id));

CREATE POLICY social_webhook_events_manage ON public.social_webhook_events
  FOR SELECT TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.manage'));
CREATE POLICY dead_letter_events_manage ON public.dead_letter_events
  FOR SELECT TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.manage'));
CREATE POLICY audit_events_manage ON public.audit_events
  FOR SELECT TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.manage'));

-- Jobs, attempts, webhooks and audit writes are server-only.
REVOKE INSERT, UPDATE, DELETE ON public.publication_jobs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.publication_attempts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.social_webhook_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.dead_letter_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_events FROM authenticated;

-- Private Supabase Storage bucket. Paths always start with tenant_id.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-assets',
  'marketing-assets',
  false,
  104857600,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

CREATE POLICY marketing_assets_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'marketing-assets'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND private.user_has_tenant_access(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY marketing_assets_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-assets'
    AND owner_id = auth.uid()::text
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND private.user_has_capability(
      ((storage.foldername(name))[1])::uuid,
      'marketing.social.create'
    )
  );

CREATE POLICY marketing_assets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketing-assets'
    AND (
      owner_id = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND private.user_has_capability(
          ((storage.foldername(name))[1])::uuid,
          'marketing.social.manage'
        )
      )
    )
  );

COMMENT ON TABLE public.content_versions IS
  'Immutable snapshots submitted for approval and referenced by publication jobs.';
COMMENT ON TABLE public.publication_jobs IS
  'Persistent idempotent publishing queue claimed by a trusted worker.';
COMMENT ON TABLE public.audit_events IS
  'Append-only application audit trail; secrets must be sanitized before insert.';
