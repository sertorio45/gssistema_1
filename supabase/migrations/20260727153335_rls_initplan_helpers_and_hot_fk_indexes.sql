-- Hot-path RLS initplan fixes + critical FK covering indexes.
-- 1) Wrap auth.uid()/auth.jwt() in (select ...) inside helper functions used by most policies.
-- 2) Rewrite hot-table policies that compare auth.uid()/auth.jwt() directly.
-- 3) Add missing indexes on frequently joined FK columns (social + capability grants).

-- ---------------------------------------------------------------------------
-- Helper functions (evaluate auth once per statement)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.current_global_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT (SELECT auth.jwt()) -> 'app_metadata' ->> 'role'
$function$;

CREATE OR REPLACE FUNCTION private.user_has_tenant_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT private.is_platform_staff()
    OR private.user_tenant_role((SELECT auth.uid()), p_tenant_id) IS NOT NULL
$function$;

CREATE OR REPLACE FUNCTION public.user_can_manage_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT COALESCE(
    private.is_platform_staff()
    OR private.user_organization_role((SELECT auth.uid()), p_organization_id) = 'cliente',
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_can_manage_tenant_team(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT private.is_platform_staff()
    OR private.user_tenant_role((SELECT auth.uid()), p_tenant_id) = 'cliente'
$function$;

CREATE OR REPLACE FUNCTION private.user_has_capability(p_tenant_id uuid, p_capability text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  explicit_grant boolean;
  effective_role public.app_role;
  current_user_id uuid := (SELECT auth.uid());
BEGIN
  IF private.is_platform_staff() THEN
    RETURN true;
  END IF;

  SELECT allowed
  INTO explicit_grant
  FROM public.tenant_capability_grants
  WHERE tenant_id = p_tenant_id
    AND user_id = current_user_id
    AND capability = p_capability;

  IF explicit_grant IS NOT NULL THEN
    RETURN explicit_grant;
  END IF;

  effective_role := private.user_tenant_role(current_user_id, p_tenant_id);

  RETURN EXISTS (
    SELECT 1
    FROM public.role_capabilities rc
    WHERE rc.role = effective_role
      AND rc.capability = p_capability
      AND (rc.tenant_id IS NULL OR rc.tenant_id = p_tenant_id)
  );
END
$function$;

-- ---------------------------------------------------------------------------
-- Hot policies: wrap direct auth.uid() / auth.jwt() comparisons
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS social_content_create ON public.social_posts;
CREATE POLICY social_content_create ON public.social_posts
  FOR INSERT
  WITH CHECK (
    (created_by = (SELECT auth.uid()))
    AND private.user_has_capability(tenant_id, 'marketing.social.create'::text)
  );

DROP POLICY IF EXISTS tenant_capabilities_select_scoped ON public.tenant_capability_grants;
CREATE POLICY tenant_capabilities_select_scoped ON public.tenant_capability_grants
  FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR user_can_manage_tenant_team(tenant_id)
  );

DROP POLICY IF EXISTS user_tenant_role_select_own ON public.user_tenant_role;
CREATE POLICY user_tenant_role_select_own ON public.user_tenant_role
  FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR user_can_manage_tenant_team(tenant_id)
    OR user_has_tenant_access(tenant_id)
  );

DROP POLICY IF EXISTS organization_memberships_select_scoped ON public.organization_memberships;
CREATE POLICY organization_memberships_select_scoped ON public.organization_memberships
  FOR SELECT
  USING (
    private.is_platform_staff()
    OR (user_id = (SELECT auth.uid()))
    OR user_can_manage_organization(organization_id)
  );

DROP POLICY IF EXISTS organization_member_tenants_select_scoped ON public.organization_member_tenants;
CREATE POLICY organization_member_tenants_select_scoped ON public.organization_member_tenants
  FOR SELECT
  USING (
    private.is_platform_staff()
    OR (
      EXISTS (
        SELECT 1
        FROM organization_memberships om
        WHERE om.id = organization_member_tenants.organization_membership_id
          AND om.user_id = (SELECT auth.uid())
      )
    )
    OR user_can_manage_organization(private.organization_of_membership(organization_membership_id))
  );

DROP POLICY IF EXISTS organization_invites_select_scoped ON public.organization_invites;
CREATE POLICY organization_invites_select_scoped ON public.organization_invites
  FOR SELECT
  USING (
    private.is_platform_staff()
    OR user_can_manage_organization(organization_id)
    OR (
      lower(email) = lower(COALESCE(((SELECT auth.jwt()) ->> 'email'::text), ''::text))
    )
  );

DROP POLICY IF EXISTS organization_invite_tenants_select_scoped ON public.organization_invite_tenants;
CREATE POLICY organization_invite_tenants_select_scoped ON public.organization_invite_tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM organization_invites i
      WHERE i.id = organization_invite_tenants.invite_id
        AND (
          private.is_platform_staff()
          OR user_can_manage_organization(i.organization_id)
          OR (
            lower(i.email) = lower(COALESCE(((SELECT auth.jwt()) ->> 'email'::text), ''::text))
          )
        )
    )
  );

