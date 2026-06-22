-- Role semantics (UI labels vs DB slugs):
-- admin = Superadministrador (global staff)
-- funcionario = Funcionário (global staff)
-- cliente = Administrador (tenant-scoped)
-- atendente = Atendente (tenant-scoped)

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

  -- Superadministrador e Funcionário (staff global)
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

  -- Apenas Administrador (cliente) do tenant gerencia equipe; Atendente não
  RETURN tenant_role = 'cliente';
END;
$$;

COMMENT ON FUNCTION public.user_can_manage_tenant_team(uuid) IS
  'Tenant team management: global admin/funcionario staff, or tenant cliente (Administrador). Atendente denied.';
