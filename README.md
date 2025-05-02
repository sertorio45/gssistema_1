![nuxt-shadcn-dashboard-social-card](https://nuxt-shadcn-dashboard.vercel.app/social-card.png)

# Nuxt Shadcn UnoCSS - Dashboard

[![built with nuxt][nuxt-src]][nuxt-href]

- [Live demo](https://nuxt-shadcn-dashboard.vercel.app)
- [Component Documentation](https://shadcn-vue.com/docs/introduction)

## Quick Start

```bash [Terminal]
npx degit dianprata/nuxt-shadcn-dashboard my-dashboard-app
cd my-dashboard-app
pnpm i # If you don't have pnpm installed, run: npm install -g pnpm
```

## Contributing

1. Clone this repository.
2. Install dependencies `pnpm install`.
3. Use `pnpm run dev` to start dev server.

## Credits

- [Nuxt.js](https://nuxtjs.org/)
- [Shadcn Vue](https://shadcn-vue.com/)
- [UnoCSS](https://unocss.com/)

## License

MIT

[nuxt-src]: https://img.shields.io/badge/Built%20With%20Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com/

## Documentation for gs studio

### Sistema de Autenticação

#### Configuração do Supabase Auth
O sistema utiliza Supabase para autenticação, com as seguintes configurações:
- Variáveis de ambiente necessárias:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `SUPABASE_SERVICE_KEY` (apenas backend)

#### Funcionalidades de Autenticação
- Login com email e senha
- Registro de novos usuários
- Recuperação de senha
- Gerenciamento de sessão automático
- Proteção de rotas

#### Middleware de Autorização
O sistema possui três middlewares principais:
1. `auth`: Verifica autenticação básica
   - Redireciona para /login se não autenticado
   - Permite acesso a rotas públicas sem autenticação
   - Rotas públicas: ['/login', '/register', '/forgot-password', '/403', '/confirm']

2. `role`: Verifica permissões baseadas em roles
   - Verifica JWT token para roles
   - Redireciona para /403 se não tiver permissão
   - Permite definir roles necessárias por rota

3. `guest`: Middleware para páginas de visitantes
   - Impede usuários autenticados de acessar páginas como login/registro
   - Redireciona para home se já autenticado

#### Rotas de Autenticação
- `/login`: Página de login principal
- `/register`: Registro de novos usuários
- `/forgot-password`: Recuperação de senha
- `/403`: Página de acesso negado
- `/401`: Página de não autorizado

#### Composable useAuth
Oferece as seguintes funcionalidades:
```ts
const {
  login,                // Login com email/senha
  logout,               // Logout do usuário
  isAuthenticated,      // Estado de autenticação
  currentUser,          // Dados do usuário atual
  currentRole,          // Role do usuário atual
  checkSession,         // Verifica sessão atual
  loading,              // Estado de carregamento
  error,                // Erros de autenticação
  hasRole,             // Verifica se tem role específica
  hasAnyRole,          // Verifica se tem alguma das roles
  updateUserRole        // Atualiza role do usuário
} = useAuth()
```

### Sistema de Usuários

#### Níveis de Acesso
O sistema possui três níveis de acesso:
- `admin`: Acesso total ao sistema
- `funcionario`: Acesso às funcionalidades operacionais
- `cliente`: Acesso limitado às funcionalidades básicas

#### Estrutura de Dados do Usuário
```ts
interface User {
  id: string
  email: string
  role: 'admin' | 'funcionario' | 'cliente'
  user_metadata?: {
    name: string
  }
  created_at: string
  updated_at: string
}
```

#### API de Usuários
Endpoints administrativos (requer role 'admin'):
- `GET /api/admin/users`: Lista todos os usuários
- `POST /api/admin/users`: Cria novo usuário com:
  - email
  - password
  - user_metadata (name)
  - email_confirm
- `PUT /api/admin/users/[id]`: Atualiza usuário (email/senha)
- `DELETE /api/admin/users/[id]`: Remove usuário

#### Tabelas do Banco
1. `auth.users`: Gerenciada pelo Supabase Auth
   - Armazena dados básicos do usuário
   - Gerenciada automaticamente pelo Supabase

2. `user_roles`: Armazena as roles dos usuários
   ```sql
   create table user_roles (
     user_id uuid references auth.users(id),
     role text not null default 'cliente',
     primary key (user_id)
   )
   ```

#### Componentes de Usuário
- `UserForm.vue`: Formulário de criação/edição de usuário
  - Campos: nome, email, senha
  - Validação de força de senha
  - Geração de senha segura

- `CreateUserDialog.vue`: Modal para criar usuário
- `EditUserDialog.vue`: Modal para editar usuário
