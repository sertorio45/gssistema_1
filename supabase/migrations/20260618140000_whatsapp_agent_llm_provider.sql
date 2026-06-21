-- Add LLM provider column to whatsapp_agent (ollama | openai)

ALTER TABLE whatsapp_agent
  ADD COLUMN IF NOT EXISTS llm_provider TEXT NOT NULL DEFAULT 'ollama';

COMMENT ON COLUMN whatsapp_agent.llm_provider IS 'LLM backend: ollama or openai';
