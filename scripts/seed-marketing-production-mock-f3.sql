-- =============================================================================
-- Seed idempotente: dados mock da Fase 3 (Kanban de produção + filas/tarefas)
-- Prefixo: [MOCK F3]
-- Tenant alvo: gsstudio (slug)
--
-- Como rodar (escolha um):
--   1) Dashboard Supabase → SQL Editor → colar e executar este arquivo
--   2) psql "$SUPABASE_DB_URL" -f scripts/seed-marketing-production-mock-f3.sql
--   3) Via MCP execute_sql no projeto gsstudio (srzohnuulwgonduoudfp)
--
-- Como limpar:
--   DELETE FROM public.social_posts
--   WHERE title LIKE '[MOCK F3]%'
--     AND tenant_id = (SELECT id FROM public.tenant WHERE slug = 'gsstudio');
--   (tarefas/movements cascateiam via FK)
--
-- Como ver:
--   Logar com usuário que tenha acesso ao tenant gsstudio (módulo marketing)
--   Abrir /marketing/production e /marketing/production/tasks
-- =============================================================================

DO $$
DECLARE
  v_tenant_id uuid;
  v_created_by uuid;
  v_user_copy uuid;
  v_user_design uuid;
  v_user_publish uuid;

  -- Posts (IDs estáveis para reruns)
  p_backlog uuid := 'a3000001-f3f3-4000-8000-000000000001';
  p_briefing uuid := 'a3000001-f3f3-4000-8000-000000000002';
  p_copy uuid := 'a3000001-f3f3-4000-8000-000000000003';
  p_design uuid := 'a3000001-f3f3-4000-8000-000000000004';
  p_review uuid := 'a3000001-f3f3-4000-8000-000000000005';
  p_client uuid := 'a3000001-f3f3-4000-8000-000000000006';
  p_changes uuid := 'a3000001-f3f3-4000-8000-000000000007';
  p_approved uuid := 'a3000001-f3f3-4000-8000-000000000008';
  p_scheduled uuid := 'a3000001-f3f3-4000-8000-000000000009';
  p_blocked uuid := 'a3000001-f3f3-4000-8000-00000000000a';
  p_published uuid := 'a3000001-f3f3-4000-8000-00000000000b';

  -- Tasks
  t1 uuid := 'b3000001-f3f3-4000-8000-000000000001';
  t2 uuid := 'b3000001-f3f3-4000-8000-000000000002';
  t3 uuid := 'b3000001-f3f3-4000-8000-000000000003';
  t4 uuid := 'b3000001-f3f3-4000-8000-000000000004';
  t5 uuid := 'b3000001-f3f3-4000-8000-000000000005';
  t6 uuid := 'b3000001-f3f3-4000-8000-000000000006';
  t7 uuid := 'b3000001-f3f3-4000-8000-000000000007';
  t8 uuid := 'b3000001-f3f3-4000-8000-000000000008';
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.tenant
  WHERE slug = 'gsstudio'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant gsstudio não encontrado';
  END IF;

  -- Prefer the attendant on gsstudio; fall back to any membership / any auth user.
  SELECT user_id INTO v_created_by
  FROM public.user_tenant_role
  WHERE tenant_id = v_tenant_id
  ORDER BY CASE role WHEN 'atendente' THEN 0 WHEN 'admin' THEN 1 WHEN 'funcionario' THEN 2 ELSE 3 END
  LIMIT 1;

  IF v_created_by IS NULL THEN
    SELECT id INTO v_created_by FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário em auth.users para created_by';
  END IF;

  -- Owners C/D/P: reuse available users for variety (nulls covered on some posts).
  v_user_copy := v_created_by;

  SELECT id INTO v_user_design
  FROM auth.users
  WHERE id <> v_created_by
  ORDER BY created_at ASC
  LIMIT 1;
  v_user_design := COALESCE(v_user_design, v_created_by);

  SELECT id INTO v_user_publish
  FROM auth.users
  WHERE id NOT IN (v_user_copy, v_user_design)
  ORDER BY created_at ASC
  LIMIT 1;
  v_user_publish := COALESCE(v_user_publish, v_created_by);

  -- Idempotent cleanup (cascades tasks / movements / task_events)
  DELETE FROM public.social_posts
  WHERE tenant_id = v_tenant_id
    AND (
      title LIKE '[MOCK F3]%'
      OR id IN (
        p_backlog, p_briefing, p_copy, p_design, p_review, p_client,
        p_changes, p_approved, p_scheduled, p_blocked, p_published
      )
    );

  INSERT INTO public.social_posts (
    id, tenant_id, title, content,
    editorial_status, publication_status, status,
    production_status, production_priority, production_due_at, blocked_reason,
    copy_owner_id, design_owner_id, publish_owner_id, assigned_to,
    scheduled_at, created_by, metadata
  ) VALUES
    (
      p_backlog, v_tenant_id,
      '[MOCK F3] Ideias de carrossel — backlog',
      'Rascunho de ideias para carrossel institucional. Sem owners ainda.',
      'draft', 'not_scheduled', 'draft',
      'backlog', 'low', NULL, NULL,
      NULL, NULL, NULL, NULL,
      NULL, v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_briefing, v_tenant_id,
      '[MOCK F3] Briefing lançamento Q3',
      'Aguardando briefing do cliente para campanha de lançamento.',
      'draft', 'not_scheduled', 'draft',
      'briefing_pending', 'normal', now() + interval '5 days', NULL,
      v_user_copy, NULL, NULL, v_user_copy,
      NULL, v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_copy, v_tenant_id,
      '[MOCK F3] Copy feed Instagram — prazo atrasado',
      'Texto em andamento para feed. Prioridade alta e prazo vencido.',
      'draft', 'not_scheduled', 'draft',
      'copy_in_progress', 'high', now() - interval '2 days', NULL,
      v_user_copy, v_user_design, NULL, v_user_copy,
      NULL, v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_design, v_tenant_id,
      '[MOCK F3] Arte stories promoção flash',
      'Design em produção para stories de promoção relâmpago.',
      'draft', 'not_scheduled', 'draft',
      'design_in_progress', 'urgent', now() + interval '1 day', NULL,
      v_user_copy, v_user_design, v_user_publish, v_user_design,
      NULL, v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_review, v_tenant_id,
      '[MOCK F3] Revisão interna — pós-evento',
      'Peça pronta para revisão interna da equipe.',
      'internal_review', 'not_scheduled', 'pending_approval',
      'internal_review', 'normal', now() + interval '3 days', NULL,
      NULL, v_user_design, v_user_publish, NULL,
      NULL, v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_client, v_tenant_id,
      '[MOCK F3] Aguardando aprovação do cliente',
      'Enviado ao cliente para aprovação final.',
      'client_review', 'not_scheduled', 'pending_approval',
      'awaiting_client_approval', 'high', now() + interval '2 days', NULL,
      NULL, NULL, v_user_publish, v_user_publish,
      NULL, v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_changes, v_tenant_id,
      '[MOCK F3] Ajustes solicitados no roteiro',
      'Cliente pediu alterações de tom e CTA.',
      'changes_requested', 'not_scheduled', 'changes_requested',
      'changes_requested', 'normal', now() + interval '4 days', NULL,
      v_user_copy, NULL, NULL, v_user_copy,
      NULL, v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_approved, v_tenant_id,
      '[MOCK F3] Conteúdo aprovado — pronto p/ agenda',
      'Aprovado editorialmente, aguardando scheduling operacional.',
      'approved', 'not_scheduled', 'approved',
      'approved', 'low', now() + interval '7 days', NULL,
      v_user_copy, v_user_design, v_user_publish, NULL,
      NULL, v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_scheduled, v_tenant_id,
      '[MOCK F3] Agendado para sexta — LinkedIn',
      'Post corporativo já na fila de publicação.',
      'approved', 'scheduled', 'scheduled',
      'scheduled', 'normal', now() + interval '3 days', NULL,
      v_user_copy, v_user_design, v_user_publish, v_user_publish,
      now() + interval '3 days', v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_blocked, v_tenant_id,
      '[MOCK F3] Bloqueado — falta asset do cliente',
      'Produção parada até receber logo em alta resolução.',
      'draft', 'not_scheduled', 'draft',
      'blocked', 'urgent', now() - interval '1 day',
      'Cliente não enviou logo em alta resolução',
      v_user_copy, v_user_design, NULL, v_user_design,
      NULL, v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    ),
    (
      p_published, v_tenant_id,
      '[MOCK F3] Publicado — case de sucesso',
      'Peça já publicada (referência visual na coluna Publicado).',
      'approved', 'published', 'published',
      'published', 'normal', now() - interval '5 days', NULL,
      v_user_copy, v_user_design, v_user_publish, NULL,
      now() - interval '5 days', v_created_by,
      '{"mock":"F3","seed":"marketing-production"}'::jsonb
    );

  INSERT INTO public.social_production_tasks (
    id, tenant_id, post_id, task_type, title, description,
    status, priority, role_scope, assignee_id, due_at, created_by
  ) VALUES
    (
      t1, v_tenant_id, p_briefing, 'prepare_briefing',
      '[MOCK F3] Coletar briefing do cliente',
      'Confirmar objetivos, público e referências visuais.',
      'todo', 'normal', 'copywriter', v_user_copy,
      now() + interval '2 days', v_created_by
    ),
    (
      t2, v_tenant_id, p_copy, 'write_copy',
      '[MOCK F3] Redigir copy do feed',
      'Versão A/B com CTA claro. Prazo já vencido.',
      'in_progress', 'high', 'copywriter', v_user_copy,
      now() - interval '2 days', v_created_by
    ),
    (
      t3, v_tenant_id, p_design, 'create_design',
      '[MOCK F3] Criar artes dos stories',
      '3 frames no formato 1080x1920.',
      'in_progress', 'urgent', 'designer', v_user_design,
      now() + interval '1 day', v_created_by
    ),
    (
      t4, v_tenant_id, p_review, 'review',
      '[MOCK F3] Revisar peça pós-evento',
      'Checar tipografia, cores da marca e ortografia.',
      'todo', 'normal', 'reviewer', v_user_publish,
      now() + interval '2 days', v_created_by
    ),
    (
      t5, v_tenant_id, p_client, 'send_to_client',
      '[MOCK F3] Enviar link de aprovação',
      'Gerar link mágico e avisar o cliente no WhatsApp.',
      'todo', 'high', 'social_media', v_user_publish,
      now() + interval '1 day', v_created_by
    ),
    (
      t6, v_tenant_id, p_changes, 'write_copy',
      '[MOCK F3] Aplicar ajustes de tom',
      'Suavizar headline e trocar CTA conforme feedback.',
      'todo', 'normal', 'copywriter', v_user_copy,
      now() + interval '3 days', v_created_by
    ),
    (
      t7, v_tenant_id, p_scheduled, 'schedule',
      '[MOCK F3] Confirmar horário LinkedIn',
      'Validar fuso e slot no calendário editorial.',
      'todo', 'normal', 'social_media', v_user_publish,
      now() + interval '2 days', v_created_by
    ),
    (
      t8, v_tenant_id, p_blocked, 'custom',
      '[MOCK F3] Cobrar asset bloqueante',
      'Solicitar logo vetorial ao cliente (bloqueio operacional).',
      'blocked', 'urgent', 'manager', v_user_design,
      now() - interval '1 day', v_created_by
    );

  RAISE NOTICE 'MOCK F3 seed OK — tenant=%, posts=11, tasks=8, created_by=%',
    v_tenant_id, v_created_by;
END
$$;
