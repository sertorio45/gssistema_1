import { useSupabaseClient } from '#imports'

import { createSharedComposable } from '@vueuse/core'
import { computed, onMounted, watch } from 'vue'

import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'
import { MODULE_META, type ModuleMeta, DEFAULT_MODULE_SLUG } from '~/constants/modules'

function getModuleSlugFromPath(path: string): string | null {
  for (const meta of Object.values(MODULE_META)) {
    if (path.startsWith(meta.basePath))
      return meta.slug
  }
  return null
}

function getModuleMetaBySlug(slug: string): ModuleMeta | undefined {
  return Object.values(MODULE_META).find(m => m.slug === slug)
}

const STORAGE_KEY = 'current-module-slug'

const currentModuleSlug = ref<string>(DEFAULT_MODULE_SLUG)
const tenantModules = ref<Array<{ id: string; module_name: string; is_active: boolean }>>([])
const isLoadingModules = ref(false)
const includeAllModulesForStaff = ref(false)
const hasResolvedRole = ref(false)

function isUuid(value: string | null | undefined) {
  if (!value)
    return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function persistModuleSlug(slug: string) {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, slug)
  }
}

function restoreModuleSlug(): string {
  if (import.meta.client) {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && getModuleMetaBySlug(saved)) {
      return saved
    }
  }
  return DEFAULT_MODULE_SLUG
}

async function fetchTenantModules(tenantId: string | null) {
  if (!tenantId || !isUuid(tenantId)) {
    tenantModules.value = []
    return []
  }
  isLoadingModules.value = true
  const supabase = useSupabaseClient()
  const { data, error } = await supabase
    .from('tenant_modules')
    .select('id, module_name, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  isLoadingModules.value = false
  if (error) {
    console.error('Error loading tenant modules:', error)
    tenantModules.value = []
    return []
  }

  const rows = data ?? []
  const hasAllBundle = rows.some(row => row.module_name === 'all' && row.is_active)

  if (hasAllBundle) {
    tenantModules.value = Object.keys(MODULE_META).map(module_name => ({
      id: `all-${module_name}`,
      module_name,
      is_active: true,
    }))
    return tenantModules.value
  }

  tenantModules.value = rows
  return tenantModules.value
}

function ensureValidModuleSlug(currentPath?: string) {
  const slug = currentModuleSlug.value
  const list = availableModules.value

  const stillValid = list.some(m => m.slug === slug)
    || (includeAllModulesForStaff.value && !!getModuleMetaBySlug(slug))

  if (stillValid)
    return

  if (!hasResolvedRole.value)
    return

  const pathSlug = currentPath ? getModuleSlugFromPath(currentPath) : null
  if (pathSlug && getModuleMetaBySlug(pathSlug)) {
    if (includeAllModulesForStaff.value || list.some(m => m.slug === pathSlug)) {
      currentModuleSlug.value = pathSlug
      persistModuleSlug(pathSlug)
      return
    }
  }

  if (list.length > 0) {
    currentModuleSlug.value = list[0].slug
    persistModuleSlug(currentModuleSlug.value)
  }
}

const availableModules = computed(() => {
  const fromTenant = tenantModules.value
    .map((tm) => {
      const meta = MODULE_META[tm.module_name]
      if (!meta)
        return null
      return { ...meta, id: tm.id, module_name: tm.module_name }
    })
    .filter((m): m is ModuleMeta & { id: string; module_name: string } => m !== null)

  if (!includeAllModulesForStaff.value)
    return fromTenant

  const registeredNames = new Set(fromTenant.map(m => m.module_name))
  const staffExtras = Object.entries(MODULE_META)
    .filter(([moduleName]) => !registeredNames.has(moduleName))
    .map(([module_name, meta]) => ({
      ...meta,
      id: `local-${module_name}`,
      module_name,
    }))

  return [...fromTenant, ...staffExtras]
})

const currentModuleMeta = computed(() => {
  return getModuleMetaBySlug(currentModuleSlug.value) ?? MODULE_META.crm
})

function _useModule() {
  const { currentTenant, tenantId } = useTenant()
  const { currentRole, currentUser } = useAuth()
  const route = useRoute()

  watch([currentRole, currentUser], ([role, user]) => {
    const globalRole = user?.user_metadata?.role || user?.app_metadata?.role
    includeAllModulesForStaff.value = role === 'admin'
      || role === 'funcionario'
      || globalRole === 'admin'
      || globalRole === 'funcionario'
    hasResolvedRole.value = !user || role !== null
    if (hasResolvedRole.value)
      ensureValidModuleSlug(route.path)
  }, { immediate: true })

  onMounted(async () => {
    currentModuleSlug.value = restoreModuleSlug()
    await fetchTenantModules(tenantId.value ?? currentTenant.value?.id ?? null)
    ensureValidModuleSlug(route.path)
  })

  watch(() => route.path, (path) => {
    const slug = getModuleSlugFromPath(path)
    if (slug && slug !== currentModuleSlug.value) {
      currentModuleSlug.value = slug
      persistModuleSlug(slug)
    }
    ensureValidModuleSlug(path)
  }, { immediate: true })

  watch(tenantId, async (newTenantId) => {
    await fetchTenantModules(newTenantId ?? null)
    ensureValidModuleSlug(route.path)
  })

  watch(availableModules, () => {
    ensureValidModuleSlug(route.path)
  })

  async function loadModules() {
    await fetchTenantModules(currentTenant.value?.id ?? tenantId.value ?? null)
    ensureValidModuleSlug(route.path)
  }

  function setCurrentModuleBySlug(slug: string) {
    if (!getModuleMetaBySlug(slug))
      return

    currentModuleSlug.value = slug
    persistModuleSlug(slug)
  }

  function getModulePath(slug: string) {
    const meta = getModuleMetaBySlug(slug)
    return meta?.defaultPath ?? meta?.basePath ?? null
  }

  return {
    currentModuleSlug,
    currentModuleMeta,
    availableModules,
    tenantModules,
    isLoadingModules,
    loadModules,
    setCurrentModuleBySlug,
    getModulePath,
    MODULE_META,
  }
}

export const useModule = createSharedComposable(_useModule)
