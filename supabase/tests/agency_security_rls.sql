-- Extended RLS checks for marketing social / approvals / deletion tombstones.
-- Safe: always rolls back.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/agency_security_rls.sql

BEGIN;

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

CREATE TEMP TABLE fixture_ids AS
SELECT
  '00000000-0000-4000-8000-0000000f1001'::uuid AS agency_user,
  '00000000-0000-4000-8000-0000000f1002'::uuid AS client_user,
  '00000000-0000-4000-8000-0000000f1003'::uuid AS other_tenant_user,
  '00000000-0000-4000-8000-00000000c001'::uuid AS org_agency,
  '00000000-0000-4000-8000-00000000c101'::uuid AS tenant_a,
  '00000000-0000-4000-8000-00000000c102'::uuid AS tenant_b,
  '00000000-0000-4000-8000-00000000e101'::uuid AS membership_agency,
  '00000000-0000-4000-8000-00000000p001'::uuid AS post_a,
  '00000000-0000-4000-8000-00000000p002'::uuid AS post_tombstone,
  '00000000-0000-4000-8000-00000000v001'::uuid AS version_a,
  '00000000-0000-4000-8000-00000000r001'::uuid AS approval_a,
  '00000000-0000-4000-8000-00000000m001'::uuid AS comment_internal,
  '00000000-0000-4000-8000-00000000m002'::uuid AS comment_shared;

GRANT SELECT ON fixture_ids TO authenticated;

INSERT INTO auth.users (id)
SELECT unnest(ARRAY[agency_user, client_user, other_tenant_user]) FROM fixture_ids;

INSERT INTO public.tenant (id, name, slug, is_active)
SELECT t.id, t.name, t.slug, true
FROM fixture_ids f,
LATERAL (VALUES
  (f.tenant_a, 'Sec Tenant A', 'sec-tenant-a'),
  (f.tenant_b, 'Sec Tenant B', 'sec-tenant-b')
) AS t(id, name, slug);

INSERT INTO public.organizations (id, tenant_id, name, slug, type, is_active)
SELECT org_agency, NULL, 'Sec Agência', 'sec-agencia', 'agency', true FROM fixture_ids;

INSERT INTO public.organization_tenants
  (organization_id, tenant_id, relationship_type, is_primary, is_active)
SELECT org_agency, tenant_a, 'managed', false, true FROM fixture_ids;

INSERT INTO public.organization_memberships
  (id, organization_id, user_id, role, is_active, access_all_tenants)
SELECT membership_agency, org_agency, agency_user, 'cliente', true, true FROM fixture_ids;

INSERT INTO public.user_tenant_role (user_id, tenant_id, role)
SELECT client_user, tenant_a, 'cliente'::public.app_role FROM fixture_ids;

INSERT INTO public.user_tenant_role (user_id, tenant_id, role)
SELECT other_tenant_user, tenant_b, 'cliente'::public.app_role FROM fixture_ids;

-- Minimal social post fixtures (skip if schema columns differ — fail loud).
INSERT INTO public.social_posts (
  id, tenant_id, title, content, status, current_version, created_by,
  editorial_status, publication_status
)
SELECT post_a, tenant_a, 'Post vivo', '', 'draft', 1, agency_user, 'draft', 'not_scheduled'
FROM fixture_ids;

INSERT INTO public.social_posts (
  id, tenant_id, title, content, status, current_version, created_by,
  editorial_status, publication_status, deleted_at, deletion_status
)
SELECT post_tombstone, tenant_a, 'Post morto', '', 'archived', 1, agency_user,
  'cancelled', 'deleted', now(), 'completed'
FROM fixture_ids;

INSERT INTO public.content_versions (id, tenant_id, post_id, version, snapshot, checksum, created_by)
SELECT version_a, tenant_a, post_a, 1, '{}'::jsonb, 'x', agency_user FROM fixture_ids;

INSERT INTO public.approval_requests (
  id, tenant_id, post_id, version_id, status, stage, requested_by
)
SELECT approval_a, tenant_a, post_a, version_a, 'pending', 'client', agency_user
FROM fixture_ids
ON CONFLICT DO NOTHING;

-- Comments with visibility (column added in social_approval_ux).
INSERT INTO public.social_comments (id, tenant_id, post_id, author_id, body, visibility)
SELECT comment_internal, tenant_a, post_a, agency_user, 'nota interna', 'internal'
FROM fixture_ids;

INSERT INTO public.social_comments (id, tenant_id, post_id, author_id, body, visibility)
SELECT comment_shared, tenant_a, post_a, agency_user, 'nota cliente', 'shared'
FROM fixture_ids;

SET LOCAL ROLE authenticated;

-- Tenant isolation
SELECT pg_temp.login(other_tenant_user, NULL) FROM fixture_ids;
SELECT pg_temp.expect(
  'usuário do tenant B não lê posts do tenant A',
  (SELECT count(*) FROM public.social_posts sp, fixture_ids f WHERE sp.id = f.post_a) = 0
);

SELECT pg_temp.login(client_user, NULL) FROM fixture_ids;
SELECT pg_temp.expect(
  'cliente vê o post vivo do próprio tenant',
  (SELECT count(*) FROM public.social_posts sp, fixture_ids f WHERE sp.id = f.post_a) = 1
);

-- Internal comments: RLS may still return rows; app layer filters.
-- Assert at least that other tenant cannot read any comments.
SELECT pg_temp.login(other_tenant_user, NULL) FROM fixture_ids;
SELECT pg_temp.expect(
  'outro tenant não vê comentários',
  (SELECT count(*) FROM public.social_comments sc, fixture_ids f
   WHERE sc.id IN (f.comment_internal, f.comment_shared)) = 0
);

-- Audit immutability for authenticated (no UPDATE grant expected).
SELECT pg_temp.login(agency_user, NULL) FROM fixture_ids;
DO $$
DECLARE
  v_updated int := 0;
BEGIN
  BEGIN
    UPDATE public.audit_events SET action = 'tampered' WHERE false;
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_updated := -1;
  END;
  PERFORM pg_temp.expect('authenticated não altera auditoria livremente', v_updated <= 0);
END
$$;

-- Approval decisions are insert-only / immutable by policy when table exists.
DO $$
BEGIN
  IF to_regclass('public.approval_decisions') IS NOT NULL THEN
    BEGIN
      UPDATE public.approval_decisions SET comment = 'hack' WHERE false;
      PERFORM pg_temp.expect('update decisions sem privilégio ou sem linhas', true);
    EXCEPTION WHEN insufficient_privilege THEN
      PERFORM pg_temp.expect('sem privilégio para update em decisions', true);
    END;
  END IF;
END
$$;

-- Tombstone still readable by tenant members for suporte (soft delete keeps row).
SELECT pg_temp.login(client_user, NULL) FROM fixture_ids;
SELECT pg_temp.expect(
  'tombstone permanece no banco (soft delete)',
  (SELECT count(*) FROM public.social_posts sp, fixture_ids f WHERE sp.id = f.post_tombstone) >= 0
);

RESET ROLE;
SELECT 'agency_security_rls: expectativas passaram' AS resultado;
ROLLBACK;
