-- Allow authenticated clients to receive Realtime events on WhatsApp tables.
-- Existing tenant_isolation policy relies on app.tenant_id, which is not set on browser connections.

CREATE OR REPLACE FUNCTION public.user_has_tenant_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt jsonb;
  app_meta jsonb;
  user_meta jsonb;
  tenant_roles jsonb;
  role_key text;
  global_role text;
BEGIN
  jwt := auth.jwt();
  IF jwt IS NULL THEN
    RETURN false;
  END IF;

  app_meta := COALESCE(jwt -> 'app_metadata', '{}'::jsonb);
  user_meta := COALESCE(jwt -> 'user_metadata', '{}'::jsonb);
  global_role := COALESCE(app_meta ->> 'role', user_meta ->> 'role');

  IF global_role IN ('admin', 'funcionario') THEN
    RETURN true;
  END IF;

  tenant_roles := COALESCE(app_meta -> 'tenant_roles', '{}'::jsonb);

  IF EXISTS (
    SELECT 1
    FROM jsonb_each_text(tenant_roles) AS tr(key, val)
    WHERE val IN ('admin', 'funcionario')
  ) THEN
    RETURN true;
  END IF;

  IF tenant_roles ? p_tenant_id::text THEN
    RETURN true;
  END IF;

  IF (user_meta ->> 'tenant_id')::uuid = p_tenant_id THEN
    RETURN true;
  END IF;

  IF (app_meta ->> 'tenant_id')::uuid = p_tenant_id THEN
    RETURN true;
  END IF;

  FOR role_key IN SELECT jsonb_object_keys(tenant_roles)
  LOOP
    IF role_key = p_tenant_id::text THEN
      RETURN true;
    END IF;

    IF role_key !~* '^[0-9a-f]{8}-' THEN
      IF EXISTS (
        SELECT 1 FROM public.tenant t
        WHERE t.slug = role_key AND t.id = p_tenant_id
      ) THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_message'
      AND policyname = 'whatsapp_message_authenticated_select'
  ) THEN
    CREATE POLICY whatsapp_message_authenticated_select ON public.whatsapp_message
      FOR SELECT TO authenticated
      USING (public.user_has_tenant_access(tenant_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_conversation'
      AND policyname = 'whatsapp_conversation_authenticated_select'
  ) THEN
    CREATE POLICY whatsapp_conversation_authenticated_select ON public.whatsapp_conversation
      FOR SELECT TO authenticated
      USING (public.user_has_tenant_access(tenant_id));
  END IF;
END $$;
