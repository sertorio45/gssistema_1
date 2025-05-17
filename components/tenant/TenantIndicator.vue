<script setup lang="ts">
import { Icon } from '#components'
import { computed } from 'vue'
import { useTenant } from '~/composables/useTenant'

const { currentTenant, clearCurrentTenant } = useTenant()

// Verificar se temos um tenant ativo
const hasTenant = computed(() => !!currentTenant.value)

// Função para trocar de tenant
function changeTenant() {
  navigateTo('/select-tenant')
}

// Função para sair do tenant
function exitTenant() {
  clearCurrentTenant()
  navigateTo('/select-tenant')
}
</script>

<template>
  <div v-if="hasTenant" class="flex items-center gap-2">
    <div class="flex items-center bg-muted px-3 py-1.5 rounded-md text-sm font-medium">
      <Icon name="lucide:building" class="mr-2 h-4 w-4 text-muted-foreground" />
      <span class="max-w-[120px] truncate">{{ currentTenant?.name }}</span>
    </div>
    
    <button 
      class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
      title="Mudar tenant"
      @click="changeTenant"
    >
      <Icon name="lucide:shuffle" class="h-4 w-4" />
      <span class="sr-only">Mudar tenant</span>
    </button>
    
    <button 
      class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
      title="Sair do tenant"
      @click="exitTenant"
    >
      <Icon name="lucide:log-out" class="h-4 w-4" />
      <span class="sr-only">Sair do tenant</span>
    </button>
  </div>
  
  <button 
    v-else
    class="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
    @click="changeTenant"
  >
    <Icon name="lucide:building" class="h-4 w-4" />
    <span>Selecionar Tenant</span>
  </button>
</template> 