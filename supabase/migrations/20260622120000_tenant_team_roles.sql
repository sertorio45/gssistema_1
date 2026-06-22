-- Tenant team: role atendente + RLS for tenant owners managing their team

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role'
      AND e.enumlabel = 'atendente'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'atendente';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.user_can_manage_tenant_team(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt jsonb;
  app_meta jsonb;
  tenant_roles jsonb;
  global_role text;
  tenant_role text;
BEGIN
  jwt := auth.jwt();
  IF jwt IS NULL THEN
    RETURN false;
  END IF;

  app_meta := COALESCE(jwt -> 'app_metadata', '{}'::jsonb);
  global_role := COALESCE(app_meta ->> 'role', jwt -> 'user_metadata' ->> 'role');

  IF global_role IN ('admin', 'funcionario') THEN
    RETURN true;
  END IF;

  tenant_roles := COALESCE(app_meta -> 'tenant_roles', '{}'::jsonb);
  tenant_role := tenant_roles ->> p_tenant_id::text;

  IF tenant_role IS NULL THEN
    SELECT tr.value INTO tenant_role
    FROM jsonb_each_text(tenant_roles) AS tr(key, value)
    JOIN public.tenant t ON t.slug = tr.key
    WHERE t.id = p_tenant_id
    LIMIT 1;
  END IF;

  RETURN tenant_role = 'cliente';
END;
$$;

ALTER TABLE public.user_tenant_role ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_tenant_role_select_own ON public.user_tenant_role;
CREATE POLICY user_tenant_role_select_own ON public.user_tenant_role
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_can_manage_tenant_team(tenant_id)
    OR public.user_has_tenant_access(tenant_id)
  );

DROP POLICY IF EXISTS user_tenant_role_manage_tenant ON public.user_tenant_role;
CREATE POLICY user_tenant_role_manage_tenant ON public.user_tenant_role
  FOR ALL TO authenticated
  USING (public.user_can_manage_tenant_team(tenant_id))
  WITH CHECK (public.user_can_manage_tenant_team(tenant_id));
