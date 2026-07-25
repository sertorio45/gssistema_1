import { useSupabaseClient } from '#imports'

import { computed, onMounted, ref, watch } from 'vue'

import { isStaffRole, isTenantScopedRole } from '~/constants/roles'
import { useTenantStore } from '~/stores/tenant'
import {
  decodeJwtPayload,
  isGlobalStaffFromJwt,
} from '~/utils/resolve-user-role'

const tenantId = ref<string | null>(null)
const tenants = ref<any[]>([])

function isUuid(value: string | null | undefined) {
  if (!value)
    return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function setTenantId(newTenantId: string | null) {
  const normalizedTenantId = isUuid(newTenantId) ? newTenantId : null
  tenantId.value = normalizedTenantId
  const tenantStore = useTenantStore()
  tenantStore.setTenant(normalizedTenantId ?? '')
  if (import.meta.client) {
    if (normalizedTenantId)
      localStorage.setItem('current-tenant-id', normalizedTenantId)
    else
      localStorage.removeItem('current-tenant-id')
  }
}

async function guardedSetTenantId(
  _supabase: any,
  newTenantId: string | null,
) {
  if (!newTenantId || !isUuid(newTenantId)) {
    setTenantId(null)
    return
  }

  const response = await $fetch<{ tenants: Array<{ id: string }> }>('/api/tenants/accessible')
  const allowed = new Set(response.tenants.map(tenant => tenant.id))
  if (!allowed.has(newTenantId))
    return

  setTenantId(newTenantId)
}

function restoreLastTenant() {
  if (import.meta.client) {
    const lastTenantId = localStorage.getItem('current-tenant-id')
    if (lastTenantId && isUuid(lastTenantId))
      setTenantId(lastTenantId)
    else if (lastTenantId)
      localStorage.removeItem('current-tenant-id')
  }
}

if (import.meta.client) {
  window.addEventListener('tenant-changed', async (event: Event) => {
    const customEvent = event as CustomEvent
    const nextId = customEvent.detail?.tenantId
    if (!nextId || !isUuid(nextId))
      return

    const supabase = useSupabaseClient()
    await guardedSetTenantId(supabase, nextId)
  })
}

watch(tenantId, (newVal) => {
  if (import.meta.client) {
    if (newVal)
      localStorage.setItem('current-tenant-id', newVal)
    else
      localStorage.removeItem('current-tenant-id')
  }
  useTenantStore().setTenant(newVal ?? '')
})

async function listTenants(supabase: any) {
  void supabase
  const response = await $fetch<{ tenants: any[] }>('/api/tenants/accessible')
  tenants.value = response.tenants || []
  return tenants.value
}

const currentTenant = computed(() => {
  return tenants.value.find(t => t.id === tenantId.value) || null
})

export function useTenant() {
  const tenantStore = useTenantStore()
  const supabase = useSupabaseClient()
  watch(
    () => tenantStore.tenantId,
    async (val) => {
      if (val !== tenantId.value)
        await guardedSetTenantId(supabase, val || null)
    },
    { immediate: true },
  )

  async function setCurrentTenantById(id: string) {
    await guardedSetTenantId(supabase, id)
  }

  async function setCurrentTenantBySlug(slug: string) {
    const { data, error } = await supabase.from('tenant').select('*').eq('slug', slug).single()
    if (error)
      throw error
    if (data?.id)
      await guardedSetTenantId(supabase, data.id)
    else
      throw new Error('Tenant não encontrado')
  }

  function setTenant(newTenantId: string) {
    void guardedSetTenantId(supabase, newTenantId)
  }

  async function setTenantFromJWT() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token)
      return

    const payload = decodeJwtPayload(session.access_token)
    if (!payload)
      return

    if (isGlobalStaffFromJwt(payload))
      return

    const tenantRoles = payload.app_metadata?.tenant_roles || {}
    const keys = Object.keys(tenantRoles)
    if (!keys.length)
      return

    const firstKey = keys[0]
    if (isUuid(firstKey)) {
      await guardedSetTenantId(supabase, firstKey)
      return
    }

    await setCurrentTenantBySlug(firstKey)
  }

  async function bootstrapTenantContext() {
    const available = await listTenants(supabase)
    restoreLastTenant()
    if (tenantId.value && available.some(tenant => tenant.id === tenantId.value))
      return
    if (available[0]?.id)
      setTenantId(available[0].id)
    else
      await setTenantFromJWT()
  }

  onMounted(async () => {
    await bootstrapTenantContext()
  })

  return {
    tenantId,
    setTenant,
    clearTenant: tenantStore.clearTenant,
    listTenants: () => listTenants(supabase),
    restoreLastTenant,
    setCurrentTenantById,
    setCurrentTenantBySlug,
    currentTenant,
    setTenantFromJWT,
    bootstrapTenantContext,
    setTenantId: (id: string | null) => guardedSetTenantId(supabase, id),
    tenants,
    isStaffRole,
    isTenantScopedRole,
  }
}
