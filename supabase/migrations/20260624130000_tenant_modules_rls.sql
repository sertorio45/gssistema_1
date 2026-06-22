-- RLS for tenant_modules: scoped read, staff manage

ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_modules_select ON public.tenant_modules;
DROP POLICY IF EXISTS tenant_modules_staff_manage ON public.tenant_modules;

CREATE POLICY tenant_modules_select ON public.tenant_modules
  FOR SELECT TO authenticated
  USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY tenant_modules_staff_manage ON public.tenant_modules
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
