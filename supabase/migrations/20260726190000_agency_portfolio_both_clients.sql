-- GS STUDIO portfolio: gsstudio and linum are both agency clients.
-- organizations.tenant_id remains the commercial anchor (gsstudio).

UPDATE public.organization_tenants
SET
  relationship_type = 'managed',
  is_primary = false,
  updated_at = now()
WHERE organization_id = '3518f43b-5c6a-40f0-ab2c-b276445d3097'
  AND tenant_id = '286f2ba0-b7a0-4685-b44a-24a55f6119c8'
  AND relationship_type = 'owner';

UPDATE public.organizations
SET is_active = false, updated_at = now()
WHERE id IN (
  '602df027-9718-4edc-8914-55b4a9cb13cb',
  'e3a966b4-8266-4447-b876-7c41f4f683a7'
)
AND is_active IS DISTINCT FROM false;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, 'marketing.social.integrations', true
FROM public.organization_roles r
JOIN public.organizations o ON o.id = r.organization_id
WHERE o.id = '3518f43b-5c6a-40f0-ab2c-b276445d3097'
  AND r.slug IN ('owner', 'agency_admin', 'marketing_manager')
ON CONFLICT (role_id, capability) DO UPDATE
SET allowed = true, updated_at = now();
