<script setup lang="ts">
import type { SocialContentBoardItem } from '@/utils/marketing-social-preview'
import ContentCard from '~/components/marketing/content/ContentCard.vue'

withDefaults(defineProps<{
  items: SocialContentBoardItem[]
  viewMode: 'thumb' | 'list'
  emptyTitle?: string
  emptyDescription?: string
  asButton?: boolean
}>(), {
  emptyTitle: 'Nenhum item encontrado',
  emptyDescription: 'Ajuste os filtros ou crie um novo conteúdo.',
  asButton: false,
})

const emit = defineEmits<{
  select: [item: SocialContentBoardItem]
}>()

function onOpen(item: SocialContentBoardItem) {
  emit('select', item)
}
</script>

<template>
  <div v-if="!items.length" class="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
    <p class="font-medium text-foreground">
      {{ emptyTitle }}
    </p>
    <p class="mt-1">
      {{ emptyDescription }}
    </p>
  </div>

  <div
    v-else-if="viewMode === 'thumb'"
    class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
  >
    <ContentCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      layout="thumb"
      :as-button="asButton"
      @open="onOpen"
    >
      <template v-if="$slots.actions" #actions="slotProps">
        <slot name="actions" v-bind="slotProps" />
      </template>
    </ContentCard>
  </div>

  <div v-else class="overflow-hidden rounded-xl border">
    <ContentCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      layout="list"
      :as-button="asButton"
      @open="onOpen"
    >
      <template v-if="$slots.actions" #actions="slotProps">
        <slot name="actions" v-bind="slotProps" />
      </template>
    </ContentCard>
  </div>
</template>
