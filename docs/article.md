# Documentação do Módulo Article

## Visão Geral

O módulo de **article** gerencia artigos, categorias e tags, permitindo CRUD completo, organização por tenant, cache local e integração com Supabase. O sistema é multi-tenant, garantindo isolamento de dados por organização.

---

## Componentes

### Estrutura
- `components/articles/` — Componentes principais de artigos
- `components/articles/category/` — Componentes de categorias
- `components/articles/tag/` — Componentes de tags

### Principais Componentes
- **DataTable.vue**: Tabela de listagem de artigos, categorias ou tags, com paginação, busca e ações.
- **DataTableToolbar.vue**: Barra de ferramentas para filtros, busca e ações em massa.
- **DataTableRowActions.vue**: Ações rápidas (editar, excluir, etc) para cada linha.
- **Tiny.vue**: Editor de texto avançado (TinyMCE) para edição de artigos.
- **ArticleFloatingMenu.vue**: Menu flutuante para ações rápidas em artigos.
- **DrawerNewCategory.vue**: Drawer para criação rápida de categorias.

---

## Páginas

- `pages/articles/index.vue`: Listagem principal de artigos (datatable padrão).
- `pages/articles/new.vue`: Criação de novo artigo (formulário completo, editor, seleção de categoria e tags).
- `pages/articles/edit/[id].vue`: Edição de artigo existente.
- `pages/articles/category/index.vue`: Listagem e gerenciamento de categorias.
- `pages/articles/tag/index.vue`: Listagem e gerenciamento de tags.

---

## Composables

### `useArticles.ts`
- **Função:** Centraliza toda a lógica de CRUD de artigos, categorias e tags, além de relacionamentos e cache local.
- **Principais métodos:**
  - `fetchArticles(tenantId?)`: Busca artigos, filtrando por tenant.
  - `fetchArticleById(id)`: Busca artigo por ID.
  - `createArticle(article)`: Cria novo artigo (com categoria e tags).
  - `updateArticle(id, updates)`: Atualiza artigo e seus relacionamentos.
  - `deleteArticle(id)`: Remove artigo e suas tags relacionadas.
  - `fetchCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()`: CRUD de categorias.
  - `fetchTags()`, `createTag()`, `updateTag()`, `deleteTag()`: CRUD de tags.
  - `fetchArticleTags(articleId)`, `addTagToArticle()`, `removeTagFromArticle()`: Gerenciamento de tags em artigos.
  - **Cache:** Mantém artigos, categorias e tags em refs locais para evitar requisições desnecessárias.

### `useTenantArticles.ts`
- **Função:** Integra o contexto de tenant ao gerenciamento de artigos, garantindo que todas as operações respeitem o tenant selecionado.
- **Principais métodos:**
  - `loadArticlesByTenant()`: Carrega artigos do tenant atual.
  - `ensureTenantContext()`: Garante que o tenant está definido antes de qualquer operação.

---

## Fluxo e Organização

- O CRUD de artigos, categorias e tags é feito via Supabase, sempre filtrando pelo tenant ativo.
- O contexto do tenant é garantido via composables e middleware.
- As páginas de listagem usam datatable padrão, com filtros, busca e ações em massa.
- O editor TinyMCE é utilizado para edição avançada de conteúdo.
- Categorias e tags possuem CRUD próprio, com validação de unicidade e verificação de uso antes de exclusão.
- Relacionamentos entre artigos e tags são mantidos em tabela própria (`article_tag_relations`).
- **Para usuários com papel cliente:** só são exibidos artigos relacionados ao seu próprio tenantId.
- **Para admin e funcionário:** a lógica já está funcionando normalmente para acesso aos dados do tenant selecionado.

---

## Menu

- O menu de artigos está em `constants/menus.ts`:
  - Articles > Ver artigos (`/articles`)
  - Articles > Criar (`/articles/new`)
  - Articles > Categorias (`/articles/category`)
  - Articles > Tags (`/articles/tag`)

---

## Cache

- O composable `useArticles` faz cache local dos dados carregados (artigos, categorias, tags).
- O cache é invalidado e recarregado após operações de criação, edição ou exclusão.

---

## Observações

- Todo o módulo segue o padrão de organização global e reutilização do Nuxt 3.
- O sistema está preparado para multi-tenancy real, com isolamento de dados por tenant.
- O menu, middleware e composables garantem que o contexto do tenant seja sempre respeitado.

---

## Histórico de Mudanças

- **[2024-05-23]** Ajuste das policies no Supabase para permitir que admin/funcionário veja artigos de todos os tenants se tiver papel em qualquer tenant.
- **[2024-05-23]** O método `fetchArticles` agora retorna todos os artigos para admin/funcionário se não houver tenant selecionado.
- **[2024-05-23]** O método `fetchArticleById` busca apenas por ID, sem filtro de tenant, confiando no RLS para segurança.
- **[2024-05-23]** O frontend foi ajustado para mostrar o selector de tenant para admin/funcionário mesmo sem tenant selecionado.

---

Se precisar de exemplos de uso, fluxos visuais ou detalhes de integração com outros módulos, posso detalhar ainda mais! 