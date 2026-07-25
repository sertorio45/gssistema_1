-- Marketing Social SaaS foundation.
-- Adds agency portfolios without changing the existing app_role enum.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS private;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_type') THEN
    CREATE TYPE public.organization_type AS ENUM ('platform', 'agency', 'direct');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  type public.organization_type NOT NULL DEFAULT 'direct',
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'atendente',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, tenant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_tenants_one_primary_idx
  ON public.organization_tenants (organization_id)
  WHERE is_primary = true;

CREATE TABLE IF NOT EXISTS public.capabilities (
  key text PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_.-]+$'),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  capability text NOT NULL REFERENCES public.capabilities(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, capability)
);

CREATE TABLE IF NOT EXISTS public.tenant_capability_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capability text NOT NULL REFERENCES public.capabilities(key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, capability)
);

INSERT INTO public.capabilities (key, description)
VALUES
  ('marketing.social.read', 'Visualizar conteúdo, calendário, mídia e aprovações'),
  ('marketing.social.create', 'Criar e editar conteúdo e assets'),
  ('marketing.social.comment', 'Comentar em conteúdo social'),
  ('marketing.social.approve', 'Aprovar conteúdo sem designação individual'),
  ('marketing.social.publish', 'Agendar e publicar conteúdo aprovado'),
  ('marketing.social.integrations', 'Gerenciar contas e credenciais sociais'),
  ('marketing.social.manage', 'Administrar e excluir recursos do Marketing Social')
ON CONFLICT (key) DO UPDATE SET description = excluded.description;

INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('cliente', 'marketing.social.read'),
    ('cliente', 'marketing.social.create'),
    ('cliente', 'marketing.social.comment'),
    ('cliente', 'marketing.social.approve'),
    ('cliente', 'marketing.social.publish'),
    ('cliente', 'marketing.social.integrations'),
    ('cliente', 'marketing.social.manage'),
    ('atendente', 'marketing.social.read'),
    ('atendente', 'marketing.social.create'),
    ('atendente', 'marketing.social.comment')
) AS defaults(role_name, capability)
ON CONFLICT (role, capability) DO NOTHING;

