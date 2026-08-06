-- Marketing MVP domain alignment (additive, non-breaking).
-- Keeps existing physical tables (social_*/media_*/approval_*/publication_*) per product plan.
-- New catalog objects use marketing_* prefix. Full physical rename deferred due to:
--   1) Plan directive: reuse entities, do not rebuild schema
--   2) Name collision: marketing_campaigns = Meta Ads paid; social_campaigns = editorial organic
--   3) High coupling in server APIs, RPCs, enums and workers

-- ---------------------------------------------------------------------------
-- 1) Domain comments (ownership map for Cursor + humans)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.social_posts IS
  'Marketing MVP core content entity (IDEIA→PUBLICADO). Domain: marketing organic. Future rename candidate: marketing_posts. Do not create a separate ideas table.';
COMMENT ON TABLE public.social_post_variants IS
  'Marketing MVP platform adaptations. Domain: marketing organic. Future rename candidate: marketing_post_variants.';
COMMENT ON TABLE public.social_post_assets IS
  'Marketing MVP content↔media links. Domain: marketing organic. Future rename candidate: marketing_post_assets.';
COMMENT ON TABLE public.social_accounts IS
  'Marketing MVP connected social accounts. Domain: marketing organic. Future rename candidate: marketing_social_accounts.';
COMMENT ON TABLE public.social_campaigns IS
  'Marketing MVP editorial campaigns (NOT Meta Ads). Domain: marketing organic. Distinct from public.marketing_campaigns (paid). Future rename candidate: marketing_editorial_campaigns.';
COMMENT ON TABLE public.social_briefings IS
  'Marketing MVP briefings. Domain: marketing planning. Future rename candidate: marketing_briefings.';
COMMENT ON TABLE public.social_briefing_templates IS
  'Marketing MVP briefing templates. Future rename candidate: marketing_briefing_templates.';
COMMENT ON TABLE public.social_briefing_links IS
  'Marketing MVP client briefing magic links. Future rename candidate: marketing_briefing_links.';
COMMENT ON TABLE public.social_briefing_link_accesses IS
  'Marketing MVP briefing link access audit. Future rename candidate: marketing_briefing_link_accesses.';
COMMENT ON TABLE public.social_brand_guides IS
  'Marketing MVP brand guides. Future rename candidate: marketing_brand_guides.';
COMMENT ON TABLE public.social_production_tasks IS
  'Marketing MVP production kanban tasks. Future rename candidate: marketing_production_tasks.';
COMMENT ON TABLE public.social_production_movements IS
  'Marketing MVP production status history. Future rename candidate: marketing_production_movements.';
COMMENT ON TABLE public.social_production_task_events IS
  'Marketing MVP production task event log. Future rename candidate: marketing_production_task_events.';
COMMENT ON TABLE public.social_approval_workflows IS
  'Marketing approval workflows (advanced kept in DB; MVP exposes 3 modes only). Future rename candidate: marketing_approval_workflows.';
COMMENT ON TABLE public.social_approval_workflow_stages IS
  'Marketing approval workflow stages. Future rename candidate: marketing_approval_workflow_stages.';
COMMENT ON TABLE public.social_approval_stage_assignees IS
  'Marketing approval stage assignees. Future rename candidate: marketing_approval_stage_assignees.';
COMMENT ON TABLE public.social_approval_settings IS
  'Marketing per-tenant approval settings. Future rename candidate: marketing_approval_settings.';
COMMENT ON TABLE public.social_review_links IS
  'Marketing public approval magic links. Future rename candidate: marketing_review_links.';
COMMENT ON TABLE public.social_review_link_accesses IS
  'Marketing review link access audit. Future rename candidate: marketing_review_link_accesses.';
COMMENT ON TABLE public.social_comments IS
  'Marketing content comments (internal/shared). Future rename candidate: marketing_comments.';
COMMENT ON TABLE public.social_webhook_events IS
  'Marketing provider webhook inbox. Future rename candidate: marketing_webhook_events.';
