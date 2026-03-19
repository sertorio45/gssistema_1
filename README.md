# GS Sistema — Documentação Completa

> **Stack:** Nuxt 3 · Vue 3 · TypeScript · Shadcn/ui · Supabase · UnoCSS · TanStack Table · Lucide Icons

---

## 1. Visão Geral

O **GS Sistema** é uma plataforma SaaS e ERP multi-tenant para gerenciamento de agências. Unifica um CRM completo, autenticação robusta via Supabase e suporte nativo a múltiplos tenants, construído sobre Nuxt 3 com componentes modernos Shadcn/ui.

| Camada | Tecnologia |
|---|---|
| Framework | Nuxt 3 (SSR) |
| UI | Vue 3 + TypeScript |
| Componentes | Shadcn/ui + Lucide Icons |
| CSS | UnoCSS |
| Banco de Dados | Supabase (PostgreSQL + RLS) |
| Autenticação | Supabase Auth |
| Tabelas | TanStack Table |
| Deploy | Vercel |

---

## 2. Quick Start

```bash
# Criar projeto a partir do template
npx degit dianprata/nuxt-shadcn-dashboard my-dashboard-app
cd my-dashboard-app
pnpm i

# Desenvolvimento
pnpm install
pnpm run dev
```

- [Live demo](https://nuxt-shadcn-dashboard.vercel.app)
- [Documentação Shadcn Vue](https://shadcn-vue.com/docs/introduction)

---

## 3. Sistema CRM

CRM completo com dados simulados (mock), arquitetura modular e DataTable obrigatório em todas as listagens.

### 3.1 Páginas

#### `/crm/dashboard`
- KPIs: total de leads, receita, taxa de conversão, ticket médio
- Gráficos de receita mensal (integração com Chart.js)
- Pipeline de vendas por estágio, top sources, top performers e timeline de atividades

#### `/crm/leads`
- DataTable com filtros (status, prioridade, fonte), busca e paginação
- Cards de estatísticas: total, hot leads, qualificados, valor total
- Modal de detalhes e ações CRUD com status badges coloridos

#### `/crm/pipeline`
- Interface Kanban com colunas por estágio
- Cards com prioridade visual (borda colorida) e estatísticas por coluna
- Modal de detalhes ao clicar em qualquer card

#### `/crm/companies`
- Tabela com formatação em Real brasileiro
- Estatísticas: total de empresas, contatos, leads e valor
- Ações CRUD básicas

#### `/crm/whatsapp`
- Sidebar com lista de conversas e status online
- Interface de chat estilo WhatsApp com status de mensagens (enviado/lido)
- Estatísticas: conversas totais, não lidas, online, mensagens do dia

### 3.2 Menu de Navegação

```
/crm/dashboard   → Dashboard
/crm/leads       → Leads
/crm/pipeline    → Sales Pipeline
/crm/companies   → Empresas
/crm/contacts    → Contatos
/crm/meetings    → Reuniões
/crm/whatsapp    → WhatsApp (NOVO)
/crm/reports     → Relatórios
```

### 3.3 Arquitetura

#### Tipos TypeScript — `types/crm.ts`

```ts
Lead · Contact · Company · Meeting
WhatsAppMessage · WhatsAppConversation
SalesStage · DashboardKPI · EvolutionAPI
```

#### Dados Mock — `data/crm-mock.ts`

| Entidade | Quantidade |
|---|---|
| Leads | 7 (diferentes status e prioridades) |
| Contatos | 5 (vinculados a empresas) |
| Empresas | 3 |
| Reuniões | 5 agendadas |
| Conversas WhatsApp | 3 |
| Mensagens | 8 de exemplo |

#### Componentes — `components/crm/shared/`

| Componente | Função |
|---|---|
| `DataTable.vue` | Componente principal genérico |
| `DataTableToolbar.vue` | Busca e filtros |
| `DataTablePagination.vue` | Paginação |
| `DataTableColumnHeader.vue` | Cabeçalhos ordenáveis |
| `DataTableRowActions.vue` | Ações das linhas (ver, editar, excluir) |
| `DataTableFacetedFilter.vue` | Filtros por facetas |
| `DataTableViewOptions.vue` | Visibilidade de colunas |

#### Colunas de Leads — `components/crm/leads/columns.ts`
- Definições de colunas com formatação de moeda e datas
- Filtros configurados por status, prioridade e fonte
- Callbacks para ações CRUD

### 3.4 KPIs

| Métrica | Valor |
|---|---|
| Total de leads | 7 |
| Novos no mês | 3 |
| Taxa de conversão | 28,6% |
| Receita total | R$ 480.000 |
| Receita do mês | R$ 85.000 |
| Ticket médio | R$ 68.571 |

### 3.5 Distribuição por Estágio

`New` · `Contacted` · `Qualified` · `Proposal` · `Negotiation` · `Won` · `Lost` — 1 lead cada

### 3.6 Estrutura de Pastas

```
components/crm/
├── shared/          # Componentes reutilizáveis
├── leads/           # Específicos de leads
└── ...

pages/crm/
├── dashboard.vue
├── leads.vue
├── pipeline.vue
├── companies.vue
└── whatsapp.vue

types/
└── crm.ts

data/
└── crm-mock.ts
```

---

## 4. Sistema de Autenticação

Autenticação via Supabase Auth com login por e-mail/senha, recuperação de senha e gerenciamento automático de sessão.

### 4.1 Variáveis de Ambiente

```env
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=   # apenas backend
```

### 4.2 Middlewares

| Middleware | Função |
|---|---|
| `auth` | Verifica autenticação; redireciona para `/login` se não autenticado |
| `role` | 
| `guest` | Impede autenticados de acessar páginas de visitante |

**Rotas públicas:** `/login` · `/register` · `/forgot-password` · `/403` · `/confirm`

### 4.3 Rotas de Autenticação

| Rota | Descrição |
|---|---|
| `/login` | Página de login principal |
| `/register` | Registro de novos usuários |
| `/forgot-password` | Recuperação de senha |
| `/403` | Acesso negado |
| `/401` | Não autorizado |

### 4.4 Composable `useAuth`

```ts
const {
  login,           // Login com email/senha
  logout,          // Logout do usuário
  isAuthenticated, // Estado de autenticação
  currentUser,     // Dados do usuário atual
  currentRole,     // Role do usuário atual
  checkSession,    // Verifica sessão atual
  loading,         // Estado de carregamento
  error,           // Erros de autenticação
  hasRole,         // Verifica se tem role específica
  hasAnyRole,      // Verifica se tem alguma das roles
  updateUserRole,  // Atualiza role do usuário
} = useAuth()
```

## 4.5 Mini tutorial: autenticar e criar novas páginas com permissão

O projeto controla acesso por **middlewares Nuxt**:
- `auth` (autenticação via Supabase Auth)
- `role` (bloqueia/desbloqueia com base em `to.meta.requiredRoles` e no JWT)
- `tenant` / `tenant-check` (contexto/validação de tenant para rotas que dependem de tenant selecionado)

### Passo 1: Autentique a página
```ts
definePageMeta({
  middleware: ['auth'],
})
```

Páginas públicas comuns: `/login`, `/register`, `/forgot-password`, `/403`, `/404` e `/confirm`.

### Passo 2: Crie a permissão por role (a “permissão que foi criada”)
```ts
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'], // ou ['admin', 'funcionario', 'cliente']
})
```

Como funciona o middleware `role`:
- ele decodifica o JWT e lê `app_metadata.tenant_roles`
- determina a role do *tenant atual* (ou o primeiro tenant do JWT)
- se a role não estiver em `requiredRoles`, redireciona para `/403`

### Passo 3: Página de domínio (ex.: CRM/Articles) com tenant
O padrão observado nas páginas CRM/Articles é:
```ts
definePageMeta({
  middleware: ['auth', 'tenant'],
})
```

E, quando a rota for admin-only:
```ts
definePageMeta({
  middleware: ['auth', 'role', 'tenant-check'],
  requiredRoles: ['admin'],
})
```

### Exemplo pronto: rota admin-only
```ts
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'],
  title: 'Admin - Something',
})
```

### Passo 4: Criar novos módulos

O sistema de módulos é controlado por `tenant_modules` e refletido no frontend pelo seletor de módulo.

#### 4.1 Banco (Supabase): habilitar o módulo para o tenant

- Edite/insira um registro em `public.tenant_modules`.
- O campo `module_name` deve ser exatamente o identificador que o frontend espera (ver `constants/modules.ts`).
- Garanta `is_active = true`.
- Existe uma constraint `UNIQUE(tenant_id, module_name)` para evitar duplicatas.

Exemplo (habilitar um módulo para um tenant por `tenant.slug`):
```sql
INSERT INTO public.tenant_modules (tenant_id, module_name, is_active, activated_at)
SELECT
  t.id,
  'seu_module_name',
  true,
  now()
FROM public.tenant t
WHERE t.slug = 'seu-tenant-slug'
ON CONFLICT (tenant_id, module_name) DO NOTHING;
```

#### 4.2 Frontend: registrar o módulo no seletor

Abra `constants/modules.ts` e adicione um item em `MODULE_META`:
```ts
export const MODULE_META: Record<string, ModuleMeta> = {
  // tenant_modules.module_name (DB) = key do objeto abaixo
  seu_module_name: {
    slug: 'um-slug-para-ui',
    title: 'Nome do Módulo no menu',
    icon: 'lucide:...',
    basePath: '/caminho-base',
    defaultPath: '/caminho-inicial-do-módulo',
  },
}
```

- `tenant_modules.module_name` deve bater com a **key** (`seu_module_name`).
- `defaultPath` define para onde o usuário vai quando seleciona o módulo (por ex. `/crm/dashboard`).

#### 4.3 Frontend: adicionar o menu do módulo

Abra `constants/menus.ts` e crie um grupo em `navMenu`:
- O grupo deve ter `title` **igual** ao `MODULE_META[seu_module_name].title`.
- Dentro de `children`, adicione os links (`link`) para as páginas do módulo.

Quando o módulo estiver selecionado, a sidebar mostra os itens do `children` em lista plana (sem submenus).

#### 4.4 Isolamento de dados por tenant

Todos os endpoints da API filtram dados pelo **tenant selecionado** (`tenant_id`), independentemente do role do usuário:

- **Admin / Funcionário:** veem apenas os dados do tenant ativo (recebido via query `tenant_id` ou extraído do JWT). Podem trocar de tenant pela UI para ver dados de outros tenants.
- **Cliente:** veem apenas os dados do próprio tenant. Tentativas de acessar dados de outro tenant retornam `403 Forbidden`.

O frontend sempre envia `tenant_id` nas chamadas de API via composable `useCurrentTenant`.

#### 4.5 Acesso ao módulo para `cliente`

Mesmo que o módulo seja mostrado no frontend, o backend valida o acesso.

- Para role `cliente`, o middleware `server/middleware/module-access.ts` bloqueia requests do prefixo `/api/crm` e `/api/articles` quando o tenant não possui o módulo ativo em `public.tenant_modules`.
- A validação é feita via função SQL `public.is_tenant_module_active(tenant_id, module_name)`.

### Banco: enum, tabelas e policies (para referência)

Conforme verificado via Supabase MCP:

**Enum `public.app_role`:** `admin`, `cliente`, `funcionario`.

**Tabelas relacionadas (permitem/limitam por tenant e role):**
- `tenant`
- `tenant_modules`
- `user_tenant_role`

**Exemplos de policies em `pg_policies`:**
- `tenant`: `All all tenant` (authenticated, `cmd=ALL`)
- `user_tenant_role`: leitura por usuário; leitura/escrita admin dentro do tenant
- `articles`: `All All` (authenticated, `cmd=ALL`)
- `articles_category`: `public` pode `SELECT` apenas categorias `published`
- `crm_products`: policy `tenant_isolation` comparando `tenant_id` com `current_setting('app.tenant_id')`

---

## 5. Sistema de Usuários

### 5.1 Níveis de Acesso

| Role | Acesso |
|---|---|
| `admin` | Total ao sistema, dados filtrados pelo tenant selecionado |
| `funcionario` | Funcionalidades operacionais, dados filtrados pelo tenant selecionado |
| `cliente` | Funcionalidades básicas, restrito ao próprio tenant |

### 5.2 Estrutura do Usuário

```ts
interface User {
  id: string
  email: string
  role: 'admin' | 'funcionario' | 'cliente'
  user_metadata?: { name: string }
  created_at: string
  updated_at: string
}
```

### 5.3 API de Usuários

> Todos os endpoints requerem role `admin`.

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/admin/users` | Lista todos os usuários |
| `POST` | `/api/admin/users` | Cria novo usuário |
| `PUT` | `/api/admin/users/[id]` | Atualiza email/senha |
| `DELETE` | `/api/admin/users/[id]` | Remove usuário |

### 5.4 Tabelas do Banco

**`auth.users`** — gerenciada automaticamente pelo Supabase Auth.

**`user_roles`** — armazena roles dos usuários:

```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id),
  role    TEXT NOT NULL DEFAULT 'cliente',
  PRIMARY KEY (user_id)
);
```

### 5.5 Componentes de Usuário

- **`UserForm.vue`** — formulário com validação de força de senha e geração automática
- **`CreateUserDialog.vue`** — modal de criação
- **`EditUserDialog.vue`** — modal de edição

---

## 6. Sistema Multi-Tenant

Suporte completo a múltiplos tenants com isolamento de dados via Row Level Security (RLS).

### 6.1 Estrutura

- Cada usuário está associado a um tenant específico
- Todas as tabelas principais possuem coluna `tenant_id`
- Políticas RLS aplicam restrições automaticamente

### 6.2 Políticas de Segurança (RLS)

| Role | Permissão |
|---|---|
| `admin` / `funcionario` | ALL nos dados do tenant selecionado |
| `cliente` | ALL apenas nos próprios dados dentro do tenant |
| Público | SELECT apenas em dados marcados como públicos |

### 6.3 Criar Novo Tenant

```sql
SELECT * FROM public.create_tenant_with_admin(
  'Nome do Tenant',
  'slug-do-tenant',
  'email@exemplo.com',
  'senha-segura'
);
```

### 6.4 Adicionar Multi-Tenant a Novas Tabelas

```sql
SELECT public.add_tenant_id_to_table('nome_da_tabela');
```

Em páginas que exigem tenant:

```ts
definePageMeta({
  middleware: ['auth', 'tenant'],
  requiresTenant: true,
})
```

### 6.5 Migrações

```bash
npx supabase login
npx supabase db push
npx supabase migration list
```

---

## 7. Próximos Passos

### Integrações Pendentes
- [ ] **Evolution API** — integração real com WhatsApp
- [ ] **Charts** — gráficos interativos (Chart.js / D3.js)
- [ ] **Supabase** — substituir mock data por banco real
- [ ] **Drag & Drop** — movimentação de leads no pipeline

### Funcionalidades Adicionais
- [ ] Página completa de Contatos
- [ ] Sistema de agendamento de Reuniões
- [ ] Relatórios e dashboards avançados
- [ ] Sistema de notificações e alertas
- [ ] Workflows automatizados

### Melhorias de UX
- [ ] CRUDs completos com formulários e validações
- [ ] Loading states e feedback de erros
- [ ] Offline support / PWA

---

## 8. Padrões de Código

- ✅ **Frontend em inglês** — variáveis e textos de interface
- ✅ **Organização modular** — estrutura por domínio de negócio
- ✅ **DataTable obrigatório** — todas as listagens usam o componente genérico
- ✅ **Componentes reutilizáveis** — princípio DRY
- ✅ **TypeScript strict** — tipagem completa
- ✅ **SSR** — server-side rendering habilitado
- ✅ **Cache** — otimização de performance

---

## Licença

MIT