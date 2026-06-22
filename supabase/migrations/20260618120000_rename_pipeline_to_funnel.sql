-- Rename pipeline domain to funnel
ALTER TABLE public.crm_pipeline RENAME TO crm_funnel;

ALTER TABLE public.crm_lead RENAME COLUMN pipeline_id TO funnel_id;
ALTER TABLE public.crm_sales_stage RENAME COLUMN pipeline_id TO funnel_id;

ALTER TABLE public.crm_funnel RENAME CONSTRAINT crm_pipeline_pkey TO crm_funnel_pkey;
ALTER TABLE public.crm_funnel RENAME CONSTRAINT crm_pipeline_tenant_id_fkey TO crm_funnel_tenant_id_fkey;
ALTER TABLE public.crm_lead RENAME CONSTRAINT crm_lead_pipeline_id_fkey TO crm_lead_funnel_id_fkey;
ALTER TABLE public.crm_sales_stage RENAME CONSTRAINT crm_sales_stage_pipeline_id_fkey TO crm_sales_stage_funnel_id_fkey;

COMMENT ON TABLE public.crm_funnel IS 'Sales funnels per tenant';
COMMENT ON COLUMN public.crm_lead.funnel_id IS 'Funnel this lead belongs to';
COMMENT ON COLUMN public.crm_sales_stage.funnel_id IS 'Funnel this stage belongs to';
