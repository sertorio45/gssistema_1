-- Workspace context: named capabilities for the platform and organization scopes.
-- These extend the existing capability registry instead of widening app_role,
-- which stays reserved for the legacy global/tenant roles.

INSERT INTO public.capabilities (key, description)
VALUES
  ('platform.organizations.read', 'Visualizar todas as organizações da plataforma'),
  ('platform.organizations.manage', 'Criar e administrar agências e clientes diretos'),
  ('platform.tenants.read', 'Visualizar todas as empresas da plataforma'),
  ('platform.context.switch', 'Entrar temporariamente no contexto de uma organização ou empresa'),
  ('platform.audit.read', 'Consultar o histórico de auditoria da plataforma'),
  ('organization.read', 'Visualizar a organização e sua carteira'),
  ('organization.manage', 'Administrar dados e configurações da organização'),
  ('organization.members.manage', 'Cadastrar a equipe e definir o alcance de cada colaborador'),
  ('organization.tenants.read', 'Visualizar as empresas atendidas pela organização'),
  ('organization.approvals.read', 'Acompanhar aprovações de todos os clientes da organização')
ON CONFLICT (key) DO UPDATE SET description = excluded.description;

-- Organization owners (app_role `cliente`) run their own team and portfolio.
-- Collaborators (app_role `atendente`) only read what they were assigned to.
INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('cliente', 'organization.read'),
    ('cliente', 'organization.manage'),
    ('cliente', 'organization.members.manage'),
    ('cliente', 'organization.tenants.read'),
    ('cliente', 'organization.approvals.read'),
    ('atendente', 'organization.read'),
    ('atendente', 'organization.tenants.read')
) AS defaults(role_name, capability)
ON CONFLICT (role, capability) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Compatibility backfill
-- ---------------------------------------------------------------------------

-- Reactivate any link or membership that predates the lifecycle columns so no
-- currently valid user loses reach when the resolver starts enforcing them.
UPDATE public.organization_tenants
SET is_active = true,
    ended_at = NULL
WHERE is_active IS NOT TRUE;

UPDATE public.organization_memberships
SET access_all_tenants = true
WHERE access_all_tenants IS NOT TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_member_tenants omt
    WHERE omt.organization_membership_id = organization_memberships.id
      AND omt.is_active = true
  );

-- Every tenant must be reachable through at least one organization link, which
-- is what the direct organization sync guarantees for tenants created earlier.
INSERT INTO public.organization_tenants (
  organization_id,
  tenant_id,
  is_primary,
  relationship_type,
  is_active
)
SELECT o.id, o.tenant_id, true, 'owner', true
FROM public.organizations o
WHERE o.type = 'direct'
  AND o.tenant_id IS NOT NULL
ON CONFLICT (organization_id, tenant_id)
DO UPDATE SET
  relationship_type = 'owner',
  is_active = true,
  ended_at = NULL,
  updated_at = now();

DO $$
DECLARE
  v_orphan_tenants integer;
BEGIN
  SELECT count(*)
  INTO v_orphan_tenants
  FROM public.tenant t
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.organization_tenants ot
    WHERE ot.tenant_id = t.id
      AND ot.is_active = true
  );

  IF v_orphan_tenants > 0 THEN
    RAISE EXCEPTION 'Backfill incompleto: % empresa(s) sem vínculo ativo de organização', v_orphan_tenants;
  END IF;
END
$$;
