-- Deduplicate conversations per tenant + phone, then enforce uniqueness.

WITH keepers AS (
  SELECT DISTINCT ON (tenant_id, contact_phone)
    id AS keep_id,
    tenant_id,
    contact_phone
  FROM whatsapp_conversation
  ORDER BY tenant_id, contact_phone, last_message_at DESC NULLS LAST, created_at DESC
),
dupes AS (
  SELECT c.id AS dupe_id, k.keep_id
  FROM whatsapp_conversation c
  INNER JOIN keepers k
    ON k.tenant_id = c.tenant_id
    AND k.contact_phone = c.contact_phone
  WHERE c.id <> k.keep_id
)
UPDATE whatsapp_message m
SET conversation_id = d.keep_id
FROM dupes d
WHERE m.conversation_id = d.dupe_id;

WITH keepers AS (
  SELECT DISTINCT ON (tenant_id, contact_phone)
    id AS keep_id,
    tenant_id,
    contact_phone
  FROM whatsapp_conversation
  ORDER BY tenant_id, contact_phone, last_message_at DESC NULLS LAST, created_at DESC
),
dupes AS (
  SELECT c.id AS dupe_id, k.keep_id
  FROM whatsapp_conversation c
  INNER JOIN keepers k
    ON k.tenant_id = c.tenant_id
    AND k.contact_phone = c.contact_phone
  WHERE c.id <> k.keep_id
)
UPDATE whatsapp_flow_execution fe
SET conversation_id = d.keep_id
FROM dupes d
WHERE fe.conversation_id = d.dupe_id;

WITH keepers AS (
  SELECT DISTINCT ON (tenant_id, contact_phone)
    id AS keep_id,
    tenant_id,
    contact_phone
  FROM whatsapp_conversation
  ORDER BY tenant_id, contact_phone, last_message_at DESC NULLS LAST, created_at DESC
),
dupes AS (
  SELECT c.id AS dupe_id, k.keep_id
  FROM whatsapp_conversation c
  INNER JOIN keepers k
    ON k.tenant_id = c.tenant_id
    AND k.contact_phone = c.contact_phone
  WHERE c.id <> k.keep_id
)
UPDATE whatsapp_agent_session s
SET conversation_id = d.keep_id
FROM dupes d
WHERE s.conversation_id = d.dupe_id;

WITH keepers AS (
  SELECT DISTINCT ON (tenant_id, contact_phone)
    id AS keep_id,
    tenant_id,
    contact_phone
  FROM whatsapp_conversation
  ORDER BY tenant_id, contact_phone, last_message_at DESC NULLS LAST, created_at DESC
),
dupes AS (
  SELECT c.id AS dupe_id
  FROM whatsapp_conversation c
  INNER JOIN keepers k
    ON k.tenant_id = c.tenant_id
    AND k.contact_phone = c.contact_phone
  WHERE c.id <> k.keep_id
)
DELETE FROM whatsapp_conversation c
USING dupes d
WHERE c.id = d.dupe_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversation_tenant_phone
  ON whatsapp_conversation (tenant_id, contact_phone);
