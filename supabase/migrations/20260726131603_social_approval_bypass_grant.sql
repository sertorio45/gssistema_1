-- Grant the approval bypass capability to the roles that own the account
-- relationship (agency owner/admin, direct owner). Applies to both the shared
-- templates (organization_id IS NULL) and the per-organization copies so
-- existing organizations get the capability without a re-seed.

INSERT INTO public.capabilities (key, description)
VALUES (
  'marketing.social.approval.bypass',
  'Ignorar fluxo de aprovação com justificativa auditada'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, 'marketing.social.approval.bypass', true
FROM public.organization_roles r
WHERE (
  (r.organization_type = 'agency' AND r.slug IN ('owner', 'agency_admin'))
  OR (r.organization_type = 'direct' AND r.slug = 'owner')
  OR (r.organization_type = 'platform' AND r.slug = 'owner')
)
ON CONFLICT (role_id, capability) DO UPDATE
  SET allowed = true, updated_at = now();
