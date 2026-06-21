-- WhatsApp module: enums, core tables, legacy migration, RLS, indexes.
-- Renames crm_whatsapp_* → whatsapp_* when present.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE whatsapp_provider AS ENUM ('evolution', 'cloud_api');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_instance_status AS ENUM ('disconnected', 'connecting', 'connected', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_conversation_status AS ENUM ('open', 'pending', 'resolved', 'spam');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_message_type AS ENUM (
    'text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'template', 'interactive'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_campaign_status AS ENUM (
    'draft', 'scheduled', 'running', 'paused', 'completed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_flow_node_type AS ENUM (
    'trigger', 'message', 'condition', 'delay', 'action', 'ai_agent', 'handoff', 'webhook', 'tag', 'crm_update'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_flow_status AS ENUM ('draft', 'active', 'paused', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_agent_tool_type AS ENUM ('mcp', 'internal', 'api');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Core: instances & integrations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS whatsapp_instance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  provider          whatsapp_provider NOT NULL DEFAULT 'evolution',
  phone_number      TEXT,
  status            whatsapp_instance_status NOT NULL DEFAULT 'disconnected',
  qr_code           TEXT,
  connection_state  JSONB NOT NULL DEFAULT '{}',
  is_default        BOOLEAN NOT NULL DEFAULT false,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_integration (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  instance_id         UUID NOT NULL REFERENCES whatsapp_instance(id) ON DELETE CASCADE,
  provider            whatsapp_provider NOT NULL,
  api_url             TEXT,
  api_token_encrypted TEXT,
  webhook_secret      TEXT,
  cloud_phone_id      TEXT,
  cloud_business_id   TEXT,
  cloud_access_token_encrypted TEXT,
  settings            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (instance_id)
);

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS whatsapp_contact (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL,
  name            TEXT,
  profile_picture TEXT,
  crm_contact_id  UUID REFERENCES crm_contact(id) ON DELETE SET NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  custom_fields   JSONB NOT NULL DEFAULT '{}',
  opt_in          BOOLEAN NOT NULL DEFAULT true,
  opt_in_at       TIMESTAMPTZ,
  blocked         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone)
);

-- ---------------------------------------------------------------------------
-- Legacy migration: crm_whatsapp_* → whatsapp_*
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.crm_whatsapp_conversation') IS NOT NULL
     AND to_regclass('public.whatsapp_conversation') IS NULL THEN
    ALTER TABLE public.crm_whatsapp_conversation RENAME TO whatsapp_conversation;
  END IF;

  IF to_regclass('public.crm_whatsapp_message') IS NOT NULL
     AND to_regclass('public.whatsapp_message') IS NULL THEN
    ALTER TABLE public.crm_whatsapp_message RENAME TO whatsapp_message;
  END IF;
END $$;

-- Conversations (create if not exists after rename)
CREATE TABLE IF NOT EXISTS whatsapp_conversation (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  instance_id           UUID REFERENCES whatsapp_instance(id) ON DELETE SET NULL,
  contact_id            UUID REFERENCES whatsapp_contact(id) ON DELETE SET NULL,
  remote_jid            TEXT NOT NULL,
  contact_name          TEXT NOT NULL DEFAULT '',
  contact_phone         TEXT NOT NULL DEFAULT '',
  status                whatsapp_conversation_status NOT NULL DEFAULT 'open',
  assigned_to           UUID,
  last_message_preview  TEXT NOT NULL DEFAULT '',
  last_message_at       TIMESTAMPTZ,
  unread_count          INTEGER NOT NULL DEFAULT 0,
  lead_id               UUID REFERENCES crm_lead(id) ON DELETE SET NULL,
  crm_contact_id        UUID REFERENCES crm_contact(id) ON DELETE SET NULL,
  priority              SMALLINT NOT NULL DEFAULT 0,
  channel               TEXT NOT NULL DEFAULT 'whatsapp',
  is_online             BOOLEAN NOT NULL DEFAULT false,
  profile_picture       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrate legacy column names on renamed table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversation' AND column_name = 'last_message'
  ) THEN
    ALTER TABLE whatsapp_conversation
      ADD COLUMN IF NOT EXISTS last_message_preview TEXT NOT NULL DEFAULT '';

    UPDATE whatsapp_conversation
    SET last_message_preview = COALESCE(NULLIF(last_message_preview, ''), last_message, '')
    WHERE last_message_preview = '' OR last_message_preview IS NULL;

    ALTER TABLE whatsapp_conversation DROP COLUMN IF EXISTS last_message;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversation' AND column_name = 'last_message_time'
  ) THEN
    ALTER TABLE whatsapp_conversation
      ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

    UPDATE whatsapp_conversation
    SET last_message_at = COALESCE(last_message_at, last_message_time, now())
    WHERE last_message_at IS NULL;

    ALTER TABLE whatsapp_conversation DROP COLUMN IF EXISTS last_message_time;
  END IF;

  -- Legacy contact_id pointed to crm_contact
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversation' AND column_name = 'contact_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_conversation_contact_id_fkey'
      AND table_name = 'whatsapp_conversation'
  ) THEN
    ALTER TABLE whatsapp_conversation RENAME COLUMN contact_id TO crm_contact_id;
  END IF;
