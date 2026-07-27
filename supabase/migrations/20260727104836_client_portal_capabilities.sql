-- Client portal: revoke agency-ops capabilities from legacy app roles.
-- End customers (cliente / atendente) keep a basic marketing surface:
-- read, schedule, publish, comment, reports, integrations (cliente only).

DELETE FROM public.role_capabilities
WHERE tenant_id IS NULL
  AND role = 'cliente'::public.app_role
  AND capability IN (
    'agency.clients.read',
    'agency.clients.manage',
    'organization.approvals.read',
    'marketing.social.create',
    'marketing.social.update',
    'marketing.social.approve',
    'marketing.social.approval.submit',
    'marketing.social.approval.internal',
    'marketing.social.approval.client',
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

-- Ensure the client portal baseline exists for Administrador (cliente).
INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('cliente', 'marketing.social.read'),
    ('cliente', 'marketing.social.comment'),
    ('cliente', 'marketing.social.schedule'),
    ('cliente', 'marketing.social.publish'),
    ('cliente', 'marketing.social.reports'),
    ('cliente', 'marketing.social.integrations'),
    ('cliente', 'organization.team.read'),
    ('cliente', 'organization.team.manage')
) AS seed(role_name, capability)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_capabilities rc
  WHERE rc.role = seed.role_name::public.app_role
    AND rc.capability = seed.capability
    AND rc.tenant_id IS NULL
);

-- Atendente: read + comment only (no integrations/reports/schedule manage).
DELETE FROM public.role_capabilities
WHERE tenant_id IS NULL
  AND role = 'atendente'::public.app_role
  AND capability IN (
    'agency.clients.read',
    'agency.clients.manage',
    'organization.team.read',
    'organization.team.manage',
    'organization.approvals.read',
    'marketing.social.create',
    'marketing.social.update',
    'marketing.social.approve',
    'marketing.social.approval.submit',
    'marketing.social.approval.internal',
    'marketing.social.approval.client',
    'marketing.social.workflow.manage',
    'marketing.social.schedule',
    'marketing.social.publish',
    'marketing.social.integrations',
    'marketing.social.reports',
    'marketing.social.delete.local',
    'marketing.social.delete.remote',
    'marketing.social.delete.force',
    'marketing.social.delete.retry',
    'marketing.social.manage',
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

INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('atendente', 'marketing.social.read'),
    ('atendente', 'marketing.social.comment')
) AS seed(role_name, capability)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_capabilities rc
  WHERE rc.role = seed.role_name::public.app_role
    AND rc.capability = seed.capability
    AND rc.tenant_id IS NULL
);

-- Direct org templates: owner = client portal + company team (not agency ops).
DELETE FROM public.organization_role_capabilities orc
USING public.organization_roles r
WHERE orc.role_id = r.id
  AND r.organization_id IS NULL
  AND r.organization_type = 'direct'
  AND r.slug = 'owner'
  AND orc.capability IN (
    'organization.approvals.read',
    'marketing.social.create',
    'marketing.social.update',
    'marketing.social.approval.submit',
    'marketing.social.approval.client',
    'marketing.social.delete.local',
    'marketing.social.delete.force',
    'marketing.social.delete.retry',
    'marketing.social.delete.remote',
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
    'marketing.social.automations.manage',
    'marketing.social.manage',
    'marketing.social.approve'
  );

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
CROSS JOIN (VALUES
  ('marketing.social.read'),
  ('marketing.social.comment'),
  ('marketing.social.schedule'),
  ('marketing.social.publish'),
  ('marketing.social.reports'),
  ('marketing.social.integrations'),
  ('organization.team.read'),
  ('organization.team.manage'),
  ('organization.read'),
  ('organization.manage'),
  ('organization.members.manage'),
  ('organization.roles.read'),
  ('organization.roles.manage')
) AS c(capability)
WHERE r.organization_id IS NULL
  AND r.organization_type = 'direct'
  AND r.slug = 'owner'
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;
