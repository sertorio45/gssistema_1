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

async function selectModule(slug: string) {
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
</script>

<template>
  <div class="w-full">
    <DropdownMenu v-model:open="isOpen">
      <DropdownMenuTrigger
        class="w-full flex items-center rounded-md px-3 py-2 outline-none space-x-2 hover:bg-muted/50 focus:outline-none focus:ring-0"
      >
        <div class="w-full flex items-center justify-between gap-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon :name="currentModuleDisplay.icon" class="h-4 w-4" />
            </div>
            <span class="text-sm font-medium truncate">
              {{ currentModuleDisplay.title }}
            </span>
            <Icon name="lucide:chevron-down" class="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-[260px]" side="right" :side-offset="8">
        <div class="px-3 py-2 border-b">
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Selecionar módulo
          </p>
        </div>
        <div class="py-1.5 max-h-[280px] overflow-y-auto">
          <template v-if="isLoadingModules">
            <div class="px-3 py-2 space-y-2">
              <div class="flex items-center gap-2">
                <Skeleton class="h-8 w-8 rounded-md" />
                <Skeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center gap-2">
                <Skeleton class="h-8 w-8 rounded-md" />
                <Skeleton class="h-4 w-20" />
              </div>
            </div>
          </template>
          <template v-else>
            <DropdownMenuItem
              v-for="module in availableModules"
              :key="module.id"
              class="flex cursor-pointer items-center gap-3 px-3 py-2.5"
              :class="{ 'bg-muted/60': currentModuleSlug === module.slug }"
              @select.prevent="selectModule(module.slug)"
            >
              <div
                class="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-primary/10 text-primary"
              >
                <Icon :name="module.icon" class="h-4 w-4" />
              </div>
              <div class="flex flex-col items-start min-w-0 flex-1">
                <span class="text-sm font-medium">{{ module.title }}</span>
                <span v-if="currentTenant?.name" class="text-xs text-muted-foreground truncate w-full">
                  {{ currentTenant.name }}
                </span>
              </div>
              <Icon
                v-if="currentModuleSlug === module.slug"
                name="lucide:check"
                class="h-4 w-4 shrink-0 text-primary"
              />
            </DropdownMenuItem>
            <div v-if="availableModules.length === 0" class="px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum módulo disponível
            </div>
          </template>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

