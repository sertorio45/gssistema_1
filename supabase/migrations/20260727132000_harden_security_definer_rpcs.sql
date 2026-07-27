-- Harden SECURITY DEFINER RPCs: revoke public/anon/authenticated EXECUTE.
-- App uses service-role server routes for tenant/org mutations — not client RPC.

REVOKE ALL ON FUNCTION public.add_user_to_tenant(uuid, uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_user_role_in_tenant(uuid, uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_tenant_and_add_admin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_user_from_tenant(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.organization_owner_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.organization_serves_tenant(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_can_manage_organization(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_can_manage_tenant_team(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_has_tenant_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_has_tenant_capability(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.add_user_to_tenant(uuid, uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.change_user_role_in_tenant(uuid, uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_tenant_and_add_admin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_user_from_tenant(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.organization_owner_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.organization_serves_tenant(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_organization(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_tenant_team(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_capability(uuid, text) TO service_role;

-- Audit table: no client access; service role bypasses RLS for inserts.
DROP POLICY IF EXISTS social_briefing_link_accesses_deny_all ON public.social_briefing_link_accesses;
CREATE POLICY social_briefing_link_accesses_deny_all
  ON public.social_briefing_link_accesses
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
