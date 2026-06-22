// Composable genérico para filtrar qualquer array de dados por tenant e role
// Use este arquivo em qualquer página de listagem multi-tenant (ex: articles, crm, categories, etc)
import type { Ref } from 'vue'
import { computed } from 'vue'

import { isStaffRole, isTenantScopedRole } from '~/constants/roles'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'

/**
 * useTenantRoleFilter
 * Filtra qualquer array de dados por tenant e role.
 * @param rawData Ref com os dados brutos (array de objetos)
 * @param tenantKey Nome do campo que representa o tenant_id no objeto (ex: 'tenant_id')
 * @returns filteredData (computed) - array filtrado conforme o contexto do usuário
 *
 * Exemplo de uso em uma página:
 *
 * import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'
 * const { data: itemsRaw } = useFetch<any[]>('/api/rota')
 * const { filteredData: items } = useTenantRoleFilter<any>(itemsRaw as any, 'tenant_id')
 * // Use "items" no seu template
 */
export function useTenantRoleFilter<T extends Record<string, any>>(
  rawData: Ref<T[] | null>,
  tenantKey: string = 'tenant_id',
) {
  // Busca o papel do usuário e o tenantId atual
  const { currentRole } = useAuth()
  const { tenantId } = useTenant()

  // Computed que retorna o array filtrado conforme o contexto
  const filteredData = computed(() => {
    if (!rawData.value) {
      return []
    }

    if (Array.isArray(rawData.value)) {
      // Administrador / Atendente: só vê dados do próprio tenant
      if (isTenantScopedRole(currentRole.value) && tenantId.value) {
        return rawData.value.filter((item: T) => item[tenantKey] === tenantId.value)
      }
      // Staff: dados do tenant selecionado
      if (isStaffRole(currentRole.value) && tenantId.value) {
        return rawData.value.filter((item: T) => item[tenantKey] === tenantId.value)
      }
      // Se não houver tenant selecionado, retorna vazio
      return []
    }
    // Se vier erro da API (status/message), retorna array vazio
    if (typeof rawData.value === 'object' && 'status' in rawData.value) {
      return []
    }
    return []
  })

  // Retorne sempre filteredData para usar no template
  return { filteredData }
}
