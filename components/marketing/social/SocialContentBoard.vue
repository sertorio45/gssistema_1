<script setup lang="ts">
import type { SocialContentBoardItem } from '@/utils/marketing-social-preview'
import {
  isImageAsset,
  isVideoAsset,
  platformIcon,
  previewUrl,
  primaryPreviewAsset,
} from '@/utils/marketing-social-preview'

const props = withDefaults(defineProps<{
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

function mainAsset(item: SocialContentBoardItem) {
  return primaryPreviewAsset(item.previewAssets)
}

function openItem(item: SocialContentBoardItem) {
  if (props.asButton) {
    emit('select', item)
    return
  }
  if (item.href)
    navigateTo(item.href)
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
    <div
      v-for="item in items"
      :key="item.id"
      class="group overflow-hidden rounded-xl border bg-card transition hover:border-primary/40 hover:shadow-sm"
    >
      <button
        type="button"
        class="relative block aspect-square w-full overflow-hidden bg-muted text-left"
        @click="openItem(item)"
      >
        <img
          v-if="mainAsset(item) && isImageAsset(mainAsset(item)) && previewUrl(mainAsset(item))"
          :src="previewUrl(mainAsset(item))!"
          :alt="item.title"
          class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        >
        <video
          v-else-if="mainAsset(item) && isVideoAsset(mainAsset(item)) && previewUrl(mainAsset(item))"
          :src="previewUrl(mainAsset(item))!"
          class="h-full w-full object-cover"
          muted
          playsinline
        />
        <div v-else class="flex h-full items-center justify-center text-muted-foreground">
          <Icon name="lucide:image-off" class="h-8 w-8" />
        </div>

        <div class="absolute left-2 top-2 flex flex-wrap gap-1">
          <Badge
            v-for="platform in item.platforms"
            :key="`${item.id}-${platform}`"
            variant="secondary"
            class="bg-background/90 backdrop-blur"
          >
            <Icon :name="platformIcon(platform)" class="mr-1 h-3 w-3" />
            {{ platform }}
          </Badge>
        </div>

        <Badge class="absolute bottom-2 right-2 bg-background/90 text-foreground backdrop-blur" variant="outline">
          {{ item.statusLabel }}
        </Badge>
      </button>

      <div class="space-y-2 p-3">
        <button type="button" class="w-full text-left" @click="openItem(item)">
          <p class="line-clamp-1 font-medium">
            {{ item.title }}
          </p>
          <p v-if="item.caption" class="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {{ item.caption }}
          </p>
          <p v-if="item.meta" class="mt-1 text-xs text-muted-foreground">
            {{ item.meta }}
          </p>
        </button>
        <div v-if="$slots.actions" class="flex flex-wrap gap-2" @click.stop>
          <slot name="actions" :item="item" />
        </div>
      </div>
    </div>
  </div>

  <div v-else class="overflow-hidden rounded-xl border">
    <div
      v-for="item in items"
      :key="item.id"
      class="flex items-center gap-4 border-b p-3 last:border-b-0 hover:bg-muted/40"
    >
      <button
        type="button"
        class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted"
        @click="openItem(item)"
      >
        <img
          v-if="mainAsset(item) && isImageAsset(mainAsset(item)) && previewUrl(mainAsset(item))"
          :src="previewUrl(mainAsset(item))!"
          :alt="item.title"
          class="h-full w-full object-cover"
        >
        <video
          v-else-if="mainAsset(item) && isVideoAsset(mainAsset(item)) && previewUrl(mainAsset(item))"
          :src="previewUrl(mainAsset(item))!"
          class="h-full w-full object-cover"
          muted
          playsinline
        />
        <div v-else class="flex h-full items-center justify-center text-muted-foreground">
          <Icon name="lucide:image-off" class="h-5 w-5" />
        </div>
      </button>

      <button type="button" class="min-w-0 flex-1 text-left" @click="openItem(item)">
        <p class="line-clamp-1 font-medium hover:underline">
          {{ item.title }}
        </p>
        <p v-if="item.caption" class="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {{ item.caption }}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            v-for="platform in item.platforms"
            :key="`${item.id}-list-${platform}`"
            variant="outline"
          >
            <Icon :name="platformIcon(platform)" class="mr-1 h-3 w-3" />
            {{ platform }}
          </Badge>
          <Badge variant="secondary">
            {{ item.statusLabel }}
          </Badge>
          <span v-if="item.meta" class="text-xs text-muted-foreground">
            {{ item.meta }}
          </span>
        </div>
      </button>

      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2" @click.stop>
        <slot name="actions" :item="item" />
        <Button v-if="!asButton && item.href" as-child variant="outline" size="sm">
          <NuxtLink :to="item.href">
            Abrir
          </NuxtLink>
        </Button>
        <Button v-else-if="asButton" variant="outline" size="sm" @click="openItem(item)">
          Abrir
        </Button>
      </div>
    </div>
  </div>
</template>
