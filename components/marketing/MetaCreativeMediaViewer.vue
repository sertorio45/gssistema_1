<script setup lang="ts">
import type { MetaAdCreativePayload, MetaCreativeMediaItem, MetaCreativeType } from '~/types/meta-creatives'

import type { Ref } from 'vue'

import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import Sheet from '@/components/ui/sheet/Sheet.vue'
import SheetContent from '@/components/ui/sheet/SheetContent.vue'
import SheetTitle from '@/components/ui/sheet/SheetTitle.vue'

import { hqMetaEmbedHtml, hqMetaPictureUrl } from '@/lib/meta-media'
import { cn } from '@/lib/utils'

const props = defineProps<{
  creative: MetaAdCreativePayload | null
}>()

const open = defineModel<boolean>({ default: false })

const carouselIdx = ref(0)
const nestedOpen = ref(false)
const nestedMedia = ref<MetaCreativeMediaItem | null>(null)
/** 'lightbox' | 'video' | 'video_preview' */
const nestedVariant = ref<'lightbox' | 'video' | 'video_preview'>('lightbox')
const videoRef = ref<HTMLVideoElement | null>(null)
const nestedVideoRef = ref<HTMLVideoElement | null>(null)

function pauseVideo(r: Ref<HTMLVideoElement | null>) {
  nextTick(() => r.value?.pause())
}

watch(open, (v) => {
  if (!v) {
    carouselIdx.value = 0
    nestedOpen.value = false
    nestedMedia.value = null
    pauseVideo(videoRef)
    pauseVideo(nestedVideoRef)
  }
})

watch(() => props.creative?.ad_id, () => {
  nestedOpen.value = false
  nestedMedia.value = null
})

watch(nestedOpen, (v) => {
  if (!v)
    pauseVideo(nestedVideoRef)
})

if (import.meta.client) {
  watch(
    () => open.value || nestedOpen.value,
    (lock) => {
      document.body.style.overflow = lock ? 'hidden' : ''
    },
    { immediate: true },
  )
}

const medias = computed(() => props.creative?.medias ?? [])

/** Evita cadeia v-if sem match (API / casing / valor inesperado) — sem branch = drawer/modal não monta */
function normalizeCreativeType(raw: unknown, mediasCount: number): MetaCreativeType {
  const s = typeof raw === 'string' ? raw.toLowerCase().trim() : ''
  if (s === 'image' || s === 'video' || s === 'carousel' || s === 'dynamic')
    return s
  if (mediasCount > 1)
    return 'dynamic'
  return 'image'
}

const type = computed(() =>
  normalizeCreativeType(props.creative?.creative_type, medias.value.length),
)
const carouselLen = computed(() => medias.value.length)

function prevCarousel() {
  if (!carouselLen.value)
    return
  carouselIdx.value = (carouselIdx.value - 1 + carouselLen.value) % carouselLen.value
}

function nextCarousel() {
  if (!carouselLen.value)
    return
  carouselIdx.value = (carouselIdx.value + 1) % carouselLen.value
}

