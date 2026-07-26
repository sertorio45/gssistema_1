<script setup lang="ts">
import {
  isImageAsset,
  isVideoAsset,
  previewUrl,
  type SocialPreviewAsset,
} from '@/utils/marketing-social-preview'

const props = defineProps<{
  assets: SocialPreviewAsset[]
  format?: string | null
}>()

const index = ref(0)

watch(() => props.assets, () => {
  index.value = 0
})

const current = computed(() => props.assets[index.value] || null)
const isCarousel = computed(() => props.assets.length > 1 || props.format === 'carousel')
</script>

<template>
  <div class="overflow-hidden rounded-xl border bg-muted">
    <div class="relative flex min-h-[240px] items-center justify-center bg-black/5 sm:min-h-[360px]">
      <template v-if="current">
        <img
          v-if="isImageAsset(current) && previewUrl(current)"
          :src="previewUrl(current)!"
          :alt="current.name || 'Preview'"
          class="max-h-[70vh] w-full object-contain"
        >
        <video
          v-else-if="isVideoAsset(current) && previewUrl(current)"
          :src="previewUrl(current)!"
          class="max-h-[70vh] w-full"
          controls
          playsinline
        />
        <div v-else class="flex flex-col items-center gap-2 p-8 text-muted-foreground">
          <Icon name="lucide:image-off" class="h-10 w-10" />
          <p class="text-sm">
            Mídia indisponível
          </p>
        </div>
      </template>
      <div v-else class="flex flex-col items-center gap-2 p-8 text-muted-foreground">
        <Icon name="lucide:image-off" class="h-10 w-10" />
        <p class="text-sm">
          Sem preview nesta versão
        </p>
      </div>

      <template v-if="isCarousel && assets.length > 1">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          class="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2"
          :disabled="index === 0"
          @click="index = Math.max(0, index - 1)"
        >
          <Icon name="lucide:chevron-left" class="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          class="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2"
          :disabled="index >= assets.length - 1"
          @click="index = Math.min(assets.length - 1, index + 1)"
        >
          <Icon name="lucide:chevron-right" class="h-4 w-4" />
        </Button>
        <div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          <span
            v-for="(_, i) in assets"
            :key="i"
            class="h-1.5 w-1.5 rounded-full"
            :class="i === index ? 'bg-primary' : 'bg-muted-foreground/40'"
          />
        </div>
      </template>
    </div>
    <div v-if="current?.name" class="truncate border-t bg-background px-3 py-2 text-xs text-muted-foreground">
      {{ current.name }}
      <span v-if="isCarousel"> · {{ index + 1 }}/{{ assets.length }}</span>
    </div>
  </div>
</template>
