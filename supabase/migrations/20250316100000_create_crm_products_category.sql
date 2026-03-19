-- CRM Product Categories table
CREATE TABLE IF NOT EXISTS crm_products_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE crm_products_category ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON crm_products_category
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

CREATE INDEX IF NOT EXISTS idx_crm_products_category_tenant_id ON crm_products_category(tenant_id);

-- Link products to category
ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS category_id UUID NULL REFERENCES crm_products_category(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_products_category_id ON crm_products(category_id);
