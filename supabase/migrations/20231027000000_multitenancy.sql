-- Habilitando a extensão uuid-ossp caso ainda não esteja habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criando a tabela de tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar coluna tenant_id aos usuários
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Adicionar coluna tenant_id às tabelas que precisam de isolamento por tenant
-- ALTER TABLE public.tasks 
-- ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- ALTER TABLE public.articles
-- ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- ALTER TABLE public.article_categories
-- ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- ALTER TABLE public.article_tags
-- ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Criar funções de Supabase para obter o tenant_id atual
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID),
    (NULLIF(current_setting('request.jwt.claims', TRUE)::json->>'tenant_id', '')::UUID)
  );
$$;

-- Criar políticas (RLS) para as tabelas com tenant_id

-- Políticas para tenants
CREATE POLICY "Tenants visíveis para qualquer usuário autenticado"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Apenas administradores podem criar tenants"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Apenas administradores podem atualizar tenants"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Apenas administradores podem excluir tenants"
  ON public.tenants
  FOR DELETE
  TO authenticated
  USING ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin');

-- Políticas para tarefas
-- CREATE POLICY "Admin e funcionário vêem todas as tarefas do tenant"
--   ON public.tasks
--   FOR SELECT
--   TO authenticated
--   USING (
--     (
--       (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
--       AND tenant_id = public.get_current_tenant_id()
--     )
--     OR
--     (
--       (SELECT role FROM auth.users WHERE id = auth.uid()) = 'cliente'
--       AND tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
--       AND user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Admin e funcionário podem criar tarefas no tenant"
--   ON public.tasks
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     (
--       (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
--       AND tenant_id = public.get_current_tenant_id()
--     )
--     OR
--     (
--       (SELECT role FROM auth.users WHERE id = auth.uid()) = 'cliente'
--       AND tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
--     )
--   );

-- CREATE POLICY "Admin e funcionário podem atualizar tarefas do tenant"
--   ON public.tasks
--   FOR UPDATE
--   TO authenticated
--   USING (
--     (
--       (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
--       AND tenant_id = public.get_current_tenant_id()
--     )
--     OR
--     (
--       (SELECT role FROM auth.users WHERE id = auth.uid()) = 'cliente'
--       AND tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
--       AND user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Admin e funcionário podem excluir tarefas do tenant"
--   ON public.tasks
--   FOR DELETE
--   TO authenticated
--   USING (
--     (
--       (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario')
--       AND tenant_id = public.get_current_tenant_id()
--     )
--     OR
--     (
--       (SELECT role FROM auth.users WHERE id = auth.uid()) = 'cliente'
--       AND tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
--       AND user_id = auth.uid()
--     )
--   );

-- Criar função para definir automaticamente o tenant_id
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o tenant_id não foi fornecido explicitamente
  IF NEW.tenant_id IS NULL THEN
    -- Se o usuário for admin/funcionário, usar o tenant_id do contexto atual
    IF (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'funcionario') THEN
      NEW.tenant_id := public.get_current_tenant_id();
    -- Se o usuário for cliente, usar o tenant_id associado ao cliente
    ELSE
      NEW.tenant_id := (SELECT tenant_id FROM auth.users WHERE id = auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
-- CREATE TRIGGER set_tenant_id_tasks
--   BEFORE INSERT ON public.tasks
--   FOR EACH ROW
--   EXECUTE FUNCTION public.set_tenant_id();

-- CREATE TRIGGER set_tenant_id_articles
--   BEFORE INSERT ON public.articles
--   FOR EACH ROW
--   EXECUTE FUNCTION public.set_tenant_id();

-- CREATE TRIGGER set_tenant_id_article_categories
--   BEFORE INSERT ON public.article_categories
--   FOR EACH ROW
--   EXECUTE FUNCTION public.set_tenant_id();

-- CREATE TRIGGER set_tenant_id_article_tags
--   BEFORE INSERT ON public.article_tags
--   FOR EACH ROW
--   EXECUTE FUNCTION public.set_tenant_id(); 