/** Vídeo: type, video_id, ou URL de ficheiro de vídeo (Meta nem sempre devolve type fiável após JSON) */
function isVideoAsset(m: MetaCreativeMediaItem): boolean {
  const t = typeof m.type === 'string' ? m.type.toLowerCase().trim() : ''
  if (t === 'video')
    return true
  if (m.video_id != null && String(m.video_id).trim() !== '')
    return true
  const u = (m.url && String(m.url).trim()) || ''
  if (u && /\.(mp4|m3u8|webm|mov)(\?|#|$)/i.test((u.split('?')[0] ?? '')))
    return true
  return false
}

/** Não passar JPG/PNG para <video> — usar preview ou lightbox */
function urlLooksLikeRasterImage(url: string): boolean {
  const path = (url.split('?')[0] ?? '').toLowerCase()
  return /\.(jpg|jpeg|png|gif|webp|bmp|avif)(\?|#|$)/i.test(path)
}

function playableMp4Url(m: MetaCreativeMediaItem | null): boolean {
  const u = m?.url && String(m.url).trim()
  return !!(u && !urlLooksLikeRasterImage(u))
}

function drawerThumbSrc(m: MetaCreativeMediaItem): string {
  const raw = m.thumbnail || m.url || ''
  if (m.type === 'video' && raw)
    return hqMetaPictureUrl(raw) || raw
  return raw
}

function openDynamicItem(m: MetaCreativeMediaItem) {
  nestedMedia.value = m
  const hasEmbed = !!(m.embed_html && String(m.embed_html).trim())

  if (isVideoAsset(m)) {
    if (playableMp4Url(m) || hasEmbed)
      nestedVariant.value = 'video'
    else
      nestedVariant.value = 'video_preview'
  }
  else {
    nestedVariant.value = 'lightbox'
  }
  nestedOpen.value = true
}

const carouselCurrent = computed(() => medias.value[carouselIdx.value] ?? null)

let touchStartX = 0
function onTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0]?.clientX ?? 0
}
function onTouchEnd(e: TouchEvent) {
  const x = e.changedTouches[0]?.clientX ?? 0
  const d = x - touchStartX
  if (Math.abs(d) < 48)
    return
  if (d < 0)
    nextCarousel()
  else
    prevCarousel()
}

onKeyStroke('Escape', () => {
  if (nestedOpen.value)
    nestedOpen.value = false
})

onUnmounted(() => {
  if (import.meta.client)
    document.body.style.overflow = ''
})
</script>

<template>
  <!-- Imagem única -->
  <Dialog v-if="creative && type === 'image'" :key="`img-${creative.ad_id}`" v-model:open="open">
    <DialogContent
      class="max-h-[95vh] max-w-[95vw] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[95vw]"
      @pointer-down-outside="open = false"
    >
      <DialogTitle class="sr-only">
        {{ creative.ad_name || 'Creative' }}
      </DialogTitle>
      <div
        class="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center"
        @click.self="open = false"
      >
        <img
          v-if="medias[0]?.url"
          :src="medias[0].url"
          :alt="creative.ad_name || ''"
          class="max-h-[90vh] max-w-[90vw] object-contain"
        >
      </div>
    </DialogContent>
  </Dialog>

  <!-- Vídeo único -->
  <Dialog v-else-if="creative && type === 'video'" :key="`vid-${creative.ad_id}`" v-model:open="open">
    <DialogContent
      class="max-h-[90vh] w-[min(100vw,80rem)] max-w-[95vw] border bg-background p-4 sm:p-6"
    >
      <DialogTitle class="sr-only">
        {{ creative.ad_name || 'Vídeo' }}
      </DialogTitle>
      <video
        v-if="medias[0] && playableMp4Url(medias[0])"
        ref="videoRef"
        :src="medias[0].url"
        class="mx-auto max-h-[min(80vh,720px)] w-full rounded-md bg-black"
        controls
        playsinline
        preload="metadata"
      />
      <div
        v-else-if="medias[0]?.embed_html"
        class="mx-auto w-full max-w-[min(100vw,1280px)] overflow-hidden rounded-md bg-black [&_iframe]:max-h-[min(80vh,720px)] [&_iframe]:w-full"
        v-html="hqMetaEmbedHtml(medias[0].embed_html)"
      />
      <div v-else-if="medias[0]?.preview_only || (!playableMp4Url(medias[0]) && !medias[0]?.embed_html)" class="space-y-3 text-center">
        <div class="relative mx-auto max-w-2xl">
          <img
            v-if="medias[0]?.thumbnail"
            :src="hqMetaPictureUrl(medias[0].thumbnail) || medias[0].thumbnail"
            alt=""
            class="max-h-[min(80vh,720px)] w-full rounded-md object-contain"
          >
          <Badge class="absolute left-2 top-2 bg-amber-600/90 text-white hover:bg-amber-600">
            Preview only
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          MP4 unavailable — check page permissions on Meta.
        </p>
      </div>
      <p v-else class="text-center text-sm text-muted-foreground">
        Video unavailable.
      </p>
    </DialogContent>
  </Dialog>

  <!-- Carrossel -->
  <Dialog v-else-if="creative && type === 'carousel'" :key="`car-${creative.ad_id}`" v-model:open="open">
    <DialogContent
      class="max-h-[95vh] w-[min(100vw,56rem)] max-w-[95vw] border bg-background p-4 sm:p-6"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <DialogTitle class="sr-only">
        {{ creative.ad_name || 'Carrossel' }}
      </DialogTitle>
      <div v-if="carouselCurrent" class="space-y-3">
        <div class="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-lg bg-black/5">
          <template v-if="carouselCurrent.type === 'video'">
            <video
              v-if="playableMp4Url(carouselCurrent)"
              ref="videoRef"
              :key="`v-${carouselIdx}`"
              :src="carouselCurrent.url"
              class="max-h-[min(75vh,640px)] w-full object-contain"
              controls
              playsinline
              preload="metadata"
            />
            <div
              v-else-if="carouselCurrent.embed_html"
              :key="`e-${carouselIdx}`"
              class="max-h-[min(75vh,640px)] w-full overflow-hidden rounded-lg [&_iframe]:max-h-[min(75vh,640px)] [&_iframe]:w-full"
              v-html="hqMetaEmbedHtml(carouselCurrent.embed_html)"
            />
            <div v-else class="relative w-full">
              <img
                v-if="carouselCurrent.thumbnail"
                :src="hqMetaPictureUrl(carouselCurrent.thumbnail) || carouselCurrent.thumbnail"
                alt=""
                class="max-h-[min(75vh,640px)] w-full object-contain"
              >
              <Badge class="absolute left-2 top-2 bg-amber-600/90 text-white">Preview only</Badge>
            </div>
          </template>
          <img
            v-else-if="carouselCurrent.type === 'image' && carouselCurrent.url"
            :key="`i-${carouselIdx}`"
            :src="carouselCurrent.url"
            :alt="`${carouselIdx + 1}`"
            class="max-h-[min(75vh,640px)] w-full object-contain"
          >
        </div>
        <div class="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="icon" aria-label="Previous" @click="prevCarousel">
            <Icon name="lucide:chevron-left" class="h-5 w-5" />
          </Button>
          <span class="text-sm text-muted-foreground tabular-nums">{{ carouselIdx + 1 }} / {{ carouselLen }}</span>
          <Button type="button" variant="outline" size="icon" aria-label="Next" @click="nextCarousel">
            <Icon name="lucide:chevron-right" class="h-5 w-5" />
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Dynamic / Advantage+ — drawer only -->
  <Sheet
    v-else-if="creative && type === 'dynamic'"
    :key="`dyn-${creative.ad_id}`"
    v-model:open="open"
  >
    <SheetContent
      side="right"
      overlay-class="z-[100]"
      class="z-[100] flex h-full w-full flex-col gap-0 overflow-hidden border-l bg-background p-0 shadow-xl transition-transform duration-300 ease-out sm:max-w-[480px]"
    >
      <SheetTitle class="sr-only">
        {{ creative.ad_name || 'Creative assets' }}
      </SheetTitle>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-14">
        <div class="grid grid-cols-2 gap-2.5">
          <button
            v-for="(m, idx) in medias"
            :key="`${m.type}-${idx}-${m.video_id || m.url?.slice(-8)}`"
            type="button"
            class="group relative aspect-square overflow-hidden rounded-xl border border-border/80 bg-muted/40 text-left shadow-sm outline-none transition hover:border-border focus-visible:ring-2 focus-visible:ring-ring"
            @click="openDynamicItem(m)"
          >
            <img
              v-if="m.thumbnail || m.url"
              :src="drawerThumbSrc(m)"
              :alt="`Asset ${idx + 1}`"
              class="h-full w-full object-cover transition group-hover:opacity-95"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-muted-foreground"
            >
              <Icon name="lucide:image-off" class="h-8 w-8 opacity-50" />
            </div>
            <span
              v-if="m.type === 'video'"
              class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25"
            >
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white shadow-md">
                <Icon name="lucide:play" class="ml-0.5 h-6 w-6" />
              </span>
            </span>
            <Badge
              v-if="m.type === 'video' && m.preview_only && !m.embed_html"
              class="absolute left-2 top-2 bg-amber-600/90 text-[10px] text-white hover:bg-amber-600"
            >
              Preview only
            </Badge>
            <span class="absolute bottom-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
              {{ m.type === 'video' ? 'Video' : 'Image' }}
            </span>
          </button>
        </div>
      </div>
    </SheetContent>
  </Sheet>

  <!-- Nested: dynamic asset → lightbox / video / preview-only -->
  <Dialog v-model:open="nestedOpen">
    <DialogContent
      overlay-class="z-[155]"
      :class="cn(
        'z-[160] max-h-[95vh] max-w-[95vw] sm:max-w-[95vw]',
        nestedVariant === 'lightbox'
          ? 'overflow-hidden border-0 bg-transparent p-0 shadow-none'
          : 'border bg-background p-4',
      )"
      @pointer-down-outside="nestedOpen = false"
    >
      <DialogTitle class="sr-only">
        {{ nestedVariant === 'lightbox' ? 'Image' : nestedVariant === 'video' ? 'Video' : 'Video preview' }}
      </DialogTitle>

      <div
        v-if="nestedVariant === 'lightbox'"
        class="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center"
        @click.self="nestedOpen = false"
      >
        <img
          v-if="nestedMedia?.url"
          :src="nestedMedia.url"
          alt=""
          class="max-h-[90vh] max-w-[90vw] object-contain"
        >
      </div>

      <div v-else-if="nestedVariant === 'video_preview'" class="relative mx-auto max-w-3xl space-y-3 text-center">
        <img
          v-if="nestedMedia?.thumbnail"
          :src="hqMetaPictureUrl(nestedMedia.thumbnail) || nestedMedia.thumbnail"
          alt=""
          class="max-h-[min(85vh,720px)] w-full rounded-md object-contain"
        >
        <Badge class="bg-amber-600/90 text-white hover:bg-amber-600">
          Preview only — MP4 unavailable
        </Badge>
        <p class="text-xs text-muted-foreground">
          Token may lack access to the page that owns this video.
        </p>
      </div>

      <video
        v-else-if="nestedVariant === 'video' && playableMp4Url(nestedMedia)"
        ref="nestedVideoRef"
        :src="nestedMedia!.url"
        class="mx-auto max-h-[min(85vh,720px)] w-full rounded-md bg-black"
        controls
        playsinline
        preload="metadata"
      />
      <div
        v-else-if="nestedVariant === 'video' && nestedMedia?.embed_html"
        class="mx-auto w-full max-w-[min(95vw,1280px)] overflow-hidden rounded-md bg-black [&_iframe]:max-h-[min(85vh,720px)] [&_iframe]:w-full"
        v-html="hqMetaEmbedHtml(nestedMedia.embed_html)"
      />
    </DialogContent>
  </Dialog>
</template>
