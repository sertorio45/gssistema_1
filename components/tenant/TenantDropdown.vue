<script setup lang="ts">
import type { WorkspaceContextOrganization, WorkspaceContextTenant } from '~/types/workspace'
import { Icon } from '#components'

import { computed, ref } from 'vue'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

import { useWorkspace } from '~/composables/useWorkspace'
import { ORGANIZATION_TYPE_LABELS } from '~/constants/workspace'

const { toast } = useToast()
const {
  tenant: currentTenant,
  tenants,
  organization,
  organizations,
  isLoading,
  isPlatformStaff,
  showTenantSwitcher,
  showOrganizationSwitcher,
  showClientSwitcher,
  isAgencyWorkspace,
  switchContext,
} = useWorkspace()

const isOpen = ref(false)
const searchQuery = ref('')
const isSwitching = ref(false)

function matchesQuery(name: string, slug?: string | null) {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query)
    return true
  return name.toLowerCase().includes(query) || (slug || '').toLowerCase().includes(query)
}

const filteredOrganizations = computed(() =>
  organizations.value.filter(org => org.is_active && matchesQuery(org.name, org.slug)),
)

/**
 * Agency portfolio: every linked company is a client workspace.
 * Own/`owner` rows only appear for non-agency (direct) accounts.
 */
const portfolioClients = computed(() => {
  if (!isAgencyWorkspace.value)
    return [] as WorkspaceContextTenant[]
  return tenants.value
    .filter(tenant => tenant.relationship_type === 'managed' || tenant.relationship_type === 'owner')
    .filter(tenant => matchesQuery(tenant.name, tenant.slug))
})

const directTenants = computed(() => {
  if (isAgencyWorkspace.value)
    return [] as WorkspaceContextTenant[]
  return tenants.value.filter(tenant => matchesQuery(tenant.name, tenant.slug))
})

const hasResults = computed(() =>
  filteredOrganizations.value.length > 0
  || portfolioClients.value.length > 0
  || directTenants.value.length > 0,
)

const currentIsClient = computed(() =>
  Boolean(currentTenant.value)
  && isAgencyWorkspace.value
  && portfolioClients.value.some(tenant => tenant.id === currentTenant.value?.id),
)

const triggerTitle = computed(() => {
  if (currentIsClient.value && currentTenant.value)
    return currentTenant.value.name
  if (isAgencyWorkspace.value && organization.value)
    return organization.value.name
  return currentTenant.value?.name || organization.value?.name || 'Selecionar contexto'
})

const triggerSubtitle = computed(() => {
  if (!organization.value && !currentTenant.value)
    return 'Escolha a agência ou o cliente'
  if (currentIsClient.value)
    return `Cliente · ${organization.value?.name || 'Agência'}`
  if (isAgencyWorkspace.value)
    return 'Agência'
  // Never surface the raw "Cliente direto" product jargon in the trigger.
  if (organization.value?.type === 'direct')
    return currentTenant.value?.name || 'Minha empresa'
  return organization.value?.name || null
})

const triggerBadge = computed(() => {
  if (currentIsClient.value)
    return 'Cliente'
  if (isAgencyWorkspace.value)
    return 'Agência'
  return null
})

async function selectOrganization(org: WorkspaceContextOrganization) {
  if (org.id === organization.value?.id && currentTenant.value)
    return

  isSwitching.value = true
  try {
    await switchContext({ organizationId: org.id, tenantId: null })
    isOpen.value = false
    toast({
      title: 'Organização selecionada',
      description: org.name,
    })
  }
  catch (error: any) {
    toast({
      title: 'Erro',
      description: error?.data?.statusMessage || 'Não foi possível trocar a organização.',
      variant: 'destructive',
    })
  }
  finally {
    isSwitching.value = false
  }
}

