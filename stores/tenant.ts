import { defineStore } from 'pinia'

/**
 * Holds the workspace the user *asked* for. It is sent to the API as a hint
 * (`X-Tenant-Id` / `X-Organization-Id`) and revalidated on every request.
 */
export const useTenantStore = defineStore('tenant', {
  state: () => ({
    tenantId: null as string | null,
    organizationId: null as string | null,
    role: null as string | null,
  }),
  actions: {
    setTenant(tenantId: string) {
      this.tenantId = tenantId || null
    },
    setOrganization(organizationId: string | null) {
      this.organizationId = organizationId || null
    },
    setRole(role: string | null) {
      this.role = role
    },
    clearTenant() {
      this.tenantId = null
      this.organizationId = null
      this.role = null
    },
  },
})
