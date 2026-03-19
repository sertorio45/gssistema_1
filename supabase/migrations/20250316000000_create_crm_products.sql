-- CRM Products table (run in Supabase SQL Editor / MCP)
CREATE TABLE IF NOT EXISTS crm_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL CHECK (type IN ('recorrente', 'avulso')),
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  recurrence  TEXT CHECK (recurrence IN ('mensal', 'trimestral', 'semestral', 'anual')) NULL,
  category    TEXT,
  tags        TEXT[] DEFAULT '{}',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON crm_products
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- Optional: create index for common filters
CREATE INDEX IF NOT EXISTS idx_crm_products_tenant_id ON crm_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_products_type ON crm_products(type);
CREATE INDEX IF NOT EXISTS idx_crm_products_active ON crm_products(active);
