import { storeToRefs } from 'pinia'
import { useTenantStore } from '~/stores/tenant'

export function useCurrentTenant() {
  const tenantStore = useTenantStore()
  const { tenantId, role } = storeToRefs(tenantStore)
  return { tenantId, role, setTenant: tenantStore.setTenant, setRole: tenantStore.setRole }
}
