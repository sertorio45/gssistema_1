-- Speed up CRM listings filtered by tenant_id
CREATE INDEX IF NOT EXISTS idx_crm_contact_tenant_id ON public.crm_contact (tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_company_tenant_id ON public.crm_company (tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_tenant_id ON public.crm_lead (tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_contact_tenant_created_at ON public.crm_contact (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_lead_tenant_created_at ON public.crm_lead (tenant_id, created_at DESC);

-- Invite lookup used by server invite helper (service role only)
GRANT EXECUTE ON FUNCTION public.auth_find_user_id_by_email(text) TO service_role;
REVOKE ALL ON FUNCTION public.auth_find_user_id_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_find_user_id_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.auth_find_user_id_by_email(text) FROM authenticated;
