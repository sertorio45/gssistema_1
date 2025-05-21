import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTenantStore = defineStore('tenant', () => {
  const tenantId = ref<string | null>(null)
  const role = ref<string | null>(null)

  function setTenant(id: string) {
    tenantId.value = id
  }

  function setRole(newRole: string) {
    role.value = newRole
  }

  return { tenantId, setTenant, role, setRole }
}) 