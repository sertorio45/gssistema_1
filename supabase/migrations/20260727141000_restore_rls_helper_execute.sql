-- Restore EXECUTE on RLS helper functions for authenticated.
-- Mutation RPCs stay revoked (service_role only).

GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_capability(uuid, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_organization(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_tenant_team(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.organization_serves_tenant(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.organization_owner_count(uuid) TO authenticated, anon, service_role;

-- Keep mutation helpers locked down.
REVOKE ALL ON FUNCTION public.add_user_to_tenant(uuid, uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_user_role_in_tenant(uuid, uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_tenant_and_add_admin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_user_from_tenant(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_to_tenant(uuid, uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.change_user_role_in_tenant(uuid, uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_tenant_and_add_admin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_user_from_tenant(uuid, uuid) TO service_role;
