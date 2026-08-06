-- Seed local (não commit): mock Fase 3 Produção — tenant gsstudio
-- Projeto remoto: srzohnuulwgonduoudfp
-- Prefixo: [MOCK F3]
--
-- Estado aplicado em 2026-08-06 via MCP execute_sql.
--
-- tenant_id: 286f2ba0-b7a0-4685-b44a-24a55f6119c8 (slug: gsstudio)
-- campaign_id: cce2eece-5cc7-4bd0-97fc-6e7b4e642c83  →  [MOCK F3] Mock Produção MVP
--
-- Users usados como owners/assignees:
--   7e424232-9466-4ce8-affc-330ba065716f  giovannistr@gmail.com
--   97cff86e-f865-4155-be98-69bd3e81a5f8  teste2@teste.com.br  (atendente no tenant)
--   c0a08208-801f-4f69-b464-1ec3136e7849  teste@teste.com
--
-- Posts (ids a3000001-f3f3-4000-8000-000000000001 .. 00000c):
--   001 backlog | 002 briefing_pending | 003 copy_in_progress (atrasado)
--   004 design_in_progress (urgent) | 005 internal_review
--   006 awaiting_client_approval | 007 changes_requested | 008 approved
--   009 scheduled | 00a blocked (asset) | 00b published
--   00c blocked (Meta token)
--
-- Contas usadas em variants:
--   IG 691023d9-fbe6-4af6-84bb-83a74c7a9303
--   FB e66757bf-36a2-429f-9ac7-04c597734459

-- =============================================================================
-- CLEANUP — apaga SOMENTE mocks [MOCK F3] do tenant gsstudio
-- =============================================================================
/*
BEGIN;

DELETE FROM public.social_production_task_events
WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
  AND (
    post_id IN (
      SELECT id FROM public.social_posts
      WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
        AND title LIKE '[MOCK F3]%'
    )
    OR task_id IN (
      SELECT id FROM public.social_production_tasks
      WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
        AND title LIKE '[MOCK F3]%'
    )
  );

DELETE FROM public.social_production_tasks
WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
  AND (
    title LIKE '[MOCK F3]%'
    OR post_id IN (
      SELECT id FROM public.social_posts
      WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
        AND title LIKE '[MOCK F3]%'
    )
  );

DELETE FROM public.social_production_movements
WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
  AND post_id IN (
    SELECT id FROM public.social_posts
    WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
      AND title LIKE '[MOCK F3]%'
  );

DELETE FROM public.social_post_variants
WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
  AND post_id IN (
    SELECT id FROM public.social_posts
    WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
      AND title LIKE '[MOCK F3]%'
  );

DELETE FROM public.social_posts
WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
  AND title LIKE '[MOCK F3]%';

DELETE FROM public.social_campaigns
WHERE tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
  AND name LIKE '[MOCK F3]%';

COMMIT;
*/
