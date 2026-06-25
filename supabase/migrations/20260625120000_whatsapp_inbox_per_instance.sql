-- Separate inboxes per WhatsApp instance (Chatwoot-style): one conversation per tenant + instance + phone.

-- Backfill instance_id from the latest message per conversation.
UPDATE whatsapp_conversation c
SET instance_id = sub.instance_id::uuid
FROM (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    instance_id
  FROM whatsapp_message
  WHERE conversation_id IS NOT NULL
    AND instance_id IS NOT NULL
    AND instance_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ORDER BY conversation_id, created_at DESC
) sub
WHERE c.id = sub.conversation_id
  AND c.instance_id IS NULL;

-- Default instance per tenant.
UPDATE whatsapp_conversation c
SET instance_id = i.id
FROM whatsapp_instance i
WHERE c.instance_id IS NULL
  AND c.tenant_id = i.tenant_id
  AND i.is_default = true;

-- Fallback: oldest instance per tenant.
UPDATE whatsapp_conversation c
SET instance_id = (
  SELECT i.id
  FROM whatsapp_instance i
  WHERE i.tenant_id = c.tenant_id
  ORDER BY i.created_at ASC
  LIMIT 1
)
WHERE c.instance_id IS NULL
  AND EXISTS (
    SELECT 1 FROM whatsapp_instance i WHERE i.tenant_id = c.tenant_id
  );

DROP INDEX IF EXISTS idx_whatsapp_conversation_tenant_phone;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversation_tenant_instance_phone
  ON whatsapp_conversation (tenant_id, instance_id, contact_phone)
  WHERE instance_id IS NOT NULL;
