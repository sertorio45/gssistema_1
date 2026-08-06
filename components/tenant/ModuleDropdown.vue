<script setup lang="ts">
/**
 * Module switcher — Linear/Notion-inspired list with large icons.
 * Built on shadcn DropdownMenu; icon assets via ModuleIcon (custom SVG or Lucide).
 */
import { MODULE_DESCRIPTIONS_PT } from '~/constants/modules'
import { cn } from '@/lib/utils'
import { useModule } from '~/composables/useModule'
import { useTenant } from '~/composables/useTenant'

const {
  currentModuleSlug,
  currentModuleMeta,
  availableModules,
  setCurrentModuleBySlug,
  getModulePath,
  loadModules,
  isLoadingModules,
} = useModule()
const { currentTenant } = useTenant()

const isOpen = ref(false)

onMounted(async () => {
  await loadModules()
})

const currentModuleDisplay = computed(() => currentModuleMeta.value)

const currentDescription = computed(() =>
  MODULE_DESCRIPTIONS_PT[currentModuleDisplay.value.slug]
  || 'Módulo ativo neste workspace',
)

async function selectModule(slug: string) {
  if (slug === currentModuleSlug.value) {
    isOpen.value = false
    return
  }

  const path = getModulePath(slug)
  if (!path)
    return

  setCurrentModuleBySlug(slug)
  isOpen.value = false

  await navigateTo(path)

  window.dispatchEvent(
    new CustomEvent('module-changed', { detail: { moduleSlug: slug } }),
  )
}

function moduleDescription(slug: string) {
  return MODULE_DESCRIPTIONS_PT[slug] || 'Abrir módulo'
}
</script>

<template>
  <div class="w-full">
    <DropdownMenu v-model:open="isOpen">
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          :class="cn(
            'group w-full flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left',
            'shadow-sm transition-colors',
            'hover:bg-accent/50 hover:border-border',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'data-[state=open]:bg-accent/60 data-[state=open]:border-primary/30',
          )"
          :aria-label="`Módulo atual: ${currentModuleDisplay.title}`"
        >
          <div
            class="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-muted/80 ring-1 ring-border/60"
          >
            <ModuleIcon
              :name="currentModuleDisplay.icon"
              class="h-7 w-7"
              :alt="currentModuleDisplay.title"
            />
          </div>
          <div class="min-w-0 flex-1 space-y-0.5">
            <p class="truncate text-sm font-semibold leading-none">
              {{ currentModuleDisplay.title }}
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ currentDescription }}
            </p>
          </div>
          <Icon
            name="lucide:chevrons-up-down"
            class="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        :side-offset="8"
        class="w-[min(100vw-2rem,18.5rem)] rounded-xl p-0"
      >
        <DropdownMenuLabel class="px-3 py-2.5">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trocar módulo
          </span>
          <p
            v-if="currentTenant?.name"
            class="mt-0.5 truncate text-xs font-normal text-muted-foreground"
          >
            {{ currentTenant.name }}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator class="m-0" />

        <div class="p-1.5 max-h-[min(22rem,70vh)] overflow-y-auto">
          <template v-if="isLoadingModules">
            <div class="space-y-1 p-1">
              <div
                v-for="n in 3"
                :key="n"
                class="flex items-center gap-3 rounded-lg px-2 py-2"
              >
                <Skeleton class="h-11 w-11 rounded-xl" />
                <div class="flex-1 space-y-2">
                  <Skeleton class="h-3.5 w-24" />
                  <Skeleton class="h-3 w-36" />
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="availableModules.length">
            <DropdownMenuItem
              v-for="module in availableModules"
              :key="module.id"
              class="cursor-pointer gap-3 rounded-lg px-2 py-2.5"
              :class="cn(
                currentModuleSlug === module.slug
                  && 'bg-primary/10 text-foreground focus:bg-primary/15',
              )"
              @select.prevent="selectModule(module.slug)"
            >
              <div
                :class="cn(
                  'h-11 w-11 shrink-0 flex items-center justify-center rounded-xl ring-1',
                  currentModuleSlug === module.slug
                    ? 'bg-primary/10 ring-primary/25'
                    : 'bg-muted/70 ring-border/50',
                )"
              >
                <ModuleIcon
                  :name="module.icon"
                  class="h-7 w-7"
                  :alt="module.title"
                />
              </div>
              <div class="min-w-0 flex-1 space-y-0.5">
                <p class="truncate text-sm font-medium leading-none">
                  {{ module.title }}
                </p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ moduleDescription(module.slug) }}
                </p>
              </div>
              <Icon
                v-if="currentModuleSlug === module.slug"
                name="lucide:check"
                class="h-4 w-4 shrink-0 text-primary"
              />
            </DropdownMenuItem>
          </template>

          <div
            v-else
            class="px-3 py-8 text-center text-sm text-muted-foreground"
          >
            Nenhum módulo disponível
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
