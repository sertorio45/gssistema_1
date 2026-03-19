import { useSupabaseClient } from '#imports'

import { computed, onMounted, ref, watch } from 'vue'

import { MODULE_META, type ModuleMeta, DEFAULT_MODULE_SLUG } from '~/constants/modules'
import { useTenant } from '~/composables/useTenant'

function getModuleSlugFromPath(path: string): string | null {
  for (const meta of Object.values(MODULE_META)) {
    if (path.startsWith(meta.basePath)) return meta.slug
  }
  return null
}

const STORAGE_KEY = 'current-module-slug'

const currentModuleSlug = ref<string>(DEFAULT_MODULE_SLUG)
const tenantModules = ref<Array<{ id: string; module_name: string; is_active: boolean }>>([])
const isLoadingModules = ref(false)

function persistModuleSlug(slug: string) {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, slug)
  }
}

function restoreModuleSlug(): string {
  if (import.meta.client) {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return saved
    }
  }
  return DEFAULT_MODULE_SLUG
}

async function fetchTenantModules(tenantId: string | null) {
  if (!tenantId) {
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
  tenantModules.value = data ?? []
  return tenantModules.value
}

const availableModules = computed(() => {
  return tenantModules.value
    .map((tm) => {
      const meta = MODULE_META[tm.module_name]
      if (!meta) return null
      return { ...meta, id: tm.id, module_name: tm.module_name }
    })
    .filter((m): m is ModuleMeta & { id: string; module_name: string } => m !== null)
})

const currentModuleMeta = computed(() => {
  const found = Object.values(MODULE_META).find(m => m.slug === currentModuleSlug.value)
  return found ?? MODULE_META.crm
})

export function useModule() {
  const { currentTenant, tenantId } = useTenant()
  const route = useRoute()

  onMounted(async () => {
    currentModuleSlug.value = restoreModuleSlug()
    await fetchTenantModules(tenantId.value ?? currentTenant.value?.id ?? null)
  })

  // Sync current module from route when navigating
  watch(() => route.path, (path) => {
    const slug = getModuleSlugFromPath(path)
    if (slug && slug !== currentModuleSlug.value) {
      currentModuleSlug.value = slug
      persistModuleSlug(slug)
    }
  }, { immediate: true })

  watch(tenantId, async (newTenantId) => {
    await fetchTenantModules(newTenantId ?? null)
    const slug = currentModuleSlug.value
    const list = availableModules.value
    const stillValid = list.some(m => m.slug === slug)
    if (!stillValid && list.length > 0) {
      currentModuleSlug.value = list[0].slug
      persistModuleSlug(currentModuleSlug.value)
    }
  }, { immediate: true })

  async function loadModules() {
    await fetchTenantModules(currentTenant.value?.id ?? tenantId.value ?? null)
  }

  function setCurrentModuleBySlug(slug: string) {
    currentModuleSlug.value = slug
    persistModuleSlug(slug)
  }

  return {
    currentModuleSlug,
    currentModuleMeta,
    availableModules,
    tenantModules,
    isLoadingModules,
    loadModules,
    setCurrentModuleBySlug,
    MODULE_META,
  }
}
