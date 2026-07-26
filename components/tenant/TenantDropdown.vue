<script setup lang="ts">
import type { WorkspaceContextTenant } from '~/types/workspace'
import { Icon } from '#components'

import { computed, ref } from 'vue'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

import { useWorkspace } from '~/composables/useWorkspace'

const { toast } = useToast()
const {
  tenant: currentTenant,
  tenants,
  organization,
  isLoading,
  isPlatformStaff,
  showTenantSwitcher,
  switchContext,
} = useWorkspace()

const isOpen = ref(false)
const searchQuery = ref('')
const isSwitching = ref(false)

function matchesQuery(tenant: WorkspaceContextTenant) {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query)
    return true
  return tenant.name.toLowerCase().includes(query) || tenant.slug.toLowerCase().includes(query)
}

/** Own workspaces first, then the client portfolio an agency serves. */
const ownTenants = computed(() =>
  tenants.value.filter(tenant => tenant.relationship_type !== 'managed').filter(matchesQuery),
)

const managedTenants = computed(() =>
  tenants.value.filter(tenant => tenant.relationship_type === 'managed').filter(matchesQuery),
)

const hasResults = computed(() => ownTenants.value.length > 0 || managedTenants.value.length > 0)

async function selectTenant(tenant: WorkspaceContextTenant) {
  if (tenant.id === currentTenant.value?.id)
    return

  isSwitching.value = true
  try {
    await switchContext({ tenantId: tenant.id })
    isOpen.value = false
    toast({
      title: 'Empresa selecionada',
      description: `Você está agora na empresa: ${tenant.name}`,
    })
    window.dispatchEvent(new CustomEvent('tenant-changed', { detail: { tenantId: tenant.id } }))
  }
  catch (error: any) {
    toast({
      title: 'Erro',
      description: error?.data?.statusMessage || 'Não foi possível selecionar a empresa.',
      variant: 'destructive',
    })
  }
  finally {
    isSwitching.value = false
  }
}
</script>

<template>
  <div v-if="showTenantSwitcher">
    <DropdownMenu v-model:open="isOpen">
      <DropdownMenuTrigger
        class="w-full flex items-center rounded-md px-3 py-2 outline-none space-x-2 hover:bg-muted/50 focus:outline-none focus:ring-0"
      >
        <div class="w-full flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span class="text-xs text-white font-medium">{{ currentTenant?.name?.charAt(0) || 'E' }}</span>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-sm font-medium">{{ currentTenant?.name || 'Selecionar empresa' }}</span>
              <span v-if="organization" class="text-xs text-muted-foreground">
                {{ organization.name }}
              </span>
            </div>
          </div>
          <Icon name="lucide:chevron-down" class="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-[280px]">
        <div class="relative px-3 py-1.5">
          <div class="relative">
            <Icon
              name="lucide:search"
              class="absolute left-2 top-1/2 h-3.5 w-3.5 transform text-muted-foreground -translate-y-1/2"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar empresa..."
              class="h-7 w-full border border-input rounded-md bg-background py-1 pl-7 pr-2 text-xs ring-offset-background disabled:cursor-not-allowed placeholder:text-muted-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-ring"
            >
          </div>
        </div>
        <div class="py-1.5">
          <template v-if="isLoading || isSwitching">
            <div class="px-3 py-2 space-y-2">
              <div class="flex items-center space-x-2">
                <Skeleton class="h-6 w-6 rounded-full" />
                <Skeleton class="h-4 w-32" />
              </div>
            </div>
          </template>
          <template v-else>
            <div v-if="ownTenants.length" class="px-3 py-1 text-xs text-muted-foreground font-semibold">
              Minhas empresas
            </div>
            <DropdownMenuItem
              v-for="tenant in ownTenants"
              :key="tenant.id"
              :disabled="!tenant.is_active"
              class="flex items-center px-3 py-1.5 space-x-2"
              @click="selectTenant(tenant)"
            >
              <div class="h-6 w-6 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <span class="text-xs font-medium">{{ tenant.name.charAt(0) }}</span>
              </div>
              <span class="text-sm font-medium">{{ tenant.name }}</span>
              <span v-if="currentTenant?.id === tenant.id" class="ml-auto text-primary">
                <Icon name="lucide:check" class="h-3.5 w-3.5" />
              </span>
            </DropdownMenuItem>

            <div v-if="managedTenants.length" class="mt-1.5 px-3 py-1 text-xs text-muted-foreground font-semibold">
              Clientes atendidos
            </div>
            <DropdownMenuItem
              v-for="tenant in managedTenants"
              :key="tenant.id"
              :disabled="!tenant.is_active"
              class="flex items-center px-3 py-1.5 space-x-2"
              @click="selectTenant(tenant)"
            >
              <div class="h-6 w-6 flex items-center justify-center rounded-full bg-muted">
                <span class="text-xs font-medium">{{ tenant.name.charAt(0) }}</span>
              </div>
              <span class="text-sm font-medium">{{ tenant.name }}</span>
              <span v-if="currentTenant?.id === tenant.id" class="ml-auto text-primary">
                <Icon name="lucide:check" class="h-3.5 w-3.5" />
              </span>
            </DropdownMenuItem>

            <div v-if="!hasResults" class="px-3 py-1.5 text-xs text-muted-foreground italic">
              Nenhuma empresa encontrada
            </div>

            <template v-if="isPlatformStaff">
              <div class="my-1.5 border-t" />
              <DropdownMenuItem as-child class="cursor-pointer">
                <NuxtLink to="/admin/tenants" class="flex items-center px-3 py-1.5 space-x-2">
                  <div class="h-6 w-6 flex items-center justify-center rounded-full bg-muted">
                    <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                  </div>
                  <span class="text-sm font-medium">Gerenciar empresas</span>
                </NuxtLink>
              </DropdownMenuItem>
            </template>
          </template>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
