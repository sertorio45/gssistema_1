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
    // Para admin/funcionário, mostra todos (NÃO filtra)
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
    await setCurrentTenantById(tenant.id)
    toast({
      title: 'Tenant Selected',
      description: `You are now in tenant: ${tenant.name}`,
    })
    // Close dropdown
    isOpen.value = false
    // Emitir evento global para atualizar o front
    window.dispatchEvent(new CustomEvent('tenant-changed'))
  }
  catch (error: any) {
    console.error('Error selecting tenant:', error)
    toast({
      title: 'Error',
      description: 'Could not select the tenant.',
      variant: 'destructive',
    })
  }
}

// Load tenants when component is mounted
onMounted(async () => {
  await loadTenants()
})
</script>

<template>
  <div v-if="currentRole !== 'cliente'">
    <DropdownMenu v-model:open="isOpen">
      <DropdownMenuTrigger class="flex items-center space-x-2 rounded-md px-3 py-2 outline-none focus:outline-none focus:ring-0 hover:bg-muted/50 w-full">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center space-x-3">
            <div class="flex items-center justify-center bg-primary text-primary-foreground h-8 w-8 rounded-full">
              <span class="text-white font-medium text-xs">{{ currentTenant?.name?.charAt(0) || 'T' }}</span>
            </div>
            <div class="flex flex-col items-start">
              <span class="font-medium text-sm">{{ currentTenant?.name || 'Select Tenant' }}</span>
            </div>
          </div>
          <Icon name="lucide:chevron-down" class="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-[280px]">
        <!-- Search -->
        <div class="relative px-3 py-1.5">
          <div class="relative">
            <Icon name="lucide:search" class="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search tenant..."
              class="w-full pl-7 pr-2 py-1 text-xs rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 h-7"
            />
          </div>
        </div>
        <div class="py-1.5">
          <!-- Skeleton loading -->
          <template v-if="isLoading">
            <div class="space-y-2 px-3 py-2">
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
            <div class="px-3 py-1 text-xs font-semibold text-muted-foreground">
              Current Account
            </div>
            <DropdownMenuItem
              v-if="currentTenant"
              class="flex items-center space-x-2 px-3 py-1.5 cursor-default"
            >
              <div class="flex items-center justify-center bg-primary text-primary-foreground h-6 w-6 rounded-full">
                <span class="text-white font-medium text-xs">{{ currentTenant.name.charAt(0) }}</span>
              </div>
              <span class="font-medium text-sm">{{ currentTenant.name }}</span>
              <span class="ml-auto text-primary">
                <Icon name="lucide:check" class="h-3.5 w-3.5" />
              </span>
            </DropdownMenuItem>
            <div v-else-if="currentRole !== 'cliente'" class="px-3 py-1.5 text-xs text-muted-foreground italic">
              No tenant selected
            </div>
            <!-- Teams Section -->
            <div class="mt-1.5 px-3 py-1 text-xs font-semibold text-muted-foreground">
              Tenants
            </div>
            <div v-if="filteredTenants.length === 0" class="px-3 py-1.5 text-xs text-muted-foreground italic">
              No tenants found
            </div>
            <DropdownMenuItem
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              @click="selectTenant(tenant)"
              :disabled="!tenant.is_active || currentTenant?.id === tenant.id"
              class="flex items-center space-x-2 px-3 py-1.5"
            >
              <div class="flex items-center justify-center bg-secondary text-secondary-foreground h-6 w-6 rounded-full">
                <span class="text-white font-medium text-xs">{{ tenant.name.charAt(0) }}</span>
              </div>
              <span class="font-medium text-sm">{{ tenant.name }}</span>
            </DropdownMenuItem>
            <!-- Create new tenant option -->
            <div class="border-t my-1.5"></div>
            <DropdownMenuItem asChild class="cursor-pointer">
              <NuxtLink to="/admin/tenants" class="flex items-center space-x-2 px-3 py-1.5">
                <div class="flex items-center justify-center bg-muted h-6 w-6 rounded-full">
                  <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                </div>
                <span class="font-medium text-sm">Manage Tenants</span>
              </NuxtLink>
            </DropdownMenuItem>
          </template>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template> 