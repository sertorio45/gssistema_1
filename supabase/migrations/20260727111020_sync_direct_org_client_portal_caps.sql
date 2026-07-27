-- Per-organization role copies for `direct` orgs still carried the full agency
-- marketing matrix. End-customer portal only needs the basic surface.

DELETE FROM public.organization_role_capabilities orc
USING public.organization_roles r
JOIN public.organizations o ON o.id = r.organization_id
WHERE orc.role_id = r.id
  AND o.type = 'direct'
  AND orc.capability IN (
    'organization.tenants.read',
    'organization.approvals.read',
    'agency.clients.read',
    'agency.clients.manage',
    'marketing.social.create',
    'marketing.social.update',
    'marketing.social.approve',
    'marketing.social.approval.submit',
    'marketing.social.approval.internal',
    'marketing.social.approval.client',
    'marketing.social.approval.bypass',
    'marketing.social.workflow.manage',
    'marketing.social.delete.local',
    'marketing.social.delete.remote',
    'marketing.social.delete.force',
    'marketing.social.delete.retry',
    'marketing.social.manage',
    'marketing.social.review_link.create',
    'marketing.social.review_link.revoke',
    'marketing.social.production.move',
    'marketing.social.production.manage',
    'marketing.social.tasks.manage',
    'marketing.social.campaigns.read',
    'marketing.social.campaigns.manage',
    'marketing.social.briefing.create',
    'marketing.social.briefing.manage',
    'marketing.social.library.manage',
    'marketing.social.brand_guide.read',
    'marketing.social.brand_guide.manage',
    'marketing.social.packages.read',
    'marketing.social.packages.manage',
    'marketing.social.sla.manage',
    'marketing.social.ops_metrics.read',
    'marketing.social.automations.read',
    'marketing.social.automations.manage'
  );

-- Ensure owner cargos on every direct org keep the portal baseline.
INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
JOIN public.organizations o ON o.id = r.organization_id
CROSS JOIN (VALUES
  ('organization.read'),
  ('organization.manage'),
  ('organization.team.read'),
  ('organization.team.manage'),
  ('organization.members.manage'),
  ('organization.roles.read'),
  ('organization.roles.manage'),
  ('marketing.social.read'),
  ('marketing.social.comment'),
  ('marketing.social.schedule'),
  ('marketing.social.publish'),
  ('marketing.social.reports'),
  ('marketing.social.integrations')
) AS c(capability)
WHERE o.type = 'direct'
  AND r.slug = 'owner'
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;
