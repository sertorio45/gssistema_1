-- Phase 4: multi-date scheduling for the same marketing content.
-- Planning slots live in marketing_post_schedules; publication_jobs remain the execution queue.
-- social_posts.scheduled_at is kept as denormalized "next active slot" for backward compatibility.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_post_schedule_status') THEN
    CREATE TYPE public.marketing_post_schedule_status AS ENUM (
      'planned',
      'queued',
      'publishing',
      'published',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.marketing_post_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  variant_id uuid,
  platform public.social_platform,
  format public.social_post_format,
  scheduled_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  status public.marketing_post_schedule_status NOT NULL DEFAULT 'planned',
  notes text,
  publication_job_id uuid REFERENCES public.publication_jobs(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_post_schedules_post_tenant_fkey
    FOREIGN KEY (post_id, tenant_id)
    REFERENCES public.social_posts(id, tenant_id)
    ON DELETE CASCADE,
  CONSTRAINT marketing_post_schedules_variant_fkey
    FOREIGN KEY (variant_id)
    REFERENCES public.social_post_variants(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS marketing_post_schedules_tenant_at_idx
  ON public.marketing_post_schedules (tenant_id, scheduled_at)
  WHERE status <> 'cancelled';

CREATE INDEX IF NOT EXISTS marketing_post_schedules_post_idx
  ON public.marketing_post_schedules (post_id, scheduled_at)
  WHERE status <> 'cancelled';

CREATE INDEX IF NOT EXISTS marketing_post_schedules_variant_idx
  ON public.marketing_post_schedules (tenant_id, variant_id, scheduled_at)
  WHERE variant_id IS NOT NULL AND status <> 'cancelled';

COMMENT ON TABLE public.marketing_post_schedules IS
  'Marketing MVP planning slots: one content may have many scheduled dates/formats. Counts of contents vs slots are independent — overview counts contents; calendar lists schedule occurrences.';

-- Backfill one planned slot from legacy social_posts.scheduled_at when none exist.
INSERT INTO public.marketing_post_schedules (
  tenant_id, post_id, scheduled_at, timezone, status, created_by, created_at, updated_at
)
SELECT
  p.tenant_id,
  p.id,
  p.scheduled_at,
  COALESCE(NULLIF(p.timezone, ''), 'America/Sao_Paulo'),
  CASE
    WHEN p.publication_status = 'published' OR p.status = 'published' THEN 'published'::public.marketing_post_schedule_status
    WHEN p.publication_status IN ('scheduled', 'publishing')
      OR p.status IN ('scheduled', 'publishing') THEN 'queued'::public.marketing_post_schedule_status
    WHEN p.publication_status = 'failed' OR p.status = 'failed' THEN 'failed'::public.marketing_post_schedule_status
    ELSE 'planned'::public.marketing_post_schedule_status
  END,
  p.created_by,
  now(),
  now()
FROM public.social_posts p
WHERE p.scheduled_at IS NOT NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.marketing_post_schedules s
    WHERE s.post_id = p.id
      AND s.tenant_id = p.tenant_id
      AND s.status <> 'cancelled'
  );

-- Keep social_posts.scheduled_at = earliest active schedule.
CREATE OR REPLACE FUNCTION public.marketing_sync_post_next_scheduled_at(p_tenant_id uuid, p_post_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_next timestamptz;
BEGIN
  SELECT min(s.scheduled_at)
  INTO v_next
  FROM public.marketing_post_schedules s
  WHERE s.tenant_id = p_tenant_id
    AND s.post_id = p_post_id
    AND s.status IN ('planned', 'queued', 'publishing', 'failed');

  UPDATE public.social_posts
  SET scheduled_at = v_next,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND id = p_post_id
    AND deleted_at IS NULL;

  RETURN v_next;
END;
$$;

COMMENT ON FUNCTION public.marketing_sync_post_next_scheduled_at(uuid, uuid) IS
  'Denormalizes earliest active marketing_post_schedules.scheduled_at onto social_posts.scheduled_at.';

REVOKE ALL ON FUNCTION public.marketing_sync_post_next_scheduled_at(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketing_sync_post_next_scheduled_at(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_sync_post_next_scheduled_at(uuid, uuid) TO service_role;

-- Overview: contents still counted once; add schedules_upcoming for planning capacity.
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
  -- Nitro uses service_role (no auth.uid); capability/tenant already gated in API.
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
    -- Occurrence capacity (not content uniqueness). One post with 3 dates contributes 3.
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
  'Marketing MVP counters. contents_by_mvp_status counts unique contents; schedules_upcoming counts schedule occurrences. Nitro may call with service_role after capability checks.';

-- RLS
ALTER TABLE public.marketing_post_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_read ON public.marketing_post_schedules;
CREATE POLICY tenant_read ON public.marketing_post_schedules
  FOR SELECT TO authenticated
  USING (private.user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS schedule_insert ON public.marketing_post_schedules;
CREATE POLICY schedule_insert ON public.marketing_post_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    private.user_has_capability(tenant_id, 'marketing.social.create')
    OR private.user_has_capability(tenant_id, 'marketing.social.schedule')
    OR private.user_has_capability(tenant_id, 'marketing.social.manage')
  );

DROP POLICY IF EXISTS schedule_update ON public.marketing_post_schedules;
CREATE POLICY schedule_update ON public.marketing_post_schedules
  FOR UPDATE TO authenticated
  USING (
    private.user_has_capability(tenant_id, 'marketing.social.create')
    OR private.user_has_capability(tenant_id, 'marketing.social.schedule')
    OR private.user_has_capability(tenant_id, 'marketing.social.manage')
  )
  WITH CHECK (
    private.user_has_capability(tenant_id, 'marketing.social.create')
    OR private.user_has_capability(tenant_id, 'marketing.social.schedule')
    OR private.user_has_capability(tenant_id, 'marketing.social.manage')
  );

DROP POLICY IF EXISTS schedule_delete ON public.marketing_post_schedules;
CREATE POLICY schedule_delete ON public.marketing_post_schedules
  FOR DELETE TO authenticated
  USING (
    private.user_has_capability(tenant_id, 'marketing.social.create')
    OR private.user_has_capability(tenant_id, 'marketing.social.schedule')
    OR private.user_has_capability(tenant_id, 'marketing.social.manage')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_post_schedules TO authenticated;
GRANT ALL ON public.marketing_post_schedules TO service_role;
