<script setup lang="ts">
import { Icon } from '#components'
import { useTenant } from '~/composables/useTenant'
import { ref, onMounted, computed } from 'vue'
import type { Tenant } from '~/composables/useTenant'
import { useToast } from '@/components/ui/toast'

const { toast } = useToast()
const { listTenants, setCurrentTenantBySlug, currentTenant } = useTenant()

const tenants = ref<Tenant[]>([])
const isLoading = ref(true)
const searchQuery = ref('')

// Carregar lista de tenants
async function loadTenants() {
  isLoading.value = true
  try {
    tenants.value = await listTenants()
  }
  catch (error: any) {
    console.error('Erro ao carregar tenants:', error)
    toast({
      title: 'Erro',
      description: 'Não foi possível carregar a lista de tenants.',
      variant: 'destructive',
    })
  }
  finally {
    isLoading.value = false
  }
}

// Selecionar um tenant
async function selectTenant(tenant: Tenant) {
  try {
    await setCurrentTenantBySlug(tenant.slug)
    toast({
      title: 'Tenant selecionado',
      description: `Você está agora no tenant: ${tenant.name}`,
    })
    
    // Redirecionar para a home ou dashboard
    navigateTo('/')
  }
  catch (error: any) {
    console.error('Erro ao selecionar tenant:', error)
    toast({
      title: 'Erro',
      description: 'Não foi possível selecionar o tenant.',
      variant: 'destructive',
    })
  }
}

// Filtrar tenants com base na busca
const filteredTenants = computed(() => {
  if (!searchQuery.value) {
    return tenants.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return tenants.value.filter(tenant => 
    tenant.name.toLowerCase().includes(query) || 
    tenant.slug.toLowerCase().includes(query)
  )
})

// Carregar tenants quando o componente é montado
onMounted(() => {
  loadTenants()
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold mb-2">
        Selecione um Tenant
      </h1>
      <p class="text-muted-foreground">
        Escolha o tenant que deseja acessar
      </p>
    </div>
    
    <!-- Barra de busca -->
    <div class="relative mb-6">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon name="lucide:search" class="h-5 w-5 text-muted-foreground" />
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por nome ou slug..."
        class="pl-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
    
    <!-- Estado de carregamento -->
    <div v-if="isLoading" class="flex justify-center mt-8">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Lista de tenants -->
    <div v-else-if="filteredTenants.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div 
        v-for="tenant in filteredTenants" 
        :key="tenant.id"
        class="border rounded-lg p-4 hover:border-primary cursor-pointer transition-all"
        :class="{ 'bg-muted': currentTenant?.id === tenant.id }"
        @click="selectTenant(tenant)"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-medium">{{ tenant.name }}</h3>
          <span v-if="!tenant.is_active" class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
            Inativo
          </span>
          <span v-else class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Ativo
          </span>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ tenant.slug }}
        </p>
        <div v-if="currentTenant?.id === tenant.id" class="mt-2 flex items-center text-primary text-sm">
          <Icon name="lucide:check-circle" class="mr-1 h-4 w-4" />
          Selecionado atualmente
        </div>
      </div>
    </div>
    
    <!-- Mensagem de nenhum tenant encontrado -->
    <div v-else class="text-center mt-8 p-8 border rounded-lg">
      <Icon name="lucide:x-circle" class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 class="text-lg font-medium">Nenhum tenant encontrado</h3>
      <p class="text-muted-foreground mt-1">
        Não há tenants disponíveis ou que correspondam à sua busca.
      </p>
    </div>
  </div>
</template> 