<script setup lang="ts">
import { Icon } from '#components'
import { computed, onMounted, ref } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'

const { toast } = useToast()
const { listTenants, setCurrentTenantById, currentTenant } = useTenant()
const { currentRole } = useAuth()

const tenants = ref<any[]>([])
const isLoading = ref(true)
const isOpen = ref(false)
const searchQuery = ref('')

// Computed filtered tenants based on search query
const filteredTenants = computed(() => {
  if (!searchQuery.value.trim()) {
    return tenants.value
  }
  const query = searchQuery.value.toLowerCase()
  return tenants.value.filter(tenant =>
    tenant.name.toLowerCase().includes(query)
    || tenant.slug.toLowerCase().includes(query),
  )
})

// Load tenants
async function loadTenants() {
  isLoading.value = true
  try {
    tenants.value = await listTenants()
    
    // Para cliente, filtra só o tenant vinculado
    if (currentRole.value === 'cliente' && currentTenant.value) {
      tenants.value = tenants.value.filter(t => t.id === currentTenant.value.id)
    }
    
    // Se não houver tenant selecionado, selecionar o primeiro da lista
    if (!currentTenant.value && tenants.value.length > 0) {
      await setCurrentTenantById(tenants.value[0].id)
    }
  }
  catch (error: any) {
    console.error('Error loading tenants:', error)
    toast({
      title: 'Error',
      description: 'Could not load the list of tenants.',
      variant: 'destructive',
    })
  }
  finally {
    isLoading.value = false
  }
}

// Select a tenant
async function selectTenant(tenant: any) {
  try {
    // Manter o tenant selecionado independente da rota
    await setCurrentTenantById(tenant.id)
    
    toast({
      title: 'Tenant Selecionado',
      description: `Você está agora no tenant: ${tenant.name}`,
    })
    
    // Fechar dropdown
    isOpen.value = false
    
    // Emitir evento global para atualizar o front
    window.dispatchEvent(new CustomEvent('tenant-changed', { 
      detail: { tenantId: tenant.id },
    }))
  }
  catch (error: any) {
    console.error('Error selecting tenant:', error)
    toast({
      title: 'Erro',
      description: 'Não foi possível selecionar o tenant.',
      variant: 'destructive',
    })
  }
}

// Adicionar listener global para manter o tenant selecionado
onMounted(async () => {
  await loadTenants()
  
  // Adicionar listener para manter o tenant selecionado
  const handleTenantChanged = (event: Event) => {
    const customEvent = event as CustomEvent
    if (customEvent.detail?.tenantId) {
      // Lógica adicional se necessário
    }
  }
  
  window.addEventListener('tenant-changed', handleTenantChanged)
  
  // Remover listener quando o componente for desmontado
  return () => {
    window.removeEventListener('tenant-changed', handleTenantChanged)
  }
})
</script>

<template>
  <div v-if="currentRole !== 'cliente'">
    <DropdownMenu v-model:open="isOpen">
      <DropdownMenuTrigger class="w-full flex items-center rounded-md px-3 py-2 outline-none space-x-2 hover:bg-muted/50 focus:outline-none focus:ring-0">
        <div class="w-full flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span class="text-xs text-white font-medium">{{ currentTenant?.name?.charAt(0) || 'T' }}</span>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-sm font-medium">{{ currentTenant?.name || 'Select Tenant' }}</span>
            </div>
          </div>
          <Icon name="lucide:chevron-down" class="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-[280px]">
        <!-- Search -->
        <div class="relative px-3 py-1.5">
          <div class="relative">
            <Icon name="lucide:search" class="absolute left-2 top-1/2 h-3.5 w-3.5 transform text-muted-foreground -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search tenant..."
              class="h-7 w-full border border-input rounded-md bg-background py-1 pl-7 pr-2 text-xs ring-offset-background disabled:cursor-not-allowed placeholder:text-muted-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-ring"
            >
          </div>
        </div>
        <div class="py-1.5">
          <!-- Skeleton loading -->
          <template v-if="isLoading">
            <div class="px-3 py-2 space-y-2">
              <div class="flex items-center space-x-2">
                <Skeleton class="h-6 w-6 rounded-full" />
                <Skeleton class="h-4 w-32" />
              </div>
              <div class="flex items-center space-x-2">
                <Skeleton class="h-6 w-6 rounded-full" />
                <Skeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center space-x-2">
                <Skeleton class="h-6 w-6 rounded-full" />
                <Skeleton class="h-4 w-20" />
              </div>
            </div>
          </template>
          <template v-else>
            <!-- Personal Account Section (Current Tenant) -->
            <div class="px-3 py-1 text-xs text-muted-foreground font-semibold">
              Current Account
            </div>
            <DropdownMenuItem
              v-if="currentTenant"
              class="flex cursor-default items-center px-3 py-1.5 space-x-2"
            >
              <div class="h-6 w-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span class="text-xs text-white font-medium">{{ currentTenant.name.charAt(0) }}</span>
              </div>
              <span class="text-sm font-medium">{{ currentTenant.name }}</span>
              <span class="ml-auto text-primary">
                <Icon name="lucide:check" class="h-3.5 w-3.5" />
              </span>
            </DropdownMenuItem>
            <div v-else-if="currentRole !== 'cliente'" class="px-3 py-1.5 text-xs text-muted-foreground italic">
              No tenant selected
            </div>
            <!-- Teams Section -->
            <div class="mt-1.5 px-3 py-1 text-xs text-muted-foreground font-semibold">
              Tenants
            </div>
            <div v-if="filteredTenants.length === 0" class="px-3 py-1.5 text-xs text-muted-foreground italic">
              No tenants found
            </div>
            <DropdownMenuItem
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              :disabled="!tenant.is_active || currentTenant?.id === tenant.id"
              class="flex items-center px-3 py-1.5 space-x-2"
              @click="selectTenant(tenant)"
            >
              <div class="h-6 w-6 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <span class="text-xs text-white font-medium">{{ tenant.name.charAt(0) }}</span>
              </div>
              <span class="text-sm font-medium">{{ tenant.name }}</span>
            </DropdownMenuItem>
            <!-- Create new tenant option -->
            <div class="my-1.5 border-t" />
            <DropdownMenuItem as-child class="cursor-pointer">
              <NuxtLink to="/admin/tenants" class="flex items-center px-3 py-1.5 space-x-2">
                <div class="h-6 w-6 flex items-center justify-center rounded-full bg-muted">
                  <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                </div>
                <span class="text-sm font-medium">Manage Tenants</span>
              </NuxtLink>
            </DropdownMenuItem>
          </template>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
