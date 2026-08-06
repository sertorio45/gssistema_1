<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { ref, watch } from 'vue'

import Button from '@/components/ui/button/Button.vue'
import Calendar from '@/components/ui/calendar/Calendar.vue'
import Label from '@/components/ui/label/Label.vue'
import Popover from '@/components/ui/popover/Popover.vue'
import PopoverContent from '@/components/ui/popover/PopoverContent.vue'
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue'

const props = defineProps<{
  modelValue?: {
    start: Date | null
    end: Date | null
  }
  /** ISO string — preferred by MeetingForm */
  startTime?: string
  endTime?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: { start: Date | null, end: Date | null }): void
  (e: 'update', value: { start: string, end: string }): void
}>()

const df = new DateFormatter('pt-BR', { dateStyle: 'medium' })
const localTz = getLocalTimeZone()

const timeSlots = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
]

const internalValue = ref({
  start: null as Date | null,
  end: null as Date | null,
})

const isStartPickerOpen = ref(false)
const isEndPickerOpen = ref(false)
const selectedStartTime = ref('')
const selectedEndTime = ref('')

function parseIso(value?: string): Date | null {
  if (!value)
    return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTime(date: Date | null): string {
  if (!date)
    return ''
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function syncFromProps() {
  const start = props.modelValue?.start
    ?? parseIso(props.startTime)
  const end = props.modelValue?.end
    ?? parseIso(props.endTime)

  if (start) {
    internalValue.value.start = start
    selectedStartTime.value = formatTime(start)
  }
  if (end) {
    internalValue.value.end = end
    selectedEndTime.value = formatTime(end)
  }
}

syncFromProps()

watch(
  () => [props.startTime, props.endTime, props.modelValue] as const,
  () => syncFromProps(),
  { deep: true },
)

function dateToCalendarDate(date: Date | null): DateValue | undefined {
  if (!date)
    return undefined
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function calendarDateToDate(dateValue: DateValue | undefined): Date | null {
  if (!dateValue)
    return null
  return dateValue.toDate(localTz)
}

function createDateWithTime(date: Date | null, timeString: string): Date | null {
  if (!date || !timeString)
    return null
  const [hours, minutes] = timeString.split(':').map(Number)
  const newDate = new Date(date)
  newDate.setHours(hours, minutes, 0, 0)
  return newDate
}

function emitUpdate() {
  emit('update:modelValue', {
    start: internalValue.value.start,
    end: internalValue.value.end,
  })

  if (internalValue.value.start && internalValue.value.end) {
    emit('update', {
      start: internalValue.value.start.toISOString(),
      end: internalValue.value.end.toISOString(),
    })
  }
}

function handleStartDateChange(dateValue: DateValue | undefined) {
  const newDate = calendarDateToDate(dateValue)
  if (!newDate)
    return

  if (selectedStartTime.value) {
    internalValue.value.start = createDateWithTime(newDate, selectedStartTime.value)
  }
  else {
    newDate.setHours(9, 0, 0, 0)
    internalValue.value.start = newDate
    selectedStartTime.value = '09:00'
  }

  // Default end = start + 1h when empty
  if (!internalValue.value.end && internalValue.value.start) {
    const end = new Date(internalValue.value.start)
    end.setHours(end.getHours() + 1)
    internalValue.value.end = end
    selectedEndTime.value = formatTime(end)
  }

  emitUpdate()
}

function handleStartTimeSelect(time: string) {
  selectedStartTime.value = time
  if (internalValue.value.start) {
    internalValue.value.start = createDateWithTime(internalValue.value.start, time)
  }
  else {
    internalValue.value.start = createDateWithTime(new Date(), time)
  }
  emitUpdate()
  isStartPickerOpen.value = false
}

function handleEndDateChange(dateValue: DateValue | undefined) {
  const newDate = calendarDateToDate(dateValue)
  if (!newDate)
    return

  if (selectedEndTime.value) {
    internalValue.value.end = createDateWithTime(newDate, selectedEndTime.value)
  }
  else {
    newDate.setHours(10, 0, 0, 0)
    internalValue.value.end = newDate
    selectedEndTime.value = '10:00'
  }
  emitUpdate()
}

function handleEndTimeSelect(time: string) {
  selectedEndTime.value = time
  if (internalValue.value.end) {
    internalValue.value.end = createDateWithTime(internalValue.value.end, time)
  }
  else {
    internalValue.value.end = createDateWithTime(new Date(), time)
  }
  emitUpdate()
  isEndPickerOpen.value = false
}

function formatDisplayDate(date: Date | null): string {
  return date ? df.format(date) : 'Escolher data'
}

function formatDisplayTime(date: Date | null): string {
  if (!date)
    return 'Horário'
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-2">
      <Label class="text-sm font-medium">
        Início
      </Label>
      <Popover v-model:open="isStartPickerOpen">
        <PopoverTrigger as-child>
          <Button variant="outline" class="h-10 w-full justify-start text-left font-normal">
            <CalendarIcon class="mr-2 size-4 shrink-0 text-muted-foreground" />
            <span class="truncate">
              {{ formatDisplayDate(internalValue.start) }}
              <span v-if="internalValue.start" class="text-muted-foreground">
                · {{ formatDisplayTime(internalValue.start) }}
              </span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
          <div class="flex flex-col sm:flex-row">
            <div class="p-3">
              <Calendar
                locale="pt-BR"
                weekday-format="short"
                :model-value="dateToCalendarDate(internalValue.start)"
                @update:model-value="handleStartDateChange"
              />
            </div>
            <div class="min-w-[120px] border-t p-3 sm:border-l sm:border-t-0">
              <div class="mb-2 text-xs font-medium text-muted-foreground">
                Horário
              </div>
              <div class="grid max-h-[200px] gap-1 overflow-y-auto">
                <Button
                  v-for="time in timeSlots"
                  :key="`start-${time}`"
                  variant="ghost"
                  size="sm"
                  class="justify-start font-normal"
                  :class="{ 'bg-primary text-primary-foreground': selectedStartTime === time }"
                  @click="handleStartTimeSelect(time)"
                >
                  {{ time }}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>

    <div class="space-y-2">
      <Label class="text-sm font-medium">
        Término
      </Label>
      <Popover v-model:open="isEndPickerOpen">
        <PopoverTrigger as-child>
          <Button variant="outline" class="h-10 w-full justify-start text-left font-normal">
            <CalendarIcon class="mr-2 size-4 shrink-0 text-muted-foreground" />
            <span class="truncate">
              {{ formatDisplayDate(internalValue.end) }}
              <span v-if="internalValue.end" class="text-muted-foreground">
                · {{ formatDisplayTime(internalValue.end) }}
              </span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
          <div class="flex flex-col sm:flex-row">
            <div class="p-3">
              <Calendar
                locale="pt-BR"
                weekday-format="short"
                :model-value="dateToCalendarDate(internalValue.end)"
                @update:model-value="handleEndDateChange"
              />
            </div>
            <div class="min-w-[120px] border-t p-3 sm:border-l sm:border-t-0">
              <div class="mb-2 text-xs font-medium text-muted-foreground">
                Horário
              </div>
              <div class="grid max-h-[200px] gap-1 overflow-y-auto">
                <Button
                  v-for="time in timeSlots"
                  :key="`end-${time}`"
                  variant="ghost"
                  size="sm"
                  class="justify-start font-normal"
                  :class="{ 'bg-primary text-primary-foreground': selectedEndTime === time }"
                  @click="handleEndTimeSelect(time)"
                >
                  {{ time }}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  </div>
</template>
