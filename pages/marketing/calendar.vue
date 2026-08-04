<script setup lang="ts">
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'vue-sonner'
import {
  isImageAsset,
  isVideoAsset,
  previewUrl,
  primaryPreviewAsset,
  uniquePostPreviewAssets,
} from '@/utils/marketing-social-preview'
import { findCalendarConflicts, findCalendarGaps } from '@/utils/social-calendar'
import { useMarketingAudience } from '~/composables/marketing/useMarketingAudience'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth'],
  title: 'Calendário editorial',
})

type CalendarView = 'month' | 'week' | 'list'

const social = useMarketingSocial()
const { can } = useWorkspace()
const { isClientExperience } = useMarketingAudience()
const view = ref<CalendarView>('month')
const anchor = ref(startOfMonth(new Date()))
const draggingPostId = ref<string | null>(null)
const rescheduling = ref(false)

const filters = ref({
  campaignId: 'all',
  platform: 'all',
  editorialStatus: 'all',
  publicationStatus: 'all',
})

const canSchedule = computed(() => can('marketing.social.schedule'))
const canCreate = computed(() => can('marketing.social.create'))

const pageTitle = computed(() => 'Calendário editorial')

const pageDescription = computed(() =>
  isClientExperience.value
    ? 'Acompanhe o que está agendado e o que já foi publicado nas suas redes.'
    : 'Mês, semana e lista — com filtros, arrastar para remarcar e alertas de conflito.',
)

const availableViews = computed(() => {
  if (isClientExperience.value)
    return [['month', 'Mês'], ['list', 'Lista']] as const
  return [['month', 'Mês'], ['week', 'Semana'], ['list', 'Lista']] as const
})

watch(isClientExperience, (client) => {
  if (client && view.value === 'week')
    view.value = 'month'
}, { immediate: true })

const interval = computed(() => {
  if (view.value === 'week') {
    return {
      start: startOfWeek(anchor.value, { weekStartsOn: 0 }),
      end: endOfWeek(anchor.value, { weekStartsOn: 0 }),
    }
  }
  if (view.value === 'list') {
    return {
      start: startOfWeek(anchor.value, { weekStartsOn: 0 }),
      end: addDays(startOfWeek(anchor.value, { weekStartsOn: 0 }), 27),
    }
  }
  return {
    start: startOfWeek(startOfMonth(anchor.value), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(anchor.value), { weekStartsOn: 0 }),
  }
})

const periodLabel = computed(() => {
  if (view.value === 'week')
    return `${format(interval.value.start, 'd MMM', { locale: ptBR })} – ${format(interval.value.end, 'd MMM yyyy', { locale: ptBR })}`
  if (view.value === 'list')
    return `Lista · ${format(interval.value.start, 'd MMM', { locale: ptBR })} – ${format(interval.value.end, 'd MMM yyyy', { locale: ptBR })}`
  return format(anchor.value, 'MMMM yyyy', { locale: ptBR })
})

const { data: response, showSkeleton, refresh } = useMarketingFetch({
  key: () => `marketing-calendar-${social.tenantId.value}-${format(interval.value.start, 'yyyy-MM-dd')}-${format(interval.value.end, 'yyyy-MM-dd')}-${JSON.stringify(filters.value)}`,
  handler: () => social.listPosts({
    start: interval.value.start.toISOString(),
    end: interval.value.end.toISOString(),
    page_size: 100,
    campaign_id: filters.value.campaignId !== 'all' ? filters.value.campaignId : undefined,
    platform: filters.value.platform !== 'all' ? filters.value.platform : undefined,
    editorial_status: filters.value.editorialStatus !== 'all' ? filters.value.editorialStatus : undefined,
    publication_status: filters.value.publicationStatus !== 'all' ? filters.value.publicationStatus : undefined,
  }),
  default: () => ({ data: [] as any[], pagination: {} as Record<string, unknown> }),
  watch: [social.tenantId, interval, filters],
  enabled: () => Boolean(social.tenantId.value),
})

