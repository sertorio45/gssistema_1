-- Etapa 3: editorial campaigns, client briefing links, library folders/tags, brand guide.
-- Distinct from Meta Ads marketing_campaigns.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_campaign_status') THEN
    CREATE TYPE public.social_campaign_status AS ENUM (
      'draft',
      'active',
      'paused',
      'completed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_briefing_status') THEN
    CREATE TYPE public.social_briefing_status AS ENUM (
      'draft',
      'awaiting_client',
      'submitted',
      'needs_info',
      'accepted',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_asset_lifecycle') THEN
    CREATE TYPE public.media_asset_lifecycle AS ENUM (
      'active',
      'archived',
      'discontinued'
    );
  END IF;
END
$$;

-- ─── Editorial campaigns ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.social_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  name text NOT NULL,
  objective text NOT NULL DEFAULT '',
  status public.social_campaign_status NOT NULL DEFAULT 'draft',
  starts_at date,
  ends_at date,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  briefing_summary text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_campaigns_name_len CHECK (char_length(name) BETWEEN 1 AND 180)
);

CREATE INDEX IF NOT EXISTS social_campaigns_tenant_idx
  ON public.social_campaigns (tenant_id, status, starts_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_campaigns_id_tenant_unique'
  ) THEN
    ALTER TABLE public.social_campaigns
      ADD CONSTRAINT social_campaigns_id_tenant_unique UNIQUE (id, tenant_id);
  END IF;
