<script setup lang="ts">
import type { MarketingMvpStatus } from '~/types/marketing-mvp'
import type { SocialContentBoardItem } from '@/utils/marketing-social-preview'
import {
  isImageAsset,
  isVideoAsset,
  platformIcon,
  previewUrl,
  primaryPreviewAsset,
} from '@/utils/marketing-social-preview'
import MarketingMvpStatusBadge from '~/components/marketing/MarketingMvpStatusBadge.vue'

const props = withDefaults(defineProps<{
  item: SocialContentBoardItem
  layout?: 'thumb' | 'list'
  asButton?: boolean
}>(), {
  layout: 'thumb',
  asButton: false,
})

const emit = defineEmits<{
  open: [item: SocialContentBoardItem]
}>()

const mainAsset = computed(() => primaryPreviewAsset(props.item.previewAssets))
const mvpStatus = computed(() => props.item.mvpStatus as MarketingMvpStatus | null | undefined)

function openItem() {
  if (props.asButton) {
    emit('open', props.item)
    return
  }
  if (props.item.href)
    navigateTo(props.item.href)
}
</script>

<template>
  <div
    v-if="layout === 'thumb'"
    class="group overflow-hidden rounded-xl border bg-card transition hover:border-primary/40 hover:shadow-sm"
  >
    <button
      type="button"
      class="relative block aspect-square w-full overflow-hidden bg-muted text-left"
      @click="openItem"
    >
      <img
        v-if="mainAsset && isImageAsset(mainAsset) && previewUrl(mainAsset)"
        :src="previewUrl(mainAsset)!"
        :alt="item.title"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
      >
      <video
        v-else-if="mainAsset && isVideoAsset(mainAsset) && previewUrl(mainAsset)"
        :src="previewUrl(mainAsset)!"
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

      <MarketingMvpStatusBadge
        v-if="mvpStatus"
        :status="mvpStatus"
        class="absolute bottom-2 right-2 bg-background/90 backdrop-blur"
      />
      <Badge
        v-else
        class="absolute bottom-2 right-2 bg-background/90 text-foreground backdrop-blur"
        variant="outline"
      >
        {{ item.statusLabel }}
      </Badge>
    </button>

    <div class="space-y-2 p-3">
      <button type="button" class="w-full text-left" @click="openItem">
        <p class="line-clamp-1 font-medium">
          {{ item.title }}
        </p>
        <p v-if="item.caption" class="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {{ item.caption }}
        </p>
        <p v-if="item.campaignLabel || item.assigneeLabel" class="mt-1 line-clamp-1 text-xs text-muted-foreground">
          <span v-if="item.campaignLabel">{{ item.campaignLabel }}</span>
          <span v-if="item.campaignLabel && item.assigneeLabel"> · </span>
          <span v-if="item.assigneeLabel">{{ item.assigneeLabel }}</span>
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

  <div
    v-else
    class="flex items-center gap-4 border-b p-3 last:border-b-0 hover:bg-muted/40"
  >
    <button
      type="button"
      class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted"
      @click="openItem"
    >
      <img
        v-if="mainAsset && isImageAsset(mainAsset) && previewUrl(mainAsset)"
        :src="previewUrl(mainAsset)!"
        :alt="item.title"
        class="h-full w-full object-cover"
      >
      <video
        v-else-if="mainAsset && isVideoAsset(mainAsset) && previewUrl(mainAsset)"
        :src="previewUrl(mainAsset)!"
        class="h-full w-full object-cover"
        muted
        playsinline
      />
      <div v-else class="flex h-full items-center justify-center text-muted-foreground">
        <Icon name="lucide:image-off" class="h-5 w-5" />
      </div>
    </button>

    <button type="button" class="min-w-0 flex-1 text-left" @click="openItem">
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
        <MarketingMvpStatusBadge v-if="mvpStatus" :status="mvpStatus" />
        <Badge v-else variant="secondary">
          {{ item.statusLabel }}
        </Badge>
        <span v-if="item.campaignLabel" class="text-xs text-muted-foreground">
          {{ item.campaignLabel }}
        </span>
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
      <Button v-else-if="asButton" variant="outline" size="sm" @click="openItem">
        Abrir
      </Button>
    </div>
  </div>
</template>
