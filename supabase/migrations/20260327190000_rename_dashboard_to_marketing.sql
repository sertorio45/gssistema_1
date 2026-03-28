-- Renomeia tabelas e módulo em tenant_modules (dashboard → marketing).
-- Aplicado também via painel Supabase / MCP em ambientes já provisionados.

ALTER TABLE IF EXISTS public.dashboard_integrations RENAME TO marketing_integrations;
ALTER TABLE IF EXISTS public.dashboard_campaign_cache RENAME TO marketing_campaign_cache;
ALTER TABLE IF EXISTS public.dashboard_report_logs RENAME TO marketing_report_logs;

UPDATE public.tenant_modules SET module_name = 'marketing' WHERE module_name = 'dashboard';