COMMENT ON TABLE public.social_client_packages IS
  'Marketing advanced packages (HIDE in MVP UI). Future rename candidate: marketing_client_packages.';
COMMENT ON TABLE public.social_package_sla_stages IS
  'Marketing advanced SLA stages (HIDE in MVP UI). Future rename candidate: marketing_package_sla_stages.';
COMMENT ON TABLE public.social_automation_rules IS
  'Marketing automation toggles (HIDE advanced flows in MVP UI). Future rename candidate: marketing_automation_rules.';
COMMENT ON TABLE public.social_automation_runs IS
  'Marketing automation run log. Future rename candidate: marketing_automation_runs.';

COMMENT ON TABLE public.content_versions IS
  'Marketing immutable content snapshots for approval/publication. Domain: marketing. Future rename candidate: marketing_content_versions.';
COMMENT ON TABLE public.approval_requests IS
  'Marketing approval runs. Domain: marketing. Future rename candidate: marketing_approval_requests.';
COMMENT ON TABLE public.approval_request_approvers IS
  'Marketing approval assignees. Future rename candidate: marketing_approval_request_approvers.';
COMMENT ON TABLE public.approval_decisions IS
  'Marketing approval decisions. Future rename candidate: marketing_approval_decisions.';
COMMENT ON TABLE public.publication_jobs IS
  'Marketing publication queue. Domain: marketing. Future rename candidate: marketing_publication_jobs.';
COMMENT ON TABLE public.publication_attempts IS
  'Marketing publication attempt log. Future rename candidate: marketing_publication_attempts.';
COMMENT ON TABLE public.deletion_jobs IS
  'Marketing remote deletion queue. Future rename candidate: marketing_deletion_jobs.';
COMMENT ON TABLE public.oauth_states IS
  'OAuth CSRF states used by marketing social integrations. Future rename candidate: marketing_oauth_states.';

COMMENT ON TABLE public.media_assets IS
  'Marketing media library assets. Domain: marketing library. Future rename candidate: marketing_media_assets.';
COMMENT ON TABLE public.media_asset_variants IS
  'Marketing media variants. Future rename candidate: marketing_media_asset_variants.';
COMMENT ON TABLE public.media_folders IS
  'Marketing media folders. Future rename candidate: marketing_media_folders.';
COMMENT ON TABLE public.media_tags IS
  'Marketing media tags. Future rename candidate: marketing_media_tags.';
COMMENT ON TABLE public.media_asset_tags IS
  'Marketing media↔tag links. Future rename candidate: marketing_media_asset_tags.';

COMMENT ON TABLE public.marketing_campaigns IS
  'PAID Meta Ads campaigns (not editorial). Domain: marketing paid traffic. Distinct from public.social_campaigns. Prefer marketing_paid_campaigns in a future rename.';
COMMENT ON TABLE public.marketing_ads IS
  'PAID Meta Ads creatives. Domain: marketing paid traffic. Prefer marketing_paid_ads in a future rename.';
COMMENT ON TABLE public.marketing_campaign_metrics IS
  'PAID campaign metrics. Domain: marketing paid traffic.';
COMMENT ON TABLE public.marketing_integrations IS
  'OAuth tokens/integrations for marketing providers (Meta/LinkedIn). Shared by organic publish + paid.';
COMMENT ON TABLE public.marketing_campaign_cache IS
  'Cached marketing dashboard/provider payloads.';
COMMENT ON TABLE public.marketing_report_logs IS
  'Marketing report generation logs.';
COMMENT ON TABLE public.marketing_ai_messages IS
  'Legacy AI messages tied to paid campaigns. MVP uses contextual IA actions only.';

