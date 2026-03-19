# Guia Prático: Como Criar Novas Páginas Multi-Tenant no Projeto

## 1. Estrutura e Organização

- Crie a nova página na pasta de domínio correto (ex: `pages/crm/config/minha-nova-pagina.vue`).
- Siga o padrão de organização de diretórios do Nuxt 3.
- Crie componentes reutilizáveis em `components/ui/` ou no domínio do módulo.

## 2. Imports Essenciais

- Importe sempre:

  ```ts
  import { computed, onMounted, ref, watch } from 'vue'

  import { useAuth } from '~/composables/useAuth'
  import { useTenant } from '~/composables/useTenant'
  import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'
  ```

- Importe os componentes de UI padronizados (DataTable, Card, Dialog, etc).

## 3. Setup do Tenant

- Utilize o composable `useTenant` para obter e manipular o tenantId:
  ```ts
  const { tenantId, setTenantFromJWT, tenants, setCurrentTenantById, listTenants } = useTenant()
  const { currentRole } = useAuth()
  ```
- No `onMounted`, garanta que:
  - Para admin/funcionário: carregue a lista de tenants e selecione um se necessário.
  - Para cliente: chame `setTenantFromJWT()` para garantir o tenantId correto.
- Exemplo:
  ```ts
  onMounted(async () => {
    if (currentRole.value === 'admin' || currentRole.value === 'funcionario') {
      await listTenants()
      if (tenants.value.length > 0 && !tenantId.value) {
        setCurrentTenantById(tenants.value[0].id)
      }
    }
    if (currentRole.value === 'cliente') {
      await setTenantFromJWT()
      // Chame refresh dos dados aqui se necessário
    }
  })
  ```

## 4. Fetch e Filtro dos Dados

- Use `useFetch` ou `useAsyncData` para buscar os dados.
- Sempre aplique o filtro multi-tenant/role:
  ```ts
  const { data: itemsRaw, pending, refresh } = useFetch<any[]>('/api/sua-rota')
  const { filteredData: items } = useTenantRoleFilter<any>(itemsRaw as any, 'tenant_id')
  ```
- Use o array `items` no seu DataTable ou listagem.

## 5. UI e DataTable

- Utilize o DataTable padronizado do projeto.
- Exemplo:
  ```vue
  <DataTable :data="items" :columns="columns" ... />
  ```
- Importe e use componentes de Card, Dialog, Skeleton, etc, conforme padrão visual do sistema.

## 6. Sincronização e Watchers

- Adicione watchers para:
  - Atualizar os dados ao trocar de tenant.
  - Atualizar ao trocar de role.
- Exemplo:
  ```ts
  watch(tenantId, () => {
    refresh()
  })
  watch(currentRole, async (role) => {
    // Repita a lógica do onMounted para garantir contexto correto
  })
  ```

## 7. Permissões e Policies

- Siga as policies do Supabase já documentadas (ver `docs/tenant.md`).
- Garanta que o frontend só permita ações permitidas pelo papel do usuário.

## 8. Cache

- O composable de tenant já faz cache dos tenants.
- Para dados de listagem, use o cache do Nuxt (useAsyncData/useFetch) e evite requisições desnecessárias.

## 9. Menu

- Adicione a nova página ao menu centralizado em `constants/menus.ts` se necessário.

## 10. Checklist Final

- [ ] Página criada na pasta correta
- [ ] Imports e setup do tenant feitos
- [ ] Fetch e filtro multi-tenant aplicados
- [ ] UI padronizada (DataTable, Card, etc)
- [ ] Watchers para tenant/role
- [ ] Policies e permissões respeitadas
- [ ] Cache e performance considerados
- [ ] Menu atualizado (se aplicável)

---

## Referências

- Veja `docs/tenant.md` para detalhes de multi-tenancy, policies, exemplos de filtro e uso de composables.
- Use sempre o composable `useTenantRoleFilter` para garantir isolamento de dados.
- Para dúvidas ou exemplos, consulte páginas já existentes como `pages/articles/index.vue` ou `pages/crm/config/sources/index.vue`.
