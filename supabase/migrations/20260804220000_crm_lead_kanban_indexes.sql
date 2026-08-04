-- Skill: index WHERE columns used by CRM kanban board
CREATE INDEX IF NOT EXISTS idx_crm_lead_tenant_funnel ON public.crm_lead (tenant_id, funnel_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_tenant_funnel_stage ON public.crm_lead (tenant_id, funnel_id, sales_stage_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversation_tenant_lead_active
  ON public.whatsapp_conversation (tenant_id, lead_id, last_message_at DESC)
  WHERE status IN ('open', 'pending');
