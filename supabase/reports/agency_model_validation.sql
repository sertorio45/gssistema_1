-- Agency model validation report (read-only diagnostics).
-- Run with service_role / postgres against staging or production copy:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/reports/agency_model_validation.sql
--
-- Each section returns rows that indicate data quality issues after backfill.
-- An empty result set for a section means that check is clean.

\echo '=== 1. Tenants sem organização ativa ==='
SELECT t.id, t.name, t.slug
FROM public.tenant t
WHERE t.is_active IS DISTINCT FROM false
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_tenants ot
    JOIN public.organizations o ON o.id = ot.organization_id
    WHERE ot.tenant_id = t.id
      AND ot.is_active = true
      AND ot.ended_at IS NULL
      AND o.is_active = true
  )
ORDER BY t.name;

\echo '=== 2. Memberships órfãos (org inexistente ou user sem role_id) ==='
SELECT om.id, om.organization_id, om.user_id, om.role, om.role_id, om.is_active
FROM public.organization_memberships om
LEFT JOIN public.organizations o ON o.id = om.organization_id
WHERE o.id IS NULL
   OR (om.is_active = true AND om.role_id IS NULL)
ORDER BY om.created_at DESC
LIMIT 200;

\echo '=== 3. Usuários membros ativos sem cargo (role_id) ==='
SELECT om.id, om.organization_id, om.user_id, om.role
FROM public.organization_memberships om
WHERE om.is_active = true
  AND om.role_id IS NULL
ORDER BY om.updated_at DESC
LIMIT 200;

\echo '=== 4. Tenants ligados a organizações conflitantes (mais de um owner primary) ==='
SELECT ot.tenant_id, count(*) AS owner_links
FROM public.organization_tenants ot
WHERE ot.relationship_type = 'owner'
  AND ot.is_active = true
  AND ot.ended_at IS NULL
GROUP BY ot.tenant_id
HAVING count(*) > 1;

\echo '=== 5. Posts sem content_version ==='
SELECT sp.id, sp.tenant_id, sp.title, sp.status, sp.editorial_status, sp.current_version
FROM public.social_posts sp
WHERE sp.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.content_versions cv
    WHERE cv.post_id = sp.id AND cv.tenant_id = sp.tenant_id
  )
ORDER BY sp.created_at DESC
LIMIT 200;

\echo '=== 6. Aprovações sem versão ==='
SELECT ar.id, ar.tenant_id, ar.post_id, ar.status, ar.version_id
FROM public.approval_requests ar
WHERE ar.version_id IS NULL
ORDER BY ar.created_at DESC
LIMIT 200;

\echo '=== 7. Variantes publicadas sem ID remoto ==='
SELECT spv.id, spv.tenant_id, spv.post_id, spv.platform, spv.format, sp.status AS post_status
FROM public.social_post_variants spv
JOIN public.social_posts sp ON sp.id = spv.post_id AND sp.tenant_id = spv.tenant_id
WHERE sp.deleted_at IS NULL
  AND sp.publication_status IN ('published', 'partially_published')
  AND spv.external_post_id IS NULL
  AND spv.external_media_id IS NULL
ORDER BY sp.published_at DESC NULLS LAST
LIMIT 200;

\echo '=== 8. Roles de sistema/org sem nenhuma capability ==='
SELECT r.id, r.organization_id, r.organization_type, r.slug, r.name
FROM public.organization_roles r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organization_role_capabilities orc
  WHERE orc.role_id = r.id
    AND orc.allowed = true
)
ORDER BY r.organization_type, r.slug
LIMIT 200;

\echo '=== 9. Tombstones (soft-deleted posts) — contagem por tenant ==='
SELECT sp.tenant_id, count(*) AS deleted_posts
FROM public.social_posts sp
WHERE sp.deleted_at IS NOT NULL
GROUP BY sp.tenant_id
ORDER BY deleted_posts DESC;

\echo '=== 10. Integrações Meta: tokens nunca devem aparecer em audit_events ==='
SELECT ae.id, ae.tenant_id, ae.action, ae.created_at
FROM public.audit_events ae
WHERE ae.after_data::text ~* 'access_token|page_access_token|EAA[A-Za-z0-9]{20,}'
   OR ae.before_data::text ~* 'access_token|page_access_token|EAA[A-Za-z0-9]{20,}'
ORDER BY ae.created_at DESC
LIMIT 50;

\echo '=== Fim do relatório ==='
