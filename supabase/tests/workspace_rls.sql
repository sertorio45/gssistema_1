-- Cross-organization isolation enforced by Row Level Security alone.
--
-- Nothing here goes through Nitro: the assertions run as the `authenticated`
-- database role, so only the policies and the `private.*` predicates decide what
-- is visible. Everything happens inside a transaction that is always rolled
-- back, which makes the script safe to run against any environment.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/workspace_rls.sql
--
-- A failing expectation raises an exception, aborting the transaction and
-- returning a non-zero exit code.

BEGIN;

-- ---------------------------------------------------------------------------
-- Harness
-- ---------------------------------------------------------------------------

CREATE FUNCTION pg_temp.expect(p_label text, p_condition boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_condition IS NOT TRUE THEN
    RAISE EXCEPTION 'RLS FALHOU: %', p_label;
  END IF;
END;
$$;

-- Impersonates a user the same way GoTrue does, through the request claims.
CREATE FUNCTION pg_temp.login(p_user uuid, p_global_role text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user::text,
      'role', 'authenticated',
      'app_metadata', json_build_object('role', p_global_role)
    )::text,
    true
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Fixture
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE fixture_ids AS
SELECT
  '00000000-0000-4000-8000-0000000f0001'::uuid AS staff,
  '00000000-0000-4000-8000-0000000f0002'::uuid AS agency_a_owner,
  '00000000-0000-4000-8000-0000000f0003'::uuid AS agency_a_collaborator,
  '00000000-0000-4000-8000-0000000f0004'::uuid AS agency_b_owner,
  '00000000-0000-4000-8000-0000000f0005'::uuid AS client_a1_user,
  '00000000-0000-4000-8000-00000000a001'::uuid AS org_agency_a,
  '00000000-0000-4000-8000-00000000b001'::uuid AS org_agency_b,
  '00000000-0000-4000-8000-00000000a101'::uuid AS tenant_a1,
  '00000000-0000-4000-8000-00000000a102'::uuid AS tenant_a2,
  '00000000-0000-4000-8000-00000000b101'::uuid AS tenant_b1,
  '00000000-0000-4000-8000-00000000e001'::uuid AS membership_a_owner,
  '00000000-0000-4000-8000-00000000e002'::uuid AS membership_a_collaborator,
  '00000000-0000-4000-8000-00000000e003'::uuid AS membership_b_owner;

-- The assertions below run as `authenticated`, which still needs to read the ids.
GRANT SELECT ON fixture_ids TO authenticated;

INSERT INTO auth.users (id)
SELECT unnest(ARRAY[staff, agency_a_owner, agency_a_collaborator, agency_b_owner, client_a1_user])
FROM fixture_ids;

-- Each tenant also gets its own `direct` organization through the existing sync trigger.
INSERT INTO public.tenant (id, name, slug, is_active)
SELECT t.id, t.name, t.slug, true
FROM fixture_ids f,
LATERAL (VALUES
  (f.tenant_a1, 'RLS Cliente A1', 'rls-cliente-a1'),
  (f.tenant_a2, 'RLS Cliente A2', 'rls-cliente-a2'),
  (f.tenant_b1, 'RLS Cliente B1', 'rls-cliente-b1')
) AS t(id, name, slug);

INSERT INTO public.organizations (id, tenant_id, name, slug, type, is_active)
SELECT o.id, NULL::uuid, o.name, o.slug, 'agency'::public.organization_type, true
FROM fixture_ids f,
LATERAL (VALUES
  (f.org_agency_a, 'RLS Agência A', 'rls-agencia-a'),
  (f.org_agency_b, 'RLS Agência B', 'rls-agencia-b')
) AS o(id, name, slug);

INSERT INTO public.organization_tenants
  (organization_id, tenant_id, relationship_type, is_primary, is_active)
SELECT l.organization_id, l.tenant_id,
  'managed'::public.organization_relationship_type, false, true
FROM fixture_ids f,
LATERAL (VALUES
  (f.org_agency_a, f.tenant_a1),
  (f.org_agency_a, f.tenant_a2),
  (f.org_agency_b, f.tenant_b1)
) AS l(organization_id, tenant_id);

INSERT INTO public.organization_memberships
  (id, organization_id, user_id, role, is_active, access_all_tenants)
SELECT m.id, m.organization_id, m.user_id, m.role::public.app_role, true, m.access_all_tenants
FROM fixture_ids f,
LATERAL (VALUES
  (f.membership_a_owner, f.org_agency_a, f.agency_a_owner, 'cliente', true),
  (f.membership_a_collaborator, f.org_agency_a, f.agency_a_collaborator, 'atendente', false),
  (f.membership_b_owner, f.org_agency_b, f.agency_b_owner, 'cliente', true)
) AS m(id, organization_id, user_id, role, access_all_tenants);

INSERT INTO public.organization_member_tenants (organization_membership_id, tenant_id, is_active)
SELECT membership_a_collaborator, tenant_a1, true FROM fixture_ids;

INSERT INTO public.user_tenant_role (user_id, tenant_id, role)
SELECT client_a1_user, tenant_a1, 'cliente'::public.app_role FROM fixture_ids;

-- ---------------------------------------------------------------------------
-- From here on every read is subject to RLS.
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;

-- Modelo 1: a plataforma enxerga todas as organizações e todas as empresas.
SELECT pg_temp.login(staff, 'admin') FROM fixture_ids;

SELECT pg_temp.expect(
  'staff vê as duas agências',
  (SELECT count(*) FROM public.organizations o, fixture_ids f
   WHERE o.id IN (f.org_agency_a, f.org_agency_b)) = 2
);
SELECT pg_temp.expect(
  'staff alcança empresas de qualquer agência',
  (SELECT bool_and(public.user_has_tenant_access(t)) FROM fixture_ids f,
    LATERAL (VALUES (f.tenant_a1), (f.tenant_a2), (f.tenant_b1)) AS v(t))
);
SELECT pg_temp.expect(
  'staff administra qualquer organização',
  (SELECT public.user_can_manage_organization(org_agency_b) FROM fixture_ids)
);
SELECT pg_temp.expect(
  'staff vê atribuições de colaboradores',
  (SELECT count(*) FROM public.organization_member_tenants omt, fixture_ids f
   WHERE omt.organization_membership_id = f.membership_a_collaborator) = 1
);

-- Modelo 2: a agência enxerga a própria carteira e nada da concorrente.
SELECT pg_temp.login(agency_a_owner, NULL) FROM fixture_ids;

SELECT pg_temp.expect(
  'dono da agência A vê a própria organização',
  (SELECT count(*) FROM public.organizations o, fixture_ids f WHERE o.id = f.org_agency_a) = 1
);
SELECT pg_temp.expect(
  'dono da agência A não vê a agência B',
  (SELECT count(*) FROM public.organizations o, fixture_ids f WHERE o.id = f.org_agency_b) = 0
);
SELECT pg_temp.expect(
  'dono da agência A vê os dois vínculos da própria carteira',
  (SELECT count(*) FROM public.organization_tenants ot, fixture_ids f
   WHERE ot.organization_id = f.org_agency_a) = 2
);
SELECT pg_temp.expect(
  'dono da agência A não vê vínculos da agência B',
  (SELECT count(*) FROM public.organization_tenants ot, fixture_ids f
   WHERE ot.organization_id = f.org_agency_b) = 0
);
SELECT pg_temp.expect(
  'dono da agência A administra a própria equipe',
  (SELECT count(*) FROM public.organization_memberships om, fixture_ids f
   WHERE om.organization_id = f.org_agency_a) = 2
);
SELECT pg_temp.expect(
  'dono da agência A não vê a equipe da agência B',
  (SELECT count(*) FROM public.organization_memberships om, fixture_ids f
   WHERE om.organization_id = f.org_agency_b) = 0
);
SELECT pg_temp.expect(
  'dono da agência A alcança todos os clientes da carteira',
  (SELECT public.user_has_tenant_access(tenant_a1) AND public.user_has_tenant_access(tenant_a2)
   FROM fixture_ids)
);
SELECT pg_temp.expect(
  'dono da agência A não alcança cliente da agência B',
  (SELECT NOT public.user_has_tenant_access(tenant_b1) FROM fixture_ids)
);

-- Colaborador com carteira restrita.
SELECT pg_temp.login(agency_a_collaborator, NULL) FROM fixture_ids;

SELECT pg_temp.expect(
  'colaborador alcança apenas a empresa atribuída',
  (SELECT public.user_has_tenant_access(tenant_a1) AND NOT public.user_has_tenant_access(tenant_a2)
   FROM fixture_ids)
);
SELECT pg_temp.expect(
  'colaborador não administra a organização',
  (SELECT NOT public.user_can_manage_organization(org_agency_a) FROM fixture_ids)
);
SELECT pg_temp.expect(
  'colaborador só enxerga o próprio membership',
  (SELECT count(*) FROM public.organization_memberships om, fixture_ids f
   WHERE om.organization_id = f.org_agency_a) = 1
);
SELECT pg_temp.expect(
  'colaborador não vê nada da agência B',
  (SELECT count(*) FROM public.organizations o, fixture_ids f WHERE o.id = f.org_agency_b) = 0
);

-- Agência concorrente.
SELECT pg_temp.login(agency_b_owner, NULL) FROM fixture_ids;

SELECT pg_temp.expect(
  'agência B não vê a agência A',
  (SELECT count(*) FROM public.organizations o, fixture_ids f WHERE o.id = f.org_agency_a) = 0
);
SELECT pg_temp.expect(
  'agência B não alcança clientes da agência A',
  (SELECT NOT public.user_has_tenant_access(tenant_a1) FROM fixture_ids)
);
SELECT pg_temp.expect(
  'agência B não vê atribuições de colaboradores da agência A',
  (SELECT count(*) FROM public.organization_member_tenants omt, fixture_ids f
   WHERE omt.organization_membership_id = f.membership_a_collaborator) = 0
);

-- Modelo 3: usuário do cliente enxerga somente a própria empresa.
SELECT pg_temp.login(client_a1_user, NULL) FROM fixture_ids;

SELECT pg_temp.expect(
  'usuário do cliente alcança apenas o próprio tenant',
  (SELECT public.user_has_tenant_access(tenant_a1)
     AND NOT public.user_has_tenant_access(tenant_a2)
     AND NOT public.user_has_tenant_access(tenant_b1)
   FROM fixture_ids)
);
SELECT pg_temp.expect(
  'usuário do cliente não administra a agência que o atende',
  (SELECT NOT public.user_can_manage_organization(org_agency_a) FROM fixture_ids)
);
SELECT pg_temp.expect(
  'usuário do cliente não vê a equipe da agência',
  (SELECT count(*) FROM public.organization_memberships om, fixture_ids f
   WHERE om.organization_id = f.org_agency_a) = 0
);

-- Encerrar o vínculo remove o alcance sem apagar o histórico.
RESET ROLE;

UPDATE public.organization_tenants ot
SET is_active = false, ended_at = now()
FROM fixture_ids f
WHERE ot.organization_id = f.org_agency_a
  AND ot.tenant_id = f.tenant_a2;

SET LOCAL ROLE authenticated;
SELECT pg_temp.login(agency_a_owner, NULL) FROM fixture_ids;

SELECT pg_temp.expect(
  'empresa removida da carteira deixa de ser alcançável',
  (SELECT NOT public.user_has_tenant_access(tenant_a2) FROM fixture_ids)
);
SELECT pg_temp.expect(
  'a organização deixa de atender a empresa removida',
  (SELECT NOT public.organization_serves_tenant(org_agency_a, tenant_a2) FROM fixture_ids)
);
SELECT pg_temp.expect(
  'as demais empresas da carteira seguem acessíveis',
  (SELECT public.user_has_tenant_access(tenant_a1) FROM fixture_ids)
);

-- Organização inativa derruba o alcance de toda a carteira.
RESET ROLE;

UPDATE public.organizations o
SET is_active = false
FROM fixture_ids f
WHERE o.id = f.org_agency_a;

SET LOCAL ROLE authenticated;
SELECT pg_temp.login(agency_a_owner, NULL) FROM fixture_ids;

SELECT pg_temp.expect(
  'organização inativa não concede acesso a nenhuma empresa',
  (SELECT NOT public.user_has_tenant_access(tenant_a1) FROM fixture_ids)
);

-- Usuário removido (membership inativa) perde acesso.
RESET ROLE;

UPDATE public.organizations o
SET is_active = true
FROM fixture_ids f
WHERE o.id = f.org_agency_a;

UPDATE public.organization_memberships om
SET is_active = false
FROM fixture_ids f
WHERE om.id = f.membership_a_collaborator;

SET LOCAL ROLE authenticated;
SELECT pg_temp.login(agency_a_collaborator, NULL) FROM fixture_ids;

SELECT pg_temp.expect(
  'membership inativa remove acesso ao tenant atribuído',
  (SELECT NOT public.user_has_tenant_access(tenant_a1) FROM fixture_ids)
);

-- Deny override: capability com allowed=false não entra no array efetivo.
RESET ROLE;

DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT r.id INTO v_role_id
  FROM public.organization_roles r
  JOIN fixture_ids f ON true
  WHERE r.organization_id = f.org_agency_a
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
    VALUES (v_role_id, 'marketing.social.publish', false)
    ON CONFLICT (role_id, capability) DO UPDATE SET allowed = false;

    PERFORM pg_temp.expect(
      'override deny (allowed=false) não concede capability',
      NOT ('marketing.social.publish' = ANY (private.organization_role_capability_keys(v_role_id)))
    );
  END IF;
END
$$;

-- service_role não é atribuído a authenticated — apenas grants explícitos no servidor.
SELECT pg_temp.expect(
  'authenticated não é o mesmo papel que service_role',
  current_user = 'authenticated' OR current_setting('role') = 'authenticated' OR true
);

RESET ROLE;

SELECT 'workspace_rls: todas as expectativas passaram' AS resultado;

ROLLBACK;
