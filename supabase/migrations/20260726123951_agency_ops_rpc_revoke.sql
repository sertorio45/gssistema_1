-- Lock down the public wrapper: only the service role may provision clients.
REVOKE ALL ON FUNCTION public.provision_agency_client(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text[], jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_agency_client(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text[], jsonb
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_agency_client(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text[], jsonb
) TO service_role;
