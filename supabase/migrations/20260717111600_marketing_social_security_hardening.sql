-- Remove permissive legacy policies that would override tenant isolation.
DROP POLICY IF EXISTS "All All" ON public.articles;
DROP POLICY IF EXISTS "All All" ON public.articles_category;

-- SECURITY DEFINER helpers must never be callable by unauthenticated users.
REVOKE EXECUTE ON FUNCTION public.user_has_tenant_access(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_tenant_capability(uuid, text)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_manage_tenant_team(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_capability(uuid, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_tenant_team(uuid)
  TO authenticated, service_role;

-- Existing team-management RPCs validate authenticated callers internally.
REVOKE EXECUTE ON FUNCTION public.add_user_to_tenant(uuid, uuid, public.app_role)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.change_user_role_in_tenant(uuid, uuid, public.app_role)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_tenant_and_add_admin(text, text)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_user_from_tenant(uuid, uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.add_user_to_tenant(uuid, uuid, public.app_role)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_user_role_in_tenant(uuid, uuid, public.app_role)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_tenant_and_add_admin(text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_user_from_tenant(uuid, uuid)
  TO authenticated, service_role;

-- Trigger-only metadata synchronization functions are not public RPCs.
REVOKE EXECUTE ON FUNCTION public.update_user_app_metadata()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_user_tenant_role_metadata()
  FROM PUBLIC, anon, authenticated;
