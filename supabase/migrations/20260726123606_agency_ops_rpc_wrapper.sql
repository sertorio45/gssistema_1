-- Expose the private provisioner to the service role under a stable public name.
-- Authenticated clients never receive EXECUTE.

CREATE OR REPLACE FUNCTION public.provision_agency_client(
  p_organization_id uuid,
  p_onboarding_id uuid,
  p_actor_id uuid,
  p_tenant_id uuid DEFAULT NULL,
  p_tenant_name text DEFAULT NULL,
  p_tenant_slug text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_internal_owner_user_id uuid DEFAULT NULL,
  p_modules text[] DEFAULT ARRAY[]::text[],
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT private.provision_agency_client(
    p_organization_id,
    p_onboarding_id,
    p_actor_id,
    p_tenant_id,
    p_tenant_name,
    p_tenant_slug,
    p_display_name,
    p_logo_url,
    p_internal_owner_user_id,
    p_modules,
    p_metadata
  );
$$;

REVOKE ALL ON FUNCTION public.provision_agency_client(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text[], jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_agency_client(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text[], jsonb
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_agency_client(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text[], jsonb
) TO service_role;
