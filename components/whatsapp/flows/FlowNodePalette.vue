<script setup lang="ts">
import type { WhatsAppFlowNodeType } from '~/types/whatsapp'

import FlowPaletteNode from '~/components/whatsapp/flows/FlowPaletteNode.vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { TooltipProvider } from '~/components/ui/tooltip'
import {
  WHATSAPP_FLOW_NODE_CATEGORIES,
  WHATSAPP_FLOW_NODE_MAP,
} from '~/constants/whatsapp-flow-nodes'

const emit = defineEmits<{
  addNode: [type: WhatsAppFlowNodeType]
  organize: []
  zoomIn: []
  zoomOut: []
  resetZoom: []
}>()

const search = ref('')

const filteredCategories = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) {
    return WHATSAPP_FLOW_NODE_CATEGORIES
  }

  return WHATSAPP_FLOW_NODE_CATEGORIES
    .map(category => ({
      ...category,
      types: category.types.filter((type) => {
        const def = WHATSAPP_FLOW_NODE_MAP[type]
        if (!def)
          return false
        return def.label.toLowerCase().includes(query)
          || def.description.toLowerCase().includes(query)
      }),
    }))
    .filter(category => category.types.length > 0)
})
</script>

<template>
  <Card class="h-fit border-border/60 shadow-none xl:sticky xl:top-4">
    <CardHeader class="space-y-3 pb-3">
      <CardTitle class="text-sm font-semibold">
        Biblioteca de blocos
      </CardTitle>
      <Input
        v-model="search"
        placeholder="Buscar bloco..."
        class="h-9"
      />
    </CardHeader>

    <TooltipProvider :delay-duration="200">
      <CardContent class="space-y-4">
        <div
          v-for="category in filteredCategories"
          :key="category.id"
          class="space-y-2"
        >
          <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {{ category.label }}
          </p>
          <div class="space-y-2">
            <FlowPaletteNode
              v-for="type in category.types"
              :key="type"
              :type="type"
              @add="emit('addNode', $event)"
            />
          </div>
        </div>

        <div v-if="!filteredCategories.length" class="py-6 text-center text-sm text-muted-foreground">
          Nenhum bloco encontrado.
        </div>

        <div class="flex flex-wrap items-center gap-1 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" class="h-8 flex-1 text-xs" @click="emit('organize')">
            <Icon name="i-lucide-magnet" class="mr-1.5 h-3.5 w-3.5" />
            Organizar blocos
          </Button>
        </div>

        <div class="flex items-center gap-1">
          <Button variant="ghost" size="sm" class="h-8 px-2" @click="emit('zoomOut')">
            <Icon name="i-lucide-minus" class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" class="h-8 px-2" @click="emit('zoomIn')">
            <Icon name="i-lucide-plus" class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" class="h-8 px-2 text-xs" @click="emit('resetZoom')">
            Reset
          </Button>
        </div>

        <p class="text-xs leading-relaxed text-muted-foreground">
          Clique no bloco para adicionar ao canvas. Passe o mouse no
          <Icon name="i-lucide-info" class="inline h-3 w-3 align-[-2px]" />
          para ver a descrição.
        </p>
      </CardContent>
    </TooltipProvider>
  </Card>
</template>