const { data: campaignsResponse } = useMarketingFetch({
  key: () => `calendar-campaigns-${social.tenantId.value}-${isClientExperience.value ? 'client' : 'agency'}`,
  handler: () => $fetch<{ data: any[] }>('/api/marketing/social/campaigns', {
    query: { tenant_id: social.tenantId.value || undefined, status: 'all' },
  }).catch(() => ({ data: [] as any[] })),
  default: () => ({ data: [] as any[] }),
  watch: [social.tenantId, isClientExperience],
  enabled: () => !isClientExperience.value && Boolean(social.tenantId.value),
})
const posts = computed(() => (response.value?.data || []) as any[])
const days = computed(() => eachDayOfInterval(interval.value))
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const conflicts = computed(() => findCalendarConflicts(posts.value))
const gapDays = computed(() => findCalendarGaps(days.value, posts.value))
const conflictDaySet = computed(() => new Set(conflicts.value.map(c => c.day)))
const gapDaySet = computed(() => new Set(gapDays.value))

const listPosts = computed(() =>
  [...posts.value]
    .filter(p => p.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
)

function postsForDay(day: Date) {
  return posts.value.filter(post =>
    post.scheduled_at && isSameDay(new Date(post.scheduled_at), day),
  )
}

function postThumb(post: any) {
  return primaryPreviewAsset(uniquePostPreviewAssets(post))
}

function platformsLabel(post: any) {
  const platforms = [...new Set((post.social_post_variants || []).map((v: any) => v.platform))]
  return platforms.join(', ') || '—'
}

function goPrev() {
  if (view.value === 'week' || view.value === 'list')
    anchor.value = subWeeks(anchor.value, view.value === 'list' ? 4 : 1)
  else
    anchor.value = subMonths(anchor.value, 1)
}

function goNext() {
  if (view.value === 'week' || view.value === 'list')
    anchor.value = addWeeks(anchor.value, view.value === 'list' ? 4 : 1)
  else
    anchor.value = addMonths(anchor.value, 1)
}

function goToday() {
  anchor.value = view.value === 'month' ? startOfMonth(new Date()) : new Date()
}

function onDragStart(postId: string, event: DragEvent) {
  if (!canSchedule.value)
    return
  draggingPostId.value = postId
  event.dataTransfer?.setData('text/plain', postId)
  if (event.dataTransfer)
    event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  draggingPostId.value = null
}

async function onDropDay(day: Date, event: DragEvent) {
  event.preventDefault()
  if (isClientExperience.value)
    return
  const postId = event.dataTransfer?.getData('text/plain') || draggingPostId.value
  draggingPostId.value = null
  if (!postId || !canSchedule.value)
    return

  const post = posts.value.find(p => p.id === postId)
  if (!post?.scheduled_at)
    return

  const previous = new Date(post.scheduled_at)
  const next = new Date(day)
  next.setHours(previous.getHours(), previous.getMinutes(), previous.getSeconds(), previous.getMilliseconds())
  if (isSameDay(previous, next))
    return

  rescheduling.value = true
  try {
    await social.reschedulePost(postId, next.toISOString())
    toast.success('Data atualizada')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Não foi possível remarcar')
  }
  finally {
    rescheduling.value = false
  }
}

async function duplicate(postId: string) {
  try {
    const copy = await social.duplicatePost(postId)
    toast.success('Publicação duplicada')
    navigateTo(`/marketing/posts/${copy.id}`)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Falha ao duplicar')
  }
}

function quickCreate(day?: Date) {
  const query: Record<string, string> = {}
  if (day)
    query.scheduledAt = day.toISOString()
  navigateTo({ path: '/marketing/posts/new', query })
}

const editorialLabels: Record<string, string> = {
  draft: 'Rascunho',
  in_review: 'Em revisão',
  changes_requested: 'Alterações',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

const publicationLabels: Record<string, string> = {
  not_scheduled: 'Sem agenda',
  scheduled: 'Agendado',
  publishing: 'Publicando',
  published: 'Publicado',
  failed: 'Falhou',
  partially_published: 'Parcial',
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          {{ pageTitle }}
        </h1>
        <p class="mt-1 text-muted-foreground">
          {{ pageDescription }}
        </p>
      </div>
      <div v-if="canCreate" class="flex flex-wrap gap-2">
        <Button v-if="!isClientExperience" variant="outline" @click="quickCreate()">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Criação rápida
        </Button>
        <Button @click="navigateTo('/marketing/posts/new')">
          <Icon name="lucide:file-plus" class="mr-2 h-4 w-4" />
          Nova publicação
        </Button>
      </div>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-3 p-4 lg:flex-row lg:flex-wrap">
        <div class="flex gap-1">
          <Button
            v-for="option in availableViews"
            :key="option[0]"
            size="sm"
            :variant="view === option[0] ? 'default' : 'outline'"
            @click="view = option[0]"
          >
            {{ option[1] }}
          </Button>
        </div>
        <Select v-if="!isClientExperience" v-model="filters.campaignId">
          <SelectTrigger class="w-full lg:w-48">
            <SelectValue placeholder="Campanha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todas as campanhas
            </SelectItem>
            <SelectItem
              v-for="campaign in campaignsResponse?.data || []"
              :key="campaign.id"
              :value="campaign.id"
            >
              {{ campaign.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filters.platform">
          <SelectTrigger class="w-full lg:w-40">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todas
            </SelectItem>
            <SelectItem value="instagram">
              Instagram
            </SelectItem>
            <SelectItem value="facebook">
              Facebook
            </SelectItem>
            <SelectItem value="linkedin">
              LinkedIn
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-if="!isClientExperience" v-model="filters.editorialStatus">
          <SelectTrigger class="w-full lg:w-44">
            <SelectValue placeholder="Aprovação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Aprovação: todas
            </SelectItem>
            <SelectItem v-for="(label, value) in editorialLabels" :key="value" :value="value">
              {{ label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filters.publicationStatus">
          <SelectTrigger class="w-full lg:w-44">
            <SelectValue placeholder="Publicação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Publicação: todas
            </SelectItem>
            <SelectItem v-for="(label, value) in publicationLabels" :key="value" :value="value">
              {{ label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>

    <MarketingPageSkeleton v-if="showSkeleton" variant="calendar" content-only />

    <template v-else>
    <div v-if="!isClientExperience && conflicts.length" class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <p class="font-medium text-amber-700 dark:text-amber-400">
        {{ conflicts.length }} dia(s) com conflito de agenda
      </p>
      <p class="mt-1 text-muted-foreground">
        Mais de uma publicação no mesmo dia: {{ conflicts.map(c => format(new Date(`${c.day}T12:00:00`), 'dd/MM')).join(', ') }}.
      </p>
    </div>

    <Card>
      <CardHeader class="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle class="capitalize">
            {{ periodLabel }}
          </CardTitle>
          <CardDescription>
            {{ posts.length }} item(ns)
            <span v-if="!isClientExperience && gapDays.length && view !== 'list'"> · {{ gapDays.length }} dia(s) sem conteúdo</span>
            <span v-if="rescheduling"> · remarcando…</span>
          </CardDescription>
        </div>
        <div class="flex gap-1">
          <Button variant="outline" size="icon" aria-label="Anterior" @click="goPrev">
            <Icon name="lucide:chevron-left" class="h-4 w-4" />
          </Button>
          <Button variant="outline" @click="goToday">
            Hoje
          </Button>
          <Button variant="outline" size="icon" aria-label="Próximo" @click="goNext">
            <Icon name="lucide:chevron-right" class="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="view === 'list'" class="space-y-2">
          <div
            v-for="post in listPosts"
            :key="post.id"
            class="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">
                {{ post.title }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ format(new Date(post.scheduled_at), "EEEE, d MMM · HH:mm", { locale: ptBR }) }}
                · {{ platformsLabel(post) }}
                <template v-if="!isClientExperience">
                  · {{ editorialLabels[post.editorial_status] || post.editorial_status || '—' }}
                </template>
                <template v-else>
                  · {{ publicationLabels[post.publication_status] || post.status || '—' }}
                </template>
              </p>
            </div>
            <div class="flex gap-2">
              <Button
                v-if="canCreate && !isClientExperience"
                size="sm"
                variant="outline"
                @click="duplicate(post.id)"
              >
                Duplicar
              </Button>
              <Button size="sm" variant="outline" @click="navigateTo(`/marketing/posts/${post.id}`)">
                Abrir
              </Button>
            </div>
          </div>
          <p v-if="!listPosts.length" class="text-sm text-muted-foreground">
            Nenhuma publicação agendada neste período.
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <div :class="view === 'week' ? 'min-w-[900px]' : 'min-w-[760px]'">
            <div class="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
              <div v-for="weekDay in weekDays" :key="weekDay" class="py-2">
                {{ weekDay }}
              </div>
            </div>
            <div class="grid grid-cols-7">
              <div
                v-for="day in days"
                :key="day.toISOString()"
                class="min-h-36 border-b border-r p-2 transition"
                :class="{
                  'bg-muted/30 text-muted-foreground': view === 'month' && !isSameMonth(day, anchor),
                  'ring-1 ring-inset ring-amber-500/50': !isClientExperience && conflictDaySet.has(format(day, 'yyyy-MM-dd')),
                  'bg-sky-500/5': !isClientExperience && gapDaySet.has(format(day, 'yyyy-MM-dd')) && (view === 'week' || isSameMonth(day, anchor)),
                }"
                @dragover.prevent
                @drop="onDropDay(day, $event)"
              >
                <div class="mb-2 flex items-center justify-between gap-1">
                  <button
                    v-if="canCreate"
                    type="button"
                    class="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Criar neste dia"
                    @click="quickCreate(day)"
                  >
                    <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                  </button>
                  <p class="ml-auto text-right text-xs font-medium">
                    {{ format(day, 'd') }}
                  </p>
                </div>
                <div
                  v-for="post in postsForDay(day)"
                  :key="post.id"
                  class="mb-2 flex w-full items-center gap-2 overflow-hidden rounded-lg border bg-card p-1.5 text-left transition"
                  :class="isClientExperience
                    ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/40'
                    : 'cursor-grab hover:border-primary/40 hover:bg-muted/40 active:cursor-grabbing'"
                  :draggable="canSchedule && !isClientExperience"
                  :title="post.title"
                  @dragstart="onDragStart(post.id, $event)"
                  @dragend="onDragEnd"
                  @click="navigateTo(`/marketing/posts/${post.id}`)"
                >
                  <div class="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    <img
                      v-if="postThumb(post) && isImageAsset(postThumb(post)) && previewUrl(postThumb(post))"
                      :src="previewUrl(postThumb(post))!"
                      :alt="post.title"
                      class="h-full w-full object-cover"
                    >
                    <video
                      v-else-if="postThumb(post) && isVideoAsset(postThumb(post)) && previewUrl(postThumb(post))"
                      :src="previewUrl(postThumb(post))!"
                      class="h-full w-full object-cover"
                      muted
                      playsinline
                    />
                    <div v-else class="flex h-full items-center justify-center text-muted-foreground">
                      <Icon name="lucide:image-off" class="h-4 w-4" />
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs font-medium text-foreground">
                      {{ post.title }}
                    </p>
                    <p class="text-[11px] text-muted-foreground">
                      {{ format(new Date(post.scheduled_at), 'HH:mm') }}
                      · {{ platformsLabel(post) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p v-if="canSchedule && !isClientExperience" class="mt-3 text-xs text-muted-foreground">
            Arraste um card para outro dia para remarcar (sem criar revisão de conteúdo).
          </p>
        </div>
      </CardContent>
    </Card>
    </template>
  </div>
</template>
