<script setup lang="ts">
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  isImageAsset,
  isVideoAsset,
  previewUrl,
  primaryPreviewAsset,
  uniquePostPreviewAssets,
} from '@/utils/marketing-social-preview'

definePageMeta({
  middleware: ['auth'],
  title: 'Calendário editorial',
})

const social = useMarketingSocial()
const currentMonth = ref(startOfMonth(new Date()))
const interval = computed(() => ({
  start: startOfWeek(startOfMonth(currentMonth.value), { weekStartsOn: 0 }),
  end: endOfWeek(endOfMonth(currentMonth.value), { weekStartsOn: 0 }),
}))

const { data: response, pending } = await useAsyncData(
  () => `marketing-calendar-${social.tenantId.value}-${format(currentMonth.value, 'yyyy-MM')}`,
  () => social.listPosts({
    start: interval.value.start.toISOString(),
    end: interval.value.end.toISOString(),
    page_size: 100,
  }),
  { watch: [social.tenantId, currentMonth], default: () => ({ data: [], pagination: {} }) },
)

const days = computed(() => eachDayOfInterval(interval.value))
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function postsForDay(day: Date) {
  return (response.value.data as any[]).filter(post =>
    post.scheduled_at && isSameDay(new Date(post.scheduled_at), day),
  )
}

function postThumb(post: any) {
  return primaryPreviewAsset(uniquePostPreviewAssets(post))
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Calendário editorial
        </h1>
        <p class="mt-1 text-muted-foreground">
          Visão mensal das publicações planejadas e enviadas.
        </p>
      </div>
      <Button @click="navigateTo('/marketing/production/new')">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Nova publicação
      </Button>
    </div>

    <Card>
      <CardHeader class="flex-row items-center justify-between">
        <div>
          <CardTitle class="capitalize">
            {{ format(currentMonth, 'MMMM yyyy', { locale: ptBR }) }}
          </CardTitle>
          <CardDescription>{{ response.data.length }} item(ns) neste período</CardDescription>
        </div>
        <div class="flex gap-1">
          <Button variant="outline" size="icon" aria-label="Mês anterior" @click="currentMonth = subMonths(currentMonth, 1)">
            <Icon name="lucide:chevron-left" class="h-4 w-4" />
          </Button>
          <Button variant="outline" @click="currentMonth = startOfMonth(new Date())">
            Hoje
          </Button>
          <Button variant="outline" size="icon" aria-label="Próximo mês" @click="currentMonth = addMonths(currentMonth, 1)">
            <Icon name="lucide:chevron-right" class="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="pending" class="h-[620px]" />
        <div v-else class="overflow-x-auto">
          <div class="min-w-[760px]">
            <div class="grid grid-cols-7 border-b text-center text-xs text-muted-foreground font-medium">
              <div v-for="weekDay in weekDays" :key="weekDay" class="py-2">
                {{ weekDay }}
              </div>
            </div>
            <div class="grid grid-cols-7">
              <div
                v-for="day in days"
                :key="day.toISOString()"
                class="min-h-36 border-b border-r p-2"
                :class="{ 'bg-muted/30 text-muted-foreground': !isSameMonth(day, currentMonth) }"
              >
                <p class="mb-2 text-right text-xs font-medium">
                  {{ format(day, 'd') }}
                </p>
                <button
                  v-for="post in postsForDay(day)"
                  :key="post.id"
                  type="button"
                  class="mb-2 flex w-full items-center gap-2 overflow-hidden rounded-lg border bg-card p-1.5 text-left transition hover:border-primary/40 hover:bg-muted/40"
                  :title="post.title"
                  @click="navigateTo(`/marketing/production/${post.id}`)"
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
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
