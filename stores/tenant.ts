import { defineStore } from 'pinia'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    tenantId: null as string | null,
  }),
  actions: {
    setTenant(tenantId: string) {
      this.tenantId = tenantId
    },
    clearTenant() {
      this.tenantId = null
    },
  },
}) 