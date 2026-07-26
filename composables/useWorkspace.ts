import type { WorkspaceCapability } from '~/constants/workspace'
import type { WorkspaceContextResponse } from '~/types/workspace'

import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'

import { holdsCapability } from '~/constants/workspace'
import { useTenantStore } from '~/stores/tenant'

const STORAGE_TENANT_KEY = 'current-tenant-id'
const STORAGE_ORGANIZATION_KEY = 'current-organization-id'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_PATTERN.test(value)
}

function readStored(key: string): string | null {
  if (!import.meta.client)
    return null
  const value = localStorage.getItem(key)
  if (isUuid(value))
    return value
  if (value)
    localStorage.removeItem(key)
  return null
}

function persist(key: string, value: string | null) {
  if (!import.meta.client)
    return
  if (value)
    localStorage.setItem(key, value)
  else
    localStorage.removeItem(key)
}

const context = ref<WorkspaceContextResponse | null>(null)
const isLoading = ref(false)

/**
 * Mirrors the server-resolved workspace context. Nothing here authorizes anything:
 * it only decides what is worth rendering. The API re-validates every request.
 */
function _useWorkspace() {
  const tenantStore = useTenantStore()

  async function load(options: { organizationId?: string | null, tenantId?: string | null } = {}) {
    isLoading.value = true
    try {
      const organizationId = options.organizationId !== undefined
        ? options.organizationId
        : tenantStore.organizationId ?? readStored(STORAGE_ORGANIZATION_KEY)
      const tenantId = options.tenantId !== undefined
        ? options.tenantId
        : tenantStore.tenantId ?? readStored(STORAGE_TENANT_KEY)

      const response = await $fetch<WorkspaceContextResponse>('/api/workspace/context', {
        query: {
          ...(isUuid(organizationId) ? { organization_id: organizationId } : {}),
          ...(isUuid(tenantId) ? { tenant_id: tenantId } : {}),
        },
      })

      applyContext(response)
      return response
    }
    finally {
      isLoading.value = false
    }
  }

  function applyContext(response: WorkspaceContextResponse) {
    context.value = response
    tenantStore.setTenant(response.tenant?.id ?? '')
    tenantStore.setOrganization(response.organization?.id ?? null)
    tenantStore.setRole(response.effective_role)
    persist(STORAGE_TENANT_KEY, response.tenant?.id ?? null)
    persist(STORAGE_ORGANIZATION_KEY, response.organization?.id ?? null)
  }

  /** Asks the server to switch scope. A rejected switch leaves the state untouched. */
  async function switchContext(input: { organizationId?: string | null, tenantId?: string | null }) {
    await $fetch('/api/workspace/context', {
      method: 'POST',
      body: {
        organizationId: input.organizationId ?? null,
        tenantId: input.tenantId ?? null,
      },
    })

    return load({
      organizationId: input.organizationId ?? null,
      tenantId: input.tenantId ?? null,
    })
  }

  const organization = computed(() => context.value?.organization ?? null)
  const organizations = computed(() => context.value?.organizations ?? [])
  const tenant = computed(() => context.value?.tenant ?? null)
  const tenants = computed(() => context.value?.tenants ?? [])
  const capabilities = computed(() => context.value?.capabilities ?? [])
  const modules = computed(() => context.value?.modules ?? [])
  const isPlatformStaff = computed(() => context.value?.is_platform_staff ?? false)
  const effectiveRole = computed(() => context.value?.effective_role ?? null)
  const organizationType = computed(() => context.value?.organization?.type ?? null)
  const organizationRelationshipType = computed(
    () => context.value?.organization_relationship_type ?? null,
  )

  function can(capability: WorkspaceCapability): boolean {
    return holdsCapability(capabilities.value, capability)
  }

  /** Portfolio features only make sense for an agency serving other companies. */
  const isAgencyWorkspace = computed(() => organizationType.value === 'agency')

  const managedTenants = computed(() =>
    tenants.value.filter(item => item.relationship_type === 'managed'),
  )

  const showOrganizationSwitcher = computed(() =>
    isPlatformStaff.value || organizations.value.length > 1,
  )

  /** Client portfolio switcher — never for direct customers or single-tenant end users. */
  const showClientSwitcher = computed(() => {
    if (organizationType.value === 'direct')
      return false
    if (isAgencyWorkspace.value)
      return managedTenants.value.length > 0
    return false
  })

  const showTenantSwitcher = computed(() =>
    showOrganizationSwitcher.value
    || showClientSwitcher.value
    || (isPlatformStaff.value && tenants.value.length > 0)
    || (!isAgencyWorkspace.value && tenants.value.length > 1),
  )

  const showAgencyPortfolio = computed(() =>
    isAgencyWorkspace.value && can('agency.clients.read'),
  )

  const showOrganizationTeam = computed(() =>
    can('organization.team.manage') && !!organization.value,
  )

  const showAgencyOpsMenu = computed(() =>
    isAgencyWorkspace.value && (
      can('agency.clients.read')
      || can('organization.team.manage')
      || can('organization.roles.read')
      || can('organization.manage')
    ),
  )

  return {
    context,
    isLoading,
    load,
    switchContext,
    organization,
    organizations,
    organizationType,
    organizationRelationshipType,
    tenant,
    tenants,
    managedTenants,
    capabilities,
    modules,
    isPlatformStaff,
    effectiveRole,
    isAgencyWorkspace,
    showOrganizationSwitcher,
    showClientSwitcher,
    showTenantSwitcher,
    showAgencyPortfolio,
    showOrganizationTeam,
    showAgencyOpsMenu,
    can,
  }
}

export const useWorkspace = createSharedComposable(_useWorkspace)