-- ---------------------------------------------------------------------------
-- 2) Calendar index for MVP planning
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS social_posts_tenant_scheduled_idx
  ON public.social_posts (tenant_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS approval_requests_tenant_pending_due_idx
  ON public.approval_requests (tenant_id, due_at)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 3) MVP simplified content projection (security_invoker inherits table RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.marketing_mvp_contents
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.tenant_id,
  p.title,
  p.content,
  p.campaign_id,
  p.status AS post_status,
  p.editorial_status,
  p.production_status,
  p.publication_status,
  p.production_priority,
  p.production_due_at,
  p.scheduled_at,
  p.published_at,
  p.timezone,
  p.created_by,
  p.assigned_to,
  p.copy_owner_id,
  p.design_owner_id,
  p.publish_owner_id,
  p.created_at,
  p.updated_at,
  CASE
    WHEN p.publication_status = 'published'
      OR p.status = 'published' THEN 'publicado'
    WHEN p.publication_status = 'failed'
      OR p.status = 'failed' THEN 'erro'
    WHEN p.publication_status IN ('scheduled', 'publishing')
      OR p.status IN ('scheduled', 'publishing') THEN 'agendado'
    WHEN p.editorial_status IN ('internal_review', 'client_review')
      OR p.status = 'pending_approval'
      OR p.production_status = 'awaiting_client_approval' THEN 'aprovacao'
    WHEN p.production_status IN (
      'briefing_pending',
      'copy_in_progress',
      'design_in_progress',
      'internal_review',
      'changes_requested',
      'blocked'
    )
      OR p.status = 'changes_requested' THEN 'producao'
    ELSE 'rascunho'
  END AS mvp_status
FROM public.social_posts p
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW public.marketing_mvp_contents IS
  'Read model mapping social_posts into MVP statuses: rascunho, producao, aprovacao, agendado, publicado, erro. Prefer this for overview/reports; writes stay on social_posts.';

GRANT SELECT ON public.marketing_mvp_contents TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) MVP overview counts RPC (tenant-scoped via existing helper)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketing_mvp_overview_counts(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.user_has_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'contents_total', count(*) FILTER (WHERE true),
    'contents_by_mvp_status', jsonb_build_object(
      'rascunho', count(*) FILTER (WHERE mvp_status = 'rascunho'),
      'producao', count(*) FILTER (WHERE mvp_status = 'producao'),
      'aprovacao', count(*) FILTER (WHERE mvp_status = 'aprovacao'),
      'agendado', count(*) FILTER (WHERE mvp_status = 'agendado'),
      'publicado', count(*) FILTER (WHERE mvp_status = 'publicado'),
      'erro', count(*) FILTER (WHERE mvp_status = 'erro')
    ),
    'approvals_pending', (
      SELECT count(*)
      FROM public.approval_requests ar
      WHERE ar.tenant_id = p_tenant_id
        AND ar.status = 'pending'
    ),
    'campaigns_active', (
      SELECT count(*)
      FROM public.social_campaigns sc
      WHERE sc.tenant_id = p_tenant_id
        AND sc.status = 'active'
    ),
    'publication_jobs_open', (
      SELECT count(*)
      FROM public.publication_jobs pj
      WHERE pj.tenant_id = p_tenant_id
        AND pj.status IN ('pending', 'processing', 'retrying')
    )
  )
  INTO v_result
  FROM public.marketing_mvp_contents c
  WHERE c.tenant_id = p_tenant_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'contents_total', 0,
    'contents_by_mvp_status', jsonb_build_object(
      'rascunho', 0,
      'producao', 0,
      'aprovacao', 0,
      'agendado', 0,
      'publicado', 0,
      'erro', 0
    ),
    'approvals_pending', 0,
    'campaigns_active', 0,
    'publication_jobs_open', 0
  ));
END;
$$;

COMMENT ON FUNCTION public.marketing_mvp_overview_counts(uuid) IS
  'Marketing MVP operational counters for overview/reports. SECURITY INVOKER + tenant access check.';

REVOKE ALL ON FUNCTION public.marketing_mvp_overview_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketing_mvp_overview_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_mvp_overview_counts(uuid) TO service_role;
