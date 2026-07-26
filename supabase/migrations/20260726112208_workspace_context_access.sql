-- Workspace context: authorization functions and cross-organization isolation.
-- Every predicate keeps the previous behaviour for rows created before this migration,
-- because the new columns default to the widest value (active link, full portfolio reach).

-- ---------------------------------------------------------------------------
-- Tenant reach
-- ---------------------------------------------------------------------------

-- Effective role of a user on a tenant. A direct grant always wins over the
-- organization portfolio, which now also requires an active organization, an
-- active link and, for narrowed members, an explicit tenant assignment.
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
    JOIN public.organizations o
      ON o.id = om.organization_id
    JOIN public.organization_tenants ot
      ON ot.organization_id = om.organization_id
    WHERE om.user_id = p_user_id
      AND om.is_active = true
      AND o.is_active = true
      AND ot.tenant_id = p_tenant_id
      AND ot.is_active = true
      AND (ot.ended_at IS NULL OR ot.ended_at > now())
      AND (
        om.access_all_tenants = true
        OR EXISTS (
          SELECT 1
          FROM public.organization_member_tenants omt
          WHERE omt.organization_membership_id = om.id
            AND omt.tenant_id = p_tenant_id
            AND omt.is_active = true
        )
      )
  ) roles
  ORDER BY priority
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Organization reach
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.user_organization_role(
  p_user_id uuid,
  p_organization_id uuid
)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT om.role
  FROM public.organization_memberships om
  JOIN public.organizations o
    ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.organization_id = p_organization_id
    AND om.is_active = true
    AND o.is_active = true
  LIMIT 1;
$$;

-- An organization is visible to its own members, to the platform, and to users
-- holding a direct role on one of the tenants it serves. Members of another
-- agency match none of these branches.
CREATE OR REPLACE FUNCTION private.user_can_view_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    private.is_platform_staff()
    OR private.user_organization_role(auth.uid(), p_organization_id) IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM public.organization_tenants ot
      JOIN public.user_tenant_role utr
        ON utr.tenant_id = ot.tenant_id
      WHERE ot.organization_id = p_organization_id
        AND ot.is_active = true
        AND utr.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    private.is_platform_staff()
    OR private.user_organization_role(auth.uid(), p_organization_id) = 'cliente';
$$;

CREATE OR REPLACE FUNCTION private.organization_of_membership(p_membership_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT organization_id
  FROM public.organization_memberships
  WHERE id = p_membership_id;
$$;

-- Reports whether the organization actually serves the tenant right now.
CREATE OR REPLACE FUNCTION public.organization_serves_tenant(
  p_organization_id uuid,
  p_tenant_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_tenants ot
    JOIN public.organizations o
      ON o.id = ot.organization_id
    WHERE ot.organization_id = p_organization_id
      AND ot.tenant_id = p_tenant_id
      AND ot.is_active = true
      AND o.is_active = true
      AND (ot.ended_at IS NULL OR ot.ended_at > now())
  );
$$;

REVOKE ALL ON FUNCTION private.user_organization_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.user_can_view_organization(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.organization_of_membership(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_manage_organization(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.organization_serves_tenant(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.user_can_view_organization(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_organization(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.organization_serves_tenant(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS organizations_select_scoped ON public.organizations;
CREATE POLICY organizations_select_scoped ON public.organizations
  FOR SELECT TO authenticated
  USING (private.user_can_view_organization(id));

DROP POLICY IF EXISTS organization_tenants_select_scoped ON public.organization_tenants;
CREATE POLICY organization_tenants_select_scoped ON public.organization_tenants
  FOR SELECT TO authenticated
  USING (
    private.user_can_view_organization(organization_id)
    OR private.user_has_tenant_access(tenant_id)
  );

DROP POLICY IF EXISTS organization_memberships_select_scoped ON public.organization_memberships;
CREATE POLICY organization_memberships_select_scoped ON public.organization_memberships
  FOR SELECT TO authenticated
  USING (
    private.is_platform_staff()
    OR user_id = auth.uid()
    OR public.user_can_manage_organization(organization_id)
  );

-- Agency and direct owners manage their own team; the platform manages everyone.
DROP POLICY IF EXISTS organization_memberships_manage_scoped ON public.organization_memberships;
CREATE POLICY organization_memberships_manage_scoped ON public.organization_memberships
  FOR ALL TO authenticated
  USING (public.user_can_manage_organization(organization_id))
  WITH CHECK (public.user_can_manage_organization(organization_id));

ALTER TABLE public.organization_member_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_member_tenants_select_scoped
  ON public.organization_member_tenants;
CREATE POLICY organization_member_tenants_select_scoped ON public.organization_member_tenants
  FOR SELECT TO authenticated
  USING (
    private.is_platform_staff()
    OR EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.id = organization_member_tenants.organization_membership_id
        AND om.user_id = auth.uid()
    )
    OR public.user_can_manage_organization(
      private.organization_of_membership(organization_membership_id)
    )
  );

DROP POLICY IF EXISTS organization_member_tenants_manage_scoped
  ON public.organization_member_tenants;
CREATE POLICY organization_member_tenants_manage_scoped ON public.organization_member_tenants
  FOR ALL TO authenticated
  USING (
    public.user_can_manage_organization(
      private.organization_of_membership(organization_membership_id)
    )
  )
  WITH CHECK (
    public.user_can_manage_organization(
      private.organization_of_membership(organization_membership_id)
    )
  );

-- audit_events now also carries tenant-less platform records.
DROP POLICY IF EXISTS audit_events_manage ON public.audit_events;
CREATE POLICY audit_events_manage ON public.audit_events
  FOR SELECT TO authenticated
  USING (
    private.is_platform_staff()
    OR (tenant_id IS NOT NULL AND private.user_has_capability(tenant_id, 'marketing.social.manage'))
    OR (organization_id IS NOT NULL AND public.user_can_manage_organization(organization_id))
  );

-- ---------------------------------------------------------------------------
-- Supporting indexes for the predicates above
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS organization_memberships_lookup_idx
  ON public.organization_memberships (user_id, organization_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS user_tenant_role_user_tenant_idx
  ON public.user_tenant_role (user_id, tenant_id);
