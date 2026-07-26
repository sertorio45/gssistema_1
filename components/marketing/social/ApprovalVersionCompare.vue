<script setup lang="ts">
import { uniqueApprovalPreviewAssets } from '@/utils/marketing-social-preview'
import ApprovalMediaPreview from '@/components/marketing/social/ApprovalMediaPreview.vue'

const props = defineProps<{
  currentSnapshot: any
  previousSnapshot: any | null
  currentVersionNumber: number | null
  previousVersionNumber: number | null
  authorId?: string | null
  createdAt?: string | null
  revisionReason?: string | null
}>()

function captions(snapshot: any) {
  return (snapshot?.variants || []).map((v: any) => ({
    platform: v.platform,
    caption: v.caption || '',
    hashtags: (v.hashtags || []).join(' '),
    link: v.link_url || '',
    format: v.format,
  }))
}

function changedFields(prev: any, curr: any) {
  const fields: string[] = []
  if (!prev)
    return ['Versão inicial']
  const prevCaps = captions(prev)
  const currCaps = captions(curr)
  if (JSON.stringify(prevCaps.map((c: { caption: string }) => c.caption)) !== JSON.stringify(currCaps.map((c: { caption: string }) => c.caption)))
    fields.push('Legenda')
  if (JSON.stringify(prevCaps.map((c: { hashtags: string }) => c.hashtags)) !== JSON.stringify(currCaps.map((c: { hashtags: string }) => c.hashtags)))
    fields.push('Hashtags')
  if (JSON.stringify(prevCaps.map((c: { link: string }) => c.link)) !== JSON.stringify(currCaps.map((c: { link: string }) => c.link)))
    fields.push('Link / CTA')
  if (JSON.stringify(prevCaps.map((c: { platform: string }) => c.platform)) !== JSON.stringify(currCaps.map((c: { platform: string }) => c.platform)))
    fields.push('Plataforma')
  if (JSON.stringify(prevCaps.map((c: { format: string }) => c.format)) !== JSON.stringify(currCaps.map((c: { format: string }) => c.format)))
    fields.push('Formato')
  const prevAssets = uniqueApprovalPreviewAssets({ content_versions: { snapshot: prev } })
  const currAssets = uniqueApprovalPreviewAssets({ content_versions: { snapshot: curr } })
  if (prevAssets.map(a => a.id).join() !== currAssets.map(a => a.id).join())
    fields.push('Mídia')
  const prevDate = prev?.post?.scheduled_at
  const currDate = curr?.post?.scheduled_at
  if (prevDate !== currDate)
    fields.push('Data de publicação')
  return fields.length ? fields : ['Sem alterações detectadas']
}

const currentAssets = computed(() =>
  uniqueApprovalPreviewAssets({ content_versions: { snapshot: props.currentSnapshot } }),
)
const previousAssets = computed(() =>
  props.previousSnapshot
    ? uniqueApprovalPreviewAssets({ content_versions: { snapshot: props.previousSnapshot } })
    : [],
)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant="secondary">
        v{{ previousVersionNumber || '—' }} → v{{ currentVersionNumber || '—' }}
      </Badge>
      <span v-if="createdAt" class="text-muted-foreground">
        {{ new Date(createdAt).toLocaleString('pt-BR') }}
      </span>
      <span v-if="authorId" class="text-muted-foreground">
        · Autor {{ authorId.slice(0, 8) }}…
      </span>
    </div>

    <div class="flex flex-wrap gap-2">
      <Badge
        v-for="field in changedFields(previousSnapshot, currentSnapshot)"
        :key="field"
        variant="outline"
      >
        {{ field }}
      </Badge>
    </div>

    <p v-if="revisionReason" class="rounded-lg border bg-muted/40 p-3 text-sm">
      <span class="font-medium">Motivo: </span>{{ revisionReason }}
    </p>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="space-y-2">
        <h4 class="text-sm font-medium">
          Versão anterior
        </h4>
        <ApprovalMediaPreview
          v-if="previousSnapshot"
          :assets="previousAssets"
        />
        <p v-else class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Não há versão anterior
        </p>
        <div
          v-for="cap in captions(previousSnapshot)"
          :key="`prev-${cap.platform}`"
          class="rounded-lg border p-3 text-sm"
        >
          <p class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            {{ cap.platform }}
          </p>
          <p class="whitespace-pre-wrap">
            {{ cap.caption || '—' }}
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-medium">
          Versão em aprovação
        </h4>
        <ApprovalMediaPreview :assets="currentAssets" />
        <div
          v-for="cap in captions(currentSnapshot)"
          :key="`curr-${cap.platform}`"
          class="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"
        >
          <p class="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            {{ cap.platform }}
          </p>
          <p class="whitespace-pre-wrap">
            {{ cap.caption || '—' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
