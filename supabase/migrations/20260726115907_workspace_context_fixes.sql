-- Two defects found while exercising the workspace rules directly against the
-- database (see supabase/tests/workspace_rls.sql).

-- ---------------------------------------------------------------------------
-- 1. Ambiguous variable in the organization sync triggers
-- ---------------------------------------------------------------------------
-- Both sync triggers declared a local variable named `organization_id`, which is
-- also a column of the tables they write to. PL/pgSQL refuses the reference
-- ("column reference organization_id is ambiguous"), so creating a tenant — or
-- granting a user a tenant role — failed at the trigger.
--
-- Prefixing the variables removes the collision without changing any behaviour.

CREATE OR REPLACE FUNCTION private.sync_tenant_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_organization_id uuid;
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
  RETURNING id INTO v_organization_id;

  INSERT INTO public.organization_tenants (
    organization_id,
    tenant_id,
    is_primary,
    relationship_type,
    is_active
  )
  VALUES (v_organization_id, NEW.id, true, 'owner', true)
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

CREATE OR REPLACE FUNCTION private.sync_user_tenant_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_organization_id uuid;
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
  INTO v_organization_id
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
    v_organization_id,
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

REVOKE ALL ON FUNCTION private.sync_tenant_organization() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.sync_user_tenant_membership() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 2. Missing EXECUTE grant for a predicate used inside an RLS policy
-- ---------------------------------------------------------------------------
-- `organization_member_tenants` policies call this helper directly, so the
-- predicate is evaluated as the querying role rather than as the definer of the
-- surrounding function. Without the grant every authenticated read of the table
-- failed with "permission denied for function organization_of_membership".

GRANT EXECUTE ON FUNCTION private.organization_of_membership(uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. A three-valued predicate
-- ---------------------------------------------------------------------------
-- `user_organization_role` returns NULL for a user without a membership, so the
-- comparison — and the whole function — returned NULL instead of false. RLS
-- reads NULL as "denied", but any other caller negating the result got NULL
-- back. Collapsing it to a plain boolean keeps the predicate usable everywhere.

CREATE OR REPLACE FUNCTION public.user_can_manage_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    private.is_platform_staff()
    OR private.user_organization_role(auth.uid(), p_organization_id) = 'cliente',
    false
  );
$$;
