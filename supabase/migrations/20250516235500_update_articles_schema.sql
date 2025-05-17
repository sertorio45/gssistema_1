-- Renomear a tabela categories para article_category
ALTER TABLE IF EXISTS public.categories RENAME TO article_category;

-- Ajustar a referência na tabela de artigos
ALTER TABLE public.articles
DROP CONSTRAINT IF EXISTS articles_category_id_fkey,
ADD CONSTRAINT articles_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES public.article_category(id) 
  ON DELETE SET NULL;

-- Remover as policies existentes para recriar com as novas regras
DROP POLICY IF EXISTS "Admin e funcionário podem ver todos os artigos do tenant" ON public.articles;
DROP POLICY IF EXISTS "Admin e funcionário podem criar artigos no tenant" ON public.articles;
DROP POLICY IF EXISTS "Admin e funcionário podem atualizar artigos do tenant" ON public.articles;
DROP POLICY IF EXISTS "Admin e funcionário podem excluir artigos do tenant" ON public.articles;

DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver categorias" ON public.article_category;
DROP POLICY IF EXISTS "Admin e funcionário podem gerenciar categorias" ON public.article_category;

DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver tags" ON public.article_tag;
DROP POLICY IF EXISTS "Admin e funcionário podem gerenciar tags" ON public.article_tag;

DROP POLICY IF EXISTS "Admin e funcionário podem gerenciar relações de tags" ON public.article_tag_relations;

-- Criar novas policies para artigos

-- Admin e Funcionário: Acesso total a todos os dados, sem restrição por tenant
CREATE POLICY "Admin e funcionário podem acessar todos os artigos"
  ON public.articles
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
  );

-- Cliente: Acesso total apenas aos dados do seu próprio tenant
CREATE POLICY "Cliente pode acessar artigos do seu tenant"
  ON public.articles
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'cliente'
    AND tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
  );

-- Público: Apenas SELECT para dados públicos
CREATE POLICY "Acesso público apenas para artigos públicos"
  ON public.articles
  FOR SELECT
  TO anon
  USING (
    is_published = true 
    AND is_public = true
  );

-- Novas policies para article_category

-- Admin e Funcionário: Acesso total a todos os dados, sem restrição por tenant
CREATE POLICY "Admin e funcionário podem acessar todas as categorias"
  ON public.article_category
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
  );

-- Cliente: Acesso total apenas aos dados do seu próprio tenant
CREATE POLICY "Cliente pode acessar categorias do seu tenant"
  ON public.article_category
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'cliente'
    AND tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
  );

-- Público: Apenas SELECT para dados públicos
CREATE POLICY "Acesso público para categorias"
  ON public.article_category
  FOR SELECT
  TO anon
  USING (
    is_active = true
  );

-- Novas policies para article_tag

-- Admin e Funcionário: Acesso total a todos os dados, sem restrição por tenant
CREATE POLICY "Admin e funcionário podem acessar todas as tags"
  ON public.article_tag
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
  );

-- Cliente: Acesso total apenas aos dados do seu próprio tenant
CREATE POLICY "Cliente pode acessar tags do seu tenant"
  ON public.article_tag
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'cliente'
    AND tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
  );

-- Público: Apenas SELECT para dados públicos
CREATE POLICY "Acesso público para tags"
  ON public.article_tag
  FOR SELECT
  TO anon
  USING (
    is_active = true
  );

-- Novas policies para article_tag_relations

-- Admin e Funcionário: Acesso total a todos os dados, sem restrição por tenant
CREATE POLICY "Admin e funcionário podem acessar todas as relações de tags"
  ON public.article_tag_relations
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
  );

-- Cliente: Acesso total apenas aos dados do seu próprio tenant
CREATE POLICY "Cliente pode acessar relações de tags do seu tenant"
  ON public.article_tag_relations
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'cliente'
    AND tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
  );

-- Renomear os triggers para refletir o novo nome da tabela
DROP TRIGGER IF EXISTS set_tenant_id_categories ON public.article_category;
CREATE TRIGGER set_tenant_id_article_category
  BEFORE INSERT ON public.article_category
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id(); 