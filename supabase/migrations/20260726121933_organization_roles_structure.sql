-- Organization roles: professional cargos scoped to an organization.
-- Templates live with organization_id IS NULL and are copied into each
-- organization on create / backfill so every org can customize without
-- affecting the others (safer for RLS and isolation).

-- ---------------------------------------------------------------------------
-- Catalog tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL CHECK (slug ~ '^[a-z][a-z0-9_-]*$'),
  description text NOT NULL DEFAULT '',
  organization_type public.organization_type,
  is_system boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_editable boolean NOT NULL DEFAULT true,
  is_protected boolean NOT NULL DEFAULT false,
  -- Kept in sync so legacy RLS predicates that still read app_role keep working.
  legacy_app_role public.app_role NOT NULL DEFAULT 'atendente',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_roles_scope_check CHECK (
    (organization_id IS NULL AND organization_type IS NOT NULL)
    OR (organization_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.organization_roles IS
  'Professional cargos. Rows with organization_id NULL are system templates; org copies are customized independently.';
COMMENT ON COLUMN public.organization_roles.is_protected IS
  'Protected cargos (owner) cannot be deleted and the last holder cannot be demoted.';
COMMENT ON COLUMN public.organization_roles.legacy_app_role IS
  'Maps the cargo onto the legacy app_role used by older RLS predicates.';

CREATE UNIQUE INDEX IF NOT EXISTS organization_roles_org_slug_uidx
  ON public.organization_roles (organization_id, slug)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organization_roles_template_slug_uidx
  ON public.organization_roles (organization_type, slug)
  WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS organization_roles_organization_idx
  ON public.organization_roles (organization_id)
  WHERE organization_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_organization_roles_updated_at ON public.organization_roles;
CREATE TRIGGER set_organization_roles_updated_at
  BEFORE UPDATE ON public.organization_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.organization_role_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.organization_roles(id) ON DELETE CASCADE,
  capability text NOT NULL REFERENCES public.capabilities(key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, capability)
);

CREATE INDEX IF NOT EXISTS organization_role_capabilities_role_idx
  ON public.organization_role_capabilities (role_id);

DROP TRIGGER IF EXISTS set_organization_role_capabilities_updated_at
  ON public.organization_role_capabilities;
CREATE TRIGGER set_organization_role_capabilities_updated_at
  BEFORE UPDATE ON public.organization_role_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Membership: one primary cargo per membership
-- ---------------------------------------------------------------------------

ALTER TABLE public.organization_memberships
  ADD COLUMN IF NOT EXISTS role_id uuid
    REFERENCES public.organization_roles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS organization_memberships_role_idx
  ON public.organization_memberships (role_id)
  WHERE role_id IS NOT NULL;

COMMENT ON COLUMN public.organization_memberships.role_id IS
  'Primary organization cargo. Tenant assignment is independent and lives in organization_member_tenants.';

-- A membership cargo must belong to the same organization (or be a template briefly during backfill).
CREATE OR REPLACE FUNCTION private.validate_membership_role_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role_organization_id uuid;
BEGIN
  IF NEW.role_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT organization_id
  INTO v_role_organization_id
  FROM public.organization_roles
  WHERE id = NEW.role_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown organization role %', NEW.role_id;
  END IF;

  IF v_role_organization_id IS NOT NULL
     AND v_role_organization_id <> NEW.organization_id THEN
    RAISE EXCEPTION 'Role % does not belong to organization %',
      NEW.role_id, NEW.organization_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_membership_role_scope ON public.organization_memberships;
CREATE TRIGGER validate_membership_role_scope
  BEFORE INSERT OR UPDATE OF role_id, organization_id
  ON public.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_membership_role_scope();

REVOKE ALL ON FUNCTION private.validate_membership_role_scope() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email)),
  role_id uuid NOT NULL REFERENCES public.organization_roles(id) ON DELETE RESTRICT,
  access_all_tenants boolean NOT NULL DEFAULT true,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_invites_pending_email_uidx
  ON public.organization_invites (organization_id, email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS organization_invites_token_idx
  ON public.organization_invites (token)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS set_organization_invites_updated_at ON public.organization_invites;
CREATE TRIGGER set_organization_invites_updated_at
  BEFORE UPDATE ON public.organization_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.organization_invite_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.organization_invites(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_id, tenant_id)
);

-- ---------------------------------------------------------------------------
-- Copy system templates into an organization
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.copy_organization_role_templates(
  p_organization_id uuid,
  p_organization_type public.organization_type,
  p_created_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_template record;
  v_new_role_id uuid;
BEGIN
  FOR v_template IN
    SELECT *
    FROM public.organization_roles
    WHERE organization_id IS NULL
      AND organization_type = p_organization_type
  LOOP
    SELECT id INTO v_new_role_id
    FROM public.organization_roles
    WHERE organization_id = p_organization_id
      AND slug = v_template.slug;

    IF v_new_role_id IS NULL THEN
      INSERT INTO public.organization_roles (
        organization_id,
        name,
        slug,
        description,
        organization_type,
        is_system,
        is_default,
        is_editable,
        is_protected,
        legacy_app_role,
        created_by
      )
      VALUES (
        p_organization_id,
        v_template.name,
        v_template.slug,
        v_template.description,
        p_organization_type,
        v_template.is_system,
        v_template.is_default,
        v_template.is_editable,
        v_template.is_protected,
        v_template.legacy_app_role,
        p_created_by
      )
      RETURNING id INTO v_new_role_id;
    END IF;

    INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
    SELECT v_new_role_id, orc.capability, orc.allowed
    FROM public.organization_role_capabilities orc
    WHERE orc.role_id = v_template.id
    ON CONFLICT (role_id, capability) DO UPDATE
      SET allowed = excluded.allowed,
          updated_at = now();
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.copy_organization_role_templates(uuid, public.organization_type, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.copy_organization_role_templates(uuid, public.organization_type, uuid)
  TO service_role;
