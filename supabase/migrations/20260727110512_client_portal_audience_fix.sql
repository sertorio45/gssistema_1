-- End customers must not receive agency.clients.* (directly or via alias).
-- organization.tenants.read aliases to agency.clients.read in CAPABILITY_ALIASES,
-- which incorrectly unlocked the full agency Marketing menu for role `cliente`.

DELETE FROM public.role_capabilities
WHERE tenant_id IS NULL
  AND role IN ('cliente'::public.app_role, 'atendente'::public.app_role)
  AND capability IN (
    'organization.tenants.read',
    'agency.clients.read',
    'agency.clients.manage'
  );

DELETE FROM public.organization_role_capabilities orc
USING public.organization_roles r
WHERE orc.role_id = r.id
  AND r.organization_id IS NULL
  AND r.organization_type = 'direct'
  AND r.slug IN ('owner', 'approver', 'editor', 'viewer')
  AND orc.capability IN (
    'organization.tenants.read',
    'agency.clients.read',
    'agency.clients.manage'
  );
