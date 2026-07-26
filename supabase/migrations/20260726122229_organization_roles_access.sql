-- RLS and helper predicates for organization roles / invites.

ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invite_tenants ENABLE ROW LEVEL SECURITY;

-- Templates (organization_id IS NULL) are readable by every authenticated user so
-- the UI can preview system cargos. Org-local copies follow organization visibility.
DROP POLICY IF EXISTS organization_roles_select_scoped ON public.organization_roles;
CREATE POLICY organization_roles_select_scoped ON public.organization_roles
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR private.user_can_view_organization(organization_id)
  );

DROP POLICY IF EXISTS organization_roles_manage_scoped ON public.organization_roles;
CREATE POLICY organization_roles_manage_scoped ON public.organization_roles
  FOR ALL TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.user_can_manage_organization(organization_id)
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND public.user_can_manage_organization(organization_id)
  );

DROP POLICY IF EXISTS organization_role_capabilities_select_scoped
  ON public.organization_role_capabilities;
CREATE POLICY organization_role_capabilities_select_scoped
  ON public.organization_role_capabilities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_roles r
      WHERE r.id = role_id
        AND (
          r.organization_id IS NULL
          OR private.user_can_view_organization(r.organization_id)
        )
    )
  );

DROP POLICY IF EXISTS organization_role_capabilities_manage_scoped
  ON public.organization_role_capabilities;
CREATE POLICY organization_role_capabilities_manage_scoped
  ON public.organization_role_capabilities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_roles r
      WHERE r.id = role_id
        AND r.organization_id IS NOT NULL
        AND public.user_can_manage_organization(r.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_roles r
      WHERE r.id = role_id
        AND r.organization_id IS NOT NULL
        AND public.user_can_manage_organization(r.organization_id)
    )
  );

DROP POLICY IF EXISTS organization_invites_select_scoped ON public.organization_invites;
CREATE POLICY organization_invites_select_scoped ON public.organization_invites
  FOR SELECT TO authenticated
  USING (
    private.is_platform_staff()
    OR public.user_can_manage_organization(organization_id)
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS organization_invites_manage_scoped ON public.organization_invites;
CREATE POLICY organization_invites_manage_scoped ON public.organization_invites
  FOR ALL TO authenticated
  USING (public.user_can_manage_organization(organization_id))
  WITH CHECK (public.user_can_manage_organization(organization_id));

DROP POLICY IF EXISTS organization_invite_tenants_select_scoped
  ON public.organization_invite_tenants;
CREATE POLICY organization_invite_tenants_select_scoped
  ON public.organization_invite_tenants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_invites i
      WHERE i.id = invite_id
        AND (
          private.is_platform_staff()
          OR public.user_can_manage_organization(i.organization_id)
          OR lower(i.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
    )
  );

DROP POLICY IF EXISTS organization_invite_tenants_manage_scoped
  ON public.organization_invite_tenants;
CREATE POLICY organization_invite_tenants_manage_scoped
  ON public.organization_invite_tenants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_invites i
      WHERE i.id = invite_id
        AND public.user_can_manage_organization(i.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_invites i
      WHERE i.id = invite_id
        AND public.user_can_manage_organization(i.organization_id)
    )
  );

-- Effective capabilities from an organization cargo (no platform / grants yet).
CREATE OR REPLACE FUNCTION private.organization_role_capability_keys(p_role_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(array_agg(capability ORDER BY capability), ARRAY[]::text[])
  FROM public.organization_role_capabilities
  WHERE role_id = p_role_id
    AND allowed = true;
$$;

REVOKE ALL ON FUNCTION private.organization_role_capability_keys(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.organization_role_capability_keys(uuid)
  TO authenticated, service_role;

-- Count active members of a protected owner cargo (used to block demotion).
CREATE OR REPLACE FUNCTION public.organization_owner_count(p_organization_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT count(*)::integer
  FROM public.organization_memberships om
  JOIN public.organization_roles r ON r.id = om.role_id
  WHERE om.organization_id = p_organization_id
    AND om.is_active = true
    AND r.is_protected = true;
$$;

REVOKE ALL ON FUNCTION public.organization_owner_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.organization_owner_count(uuid)
  TO authenticated, service_role;
