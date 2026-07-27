-- Capabilities for creating and revoking magic review links.

INSERT INTO public.capabilities (key, description)
VALUES
  ('marketing.social.review_link.create', 'Gerar link mágico de aprovação para o cliente'),
  ('marketing.social.review_link.revoke', 'Revogar link mágico de aprovação')
ON CONFLICT (key) DO UPDATE SET description = excluded.description;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (
  VALUES
    ('marketing.social.review_link.create'),
    ('marketing.social.review_link.revoke')
) AS c(capability)
WHERE r.is_system
  AND r.organization_type IN ('agency', 'direct', 'platform')
  AND r.slug IN ('owner', 'agency_admin', 'marketing_manager')
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;

-- Copy into non-system org role clones that match those slugs.
INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (
  VALUES
    ('marketing.social.review_link.create'),
    ('marketing.social.review_link.revoke')
) AS c(capability)
WHERE r.is_system = false
  AND r.organization_type IN ('agency', 'direct')
  AND r.slug IN ('owner', 'agency_admin', 'marketing_manager')
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;

INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('admin', 'marketing.social.review_link.create'),
    ('admin', 'marketing.social.review_link.revoke'),
    ('funcionario', 'marketing.social.review_link.create'),
    ('funcionario', 'marketing.social.review_link.revoke'),
    ('cliente', 'marketing.social.review_link.create'),
    ('cliente', 'marketing.social.review_link.revoke')
) AS v(role_name, capability)
ON CONFLICT DO NOTHING;
