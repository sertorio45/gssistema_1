-- Migration para módulo de artigos, categorias e tags
-- Habilitar extensão uuid-ossp se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  UNIQUE (slug, tenant_id)
);

-- Tabela de tags
CREATE TABLE IF NOT EXISTS public.article_tag (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  UNIQUE (slug, tenant_id)
);

-- Tabela de artigos
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  content TEXT,
  excerpt TEXT,
  featured_image VARCHAR(512),
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  author_id UUID REFERENCES auth.users(id),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  meta_description VARCHAR(512),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  UNIQUE (slug, tenant_id)
);

-- Tabela de relação N:N entre artigos e tags
CREATE TABLE IF NOT EXISTS public.article_tag_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.article_tag(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  UNIQUE (article_id, tag_id)
);

-- Triggers para definir automaticamente o tenant_id
CREATE TRIGGER set_tenant_id_articles
  BEFORE INSERT ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_categories
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_article_tag
  BEFORE INSERT ON public.article_tag
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_article_tag_relations
  BEFORE INSERT ON public.article_tag_relations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Políticas RLS para artigos
CREATE POLICY "Admin e funcionário podem ver todos os artigos do tenant"
  ON public.articles
  FOR SELECT
  TO authenticated
  USING (
    (
      (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
      AND tenant_id = public.get_current_tenant_id()
    )
    OR
    (
      is_public = true
      AND tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admin e funcionário podem criar artigos no tenant"
  ON public.articles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
    AND tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "Admin e funcionário podem atualizar artigos do tenant"
  ON public.articles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
    AND tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "Admin e funcionário podem excluir artigos do tenant"
  ON public.articles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
    AND tenant_id = public.get_current_tenant_id()
  );

-- Políticas RLS para categorias e tags seguindo o mesmo padrão
CREATE POLICY "Qualquer usuário autenticado pode ver categorias"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Admin e funcionário podem gerenciar categorias"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
    AND tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "Qualquer usuário autenticado pode ver tags"
  ON public.article_tag
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Admin e funcionário podem gerenciar tags"
  ON public.article_tag
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
    AND tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "Admin e funcionário podem gerenciar relações de tags"
  ON public.article_tag_relations
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
    AND tenant_id = public.get_current_tenant_id()
  ); 