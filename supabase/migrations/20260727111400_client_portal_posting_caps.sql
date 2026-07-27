-- Client portal may create and edit posts (postagem), without agency ops.

INSERT INTO public.role_capabilities (role, capability)
SELECT role_name::public.app_role, capability
FROM (
  VALUES
    ('cliente', 'marketing.social.create'),
    ('cliente', 'marketing.social.update')
) AS seed(role_name, capability)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_capabilities rc
  WHERE rc.role = seed.role_name::public.app_role
    AND rc.capability = seed.capability
    AND rc.tenant_id IS NULL
);

-- System + per-org direct owner templates.
INSERT INTO public.organization_role_capabilities (role_id, capability, allowed)
SELECT r.id, c.capability, true
FROM public.organization_roles r
LEFT JOIN public.organizations o ON o.id = r.organization_id
CROSS JOIN (VALUES
  ('marketing.social.create'),
  ('marketing.social.update')
) AS c(capability)
WHERE r.slug = 'owner'
  AND (
    (r.organization_id IS NULL AND r.organization_type = 'direct')
    OR o.type = 'direct'
  )
ON CONFLICT (role_id, capability) DO UPDATE SET allowed = true;
