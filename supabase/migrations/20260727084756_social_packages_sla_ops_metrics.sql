-- Etapa 4: client packages, SLA stage deadlines, ops metrics support.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_package_status') THEN
    CREATE TYPE public.social_package_status AS ENUM (
      'draft',
      'active',
      'paused',
      'ended'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_sla_stage_key') THEN
    CREATE TYPE public.social_sla_stage_key AS ENUM (
      'briefing',
      'copy',
      'design',
      'review',
      'approval',
      'fix',
      'publication'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.social_client_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  name text NOT NULL,
  status public.social_package_status NOT NULL DEFAULT 'active',
  starts_at date NOT NULL,
  ends_at date,
  posts_quota integer NOT NULL DEFAULT 0 CHECK (posts_quota >= 0),
  reels_quota integer NOT NULL DEFAULT 0 CHECK (reels_quota >= 0),
  stories_quota integer NOT NULL DEFAULT 0 CHECK (stories_quota >= 0),
  campaigns_quota integer NOT NULL DEFAULT 0 CHECK (campaigns_quota >= 0),
  capture_quota integer NOT NULL DEFAULT 0 CHECK (capture_quota >= 0),
  notes text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_client_packages_name_len CHECK (char_length(name) BETWEEN 1 AND 180),
  CONSTRAINT social_client_packages_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT social_client_packages_period_chk CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS social_client_packages_tenant_idx
  ON public.social_client_packages (tenant_id, status, starts_at DESC);

CREATE TABLE IF NOT EXISTS public.social_package_sla_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  package_id uuid NOT NULL,
  stage_key public.social_sla_stage_key NOT NULL,
  max_business_days integer NOT NULL CHECK (max_business_days > 0 AND max_business_days <= 90),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_package_sla_stages_unique UNIQUE (package_id, stage_key)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_package_sla_stages_package_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_package_sla_stages
      ADD CONSTRAINT social_package_sla_stages_package_tenant_fkey
      FOREIGN KEY (package_id, tenant_id)
      REFERENCES public.social_client_packages(id, tenant_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS package_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_posts_package_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_posts
      ADD CONSTRAINT social_posts_package_tenant_fkey
      FOREIGN KEY (package_id, tenant_id)
      REFERENCES public.social_client_packages(id, tenant_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS social_posts_package_idx
  ON public.social_posts (tenant_id, package_id)
  WHERE package_id IS NOT NULL AND deleted_at IS NULL;

-- Caps
INSERT INTO public.capabilities (key, description)
VALUES
  ('marketing.social.packages.read', 'Visualizar pacotes contratados'),
  ('marketing.social.packages.manage', 'Gerenciar pacotes e cotas'),
  ('marketing.social.sla.manage', 'Gerenciar SLA por etapa'),
  ('marketing.social.ops_metrics.read', 'Visualizar métricas operacionais')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.packages.read'),
  ('marketing.social.packages.manage'),
  ('marketing.social.sla.manage'),
  ('marketing.social.ops_metrics.read')
) AS c(capability)
WHERE r.slug IN ('owner', 'agency_admin', 'marketing_manager')
  AND r.organization_type IN ('agency', 'direct')
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.packages.read'),
  ('marketing.social.ops_metrics.read')
) AS c(capability)
WHERE r.slug IN ('social_media', 'analyst')
  AND r.organization_type = 'agency'
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;

INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('admin', 'marketing.social.packages.read'),
    ('admin', 'marketing.social.packages.manage'),
    ('admin', 'marketing.social.sla.manage'),
    ('admin', 'marketing.social.ops_metrics.read'),
    ('funcionario', 'marketing.social.packages.read'),
    ('funcionario', 'marketing.social.packages.manage'),
    ('funcionario', 'marketing.social.sla.manage'),
    ('funcionario', 'marketing.social.ops_metrics.read'),
    ('cliente', 'marketing.social.packages.read'),
    ('cliente', 'marketing.social.ops_metrics.read')
) AS seed(role_name, capability)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_capabilities rc
  WHERE rc.role = seed.role_name::public.app_role
    AND rc.capability = seed.capability
    AND rc.tenant_id IS NULL
);

ALTER TABLE public.social_client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_package_sla_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_read ON public.social_client_packages;
CREATE POLICY tenant_read ON public.social_client_packages
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.social_client_packages;
CREATE POLICY social_manage ON public.social_client_packages
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.packages.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.packages.manage'));

DROP POLICY IF EXISTS tenant_read ON public.social_package_sla_stages;
CREATE POLICY tenant_read ON public.social_package_sla_stages
  FOR SELECT TO authenticated USING (private.user_has_tenant_access(tenant_id));
DROP POLICY IF EXISTS social_manage ON public.social_package_sla_stages;
CREATE POLICY social_manage ON public.social_package_sla_stages
  FOR ALL TO authenticated
  USING (private.user_has_capability(tenant_id, 'marketing.social.sla.manage'))
  WITH CHECK (private.user_has_capability(tenant_id, 'marketing.social.sla.manage'));

COMMENT ON TABLE public.social_client_packages IS
  'Contracted monthly quotas per client tenant (posts, reels, stories, campaigns).';
COMMENT ON TABLE public.social_package_sla_stages IS
  'Business-day SLA deadlines per production stage within a package.';
