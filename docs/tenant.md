# Documentação do Módulo Tenant

## Visão Geral

O módulo de **tenant** implementa multi-tenancy, permitindo que diferentes organizações ou clientes utilizem a mesma aplicação, mas com dados isolados. O gerenciamento de tenant é feito de forma global, com seleção, troca, persistência e administração de tenants.

---

## Componentes

### 1. `TenantIndicator.vue`
- **Função:** Exibe o tenant atualmente selecionado no topo da interface, com opções para trocar ou sair do tenant.
- **Ações:**
  - Mostra o nome do tenant ativo.
  - Botão para trocar de tenant (abre seleção de tenant).
  - Botão para sair do tenant (limpa o tenant atual e volta para tela inicial ou fluxo definido).
  - Se não houver tenant selecionado, exibe botão para selecionar.

### 2. `TenantDropdown.vue`
- **Função:** Dropdown para trocar rapidamente de tenant, com busca e listagem dos tenants disponíveis.
- **Ações:**
  - Busca dinâmica por nome ou slug.
  - Exibe tenant atual e lista de todos os tenants ativos.
  - Permite selecionar um tenant (atualiza o contexto global).
  - Link para gerenciamento completo em `/admin/tenants`.

### 3. `TenantSelector.vue`
- **Função:** Página de seleção de tenant (caso utilizada), geralmente acessada ao login ou ao trocar de tenant.
- **Ações:**
  - Busca por nome ou slug.
  - Lista todos os tenants disponíveis.
  - Permite selecionar e ativar um tenant.
  - Indica o tenant atualmente selecionado.

---

## Composable

### `useTenant.ts`
- **Função:** Centraliza toda a lógica de tenants para uso global.
- **Principais métodos:**
  - `listTenants()`: Busca todos os tenants do banco (Supabase).
  - `setCurrentTenantBySlug(slug)`: Define o tenant atual pelo slug, salva no store e localStorage.
  - `restoreLastTenant()`: Restaura o último tenant salvo no localStorage.
  - `currentTenant`: Computed que retorna o objeto do tenant atual.
  - `tenantId`, `setTenant`, `clearTenant`: Métodos do store para manipulação do estado global.

---

## Store

### `stores/tenant.ts`
- **Pinia Store** para gerenciamento global do tenant selecionado.
- **Estado:** `tenantId` (string ou null).
- **Ações:**
  - `setTenant(tenantId)`: Define o tenant atual.
  - `clearTenant()`: Limpa o tenant atual.

---

## Middleware

### `middleware/tenant.ts`
- **Função:** Garante que rotas que exigem tenant tenham um tenant válido selecionado.
- **Fluxo:**
  - Se a rota requer tenant (`meta.requiresTenant`), verifica se há slug na URL ou tenant ativo.
  - Se não houver tenant válido, redireciona para uma tela de erro ou fluxo definido.

---

## Página Administrativa

### `pages/admin/tenants.vue`
- **Função:** CRUD completo de tenants (apenas para admin).
- **Funcionalidades:**
  - Listagem em datatable (padrão do sistema).
  - Criação, edição e exclusão (simples e múltipla) de tenants.
  - Ativação/desativação de tenants.
  - Geração automática de slug.
  - Dialogs para confirmação de ações.
  - Integração com Supabase para persistência.

---

## Menu

### `constants/menus.ts`
- **Entrada de menu:**  
  - Administração > Tenants (`/admin/tenants`)
  - Apenas visível para usuários com papel `admin`.

---

## Fluxo de Seleção e Contexto

- O tenant selecionado é salvo no Pinia Store e no localStorage.
- Ao acessar rotas protegidas, o middleware garante que um tenant esteja ativo.
- O tenant pode ser trocado a qualquer momento via dropdown ou página de seleção.
- O contexto do tenant é utilizado em todos os módulos para filtrar dados e garantir isolamento.
- **Para usuários com papel cliente:** só são exibidos dados relacionados ao seu próprio tenantId.
- **Para admin e funcionário:** a lógica já está funcionando normalmente para acesso aos dados do tenant selecionado.

---

## Cache

- O composable e os componentes fazem cache local dos tenants carregados para evitar requisições desnecessárias.

---

## Observações

- Todos os componentes e lógica seguem o padrão de organização global e reutilização do Nuxt 3.
- O sistema está preparado para multi-tenancy real, com isolamento de dados e contexto.
- O menu, middleware e store garantem que o tenant esteja sempre presente e válido durante a navegação.

---

## Histórico de Mudanças

- **[2024-05-23]** Policies do Supabase ajustadas para permitir que admin/funcionário veja todos os tenants/artigos se tiver papel em qualquer tenant.
- **[2024-05-23]** O selector de tenant agora aparece para admin/funcionário mesmo sem tenant selecionado.
- **[2024-05-23]** O frontend e middleware garantem que o contexto de tenant é opcional para admin/funcionário, mas obrigatório para cliente.

Se precisar de exemplos de uso, fluxos visuais ou detalhes de integração com outros módulos, posso detalhar ainda mais! 