async function selectTenant(tenant: WorkspaceContextTenant) {
  if (
    tenant.id === currentTenant.value?.id
    && (tenant.organization_id ?? null) === (organization.value?.id ?? null)
  ) {
    return
  }

  isSwitching.value = true
  try {
    await switchContext({
      organizationId: tenant.organization_id ?? organization.value?.id ?? null,
      tenantId: tenant.id,
    })
    isOpen.value = false
    toast({
      title: isAgencyWorkspace.value ? 'Cliente selecionado' : 'Empresa selecionada',
      description: isAgencyWorkspace.value
        ? `${tenant.name} · ${organization.value?.name || 'Agência'}`
        : tenant.name,
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
        <div class="w-full flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center space-x-3">
            <div
              class="h-8 w-8 flex shrink-0 items-center justify-center rounded-full text-xs font-medium"
              :class="currentIsClient ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'"
            >
              <span>{{ triggerTitle?.charAt(0) || 'E' }}</span>
            </div>
            <div class="min-w-0 flex flex-col items-start">
              <span class="truncate text-sm font-medium">{{ triggerTitle }}</span>
              <span v-if="triggerSubtitle" class="truncate text-xs text-muted-foreground">
                {{ triggerSubtitle }}
              </span>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <span
              v-if="triggerBadge"
              class="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              :class="currentIsClient ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'"
            >
              {{ triggerBadge }}
            </span>
            <Icon name="lucide:chevron-down" class="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-[320px]">
        <div class="relative px-3 py-1.5">
          <div class="relative">
            <Icon
              name="lucide:search"
              class="absolute left-2 top-1/2 h-3.5 w-3.5 transform text-muted-foreground -translate-y-1/2"
            />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="isAgencyWorkspace ? 'Buscar cliente…' : 'Buscar empresa…'"
              class="h-7 w-full border border-input rounded-md bg-background py-1 pl-7 pr-2 text-xs ring-offset-background disabled:cursor-not-allowed placeholder:text-muted-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-ring"
            >
          </div>
        </div>
        <div class="max-h-80 overflow-y-auto py-1.5">
          <template v-if="isLoading || isSwitching">
            <div class="px-3 py-2 space-y-2">
              <div class="flex items-center space-x-2">
                <Skeleton class="h-6 w-6 rounded-full" />
                <Skeleton class="h-4 w-32" />
              </div>
            </div>
          </template>
          <template v-else>
            <template v-if="showOrganizationSwitcher && filteredOrganizations.length">
              <div class="px-3 py-1 text-xs text-muted-foreground font-semibold">
                Organizações
              </div>
              <DropdownMenuItem
                v-for="org in filteredOrganizations"
                :key="org.id"
                :disabled="!org.is_active"
                class="flex items-center px-3 py-1.5 space-x-2"
                @click="selectOrganization(org)"
              >
                <div class="h-6 w-6 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <span class="text-xs font-medium">{{ org.name.charAt(0) }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ org.name }}</span>
                  <span class="block text-[10px] text-muted-foreground">
                    {{ ORGANIZATION_TYPE_LABELS[org.type] }}
                  </span>
                </div>
                <span v-if="organization?.id === org.id" class="ml-auto text-primary">
                  <Icon name="lucide:check" class="h-3.5 w-3.5" />
                </span>
              </DropdownMenuItem>
              <div
                v-if="portfolioClients.length || directTenants.length"
                class="my-1.5 border-t"
              />
            </template>

            <template v-if="isAgencyWorkspace">
              <div
                v-if="organization"
                class="px-3 py-1.5"
              >
                <p class="text-xs text-muted-foreground font-semibold">
                  Agência
                </p>
                <p class="truncate text-sm font-medium">
                  {{ organization.name }}
                </p>
              </div>

              <template v-if="showClientSwitcher && portfolioClients.length">
                <div class="mt-1 px-3 py-1 text-xs text-muted-foreground font-semibold">
                  Clientes
                </div>
                <DropdownMenuItem
                  v-for="tenant in portfolioClients"
                  :key="tenant.id"
                  :disabled="!tenant.is_active"
                  class="flex items-center px-3 py-1.5 space-x-2"
                  @click="selectTenant(tenant)"
                >
                  <div class="h-6 w-6 flex items-center justify-center rounded-full bg-muted">
                    <span class="text-xs font-medium">{{ tenant.name.charAt(0) }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium">{{ tenant.name }}</span>
                    <span class="block text-[10px] text-muted-foreground">
                      Workspace do cliente
                    </span>
                  </div>
                  <span v-if="currentTenant?.id === tenant.id" class="ml-auto text-primary">
                    <Icon name="lucide:check" class="h-3.5 w-3.5" />
                  </span>
                </DropdownMenuItem>
              </template>
            </template>

            <template v-else>
              <div v-if="directTenants.length" class="px-3 py-1 text-xs text-muted-foreground font-semibold">
                Minha empresa
              </div>
              <DropdownMenuItem
                v-for="tenant in directTenants"
                :key="tenant.id"
                :disabled="!tenant.is_active"
                class="flex items-center px-3 py-1.5 space-x-2"
                @click="selectTenant(tenant)"
              >
                <div class="h-6 w-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span class="text-xs font-medium">{{ tenant.name.charAt(0) }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ tenant.name }}</span>
                </div>
                <span v-if="currentTenant?.id === tenant.id" class="ml-auto text-primary">
                  <Icon name="lucide:check" class="h-3.5 w-3.5" />
                </span>
              </DropdownMenuItem>
            </template>

            <div v-if="!hasResults" class="px-3 py-1.5 text-xs text-muted-foreground italic">
              Nenhum resultado
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
