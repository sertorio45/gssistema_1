-- Dispatches due publication jobs to the Nuxt worker endpoint via pg_cron + pg_net.
-- Credentials live in Supabase Vault so they are never stored in plain SQL.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.marketing_dispatch_publication_jobs()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_base_url text;
  v_secret text;
  v_due_count integer;
  v_request_id bigint;
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

  -- Avoid hitting the endpoint when there is nothing due.
  SELECT count(*) INTO v_due_count
  FROM public.publication_jobs
  WHERE status IN ('pending', 'retrying')
    AND scheduled_at <= now()
    AND (next_attempt_at IS NULL OR next_attempt_at <= now());

  IF v_due_count = 0 THEN
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_base_url, '/') || '/api/marketing/social/jobs/process',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', v_secret
    ),
    body := jsonb_build_object('workerId', 'pg_cron', 'limit', 25),
    timeout_milliseconds := 25000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION private.marketing_dispatch_publication_jobs() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.marketing_dispatch_publication_jobs() FROM anon, authenticated;

SELECT cron.schedule(
  'marketing-dispatch-publication-jobs',
  '* * * * *',
  $job$SELECT private.marketing_dispatch_publication_jobs()$job$
);
