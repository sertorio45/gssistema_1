<script setup lang="ts">
import type { Meeting } from '~/types/crm'
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

import { MEETING_STATUS_LABELS, MEETING_TYPE_LABELS } from '~/constants/meetings'

type CalendarView = 'month' | 'week' | 'list'

const props = defineProps<{
  meetings: Meeting[]
}>()

const emit = defineEmits<{
  select: [meeting: Meeting]
  create: [slot: { start: string, end: string }]
}>()

const view = ref<CalendarView>('month')
const anchor = ref(startOfMonth(new Date()))

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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
  if (view.value === 'week') {
    return `${format(interval.value.start, 'd MMM', { locale: ptBR })} – ${format(interval.value.end, 'd MMM yyyy', { locale: ptBR })}`
  }
  if (view.value === 'list') {
    return `Lista · ${format(interval.value.start, 'd MMM', { locale: ptBR })} – ${format(interval.value.end, 'd MMM yyyy', { locale: ptBR })}`
  }
  return format(anchor.value, 'MMMM yyyy', { locale: ptBR })
})

const days = computed(() => eachDayOfInterval(interval.value))

function meetingsForDay(day: Date) {
  return props.meetings.filter(meeting =>
    meeting.start_time && isSameDay(new Date(meeting.start_time), day),
  )
}

const listMeetings = computed(() =>
  [...props.meetings]
    .filter((meeting) => {
      if (!meeting.start_time)
        return false
      const at = new Date(meeting.start_time)
      return at >= interval.value.start && at <= interval.value.end
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
)

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

function defaultSlotForDay(day: Date) {
  const start = new Date(day)
  start.setHours(10, 0, 0, 0)
  const end = new Date(start)
  end.setHours(11, 0, 0, 0)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function onDayClick(day: Date) {
  emit('create', defaultSlotForDay(day))
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="goPrev">
          <Icon name="lucide:chevron-left" class="size-4" />
        </Button>
        <Button variant="outline" size="sm" @click="goToday">
          Hoje
        </Button>
        <Button variant="outline" size="sm" @click="goNext">
          <Icon name="lucide:chevron-right" class="size-4" />
        </Button>
        <p class="ml-2 text-sm font-medium capitalize">
          {{ periodLabel }}
        </p>
      </div>

      <Tabs v-model="view" class="w-full sm:w-auto">
        <TabsList>
          <TabsTrigger value="month">
            Mês
          </TabsTrigger>
          <TabsTrigger value="week">
            Semana
          </TabsTrigger>
          <TabsTrigger value="list">
            Lista
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    <div v-if="view === 'list'" class="space-y-2">
      <button
        v-for="meeting in listMeetings"
        :key="meeting.id"
        type="button"
        class="w-full flex items-start justify-between gap-3 border rounded-xl bg-card p-4 text-left transition-colors hover:bg-accent/40"
        @click="emit('select', meeting)"
      >
        <div class="min-w-0">
          <p class="truncate font-medium">
            {{ meeting.title }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ MEETING_TYPE_LABELS[meeting.type] || meeting.type }}
            · {{ MEETING_STATUS_LABELS[meeting.status] || meeting.status }}
            <span v-if="meeting.location"> · {{ meeting.location }}</span>
          </p>
        </div>
        <div class="shrink-0 text-right text-xs text-muted-foreground">
          <p>{{ new Date(meeting.start_time).toLocaleDateString('pt-BR') }}</p>
          <p>{{ formatTime(meeting.start_time) }} – {{ formatTime(meeting.end_time) }}</p>
        </div>
      </button>
      <p v-if="!listMeetings.length" class="border rounded-xl border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma reunião neste período.
      </p>
    </div>

    <div v-else class="overflow-hidden border rounded-xl">
      <div class="grid grid-cols-7 border-b bg-muted/40">
        <div
          v-for="label in weekDays"
          :key="label"
          class="px-2 py-2 text-center text-xs text-muted-foreground font-medium"
        >
          {{ label }}
        </div>
      </div>

      <div class="grid grid-cols-7">
        <button
          v-for="day in days"
          :key="day.toISOString()"
          type="button"
          class="min-h-28 border-b border-r p-2 text-left transition-colors hover:bg-accent/30"
          :class="{
            'bg-muted/20': view === 'month' && !isSameMonth(day, anchor),
            'bg-primary/5': isSameDay(day, new Date()),
          }"
          @click="onDayClick(day)"
        >
          <div class="mb-1 flex items-center justify-between">
            <span
              class="size-6 inline-flex items-center justify-center rounded-full text-xs"
              :class="isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'"
            >
              {{ format(day, 'd') }}
            </span>
          </div>

          <div class="space-y-1">
            <button
              v-for="meeting in meetingsForDay(day).slice(0, view === 'week' ? 8 : 3)"
              :key="meeting.id"
              type="button"
              class="block w-full truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-left text-[11px] text-foreground hover:bg-primary/20"
              @click.stop="emit('select', meeting)"
            >
              <span class="font-medium">{{ formatTime(meeting.start_time) }}</span>
              {{ meeting.title }}
            </button>
            <p
              v-if="meetingsForDay(day).length > (view === 'week' ? 8 : 3)"
              class="text-[10px] text-muted-foreground"
            >
              +{{ meetingsForDay(day).length - (view === 'week' ? 8 : 3) }} mais
            </p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
