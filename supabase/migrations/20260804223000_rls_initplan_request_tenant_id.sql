-- Skill: security-rls-performance — evaluate current_setting once per statement
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.request_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $fn$
  SELECT NULLIF((SELECT current_setting('app.tenant_id', true)), '')::uuid
$fn$;

CREATE OR REPLACE FUNCTION private.request_tenant_id_text()
RETURNS text
LANGUAGE sql
STABLE
AS $fn$
  SELECT NULLIF((SELECT current_setting('app.tenant_id', true)), '')
$fn$;

DO $migrate$
DECLARE
  r record;
  using_expr text;
  check_expr text;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name,
           pg_get_expr(p.polqual, p.polrelid) AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND p.polname = 'tenant_isolation'
      AND pg_get_expr(p.polqual, p.polrelid) ILIKE '%current_setting%app.tenant_id%'
  LOOP
    IF r.using_expr ILIKE '%::uuid%' THEN
      using_expr := 'tenant_id = (SELECT private.request_tenant_id())';
      check_expr := CASE WHEN r.check_expr IS NULL THEN NULL ELSE 'tenant_id = (SELECT private.request_tenant_id())' END;
    ELSE
      using_expr := '(tenant_id)::text = (SELECT private.request_tenant_id_text())';
      check_expr := CASE WHEN r.check_expr IS NULL THEN NULL ELSE '(tenant_id)::text = (SELECT private.request_tenant_id_text())' END;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', r.table_name);

    IF check_expr IS NULL THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I FOR ALL USING (%s)',
        r.table_name,
        using_expr
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I FOR ALL USING (%s) WITH CHECK (%s)',
        r.table_name,
        using_expr,
        check_expr
      );
    END IF;
  END LOOP;
END
$migrate$;
