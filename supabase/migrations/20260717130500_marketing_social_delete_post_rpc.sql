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
  IF NOT EXISTS (
    SELECT 1
    FROM public.social_posts
    WHERE id = p_post_id
      AND tenant_id = p_tenant_id
  ) THEN
    RETURN false;
  END IF;

  DELETE FROM public.publication_jobs
  WHERE tenant_id = p_tenant_id
    AND post_id = p_post_id;

  DELETE FROM public.approval_requests
  WHERE tenant_id = p_tenant_id
    AND post_id = p_post_id;

  DELETE FROM public.social_comments
  WHERE tenant_id = p_tenant_id
    AND post_id = p_post_id;

  UPDATE public.social_posts
  SET approved_version_id = NULL
  WHERE tenant_id = p_tenant_id
    AND id = p_post_id;

  DELETE FROM public.content_versions
  WHERE tenant_id = p_tenant_id
    AND post_id = p_post_id;

  DELETE FROM public.social_post_variants
  WHERE tenant_id = p_tenant_id
    AND post_id = p_post_id;

  DELETE FROM public.social_posts
  WHERE tenant_id = p_tenant_id
    AND id = p_post_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.marketing_delete_social_post(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_delete_social_post(uuid, uuid)
  TO service_role;
