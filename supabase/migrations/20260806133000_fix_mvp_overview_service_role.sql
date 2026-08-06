-- Nitro / requireWorkspaceContext calls RPCs with the service_role key
-- (auth.uid() is null). marketing_mvp_overview_counts was granted to
-- service_role but rejected those callers with "not authenticated", so
-- GET /api/marketing/mvp/overview always failed and the UI showed zeros.

CREATE OR REPLACE FUNCTION public.marketing_mvp_overview_counts(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_result jsonb;
  v_is_service boolean := coalesce(auth.role(), '') = 'service_role';
BEGIN
  -- Authenticated JWT callers must have a uid; service_role is used by Nitro
  -- after requireSocialContext already validated tenant + capability.
  IF auth.uid() IS NULL AND NOT v_is_service THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT v_is_service AND NOT public.user_has_tenant_access(p_tenant_id) THEN
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
    ),
    'schedules_upcoming', (
      SELECT count(*)
      FROM public.marketing_post_schedules s
      WHERE s.tenant_id = p_tenant_id
        AND s.status IN ('planned', 'queued')
        AND s.scheduled_at >= now()
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
    'publication_jobs_open', 0,
    'schedules_upcoming', 0
  ));
END;
$$;

COMMENT ON FUNCTION public.marketing_mvp_overview_counts(uuid) IS
  'Marketing MVP counters. Nitro calls with service_role after capability checks; end users via JWT still require tenant access.';

GRANT SELECT ON public.marketing_mvp_contents TO service_role;
