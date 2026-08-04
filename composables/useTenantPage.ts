import { onMounted, ref, watch } from 'vue'

import { isStaffRole, isTenantScopedRole } from '~/constants/roles'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'
import { useWorkspace } from '~/composables/useWorkspace'

/**
 * Bootstrap de tenant para páginas de módulo (CRM, Articles, WhatsApp, etc.).
 * Staff: restaura/seleciona tenant. Scoped (cliente/atendente): fixa via JWT.
 * Reuses an already-resolved workspace context to avoid a second round-trip.
 */
export function useTenantPage() {
  const { currentRole, updateUserRole } = useAuth()
  const workspace = useWorkspace()
  const {
    tenantId,
    listTenants,
    setCurrentTenantById,
    setTenantFromJWT,
    bootstrapTenantContext,
    tenants,
  } = useTenant()

  const isBootstrapping = ref(true)
  const isReady = ref(false)

  async function ensureStaffTenant() {
    if (!isStaffRole(currentRole.value))
      return

    if (!tenantId.value) {
      if (workspace.tenants.value.length > 0) {
        await setCurrentTenantById(workspace.tenants.value[0].id)
        return
      }
      await listTenants()
      if (tenants.value.length > 0)
        await setCurrentTenantById(tenants.value[0].id)
    }
  }

  async function ensureScopedTenant() {
    if (!isTenantScopedRole(currentRole.value))
      return

    if (!tenantId.value)
      await setTenantFromJWT()
  }

  async function bootstrap() {
    isBootstrapping.value = true
    try {
      // Fast path: sidebar/layout already hydrated the workspace.
      if (workspace.context.value?.tenant?.id) {
        isReady.value = true
        return
      }

      await Promise.all([
        updateUserRole(),
        bootstrapTenantContext(),
      ])
      await ensureStaffTenant()
      await ensureScopedTenant()
      isReady.value = Boolean(tenantId.value)
    }
    finally {
      isBootstrapping.value = false
      isReady.value = Boolean(tenantId.value)
    }
  }

  function whenTenantReady(callback: () => void | Promise<void>) {
    watch(
      [tenantId, isReady],
      async ([id, ready]) => {
        if (!ready || !id)
          return
        await callback()
      },
      { immediate: true },
    )
  }

  onMounted(bootstrap)

  watch(currentRole, async (role) => {
    if (!role)
      return

    if (isStaffRole(role))
      await ensureStaffTenant()
    else if (isTenantScopedRole(role))
      await ensureScopedTenant()

    isReady.value = Boolean(tenantId.value)
  })

  return {
    tenantId,
    currentRole,
    isBootstrapping,
    isReady,
    bootstrap,
    whenTenantReady,
    listTenants,
    setCurrentTenantById,
    setTenantFromJWT,
    tenants,
  }
}
