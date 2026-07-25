CREATE UNIQUE INDEX social_accounts_one_active_platform_idx
  ON public.social_accounts (tenant_id, platform)
  WHERE is_active = true;
