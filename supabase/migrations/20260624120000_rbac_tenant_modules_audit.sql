-- RBAC audit: tenant isolation, module "all", fix user_has_tenant_access

-- 1) user_has_tenant_access: staff only via global role, never via tenant_roles values
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt jsonb;
  app_meta jsonb;
  user_meta jsonb;
  tenant_roles jsonb;
  role_key text;
  global_role text;
BEGIN
  jwt := auth.jwt();
  IF jwt IS NULL THEN
    RETURN false;
  END IF;

  app_meta := COALESCE(jwt -> 'app_metadata', '{}'::jsonb);
  user_meta := COALESCE(jwt -> 'user_metadata', '{}'::jsonb);
  global_role := COALESCE(app_meta ->> 'role', user_meta ->> 'role');

  IF global_role IN ('admin', 'funcionario') THEN
    RETURN true;
  END IF;

  tenant_roles := COALESCE(app_meta -> 'tenant_roles', '{}'::jsonb);

  IF tenant_roles ? p_tenant_id::text THEN
    RETURN true;
  END IF;

  IF (user_meta ->> 'tenant_id')::uuid = p_tenant_id THEN
    RETURN true;
  END IF;

  IF (app_meta ->> 'tenant_id')::uuid = p_tenant_id THEN
    RETURN true;
  END IF;

  FOR role_key IN SELECT jsonb_object_keys(tenant_roles)
  LOOP
    IF role_key = p_tenant_id::text THEN
      RETURN true;
    END IF;

    IF role_key !~* '^[0-9a-f]{8}-' THEN
      IF EXISTS (
        SELECT 1 FROM public.tenant t
        WHERE t.slug = role_key AND t.id = p_tenant_id
      ) THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- 2) is_tenant_module_active: module "all" grants every module
CREATE OR REPLACE FUNCTION public.is_tenant_module_active(p_tenant_id uuid, p_module_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_modules tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.is_active = true
      AND (
        tm.module_name = p_module_name
        OR tm.module_name = 'all'
      )
  );
$function$;

-- 3) tenant RLS: scoped SELECT, staff full access
ALTER TABLE public.tenant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All all tenant" ON public.tenant;
DROP POLICY IF EXISTS tenant_select_scoped ON public.tenant;
DROP POLICY IF EXISTS tenant_staff_manage ON public.tenant;

CREATE POLICY tenant_select_scoped ON public.tenant
  FOR SELECT TO authenticated
  USING (public.user_has_tenant_access(id));

CREATE POLICY tenant_staff_manage ON public.tenant
  FOR ALL TO authenticated
  USING (
    COALESCE(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    ) IN ('admin', 'funcionario')
  )
  WITH CHECK (
    COALESCE(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    ) IN ('admin', 'funcionario')
  );

-- 4) Clean duplicate user_tenant_role policies (keep team management policies)
DROP POLICY IF EXISTS "Enable read access for admins to tenant roles" ON public.user_tenant_role;
DROP POLICY IF EXISTS "Enable read access for users to their own roles" ON public.user_tenant_role;
DROP POLICY IF EXISTS "Enable write access for admins to tenant roles" ON public.user_tenant_role;

-- 5) Consolidate tenant_modules to single "all" row per tenant (Blimber bundle)
INSERT INTO public.tenant_modules (tenant_id, module_name, is_active, activated_at)
SELECT t.id, 'all', true, NOW()
FROM public.tenant t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_name = 'all'
);

DELETE FROM public.tenant_modules
WHERE module_name <> 'all';

-- 6) Staff users must not be tied via user_tenant_role (global role only)
DELETE FROM public.user_tenant_role
WHERE role IN ('admin', 'funcionario');

COMMENT ON FUNCTION public.is_tenant_module_active(uuid, text) IS
  'Returns true when tenant has the module active or module_name = all (full Blimber bundle).';
