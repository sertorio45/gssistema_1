-- Soft-delete RPC (replaces hard delete)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.marketing_delete_social_post(
  p_tenant_id uuid,
  p_post_id uuid,
  p_deleted_by uuid DEFAULT NULL,
  p_mode public.social_deletion_mode DEFAULT 'system_only',
  p_reason text DEFAULT NULL,
  p_remote_status public.social_remote_deletion_status DEFAULT 'not_applicable'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.social_posts
    WHERE id = p_post_id
      AND tenant_id = p_tenant_id
  ) THEN
    RETURN false;
  END IF;

  -- Cancel jobs that have not started; leave processing ones for the worker to abort.
  UPDATE public.publication_jobs
  SET
    status = 'failed',
    last_error_code = 'deletion_cancelled',
    last_error_message = 'Job cancelado porque a publicação entrou em exclusão',
    locked_at = NULL,
    locked_by = NULL,
    updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND post_id = p_post_id
    AND status IN ('pending', 'retrying');

  UPDATE public.approval_requests
  SET
    status = 'cancelled',
    run_status = 'cancelled',
    resolved_at = now(),
    locked_at = NULL,
    locked_by = NULL
  WHERE tenant_id = p_tenant_id
    AND post_id = p_post_id
    AND status = 'pending';

  UPDATE public.social_posts
  SET
    deleted_at = COALESCE(deleted_at, now()),
    deleted_by = COALESCE(p_deleted_by, deleted_by),
    deletion_mode = COALESCE(p_mode, deletion_mode),
    deletion_status = 'completed',
    deletion_reason = COALESCE(p_reason, deletion_reason),
    remote_deletion_status = p_remote_status,
    publication_status = 'deleted',
    editorial_status = 'cancelled',
    status = 'archived',
    scheduled_at = NULL,
    deletion_locked_at = NULL,
    deletion_locked_by = NULL,
    updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND id = p_post_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.marketing_delete_social_post(uuid, uuid, uuid, public.social_deletion_mode, text, public.social_remote_deletion_status)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_delete_social_post(uuid, uuid, uuid, public.social_deletion_mode, text, public.social_remote_deletion_status)
  TO service_role;

-- Keep a thin wrapper with the old 2-arg signature for any leftover callers.
CREATE OR REPLACE FUNCTION public.marketing_delete_social_post(
  p_tenant_id uuid,
  p_post_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN public.marketing_delete_social_post(
    p_tenant_id,
    p_post_id,
    NULL,
    'system_only'::public.social_deletion_mode,
    NULL,
    'not_applicable'::public.social_remote_deletion_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.marketing_delete_social_post(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_delete_social_post(uuid, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Deletion lock helper (concurrency between publish and delete)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lock_social_post_for_deletion(
  p_tenant_id uuid,
  p_post_id uuid,
  p_locked_by text,
  p_lock_ttl_seconds integer DEFAULT 120
)
RETURNS public.social_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.social_posts;
BEGIN
  SELECT *
  INTO v_row
  FROM public.social_posts
  WHERE tenant_id = p_tenant_id
    AND id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'social_post_not_found';
  END IF;

  IF v_row.deleted_at IS NOT NULL AND v_row.deletion_status = 'completed' THEN
    RAISE EXCEPTION 'social_post_already_deleted';
  END IF;

  IF v_row.deletion_locked_at IS NOT NULL
     AND v_row.deletion_locked_by IS DISTINCT FROM p_locked_by
     AND v_row.deletion_locked_at > now() - make_interval(secs => p_lock_ttl_seconds) THEN
    RAISE EXCEPTION 'social_post_deletion_locked';
  END IF;

  IF v_row.publication_status = 'publishing' THEN
    RAISE EXCEPTION 'social_post_publishing_in_progress';
  END IF;

  UPDATE public.social_posts
  SET
    deletion_locked_at = now(),
    deletion_locked_by = p_locked_by,
    publication_status = CASE
      WHEN publication_status IN ('published', 'partially_published', 'failed', 'scheduled')
        THEN 'deletion_pending'::public.social_publication_status
      ELSE publication_status
    END,
    deletion_status = 'requested',
    updated_at = now()
  WHERE id = p_post_id
    AND tenant_id = p_tenant_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_social_post_for_deletion(uuid, uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_social_post_for_deletion(uuid, uuid, text, integer)
  TO service_role;
