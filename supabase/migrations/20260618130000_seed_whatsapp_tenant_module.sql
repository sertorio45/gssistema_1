-- Ativa o módulo WhatsApp para todos os tenants existentes.
INSERT INTO public.tenant_modules (tenant_id, module_name, is_active, activated_at)
SELECT t.id, 'whatsapp', true, COALESCE(now(), now())
FROM public.tenant t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tenant_modules tm
  WHERE tm.tenant_id = t.id
    AND tm.module_name = 'whatsapp'
);
