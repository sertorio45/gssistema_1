-- Workspace context: structural support for platform / agency / direct commercial models.
-- Additive only. Existing rows keep their current reach through defaults and backfill.

CREATE SCHEMA IF NOT EXISTS private;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_relationship_type') THEN
    CREATE TYPE public.organization_relationship_type AS ENUM ('owner', 'managed');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- organization_tenants: link type, lifecycle and provenance
-- ---------------------------------------------------------------------------

ALTER TABLE public.organization_tenants
  ADD COLUMN IF NOT EXISTS relationship_type public.organization_relationship_type
    NOT NULL DEFAULT 'managed',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- A link is owned when it points at the organization's own anchor tenant.
UPDATE public.organization_tenants ot
SET relationship_type = 'owner'
FROM public.organizations o
WHERE o.id = ot.organization_id
  AND o.tenant_id = ot.tenant_id
  AND ot.relationship_type <> 'owner';

UPDATE public.organization_tenants
SET started_at = COALESCE(created_at, now())
WHERE started_at > COALESCE(created_at, now());

ALTER TABLE public.organization_tenants
  DROP CONSTRAINT IF EXISTS organization_tenants_period_check;
ALTER TABLE public.organization_tenants
  ADD CONSTRAINT organization_tenants_period_check
  CHECK (ended_at IS NULL OR ended_at >= started_at);

CREATE INDEX IF NOT EXISTS organization_tenants_active_idx
  ON public.organization_tenants (tenant_id, organization_id)
  WHERE is_active = true;

COMMENT ON COLUMN public.organization_tenants.relationship_type IS
  'owner: the organization''s own workspace. managed: a client workspace served by the organization.';
COMMENT ON COLUMN public.organization_tenants.is_active IS
  'Inactive links are ignored by the access resolver without losing history.';

-- ---------------------------------------------------------------------------
-- organization_memberships: portfolio reach of each member
-- ---------------------------------------------------------------------------

-- Defaults to true so that every membership created before this migration keeps
-- the reach it already had. Narrowing is an explicit action from now on.
ALTER TABLE public.organization_memberships
  ADD COLUMN IF NOT EXISTS access_all_tenants boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.organization_memberships.access_all_tenants IS
  'Requested reach only. The server-side resolver still validates organization, link and module before granting access.';

-- ---------------------------------------------------------------------------
-- organization_member_tenants: which client workspaces a collaborator may open
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_member_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  organization_membership_id uuid NOT NULL
    REFERENCES public.organization_memberships(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_membership_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS organization_member_tenants_tenant_idx
  ON public.organization_member_tenants (tenant_id)
  WHERE is_active = true;

COMMENT ON TABLE public.organization_member_tenants IS
  'Assigns an organization member to specific client workspaces. Only read when access_all_tenants is false.';

DROP TRIGGER IF EXISTS set_organization_member_tenants_updated_at
  ON public.organization_member_tenants;
CREATE TRIGGER set_organization_member_tenants_updated_at
  BEFORE UPDATE ON public.organization_member_tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- An assignment is only meaningful for a tenant already in the organization portfolio.
CREATE OR REPLACE FUNCTION private.validate_organization_member_tenant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_organization_id uuid;
BEGIN
  SELECT organization_id
  INTO v_organization_id
  FROM public.organization_memberships
  WHERE id = NEW.organization_membership_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Unknown organization membership %', NEW.organization_membership_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_tenants ot
    WHERE ot.organization_id = v_organization_id
      AND ot.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Tenant % is not part of organization % portfolio',
      NEW.tenant_id, v_organization_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_organization_member_tenant
  ON public.organization_member_tenants;
CREATE TRIGGER validate_organization_member_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, organization_membership_id
  ON public.organization_member_tenants
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_organization_member_tenant();

REVOKE ALL ON FUNCTION private.validate_organization_member_tenant() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- audit_events: platform actions are not always bound to a tenant
-- ---------------------------------------------------------------------------

ALTER TABLE public.audit_events
  ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS organization_id uuid
    REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS audit_events_organization_idx
  ON public.audit_events (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

COMMENT ON COLUMN public.audit_events.organization_id IS
  'Set for organization-scoped and platform context-switch events.';

-- ---------------------------------------------------------------------------
-- Keep the tenant -> direct organization sync aware of the new link type
-- ---------------------------------------------------------------------------

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
    is_primary,
    relationship_type,
    is_active
  )
  VALUES (organization_id, NEW.id, true, 'owner', true)
  ON CONFLICT (organization_id, tenant_id)
  DO UPDATE SET
    is_primary = true,
    relationship_type = 'owner',
    is_active = true,
    ended_at = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_tenant_organization() FROM PUBLIC;
