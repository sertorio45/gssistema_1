-- Continuation of organization role seed: capability matrices and backfill.

CREATE TEMP TABLE tmp_role_caps (
  organization_type public.organization_type NOT NULL,
  slug text NOT NULL,
  capability text NOT NULL
);

-- Capability matrices -------------------------------------------------------

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'agency', 'owner', c FROM unnest(ARRAY[
  'organization.read','organization.manage',
  'organization.team.read','organization.team.manage','organization.members.manage',
  'organization.roles.read','organization.roles.manage',
  'organization.tenants.read','organization.approvals.read',
  'agency.clients.read','agency.clients.manage',
  'marketing.social.read','marketing.social.create','marketing.social.update',
  'marketing.social.comment','marketing.social.approval.submit',
  'marketing.social.approval.internal','marketing.social.approval.client',
  'marketing.social.workflow.manage','marketing.social.schedule',
  'marketing.social.publish','marketing.social.delete.local','marketing.social.delete.remote',
  'marketing.social.integrations','marketing.social.reports','marketing.social.manage',
  'marketing.social.approve'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'agency', 'agency_admin', c FROM unnest(ARRAY[
  'organization.read',
  'organization.team.read','organization.team.manage','organization.members.manage',
  'organization.roles.read','organization.roles.manage',
  'organization.tenants.read','organization.approvals.read',
  'agency.clients.read','agency.clients.manage',
  'marketing.social.read','marketing.social.create','marketing.social.update',
  'marketing.social.comment','marketing.social.approval.submit',
  'marketing.social.approval.internal',
  'marketing.social.workflow.manage','marketing.social.schedule',
  'marketing.social.publish','marketing.social.delete.local','marketing.social.delete.remote',
  'marketing.social.integrations','marketing.social.reports','marketing.social.manage',
  'marketing.social.approve'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'agency', 'marketing_manager', c FROM unnest(ARRAY[
  'organization.read','organization.team.read',
  'organization.tenants.read','organization.approvals.read','agency.clients.read',
  'marketing.social.read','marketing.social.create','marketing.social.update',
  'marketing.social.comment','marketing.social.approval.submit',
  'marketing.social.approval.internal','marketing.social.schedule',
  'marketing.social.publish','marketing.social.delete.local',
  'marketing.social.reports','marketing.social.approve'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'agency', 'social_media', c FROM unnest(ARRAY[
  'organization.read','organization.tenants.read','agency.clients.read',
  'marketing.social.read','marketing.social.create','marketing.social.update',
  'marketing.social.comment','marketing.social.approval.submit'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'agency', 'designer', c FROM unnest(ARRAY[
  'organization.read','organization.tenants.read','agency.clients.read',
  'marketing.social.read','marketing.social.create','marketing.social.update',
  'marketing.social.comment'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'agency', 'copywriter', c FROM unnest(ARRAY[
  'organization.read','organization.tenants.read','agency.clients.read',
  'marketing.social.read','marketing.social.update','marketing.social.comment',
  'marketing.social.create'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'agency', 'internal_approver', c FROM unnest(ARRAY[
  'organization.read','organization.tenants.read','agency.clients.read',
  'organization.approvals.read',
  'marketing.social.read','marketing.social.comment',
  'marketing.social.approval.internal','marketing.social.approve'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'agency', 'analyst', c FROM unnest(ARRAY[
  'organization.read','organization.tenants.read','agency.clients.read',
  'marketing.social.read','marketing.social.reports'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'direct', 'owner', c FROM unnest(ARRAY[
  'organization.read','organization.manage',
  'organization.team.read','organization.team.manage','organization.members.manage',
  'organization.roles.read','organization.roles.manage',
  'organization.tenants.read','organization.approvals.read',
  'marketing.social.read','marketing.social.create','marketing.social.update',
  'marketing.social.comment','marketing.social.approval.submit',
  'marketing.social.approval.client','marketing.social.schedule',
  'marketing.social.publish','marketing.social.delete.local',
  'marketing.social.reports','marketing.social.manage','marketing.social.approve'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'direct', 'approver', c FROM unnest(ARRAY[
  'organization.read',
  'marketing.social.read','marketing.social.comment',
  'marketing.social.approval.client','marketing.social.approve','marketing.social.reports'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'direct', 'editor', c FROM unnest(ARRAY[
  'organization.read',
  'marketing.social.read','marketing.social.create','marketing.social.update',
  'marketing.social.comment','marketing.social.approval.submit'
]) AS c;

INSERT INTO tmp_role_caps (organization_type, slug, capability)
SELECT 'direct', 'viewer', c FROM unnest(ARRAY[
  'organization.read','marketing.social.read','marketing.social.reports'
]) AS c;

INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, t.capability, true
FROM tmp_role_caps t
JOIN public.organization_roles r
  ON r.organization_id IS NULL
 AND r.organization_type = t.organization_type
 AND r.slug = t.slug
ON CONFLICT (role_id, capability) DO UPDATE
  SET allowed = true, updated_at = now();

-- ---------------------------------------------------------------------------
-- Backfill: copy templates into every existing organization
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN
    SELECT id, type
    FROM public.organizations
    WHERE type IN ('agency', 'direct')
  LOOP
    PERFORM private.copy_organization_role_templates(v_org.id, v_org.type, NULL);
  END LOOP;
END
$$;

-- Map existing memberships onto the org-local cargo that matches the legacy role.
UPDATE public.organization_memberships om
SET role_id = r.id
FROM public.organization_roles r
WHERE om.role_id IS NULL
  AND om.role = 'cliente'
  AND r.organization_id = om.organization_id
  AND r.slug = 'owner';

UPDATE public.organization_memberships om
SET role_id = r.id
FROM public.organization_roles r, public.organizations o
WHERE om.role_id IS NULL
  AND om.role = 'atendente'
  AND o.id = om.organization_id
  AND r.organization_id = om.organization_id
  AND (
    (o.type = 'agency' AND r.slug = 'social_media')
    OR (o.type = 'direct' AND r.slug = 'editor')
    OR (o.type = 'platform' AND r.slug = 'owner')
  );

-- Keep legacy app_role column aligned with the cargo.
UPDATE public.organization_memberships om
SET role = r.legacy_app_role
FROM public.organization_roles r
WHERE om.role_id = r.id
  AND om.role IS DISTINCT FROM r.legacy_app_role;

-- Hook: whenever a new organization is created, copy the matching templates.
CREATE OR REPLACE FUNCTION private.seed_organization_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.type IN ('agency', 'direct') THEN
    PERFORM private.copy_organization_role_templates(NEW.id, NEW.type, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_organization_roles ON public.organizations;
CREATE TRIGGER seed_organization_roles
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION private.seed_organization_roles();

REVOKE ALL ON FUNCTION private.seed_organization_roles() FROM PUBLIC;
