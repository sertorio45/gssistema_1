# Workspace de agências — plataforma, organização e tenant

Documentação interna do modelo multi-tenant evoluído (fases 1–7).

## Conceitos

| Conceito | O que é | Exemplos |
|---|---|---|
| **Plataforma** | Operador do SaaS (GS Studio / Blimber) | Superadmin, suporte |
| **Organização** | Conta comercial (`organizations.type`) | `platform`, `agency`, `direct` |
| **Tenant** | Empresa operacional (dados isolados) | Cliente da agência, empresa direta |
| **Membership** | Vínculo usuário ↔ organização + cargo | Owner, social media, aprovador |
| **Capability** | Permissão atômica | `marketing.social.publish` |

### Agência versus cliente direto

- **Agência (`agency`)**: possui carteira de tenants `managed` + opcionalmente um tenant `owner` próprio.
- **Cliente direto (`direct`)**: uma organização ligada a um único tenant (a própria empresa).
- **Cliente atendido**: tenant `managed` pela agência; usuários do cliente **não** veem menus/equipe/custos da agência.

## Sistema de cargos

Cargos vivem em `organization_roles` (templates de sistema + cópias por organização).

**Agência (padrão):** owner, agency_admin, marketing_manager, social_media, designer, copywriter, internal_approver, analyst.

**Cliente direto (padrão):** owner, approver, editor, viewer.

A matriz canônica usada nos testes está em `constants/organization-role-matrix.ts` e deve permanecer alinhada aos seeds SQL.

Capabilities efetivas = cargo + grants − overrides `allowed = false` + aliases (`constants/workspace.ts`).

### Atribuição por cliente

Membros com `access_all_tenants = false` só acessam tenants listados em `organization_member_tenants`.

## Fluxo de aprovação

1. Produção cria/edita post (`marketing.social.create` / `update`).
2. Envio (`approval.submit`) inicia workflow (`simple_client`, `agency_internal_client`, `no_approval`).
3. Decisões em `approval_requests` / `approval_decisions` (imutáveis).
4. Comentários: `visibility = internal | shared` — internos **nunca** para o cliente.
5. Após aprovação: agendar (`schedule`) / publicar (`publish`).

Domínio: `server/utils/social-approval-domain.ts`.

## Exclusão local e remota

| Modo | Capability | Comportamento |
|---|---|---|
| `cancel_draft` | `delete.local` | Soft-delete sem Meta |
| `system_and_remote` | `delete.local` + `delete.remote` | Tenta Meta por variante → tombstone |
| `system_only` | `delete.local` | Tombstone; conteúdo permanece nas redes (motivo + confirmação) |
| `retry_remote` | `delete.retry` (+ remote) | Só variantes falhas |
| Force local | `delete.force` | Finaliza local após falha remota |

- Soft-delete: `deleted_at`, `deletion_*`, `remote_deletion_status`.
- Tentativas: `deletion_jobs` (idempotency key).
- Adapters Meta: `server/utils/social-publishers/meta-delete.ts`.
- Hard delete futuro: política documentada (365d+), **não** automática.

### Estados de publicação

`not_scheduled` → `scheduled` → `publishing` → `published` / `partially_published` / `failed` → `deletion_pending` → `deleted`.

### Retry e limitações por provider

- Retry só reprocessa jobs/variantes não concluídos.
- Stories IG/FB: frequentemente `manual_action_required`.
- LinkedIn: exclusão remota ainda não suportada.
- IDs: nunca apagar usando só `creation/container` quando existir media/post ID publicado.
- Tokens **nunca** em auditoria (scrub nos logs).

## Resolver central

Toda API de marketing social / organizations deve usar:

- `requireWorkspaceContext` / `requireSocialContext`
- Capabilities explícitas (não `role === 'cliente'`)
- Body Zod para ações sensíveis (não `force=true` na query)

## Migrations e rollback

Migrations relevantes (ordem remota):

- `workspace_context_*`, `organization_roles_*`, `agency_ops_*`
- `social_approval_*`, `social_approval_ux`
- `social_post_deletion_flow_a/b/c`

**Rollback:** não dropar colunas de tombstone em produção sem backup. Preferir feature-flag de UI + reverter deploys de API. Seeds de roles são idempotentes (`ON CONFLICT`).

### Validação pós-backfill

```bash
psql "$DATABASE_URL" -f supabase/reports/agency_model_validation.sql
```

### Testes RLS

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/workspace_rls.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/agency_security_rls.sql
```

### Testes unitários

```bash
pnpm test
```

Inclui `tests/agency-access-matrix.test.ts` (matriz completa de perfis × ações).
