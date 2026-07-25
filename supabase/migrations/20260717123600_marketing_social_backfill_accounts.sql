INSERT INTO public.social_accounts (
  tenant_id,
  platform,
  provider,
  integration_id,
  external_account_id,
  name,
  username,
  capabilities,
  is_active
)
SELECT
  tenant_id,
  'facebook'::public.social_platform,
  'meta',
  id,
  config ->> 'page_id',
  COALESCE(config ->> 'page_name', 'Página ' || (config ->> 'page_id')),
  NULL,
  ARRAY['publish_post'],
  true
FROM public.marketing_integrations
WHERE provider = 'meta'
  AND is_active = true
  AND NULLIF(config ->> 'page_id', '') IS NOT NULL

UNION ALL

SELECT
  tenant_id,
  'instagram'::public.social_platform,
  'meta',
  id,
  config ->> 'instagram_business_account_id',
  COALESCE(
    config ->> 'instagram_name',
    config ->> 'instagram_username',
    'Instagram ' || (config ->> 'instagram_business_account_id')
  ),
  config ->> 'instagram_username',
  ARRAY['publish_image', 'publish_video', 'publish_carousel'],
  true
FROM public.marketing_integrations
WHERE provider = 'meta'
  AND is_active = true
  AND NULLIF(config ->> 'instagram_business_account_id', '') IS NOT NULL

UNION ALL

SELECT
  tenant_id,
  'linkedin'::public.social_platform,
  'linkedin',
  id,
  config ->> 'organization_id',
  COALESCE(config ->> 'organization_name', 'LinkedIn ' || (config ->> 'organization_id')),
  NULL,
  ARRAY['publish_post', 'publish_image', 'publish_video'],
  true
FROM public.marketing_integrations
WHERE provider = 'linkedin'
  AND is_active = true
  AND NULLIF(config ->> 'organization_id', '') IS NOT NULL
ON CONFLICT (tenant_id, platform, external_account_id)
DO UPDATE SET
  integration_id = excluded.integration_id,
  name = excluded.name,
  username = excluded.username,
  capabilities = excluded.capabilities,
  is_active = true,
  updated_at = now();