CREATE INDEX IF NOT EXISTS organizations_tenant_idx
  ON public.organizations (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_one_direct_per_tenant_idx
  ON public.organizations (tenant_id)
  WHERE type = 'direct';
CREATE INDEX IF NOT EXISTS organization_memberships_user_idx
  ON public.organization_memberships (user_id, is_active);
CREATE INDEX IF NOT EXISTS organization_memberships_tenant_idx
  ON public.organization_memberships (tenant_id);
CREATE INDEX IF NOT EXISTS organization_tenants_tenant_idx
  ON public.organization_tenants (tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS tenant_capability_grants_user_idx
  ON public.tenant_capability_grants (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS role_capabilities_role_idx
  ON public.role_capabilities (role, capability);

-- Preserve every existing tenant and membership in the additive organization model.
INSERT INTO public.organizations (tenant_id, name, slug, type, is_active)
SELECT t.id, t.name, 'direct-' || t.slug, 'direct', COALESCE(t.is_active, true)
FROM public.tenant t
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.organization_tenants (organization_id, tenant_id, is_primary)
SELECT o.id, o.tenant_id, true
FROM public.organizations o
WHERE o.tenant_id IS NOT NULL
  AND o.type = 'direct'
ON CONFLICT (organization_id, tenant_id) DO UPDATE SET is_primary = true;

INSERT INTO public.organization_memberships (
  id,
  tenant_id,
  organization_id,
  user_id,
  role,
  created_at,
  updated_at
)
SELECT
  utr.id,
  utr.tenant_id,
  o.id,
  utr.user_id,
  utr.role,
  utr.created_at,
  utr.updated_at
FROM public.user_tenant_role utr
JOIN public.organizations o
  ON o.tenant_id = utr.tenant_id
 AND o.type = 'direct'
WHERE utr.tenant_id IS NOT NULL
  AND utr.role NOT IN ('admin', 'funcionario')
ON CONFLICT (organization_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.validate_organization_membership_tenant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  anchor_tenant_id uuid;
BEGIN
  SELECT tenant_id
  INTO anchor_tenant_id
  FROM public.organizations
  WHERE id = NEW.organization_id;

  IF NEW.tenant_id IS DISTINCT FROM anchor_tenant_id THEN
    RAISE EXCEPTION 'Membership tenant must match the organization anchor tenant';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_organization_membership_tenant
  ON public.organization_memberships;
CREATE TRIGGER validate_organization_membership_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, organization_id
  ON public.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_organization_membership_tenant();

CREATE OR REPLACE FUNCTION private.sync_tenant_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  organization_id uuid;
BEGIN
  INSERT INTO public.organizations (tenant_id, name, slug, type, is_active)
  VALUES (
    NEW.id,
    NEW.name,
    'direct-' || NEW.slug,
    'direct',
    COALESCE(NEW.is_active, true)
  )
  ON CONFLICT (tenant_id) WHERE type = 'direct'
  DO UPDATE SET
    name = excluded.name,
    slug = excluded.slug,
    is_active = excluded.is_active,
    updated_at = now()
  RETURNING id INTO organization_id;

  INSERT INTO public.organization_tenants (
    organization_id,
    tenant_id,
    is_primary
  )
  VALUES (organization_id, NEW.id, true)
  ON CONFLICT (organization_id, tenant_id)
  DO UPDATE SET is_primary = true, updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_tenant_organization ON public.tenant;
CREATE TRIGGER sync_tenant_organization
  AFTER INSERT OR UPDATE OF name, slug, is_active
  ON public.tenant
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_tenant_organization();

CREATE OR REPLACE FUNCTION private.sync_user_tenant_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  organization_id uuid;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.tenant_id IS NOT NULL THEN
    DELETE FROM public.organization_memberships om
    USING public.organizations o
    WHERE om.id = OLD.id
      AND om.organization_id = o.id
      AND o.type = 'direct';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.tenant_id IS NULL OR NEW.role IN ('admin', 'funcionario') THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO organization_id
  FROM public.organizations
  WHERE tenant_id = NEW.tenant_id
    AND type = 'direct';

  INSERT INTO public.organization_memberships (
    id,
    tenant_id,
    organization_id,
    user_id,
    role,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.tenant_id,
    organization_id,
    NEW.user_id,
    NEW.role,
    true,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET
    role = excluded.role,
    is_active = true,
    updated_at = excluded.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_tenant_membership ON public.user_tenant_role;
CREATE TRIGGER sync_user_tenant_membership
  AFTER INSERT OR UPDATE OR DELETE
  ON public.user_tenant_role
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_user_tenant_membership();

CREATE OR REPLACE FUNCTION private.current_global_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

CREATE OR REPLACE FUNCTION private.is_platform_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(private.current_global_role() IN ('admin', 'funcionario'), false);
$$;

CREATE OR REPLACE FUNCTION private.user_tenant_role(
  p_user_id uuid,
  p_tenant_id uuid
)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT role
  FROM (
    SELECT utr.role, 0 AS priority
    FROM public.user_tenant_role utr
    WHERE utr.user_id = p_user_id
      AND utr.tenant_id = p_tenant_id

    UNION ALL

    SELECT om.role, 1 AS priority
    FROM public.organization_memberships om
    JOIN public.organization_tenants ot
      ON ot.organization_id = om.organization_id
    WHERE om.user_id = p_user_id
      AND om.is_active = true
      AND ot.tenant_id = p_tenant_id
  ) roles
  ORDER BY priority
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.user_has_tenant_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    private.is_platform_staff()
    OR private.user_tenant_role(auth.uid(), p_tenant_id) IS NOT NULL;
$$;

-- Compatibility wrapper used by existing policies.
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT private.user_has_tenant_access(p_tenant_id);
$$;

CREATE OR REPLACE FUNCTION private.user_has_capability(
  p_tenant_id uuid,
  p_capability text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  explicit_grant boolean;
  effective_role public.app_role;
BEGIN
  IF private.is_platform_staff() THEN
    RETURN true;
  END IF;

  SELECT allowed
  INTO explicit_grant
  FROM public.tenant_capability_grants
  WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND capability = p_capability;

  IF explicit_grant IS NOT NULL THEN
    RETURN explicit_grant;
  END IF;

  effective_role := private.user_tenant_role(auth.uid(), p_tenant_id);

  RETURN EXISTS (
    SELECT 1
    FROM public.role_capabilities rc
    WHERE rc.role = effective_role
      AND rc.capability = p_capability
      AND (rc.tenant_id IS NULL OR rc.tenant_id = p_tenant_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_tenant_capability(
  p_tenant_id uuid,
  p_capability text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT private.user_has_capability(p_tenant_id, p_capability);
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_tenant_team(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT private.is_platform_staff()
    OR private.user_tenant_role(auth.uid(), p_tenant_id) = 'cliente';
$$;

REVOKE ALL ON FUNCTION private.current_global_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_platform_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.user_tenant_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.user_has_tenant_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.user_has_capability(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.validate_organization_membership_tenant() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.sync_tenant_organization() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.sync_user_tenant_membership() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_tenant_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_tenant_capability(uuid, text) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_platform_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.user_has_tenant_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.user_has_capability(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_capability(uuid, text) TO authenticated, service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_capability_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY capabilities_read ON public.capabilities
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR private.user_has_tenant_access(tenant_id));
CREATE POLICY capabilities_platform_manage ON public.capabilities
  FOR ALL TO authenticated
  USING (private.is_platform_staff())
  WITH CHECK (private.is_platform_staff());

CREATE POLICY role_capabilities_read ON public.role_capabilities
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR private.user_has_tenant_access(tenant_id));
CREATE POLICY role_capabilities_platform_manage ON public.role_capabilities
  FOR ALL TO authenticated
  USING (private.is_platform_staff())
  WITH CHECK (private.is_platform_staff());

CREATE POLICY organizations_select_scoped ON public.organizations
  FOR SELECT TO authenticated
  USING (
    private.is_platform_staff()
    OR tenant_id IS NOT NULL AND private.user_has_tenant_access(tenant_id)
    OR EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY organizations_platform_manage ON public.organizations
  FOR ALL TO authenticated
  USING (private.is_platform_staff())
  WITH CHECK (private.is_platform_staff());

CREATE POLICY organization_memberships_select_scoped ON public.organization_memberships
  FOR SELECT TO authenticated
  USING (
    private.is_platform_staff()
    OR user_id = auth.uid()
    OR tenant_id IS NOT NULL AND public.user_can_manage_tenant_team(tenant_id)
  );

CREATE POLICY organization_memberships_manage_scoped ON public.organization_memberships
  FOR ALL TO authenticated
  USING (private.is_platform_staff())
  WITH CHECK (private.is_platform_staff());

CREATE POLICY organization_tenants_select_scoped ON public.organization_tenants
  FOR SELECT TO authenticated
  USING (private.user_has_tenant_access(tenant_id));

CREATE POLICY organization_tenants_manage_scoped ON public.organization_tenants
  FOR ALL TO authenticated
  USING (private.is_platform_staff())
  WITH CHECK (private.is_platform_staff());

CREATE POLICY tenant_capabilities_select_scoped ON public.tenant_capability_grants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_can_manage_tenant_team(tenant_id)
  );

CREATE POLICY tenant_capabilities_manage_scoped ON public.tenant_capability_grants
  FOR ALL TO authenticated
  USING (public.user_can_manage_tenant_team(tenant_id))
  WITH CHECK (public.user_can_manage_tenant_team(tenant_id));

-- Remove authorization fallbacks to editable user_metadata from existing core policies.
DROP POLICY IF EXISTS tenant_staff_manage ON public.tenant;
CREATE POLICY tenant_staff_manage ON public.tenant
  FOR ALL TO authenticated
  USING (private.is_platform_staff())
  WITH CHECK (private.is_platform_staff());

DROP POLICY IF EXISTS tenant_modules_staff_manage ON public.tenant_modules;
CREATE POLICY tenant_modules_staff_manage ON public.tenant_modules
  FOR ALL TO authenticated
  USING (private.is_platform_staff())
  WITH CHECK (private.is_platform_staff());

-- CRM and Articles predate the current tenant RLS conventions. Apply a uniform
-- tenant policy only to tables that exist and have a tenant_id column.
DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'crm_company',
    'crm_contact',
    'crm_lead',
    'crm_funnel',
    'crm_sales_stage',
    'crm_lead_source_table',
    'crm_meeting',
    'crm_products',
    'crm_products_category',
    'articles',
    'articles_category',
    'articles_tag',
    'articles_tag_relations'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND information_schema.columns.table_name = v_table_name
        AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', v_table_name);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I FOR ALL TO authenticated USING (private.user_has_tenant_access(tenant_id)) WITH CHECK (private.user_has_tenant_access(tenant_id))',
        v_table_name
      );
    END IF;
  END LOOP;
END
$$;

COMMENT ON TABLE public.organizations IS
  'Commercial account boundary: platform, partner agency, or direct customer.';
COMMENT ON TABLE public.organization_tenants IS
  'Agency portfolio mapping. A tenant can be managed by an organization.';
COMMENT ON TABLE public.tenant_capability_grants IS
  'Per-user tenant capability overrides layered on top of existing app roles.';