DROP POLICY IF EXISTS approval_decisions_insert ON public.approval_decisions;
CREATE POLICY approval_decisions_insert ON public.approval_decisions
  FOR INSERT
  WITH CHECK (
    (approver_id = (SELECT auth.uid()))
    AND (
      private.user_has_capability(tenant_id, 'marketing.social.approve'::text)
      OR EXISTS (
        SELECT 1
        FROM approval_request_approvers ara
        WHERE ara.request_id = approval_decisions.request_id
          AND ara.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS notification_preferences_own ON public.notification_preferences;
CREATE POLICY notification_preferences_own ON public.notification_preferences
  FOR ALL
  USING (
    (user_id = (SELECT auth.uid()))
    AND private.user_has_tenant_access(tenant_id)
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    AND private.user_has_tenant_access(tenant_id)
  );

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    AND private.user_has_tenant_access(tenant_id)
  );

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE
  USING (
    (user_id = (SELECT auth.uid()))
    AND private.user_has_tenant_access(tenant_id)
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    AND private.user_has_tenant_access(tenant_id)
  );

-- ---------------------------------------------------------------------------
-- Critical FK indexes (workspace + social joins / deletes)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS social_posts_workflow_id_idx
  ON public.social_posts (workflow_id)
  WHERE workflow_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_posts_assigned_to_idx
  ON public.social_posts (assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_posts_created_by_idx
  ON public.social_posts (created_by);

CREATE INDEX IF NOT EXISTS social_post_variants_account_id_idx
  ON public.social_post_variants (account_id);

CREATE INDEX IF NOT EXISTS social_post_assets_tenant_id_idx
  ON public.social_post_assets (tenant_id);

CREATE INDEX IF NOT EXISTS social_post_assets_variant_id_idx
  ON public.social_post_assets (variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_post_assets_asset_id_idx
  ON public.social_post_assets (asset_id);

CREATE INDEX IF NOT EXISTS social_comments_tenant_id_idx
  ON public.social_comments (tenant_id);

CREATE INDEX IF NOT EXISTS social_comments_parent_id_idx
  ON public.social_comments (parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_comments_author_id_idx
  ON public.social_comments (author_id);

CREATE INDEX IF NOT EXISTS tenant_capability_grants_capability_idx
  ON public.tenant_capability_grants (capability);

CREATE INDEX IF NOT EXISTS tenant_capability_grants_user_id_only_idx
  ON public.tenant_capability_grants (user_id);

CREATE INDEX IF NOT EXISTS social_campaigns_organization_id_idx
  ON public.social_campaigns (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_production_tasks_created_by_idx
  ON public.social_production_tasks (created_by);

CREATE INDEX IF NOT EXISTS social_production_task_events_tenant_id_idx
  ON public.social_production_task_events (tenant_id);

CREATE INDEX IF NOT EXISTS social_production_task_events_actor_id_idx
  ON public.social_production_task_events (actor_id);

CREATE INDEX IF NOT EXISTS social_approval_stage_assignees_stage_id_idx
  ON public.social_approval_stage_assignees (stage_id);

CREATE INDEX IF NOT EXISTS social_approval_stage_assignees_user_id_idx
  ON public.social_approval_stage_assignees (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_approval_stage_assignees_role_id_idx
  ON public.social_approval_stage_assignees (role_id)
  WHERE role_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_approval_settings_default_workflow_id_idx
  ON public.social_approval_settings (default_workflow_id)
  WHERE default_workflow_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_briefings_organization_id_idx
  ON public.social_briefings (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_briefing_links_organization_id_idx
  ON public.social_briefing_links (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_briefing_link_accesses_tenant_id_idx
  ON public.social_briefing_link_accesses (tenant_id);

CREATE INDEX IF NOT EXISTS social_webhook_events_tenant_id_idx
  ON public.social_webhook_events (tenant_id);
