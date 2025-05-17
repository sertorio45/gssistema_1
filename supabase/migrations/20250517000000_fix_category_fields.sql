-- Migration para otimizar a tabela article_category

-- Atualizar slug onde está vazio, usando name
UPDATE public.article_category 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        name, 
        '[^a-zA-Z0-9]', '-', 'g'),
      '-+', '-', 'g'),
    '^-|-$', '', 'g')
)
WHERE slug IS NULL AND name IS NOT NULL;

-- Criar índice para otimizar consultas por name
CREATE INDEX IF NOT EXISTS idx_article_category_name ON public.article_category(name);

-- Criar índice para otimizar consultas por slug
CREATE INDEX IF NOT EXISTS idx_article_category_slug ON public.article_category(slug, tenant_id);

-- Habilitar cache para categorias
ALTER TABLE public.article_category ENABLE ROW LEVEL SECURITY; 