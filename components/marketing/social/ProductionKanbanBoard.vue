<script setup lang="ts">
import type { SocialProductionStatus } from '~/types/marketing-social'
import { SOCIAL_PRODUCTION_PRIORITY_LABELS, SOCIAL_PRODUCTION_STATUS_LABELS } from '~/types/marketing-social'

export interface ProductionKanbanCard {
  id: string
  tenant_id: string
  client_name: string
  title: string
  platforms: string[]
  formats: string[]
  production_status: SocialProductionStatus
  production_priority: string
  production_due_at: string | null
  blocked_reason: string | null
  editorial_status: string | null
  publication_status: string | null
  current_version: number
  open_tasks_count: number
  overdue: boolean
  preview_url: string | null
  href: string
}

const props = defineProps<{
  columns: readonly SocialProductionStatus[]
  cards: ProductionKanbanCard[]
  canMove: boolean
}>()

const emit = defineEmits<{
  move: [payload: { postId: string, tenantId: string, toStatus: SocialProductionStatus }]
}>()

const draggingId = ref<string | null>(null)

const cardsByColumn = computed(() => {
  const map = {} as Record<SocialProductionStatus, ProductionKanbanCard[]>
  for (const column of props.columns)
    map[column] = []
  for (const card of props.cards) {
    const key = card.production_status in map ? card.production_status : 'backlog'
    map[key as SocialProductionStatus].push(card)
  }
  return map
})

function onDragStart(event: DragEvent, card: ProductionKanbanCard) {
  if (!props.canMove)
    return
  draggingId.value = card.id
  event.dataTransfer?.setData('text/plain', JSON.stringify({
    postId: card.id,
    tenantId: card.tenant_id,
    fromStatus: card.production_status,
  }))
  event.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(event: DragEvent) {
  if (!props.canMove)
    return
  event.preventDefault()
}

function onDrop(event: DragEvent, toStatus: SocialProductionStatus) {
  if (!props.canMove)
    return
  event.preventDefault()
  const raw = event.dataTransfer?.getData('text/plain')
  draggingId.value = null
  if (!raw)
    return
  try {
    const payload = JSON.parse(raw) as { postId: string, tenantId: string, fromStatus: string }
    if (payload.fromStatus === toStatus)
      return
    emit('move', { postId: payload.postId, tenantId: payload.tenantId, toStatus })
  }
  catch {
    // ignore malformed drag payload
  }
}

function formatDue(value: string | null) {
  if (!value)
    return null
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function platformIcon(platform: string) {
  if (platform === 'instagram')
    return 'lucide:instagram'
  if (platform === 'facebook')
    return 'lucide:facebook'
  if (platform === 'linkedin')
    return 'lucide:linkedin'
  return 'lucide:share-2'
}
</script>

<template>
  <div class="flex gap-3 overflow-x-auto pb-4">
    <div
      v-for="column in columns"
      :key="column"
      class="w-72 shrink-0 flex flex-col rounded-xl border bg-muted/30"
      @dragover="onDragOver"
      @drop="onDrop($event, column)"
    >
      <div class="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div>
          <p class="text-sm font-semibold">
            {{ SOCIAL_PRODUCTION_STATUS_LABELS[column] }}
          </p>
          <p class="text-[11px] text-muted-foreground">
            {{ cardsByColumn[column]?.length || 0 }} itens
          </p>
        </div>
        <Badge
          v-if="column === 'blocked'"
          variant="destructive"
          class="text-[10px]"
        >
          Atenção
        </Badge>
      </div>

      <div class="min-h-40 flex flex-col gap-2 p-2">
        <button
          v-for="card in cardsByColumn[column]"
          :key="card.id"
          type="button"
          class="rounded-lg border bg-background p-2.5 text-left shadow-sm transition hover:border-primary/40"
          :class="draggingId === card.id ? 'opacity-60' : ''"
          :draggable="canMove"
          @dragstart="onDragStart($event, card)"
          @dragend="draggingId = null"
          @click="navigateTo(card.href)"
        >
          <div class="mb-2 flex items-start gap-2">
            <div
              v-if="card.preview_url"
              class="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted"
            >
              <img :src="card.preview_url" alt="" class="h-full w-full object-cover">
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs text-muted-foreground">
                {{ card.client_name }}
              </p>
              <p class="line-clamp-2 text-sm font-medium">
                {{ card.title }}
              </p>
            </div>
          </div>

          <div class="mb-2 flex flex-wrap items-center gap-1">
            <Badge variant="outline" class="text-[10px]">
              v{{ card.current_version }}
            </Badge>
            <Badge variant="secondary" class="text-[10px]">
              {{ SOCIAL_PRODUCTION_PRIORITY_LABELS[card.production_priority as keyof typeof SOCIAL_PRODUCTION_PRIORITY_LABELS] || card.production_priority }}
            </Badge>
            <Badge
              v-if="card.overdue"
              variant="destructive"
              class="text-[10px]"
            >
              Atrasado
            </Badge>
          </div>

          <div class="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <div class="flex items-center gap-1">
              <Icon
                v-for="platform in card.platforms.slice(0, 3)"
                :key="platform"
                :name="platformIcon(platform)"
                class="h-3.5 w-3.5"
              />
              <span v-if="card.formats[0]" class="ml-1">{{ card.formats[0] }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="card.open_tasks_count" class="inline-flex items-center gap-0.5">
                <Icon name="lucide:list-checks" class="h-3 w-3" />
                {{ card.open_tasks_count }}
              </span>
              <span v-if="formatDue(card.production_due_at)">
                {{ formatDue(card.production_due_at) }}
              </span>
            </div>
          </div>

          <p
            v-if="card.blocked_reason"
            class="mt-2 line-clamp-2 text-[11px] text-destructive"
          >
            {{ card.blocked_reason }}
          </p>
        </button>

        <p
          v-if="!(cardsByColumn[column]?.length)"
          class="px-2 py-6 text-center text-xs text-muted-foreground"
        >
          Vazio
        </p>
      </div>
    </div>
  </div>
</template>
