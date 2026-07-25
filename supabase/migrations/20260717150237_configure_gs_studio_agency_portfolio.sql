DO $$
DECLARE
  v_gs_tenant_id uuid;
  v_linum_tenant_id uuid;
  v_gs_direct_organization_id uuid;
  v_agency_organization_id uuid;
BEGIN
  SELECT id INTO v_gs_tenant_id
  FROM public.tenant
  WHERE slug = 'gsstudio';

  SELECT id INTO v_linum_tenant_id
  FROM public.tenant
  WHERE slug = 'linum';

  IF v_gs_tenant_id IS NULL OR v_linum_tenant_id IS NULL THEN
    RAISE EXCEPTION 'GS STUDIO ou Linum não foi encontrada';
  END IF;

  SELECT id INTO v_gs_direct_organization_id
  FROM public.organizations
  WHERE tenant_id = v_gs_tenant_id
    AND type = 'direct';

  IF v_gs_direct_organization_id IS NULL THEN
    RAISE EXCEPTION 'Organização técnica da GS STUDIO não foi encontrada';
  END IF;

  INSERT INTO public.organization_tenants (
    organization_id,
    tenant_id,
    is_primary
  )
  VALUES (
    v_gs_direct_organization_id,
    v_gs_tenant_id,
    true
  )
  ON CONFLICT (organization_id, tenant_id)
  DO UPDATE SET
    is_primary = true,
    updated_at = now();

  DELETE FROM public.organization_tenants
  WHERE organization_id = v_gs_direct_organization_id
    AND tenant_id = v_linum_tenant_id;

  INSERT INTO public.organizations (
    tenant_id,
    name,
    slug,
    type,
    is_active,
    settings
  )
  VALUES (
    v_gs_tenant_id,
    'GS STUDIO',
    'agency-gs-studio',
    'agency',
    true,
    '{"portfolio_label":"Clientes da agência"}'::jsonb
  )
  ON CONFLICT (slug)
  DO UPDATE SET
    tenant_id = excluded.tenant_id,
    name = excluded.name,
    type = 'agency',
    is_active = true,
    settings = public.organizations.settings || excluded.settings,
    updated_at = now()
  RETURNING id INTO v_agency_organization_id;

  INSERT INTO public.organization_tenants (
    organization_id,
    tenant_id,
    is_primary
  )
  VALUES
    (v_agency_organization_id, v_gs_tenant_id, true),
    (v_agency_organization_id, v_linum_tenant_id, false)
  ON CONFLICT (organization_id, tenant_id)
  DO UPDATE SET
    is_primary = excluded.is_primary,
    updated_at = now();
END
$$;
