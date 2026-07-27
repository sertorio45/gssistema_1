-- Historical fix applied remotely as 20260726185135_fix_agency_portfolio_shadow_directs.
-- Deactivated shadow direct orgs, linked gsstudio/linum under GS STUDIO, granted integrations.

UPDATE public.organizations
SET is_active = false, updated_at = now()
WHERE slug IN ('direct-gsstudio', 'direct-linum')
  AND type = 'direct'
  AND is_active IS DISTINCT FROM false;

INSERT INTO public.organization_tenants (
  organization_id, tenant_id, relationship_type, is_primary, is_active
)
SELECT
  '3518f43b-5c6a-40f0-ab2c-b276445d3097',
  t.id,
  CASE WHEN t.slug = 'gsstudio' THEN 'owner'::public.organization_relationship_type
       ELSE 'managed'::public.organization_relationship_type END,
  t.slug = 'gsstudio',
  true
FROM public.tenant t
WHERE t.slug IN ('gsstudio', 'linum')
ON CONFLICT (organization_id, tenant_id) DO UPDATE
SET
  relationship_type = EXCLUDED.relationship_type,
  is_primary = EXCLUDED.is_primary,
  is_active = true,
  ended_at = null,
  updated_at = now();

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.integrations')
) AS c(capability)
WHERE r.organization_id = '3518f43b-5c6a-40f0-ab2c-b276445d3097'
  AND r.slug IN ('owner', 'agency_admin', 'marketing_manager')
ON CONFLICT (role_id, capability) DO UPDATE
SET allowed = true, updated_at = now();
