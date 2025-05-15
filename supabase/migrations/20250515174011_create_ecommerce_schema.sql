-- Criar schema e-commerce
-- Tabelas para o sistema de e-commerce

-- Tabela de categorias
CREATE TABLE ecommerce_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES ecommerce_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger à tabela de categorias
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON ecommerce_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Produtos
CREATE TABLE ecommerce_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    compare_at_price DECIMAL(10, 2),
    status TEXT NOT NULL DEFAULT 'draft',
    inventory INTEGER DEFAULT 0,
    meta_title TEXT,
    meta_description TEXT,
    category_id UUID REFERENCES ecommerce_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_status CHECK (status IN ('draft', 'published', 'archived'))
);

-- Aplicar o trigger à tabela de produtos
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON ecommerce_products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Variantes de produtos
CREATE TABLE ecommerce_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES ecommerce_products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sku TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    inventory INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aplicar o trigger à tabela de variantes
CREATE TRIGGER update_variants_updated_at
BEFORE UPDATE ON ecommerce_variants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Imagens de produtos
CREATE TABLE ecommerce_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES ecommerce_products(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'gallery',
    path TEXT NOT NULL,
    alt TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_type CHECK (type IN ('thumb', 'gallery'))
);

-- Aplicar o trigger à tabela de imagens
CREATE TRIGGER update_images_updated_at
BEFORE UPDATE ON ecommerce_images
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Integrações com plataformas externas
CREATE TABLE ecommerce_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    api_key TEXT,
    store_url TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aplicar o trigger à tabela de integrações
CREATE TRIGGER update_integrations_updated_at
BEFORE UPDATE ON ecommerce_integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trigger para garantir unicidade de slug com base no título ao inserir
CREATE OR REPLACE FUNCTION generate_product_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Converter o título para slug
  base_slug := LOWER(REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9]', '-', 'g'));
  -- Remover hífens duplicados
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
  -- Remover hífens do início e do fim
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  final_slug := base_slug;
  
  -- Verificar se o slug já existe
  WHILE EXISTS (
    SELECT 1 FROM ecommerce_products WHERE slug = final_slug AND id != NEW.id
  ) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger para gerar slug automático para produtos se o slug estiver vazio
CREATE TRIGGER generate_product_slug_trigger
BEFORE INSERT OR UPDATE ON ecommerce_products
FOR EACH ROW
WHEN (NEW.slug IS NULL OR NEW.slug = '')
EXECUTE FUNCTION generate_product_slug();

-- Trigger para categorias
CREATE OR REPLACE FUNCTION generate_category_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Converter o nome para slug
  base_slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]', '-', 'g'));
  -- Remover hífens duplicados
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
  -- Remover hífens do início e do fim
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  final_slug := base_slug;
  
  -- Verificar se o slug já existe
  WHILE EXISTS (
    SELECT 1 FROM ecommerce_categories WHERE slug = final_slug AND id != NEW.id
  ) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger para gerar slug automático para categorias se o slug estiver vazio
CREATE TRIGGER generate_category_slug_trigger
BEFORE INSERT OR UPDATE ON ecommerce_categories
FOR EACH ROW
WHEN (NEW.slug IS NULL OR NEW.slug = '')
EXECUTE FUNCTION generate_category_slug();

-- Policies para acesso autenticado

-- Policies para produtos
ALTER TABLE ecommerce_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON ecommerce_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON ecommerce_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON ecommerce_products
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete products"
  ON ecommerce_products
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies para categorias
ALTER TABLE ecommerce_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON ecommerce_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON ecommerce_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON ecommerce_categories
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete categories"
  ON ecommerce_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies para variantes
ALTER TABLE ecommerce_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view variants"
  ON ecommerce_variants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert variants"
  ON ecommerce_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update variants"
  ON ecommerce_variants
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete variants"
  ON ecommerce_variants
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies para imagens
ALTER TABLE ecommerce_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view images"
  ON ecommerce_images
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert images"
  ON ecommerce_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update images"
  ON ecommerce_images
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete images"
  ON ecommerce_images
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies para integrações
ALTER TABLE ecommerce_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integrations"
  ON ecommerce_integrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
  ON ecommerce_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON ecommerce_integrations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON ecommerce_integrations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Configuração do Storage para o e-commerce
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ecommerce', 'ecommerce', false, 10485760, '{image/png,image/jpeg,image/webp}')
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket de e-commerce
CREATE POLICY "Authenticated users can view ecommerce storage"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'ecommerce');

CREATE POLICY "Authenticated users can upload to ecommerce storage"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ecommerce');

CREATE POLICY "Authenticated users can update ecommerce storage"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'ecommerce');

CREATE POLICY "Authenticated users can delete from ecommerce storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'ecommerce'); 