END
$$;

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS campaign_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_posts_campaign_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_posts
      ADD CONSTRAINT social_posts_campaign_tenant_fkey
      FOREIGN KEY (campaign_id, tenant_id)
      REFERENCES public.social_campaigns(id, tenant_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS social_posts_campaign_idx
  ON public.social_posts (tenant_id, campaign_id)
  WHERE campaign_id IS NOT NULL AND deleted_at IS NULL;

-- ─── Briefing templates + submissions + magic links ──────────────────────────

CREATE TABLE IF NOT EXISTS public.social_briefing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_briefing_templates_fields_array CHECK (jsonb_typeof(fields) = 'array'),
  CONSTRAINT social_briefing_templates_scope_chk CHECK (
    tenant_id IS NOT NULL OR organization_id IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.social_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  campaign_id uuid,
  template_id uuid REFERENCES public.social_briefing_templates(id) ON DELETE SET NULL,
  post_id uuid,
  status public.social_briefing_status NOT NULL DEFAULT 'draft',
  title text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_email text,
  submitted_at timestamptz,
  accepted_at timestamptz,
  needs_info_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_briefings_id_tenant_unique UNIQUE (id, tenant_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_briefings_campaign_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_briefings
      ADD CONSTRAINT social_briefings_campaign_tenant_fkey
      FOREIGN KEY (campaign_id, tenant_id)
      REFERENCES public.social_campaigns(id, tenant_id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_briefings_post_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_briefings
      ADD CONSTRAINT social_briefings_post_tenant_fkey
      FOREIGN KEY (post_id, tenant_id)
      REFERENCES public.social_posts(id, tenant_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS social_briefings_tenant_status_idx
  ON public.social_briefings (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.social_briefing_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  briefing_id uuid NOT NULL,
  template_id uuid REFERENCES public.social_briefing_templates(id) ON DELETE SET NULL,
  campaign_id uuid,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  require_email_confirm boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz,
  CONSTRAINT social_briefing_links_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT social_briefing_links_max_uses_chk CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT social_briefing_links_use_count_chk CHECK (use_count >= 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_briefing_links_briefing_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_briefing_links
      ADD CONSTRAINT social_briefing_links_briefing_tenant_fkey
      FOREIGN KEY (briefing_id, tenant_id)
      REFERENCES public.social_briefings(id, tenant_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_briefing_links_campaign_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_briefing_links
      ADD CONSTRAINT social_briefing_links_campaign_tenant_fkey
      FOREIGN KEY (campaign_id, tenant_id)
      REFERENCES public.social_campaigns(id, tenant_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS social_briefing_links_active_idx
  ON public.social_briefing_links (tenant_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.social_briefing_link_accesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  briefing_link_id uuid NOT NULL REFERENCES public.social_briefing_links(id) ON DELETE CASCADE,
  action text NOT NULL,
  ip_hash text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_briefing_link_accesses_rate_idx
  ON public.social_briefing_link_accesses (briefing_link_id, ip_hash, created_at DESC);

-- ─── Library folders / tags / lifecycle ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  parent_id uuid,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_folders_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT media_folders_id_tenant_unique UNIQUE (id, tenant_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_folders_parent_tenant_fkey'
  ) THEN
    ALTER TABLE public.media_folders
      ADD CONSTRAINT media_folders_parent_tenant_fkey
      FOREIGN KEY (parent_id, tenant_id)
      REFERENCES public.media_folders(id, tenant_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS media_folders_tenant_parent_idx
  ON public.media_folders (tenant_id, parent_id);

CREATE TABLE IF NOT EXISTS public.media_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_tags_tenant_name_unique UNIQUE (tenant_id, name),
  CONSTRAINT media_tags_name_len CHECK (char_length(name) BETWEEN 1 AND 60),
  CONSTRAINT media_tags_id_tenant_unique UNIQUE (id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.media_asset_tags (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, tag_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_asset_tags_asset_tenant_fkey'
  ) THEN
    ALTER TABLE public.media_asset_tags
      ADD CONSTRAINT media_asset_tags_asset_tenant_fkey
      FOREIGN KEY (asset_id, tenant_id)
      REFERENCES public.media_assets(id, tenant_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_asset_tags_tag_tenant_fkey'
  ) THEN
    ALTER TABLE public.media_asset_tags
      ADD CONSTRAINT media_asset_tags_tag_tenant_fkey
      FOREIGN KEY (tag_id, tenant_id)
      REFERENCES public.media_tags(id, tenant_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

-- Ensure media_assets has (id, tenant_id) unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_id_tenant_unique'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_id_tenant_unique UNIQUE (id, tenant_id);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END
$$;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS folder_id uuid,
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS lifecycle public.media_asset_lifecycle NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS category text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_folder_tenant_fkey'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_folder_tenant_fkey
      FOREIGN KEY (folder_id, tenant_id)
      REFERENCES public.media_folders(id, tenant_id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_campaign_tenant_fkey'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_campaign_tenant_fkey
      FOREIGN KEY (campaign_id, tenant_id)
      REFERENCES public.social_campaigns(id, tenant_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS media_assets_folder_idx
  ON public.media_assets (tenant_id, folder_id, lifecycle);

CREATE INDEX IF NOT EXISTS media_assets_category_idx
  ON public.media_assets (tenant_id, category)
  WHERE category IS NOT NULL;

-- ─── Brand / communication guide ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.social_brand_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  tone_of_voice text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT '',
  allowed_words text[] NOT NULL DEFAULT '{}',
  forbidden_words text[] NOT NULL DEFAULT '{}',
  ctas text[] NOT NULL DEFAULT '{}',
  hashtags text[] NOT NULL DEFAULT '{}',
  colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  fonts jsonb NOT NULL DEFAULT '[]'::jsonb,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  competitors jsonb NOT NULL DEFAULT '[]'::jsonb,
  restrictions text NOT NULL DEFAULT '',
  legal_notes text NOT NULL DEFAULT '',
  logo_asset_ids uuid[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_brand_guides_tenant_unique UNIQUE (tenant_id)
);

-- ─── Caps ────────────────────────────────────────────────────────────────────

INSERT INTO public.capabilities (key, description)
VALUES
  ('marketing.social.campaigns.read', 'Visualizar campanhas editoriais'),
  ('marketing.social.campaigns.manage', 'Criar e gerenciar campanhas editoriais'),
  ('marketing.social.briefing.create', 'Criar briefings e links mágicos'),
  ('marketing.social.briefing.manage', 'Gerenciar briefings e templates'),
  ('marketing.social.library.manage', 'Gerenciar pastas, tags e ciclo de vida da biblioteca'),
  ('marketing.social.brand_guide.read', 'Visualizar guia de comunicação'),
  ('marketing.social.brand_guide.manage', 'Editar guia de comunicação do cliente')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.campaigns.read'),
  ('marketing.social.campaigns.manage'),
  ('marketing.social.briefing.create'),
  ('marketing.social.briefing.manage'),
  ('marketing.social.library.manage'),
  ('marketing.social.brand_guide.read'),
  ('marketing.social.brand_guide.manage')
) AS c(capability)
WHERE r.slug IN ('owner', 'agency_admin', 'marketing_manager')
  AND r.organization_type IN ('agency', 'direct')
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.campaigns.read'),
  ('marketing.social.briefing.create'),
  ('marketing.social.brand_guide.read'),
  ('marketing.social.library.manage')
) AS c(capability)
WHERE r.slug IN ('social_media', 'designer', 'copywriter')
  AND r.organization_type = 'agency'
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;

INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('admin', 'marketing.social.campaigns.read'),
    ('admin', 'marketing.social.campaigns.manage'),
    ('admin', 'marketing.social.briefing.create'),
    ('admin', 'marketing.social.briefing.manage'),
    ('admin', 'marketing.social.library.manage'),
    ('admin', 'marketing.social.brand_guide.read'),
    ('admin', 'marketing.social.brand_guide.manage'),
    ('funcionario', 'marketing.social.campaigns.read'),
    ('funcionario', 'marketing.social.campaigns.manage'),
    ('funcionario', 'marketing.social.briefing.create'),
    ('funcionario', 'marketing.social.briefing.manage'),
    ('funcionario', 'marketing.social.library.manage'),
    ('funcionario', 'marketing.social.brand_guide.read'),
    ('funcionario', 'marketing.social.brand_guide.manage'),
    ('cliente', 'marketing.social.campaigns.read'),
    ('cliente', 'marketing.social.briefing.create'),
    ('cliente', 'marketing.social.briefing.manage'),
    ('cliente', 'marketing.social.library.manage'),
    ('cliente', 'marketing.social.brand_guide.read'),
    ('cliente', 'marketing.social.brand_guide.manage')
) AS seed(role_name, capability)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_capabilities rc
  WHERE rc.role = seed.role_name::public.app_role
    AND rc.capability = seed.capability
    AND rc.tenant_id IS NULL
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_briefing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_brand_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_briefing_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_briefing_link_accesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_read ON public.social_campaigns;
CREATE POLICY tenant_read ON public.social_campaigns
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.social_campaigns;
CREATE POLICY social_manage ON public.social_campaigns
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.campaigns.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.campaigns.manage'));

DROP POLICY IF EXISTS tenant_read ON public.social_briefings;
CREATE POLICY tenant_read ON public.social_briefings
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.social_briefings;
CREATE POLICY social_manage ON public.social_briefings
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.briefing.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.briefing.manage'));

DROP POLICY IF EXISTS tenant_read ON public.social_briefing_templates;
CREATE POLICY tenant_read ON public.social_briefing_templates
  FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL
    OR private.user_has_tenant_access(tenant_id)
  );

DROP POLICY IF EXISTS social_manage ON public.social_briefing_templates;
CREATE POLICY social_manage ON public.social_briefing_templates
  FOR ALL TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND private.user_has_capability(tenant_id, 'marketing.social.briefing.manage')
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND private.user_has_capability(tenant_id, 'marketing.social.briefing.manage')
  );

DROP POLICY IF EXISTS tenant_read ON public.media_folders;
CREATE POLICY tenant_read ON public.media_folders
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.media_folders;
CREATE POLICY social_manage ON public.media_folders
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.library.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.library.manage'));

DROP POLICY IF EXISTS tenant_read ON public.media_tags;
CREATE POLICY tenant_read ON public.media_tags
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.media_tags;
CREATE POLICY social_manage ON public.media_tags
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.library.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.library.manage'));

DROP POLICY IF EXISTS tenant_read ON public.media_asset_tags;
CREATE POLICY tenant_read ON public.media_asset_tags
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.media_asset_tags;
CREATE POLICY social_manage ON public.media_asset_tags
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.library.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.library.manage'));

DROP POLICY IF EXISTS tenant_read ON public.social_brand_guides;
CREATE POLICY tenant_read ON public.social_brand_guides
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.social_brand_guides;
CREATE POLICY social_manage ON public.social_brand_guides
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.brand_guide.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.brand_guide.manage'));

REVOKE ALL ON public.social_briefing_links FROM anon, authenticated;
REVOKE ALL ON public.social_briefing_link_accesses FROM anon, authenticated;
GRANT ALL ON public.social_briefing_links TO service_role;
GRANT ALL ON public.social_briefing_link_accesses TO service_role;

DROP POLICY IF EXISTS social_briefing_links_select ON public.social_briefing_links;
CREATE POLICY social_briefing_links_select ON public.social_briefing_links
  FOR SELECT TO authenticated
  USING (private.user_has_tenant_access(tenant_id));

COMMENT ON TABLE public.social_campaigns IS
  'Editorial content campaigns (not Meta Ads marketing_campaigns).';
COMMENT ON TABLE public.social_briefing_links IS
  'Magic briefing links; plaintext token never stored.';
COMMENT ON TABLE public.social_brand_guides IS
  'Per-tenant communication guide for team and future AI.';