END $$;

ALTER TABLE whatsapp_conversation
  ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES whatsapp_instance(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES whatsapp_contact(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status whatsapp_conversation_status NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS crm_contact_id UUID REFERENCES crm_contact(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Messages
CREATE TABLE IF NOT EXISTS whatsapp_message (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversation(id) ON DELETE CASCADE,
  instance_id     TEXT NOT NULL DEFAULT '',
  contact_id      UUID REFERENCES whatsapp_contact(id) ON DELETE SET NULL,
  external_id     TEXT,
  remote_jid      TEXT NOT NULL,
  from_me         BOOLEAN NOT NULL DEFAULT false,
  message_type    TEXT NOT NULL DEFAULT 'text',
  content         TEXT NOT NULL DEFAULT '',
  media_url       TEXT,
  media_mime      TEXT,
  file_name       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  lead_id         UUID REFERENCES crm_lead(id) ON DELETE SET NULL,
  crm_contact_id  UUID REFERENCES crm_contact(id) ON DELETE SET NULL,
  reply_to_id     UUID REFERENCES whatsapp_message(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrate legacy message columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_message' AND column_name = 'message'
  ) THEN
    ALTER TABLE whatsapp_message
      ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';

    UPDATE whatsapp_message
    SET content = COALESCE(NULLIF(content, ''), message, '')
    WHERE content = '' OR content IS NULL;
    ALTER TABLE whatsapp_message DROP COLUMN IF EXISTS message;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_message' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE whatsapp_message
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

    UPDATE whatsapp_message
    SET sent_at = COALESCE(sent_at, "timestamp", now())
    WHERE sent_at IS NULL;
    ALTER TABLE whatsapp_message DROP COLUMN IF EXISTS timestamp;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_message' AND column_name = 'contact_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_message_contact_id_fkey'
      AND table_name = 'whatsapp_message'
  ) THEN
    ALTER TABLE whatsapp_message RENAME COLUMN contact_id TO crm_contact_id;
  END IF;
END $$;

ALTER TABLE whatsapp_message
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES whatsapp_conversation(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES whatsapp_contact(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS media_mime TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crm_contact_id UUID REFERENCES crm_contact(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES whatsapp_message(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------------
-- Tags & assignments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS whatsapp_tag (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS whatsapp_contact_tag (
  contact_id  UUID NOT NULL REFERENCES whatsapp_contact(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES whatsapp_tag(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS whatsapp_conversation_tag (
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversation(id) ON DELETE CASCADE,
  tag_id          UUID NOT NULL REFERENCES whatsapp_tag(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, tag_id)
);

CREATE TABLE IF NOT EXISTS whatsapp_assignment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversation(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Templates & campaigns
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS whatsapp_template (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instance(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'pt_BR',
  category    TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  components  JSONB NOT NULL DEFAULT '[]',
  external_id TEXT,
  provider    whatsapp_provider,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  instance_id     UUID REFERENCES whatsapp_instance(id) ON DELETE SET NULL,
  template_id     UUID REFERENCES whatsapp_template(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  status          whatsapp_campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  audience_filter JSONB NOT NULL DEFAULT '{}',
  stats           JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign_recipient (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  campaign_id         UUID NOT NULL REFERENCES whatsapp_campaign(id) ON DELETE CASCADE,
  contact_id          UUID REFERENCES whatsapp_contact(id) ON DELETE SET NULL,
  phone               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  sent_at             TIMESTAMPTZ,
  error_message       TEXT,
  external_message_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Flows (automation)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS whatsapp_flow (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  status         whatsapp_flow_status NOT NULL DEFAULT 'draft',
  trigger_type   TEXT NOT NULL DEFAULT 'message_received',
  trigger_config JSONB NOT NULL DEFAULT '{}',
  viewport       JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
  version        INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_flow_node (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  flow_id    UUID NOT NULL REFERENCES whatsapp_flow(id) ON DELETE CASCADE,
  type       whatsapp_flow_node_type NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  position   JSONB NOT NULL DEFAULT '{"x":0,"y":0}',
  data       JSONB NOT NULL DEFAULT '{}',
  node_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flow_id, node_key)
);

CREATE TABLE IF NOT EXISTS whatsapp_flow_edge (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  flow_id         UUID NOT NULL REFERENCES whatsapp_flow(id) ON DELETE CASCADE,
  source_node_id  UUID NOT NULL REFERENCES whatsapp_flow_node(id) ON DELETE CASCADE,
  target_node_id  UUID NOT NULL REFERENCES whatsapp_flow_node(id) ON DELETE CASCADE,
  source_handle   TEXT,
  target_handle   TEXT,
  condition       JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_flow_execution (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  flow_id         UUID NOT NULL REFERENCES whatsapp_flow(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES whatsapp_contact(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES whatsapp_conversation(id) ON DELETE SET NULL,
  current_node_id UUID REFERENCES whatsapp_flow_node(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'running',
  context         JSONB NOT NULL DEFAULT '{}',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_flow_execution_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL REFERENCES whatsapp_flow_execution(id) ON DELETE CASCADE,
  node_id      UUID REFERENCES whatsapp_flow_node(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  input        JSONB NOT NULL DEFAULT '{}',
  output       JSONB NOT NULL DEFAULT '{}',
  error        TEXT,
  executed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- AI agents
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS whatsapp_agent (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  avatar         TEXT,
  model          TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  system_prompt  TEXT NOT NULL DEFAULT '',
  temperature    NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  max_tokens     INTEGER NOT NULL DEFAULT 1024,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  handoff_rules  JSONB NOT NULL DEFAULT '{}',
  knowledge_base JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_agent_tool (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES whatsapp_agent(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          whatsapp_agent_tool_type NOT NULL DEFAULT 'internal',
  config        JSONB NOT NULL DEFAULT '{}',
  mcp_server    TEXT,
  mcp_tool_name TEXT,
  is_enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_agent_session (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  agent_id         UUID NOT NULL REFERENCES whatsapp_agent(id) ON DELETE CASCADE,
  conversation_id  UUID REFERENCES whatsapp_conversation(id) ON DELETE SET NULL,
  contact_id       UUID REFERENCES whatsapp_contact(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  messages_context JSONB NOT NULL DEFAULT '[]',
  tokens_used      INTEGER NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Infra: webhooks, metrics, settings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS whatsapp_webhook_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instance(id) ON DELETE SET NULL,
  provider    whatsapp_provider,
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  processed   BOOLEAN NOT NULL DEFAULT false,
  error       TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_metric_daily (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  instance_id             UUID REFERENCES whatsapp_instance(id) ON DELETE SET NULL,
  date                    DATE NOT NULL,
  messages_sent           INTEGER NOT NULL DEFAULT 0,
  messages_received       INTEGER NOT NULL DEFAULT 0,
  conversations_opened    INTEGER NOT NULL DEFAULT 0,
  conversations_resolved  INTEGER NOT NULL DEFAULT 0,
  avg_response_time_sec   INTEGER NOT NULL DEFAULT 0,
  campaigns_sent          INTEGER NOT NULL DEFAULT 0,
  agent_interactions      INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, instance_id, date)
);

CREATE TABLE IF NOT EXISTS whatsapp_setting (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_whatsapp_instance_tenant ON whatsapp_instance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contact_tenant_phone ON whatsapp_contact(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversation_tenant ON whatsapp_conversation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversation_instance ON whatsapp_conversation(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversation_status ON whatsapp_conversation(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_conversation ON whatsapp_message(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_tenant ON whatsapp_message(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_tenant ON whatsapp_campaign(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_tenant ON whatsapp_flow(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_agent_tenant ON whatsapp_agent(tenant_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'whatsapp_instance', 'whatsapp_integration', 'whatsapp_contact',
    'whatsapp_conversation', 'whatsapp_message', 'whatsapp_tag',
    'whatsapp_contact_tag', 'whatsapp_conversation_tag', 'whatsapp_assignment',
    'whatsapp_template', 'whatsapp_campaign', 'whatsapp_campaign_recipient',
    'whatsapp_flow', 'whatsapp_flow_node', 'whatsapp_flow_edge',
    'whatsapp_flow_execution', 'whatsapp_flow_execution_log',
    'whatsapp_agent', 'whatsapp_agent_tool', 'whatsapp_agent_session',
    'whatsapp_webhook_log', 'whatsapp_metric_daily', 'whatsapp_setting'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = 'tenant_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON %I
         USING (tenant_id = (current_setting(''app.tenant_id'', true))::uuid)
         WITH CHECK (tenant_id = (current_setting(''app.tenant_id'', true))::uuid)',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Module activation for existing CRM tenants
-- ---------------------------------------------------------------------------

INSERT INTO public.tenant_modules (tenant_id, module_name, is_active, activated_at)
SELECT tenant_id, 'whatsapp', is_active, COALESCE(activated_at, now())
FROM public.tenant_modules
WHERE module_name = 'crm'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_modules tm
    WHERE tm.tenant_id = tenant_modules.tenant_id AND tm.module_name = 'whatsapp'
  );

-- ---------------------------------------------------------------------------
-- Realtime (enable in Supabase dashboard if publication fails here)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_message;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversation;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
