-- Dispatch overdue/stalled social automations via the same marketing worker vault secrets.

CREATE OR REPLACE FUNCTION private.marketing_dispatch_automations()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_base_url text;
  v_secret text;
  v_request_id bigint;
  v_has_due boolean;
BEGIN
  SELECT decrypted_secret INTO v_base_url
  FROM vault.decrypted_secrets
  WHERE name = 'marketing_worker_base_url';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'marketing_worker_secret';

  IF v_base_url IS NULL OR v_secret IS NULL THEN
    RAISE WARNING 'marketing worker secrets not configured in vault';
    RETURN NULL;
  END IF;

  SELECT (
    EXISTS (
      SELECT 1 FROM public.approval_requests
      WHERE run_status = 'pending'
        AND due_at IS NOT NULL
        AND due_at < now()
    )
    OR EXISTS (
      SELECT 1 FROM public.social_posts
      WHERE deleted_at IS NULL
        AND production_due_at IS NOT NULL
        AND production_due_at < now()
        AND production_status::text NOT IN ('approved', 'scheduled', 'published')
    )
  ) INTO v_has_due;

  IF NOT v_has_due THEN
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_base_url, '/') || '/api/marketing/social/jobs/automations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', v_secret
    ),
    body := jsonb_build_object('workerId', 'pg_cron_automations', 'limit', 40),
    timeout_milliseconds := 25000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION private.marketing_dispatch_automations() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.marketing_dispatch_automations() FROM anon, authenticated;

SELECT cron.schedule(
  'marketing-dispatch-automations',
  '*/15 * * * *',
  $job$SELECT private.marketing_dispatch_automations()$job$
);
