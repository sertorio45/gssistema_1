-- Magic review links for client approval without full panel access.
-- Plaintext tokens are never stored; only SHA-256 hashes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_review_after_decision') THEN
    CREATE TYPE public.social_review_after_decision AS ENUM (
      'read_only',
      'invalidate'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.social_review_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  approval_request_id uuid NOT NULL,
  version_id uuid NOT NULL,
  post_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  allowed_actions jsonb NOT NULL DEFAULT '["approve","changes_requested","reject","comment"]'::jsonb,
  after_decision public.social_review_after_decision NOT NULL DEFAULT 'read_only',
  require_email_confirm boolean NOT NULL DEFAULT false,
  confirmed_email text,
  email_challenge_hash text,
  email_challenge_expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz,
  CONSTRAINT social_review_links_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT social_review_links_max_uses_chk CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT social_review_links_use_count_chk CHECK (use_count >= 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_review_links_request_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_review_links
      ADD CONSTRAINT social_review_links_request_tenant_fkey
      FOREIGN KEY (approval_request_id, tenant_id)
      REFERENCES public.approval_requests(id, tenant_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_review_links_post_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_review_links
      ADD CONSTRAINT social_review_links_post_tenant_fkey
      FOREIGN KEY (post_id, tenant_id)
      REFERENCES public.social_posts(id, tenant_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_review_links_version_post_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_review_links
      ADD CONSTRAINT social_review_links_version_post_tenant_fkey
      FOREIGN KEY (version_id, post_id, tenant_id)
      REFERENCES public.content_versions(id, post_id, tenant_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS social_review_links_request_idx
  ON public.social_review_links (tenant_id, approval_request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS social_review_links_active_idx
  ON public.social_review_links (tenant_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.social_review_link_accesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  review_link_id uuid NOT NULL REFERENCES public.social_review_links(id) ON DELETE CASCADE,
  action text NOT NULL,
  ip_hash text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_review_link_accesses_link_idx
  ON public.social_review_link_accesses (review_link_id, created_at DESC);

CREATE INDEX IF NOT EXISTS social_review_link_accesses_rate_idx
  ON public.social_review_link_accesses (review_link_id, ip_hash, created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at ON public.social_review_links;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.social_review_links
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.social_review_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_review_link_accesses ENABLE ROW LEVEL SECURITY;

-- Public PostgREST must not read tokens/access logs. Nitro uses service_role.
REVOKE ALL ON public.social_review_links FROM anon, authenticated;
REVOKE ALL ON public.social_review_link_accesses FROM anon, authenticated;
GRANT ALL ON public.social_review_links TO service_role;
GRANT ALL ON public.social_review_link_accesses TO service_role;

-- Defense in depth: authenticated SELECT only with tenant access (no writes).
DROP POLICY IF EXISTS social_review_links_select ON public.social_review_links;
CREATE POLICY social_review_links_select ON public.social_review_links
  FOR SELECT TO authenticated
  USING (public.user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS social_review_link_accesses_select ON public.social_review_link_accesses;
CREATE POLICY social_review_link_accesses_select ON public.social_review_link_accesses
  FOR SELECT TO authenticated
  USING (public.user_has_tenant_access(tenant_id));

GRANT SELECT ON public.social_review_links TO authenticated;
GRANT SELECT ON public.social_review_link_accesses TO authenticated;

COMMENT ON TABLE public.social_review_links IS
  'Magic approval links. Store token_hash only; plaintext returned once at creation.';
COMMENT ON TABLE public.social_review_link_accesses IS
  'Access/decision audit for magic review links. ip_hash is one-way; never store raw IP long-term.';
