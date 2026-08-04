<script setup lang="ts">
import type { WorkspaceContextOrganization, WorkspaceContextTenant } from '~/types/workspace'
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

/**
 * Staff switcher: only real agencies at the top level.
 * Direct orgs of agency-managed clients must NOT appear as selectable organizations —
 * they are portfolio tenants under the agency.
 */
const agencyOrganizations = computed(() =>
  organizations.value.filter(org =>
    org.is_active
    && org.type === 'agency'
    && matchesQuery(org.name, org.slug),
  ),
)

/**
 * Non-staff / rare standalone directs: orgs the user may switch that are not agencies.
 * For staff we keep this empty — clients live under the selected agency.
 */
const otherOrganizations = computed(() => {
  if (isPlatformStaff.value)
    return [] as WorkspaceContextOrganization[]
  return organizations.value.filter(org =>
    org.is_active
    && org.type !== 'agency'
    && matchesQuery(org.name, org.slug),
  )
})

const switcherOrganizations = computed(() => {
  if (isPlatformStaff.value)
    return agencyOrganizations.value
  return organizations.value.filter(org => org.is_active && matchesQuery(org.name, org.slug))
})

/**
 * Clients of the currently selected agency (managed portfolio + own brand).
 * Only when organization context is an agency.
 */
const portfolioClients = computed(() => {
  if (!isAgencyWorkspace.value)
    return [] as WorkspaceContextTenant[]
  return tenants.value
    .filter(tenant => tenant.relationship_type === 'managed' || tenant.relationship_type === 'owner')
    .filter(tenant => matchesQuery(tenant.name, tenant.slug))
})

/**
 * End-customer / non-agency workspace tenants.
 * Never dump the full platform tenant list for staff outside an agency.
 */
const directTenants = computed(() => {
  if (isPlatformStaff.value || isAgencyWorkspace.value)
    return [] as WorkspaceContextTenant[]
  return tenants.value.filter(tenant => matchesQuery(tenant.name, tenant.slug))
})

const showAgenciesSection = computed(() =>
  showOrganizationSwitcher.value && switcherOrganizations.value.length > 0,
)

const showClientsSection = computed(() =>
  isAgencyWorkspace.value && showClientSwitcher.value && portfolioClients.value.length > 0,
)

const hasResults = computed(() =>
  switcherOrganizations.value.length > 0
  || otherOrganizations.value.length > 0
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
    return isPlatformStaff.value ? 'Escolha uma agência' : 'Escolha o contexto'
  if (currentIsClient.value)
    return `Cliente · ${organization.value?.name || 'Agência'}`
  if (isAgencyWorkspace.value)
    return 'Agência'
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

const searchPlaceholder = computed(() => {
  if (isAgencyWorkspace.value)
    return 'Buscar cliente…'
  if (isPlatformStaff.value)
    return 'Buscar agência…'
  return 'Buscar empresa…'
})

async function selectOrganization(org: WorkspaceContextOrganization) {
  // Selecting an agency clears the client tenant and opens the portfolio view.
  if (org.id === organization.value?.id && !currentTenant.value && org.type === 'agency')
    return

  isSwitching.value = true
  try {
    await switchContext({ organizationId: org.id, tenantId: null })
    isOpen.value = false
    toast({
      title: org.type === 'agency' ? 'Agência selecionada' : 'Organização selecionada',
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

/** Stay on the agency portfolio without a specific client tenant. */
async function selectAgencyHome() {
  if (!organization.value || organization.value.type !== 'agency')
    return
  if (!currentTenant.value)
    return

  isSwitching.value = true
  try {
    await switchContext({ organizationId: organization.value.id, tenantId: null })
    isOpen.value = false
    toast({
      title: 'Visão da agência',
      description: organization.value.name,
    })
  }
  catch (error: any) {
    toast({
      title: 'Erro',
      description: error?.data?.statusMessage || 'Não foi possível voltar à agência.',
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
              :placeholder="searchPlaceholder"
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
            <!-- Step 1: agencies (staff) / organizations (multi-org users) -->
            <template v-if="showAgenciesSection">
              <div class="px-3 py-1 text-xs text-muted-foreground font-semibold">
                {{ isPlatformStaff || agencyOrganizations.length ? 'Agências' : 'Organizações' }}
              </div>
              <DropdownMenuItem
                v-for="org in switcherOrganizations"
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
                    Carteira de clientes
                  </span>
                </div>
                <span
                  v-if="organization?.id === org.id && !currentIsClient"
                  class="ml-auto text-primary"
                >
                  <Icon name="lucide:check" class="h-3.5 w-3.5" />
                </span>
              </DropdownMenuItem>
              <div
                v-if="showClientsSection || directTenants.length || otherOrganizations.length"
                class="my-1.5 border-t"
              />
            </template>

            <!-- Non-agency orgs only for non-staff memberships -->
            <template v-if="otherOrganizations.length">
              <div class="px-3 py-1 text-xs text-muted-foreground font-semibold">
                Contas
              </div>
              <DropdownMenuItem
                v-for="org in otherOrganizations"
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
                </div>
                <span v-if="organization?.id === org.id" class="ml-auto text-primary">
                  <Icon name="lucide:check" class="h-3.5 w-3.5" />
                </span>
              </DropdownMenuItem>
              <div
                v-if="showClientsSection || directTenants.length"
                class="my-1.5 border-t"
              />
            </template>

            <!-- Step 2: clients of the selected agency -->
            <template v-if="isAgencyWorkspace">
              <div
                v-if="organization"
                class="px-3 py-1.5"
              >
                <p class="text-xs text-muted-foreground font-semibold">
                  Agência atual
                </p>
                <button
                  type="button"
                  class="mt-0.5 flex w-full items-center gap-2 rounded-md px-0 py-1 text-left hover:bg-muted/40"
                  :disabled="!currentTenant"
                  @click="selectAgencyHome"
                >
                  <span class="min-w-0 truncate text-sm font-medium">{{ organization.name }}</span>
                  <span
                    v-if="!currentIsClient"
                    class="ml-auto shrink-0 text-primary"
                  >
                    <Icon name="lucide:check" class="h-3.5 w-3.5" />
                  </span>
                  <span
                    v-else
                    class="ml-auto shrink-0 text-[10px] text-muted-foreground"
                  >
                    Visão da agência
                  </span>
                </button>
              </div>

              <template v-if="showClientsSection">
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
                      {{ tenant.relationship_type === 'owner' ? 'Empresa principal' : 'Cliente atendido' }}
                    </span>
                  </div>
                  <span v-if="currentTenant?.id === tenant.id" class="ml-auto text-primary">
                    <Icon name="lucide:check" class="h-3.5 w-3.5" />
                  </span>
                </DropdownMenuItem>
              </template>

              <div
                v-else-if="organization"
                class="px-3 py-2 text-xs text-muted-foreground italic"
              >
                Nenhum cliente na carteira desta agência.
              </div>
            </template>

            <!-- End-user multi-tenant (not staff / not agency) -->
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
