<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { computed, ref, watch } from 'vue'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import { Calendar as CalendarIcon, Clock as ClockIcon } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import Calendar from '@/components/ui/calendar/Calendar.vue'
import Label from '@/components/ui/label/Label.vue'
import Popover from '@/components/ui/popover/Popover.vue'
import PopoverContent from '@/components/ui/popover/PopoverContent.vue'
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: {
    start: Date | null
    end: Date | null
  }
}>()
const emit = defineEmits(['update:modelValue'])

const df = new DateFormatter('en-US', { dateStyle: 'medium' })
const localTz = getLocalTimeZone()

// Horários disponíveis
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

// State interno
const internalValue = ref({
  start: null as Date | null,
  end: null as Date | null,
})

const isStartPickerOpen = ref(false)
const isEndPickerOpen = ref(false)
const selectedStartTime = ref('')
const selectedEndTime = ref('')

// Inicializar valores
function initializeValues() {
  if (props.modelValue?.start) {
    internalValue.value.start = new Date(props.modelValue.start)
    selectedStartTime.value = formatTime(internalValue.value.start)
  }
  if (props.modelValue?.end) {
    internalValue.value.end = new Date(props.modelValue.end)
    selectedEndTime.value = formatTime(internalValue.value.end)
  }
}

initializeValues()

// Watch props changes
watch(() => props.modelValue, (newVal) => {
  if (newVal?.start && (!internalValue.value.start || newVal.start.getTime() !== internalValue.value.start.getTime())) {
    internalValue.value.start = new Date(newVal.start)
    selectedStartTime.value = formatTime(internalValue.value.start)
  }
  if (newVal?.end && (!internalValue.value.end || newVal.end.getTime() !== internalValue.value.end.getTime())) {
    internalValue.value.end = new Date(newVal.end)
    selectedEndTime.value = formatTime(internalValue.value.end)
  }
}, { deep: true })

// Conversões entre Date e DateValue
function dateToCalendarDate(date: Date | null): DateValue | undefined {
  if (!date) return undefined
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function calendarDateToDate(dateValue: DateValue | undefined): Date | null {
  if (!dateValue) return null
  return dateValue.toDate(localTz)
}

// Função para formatar tempo
function formatTime(date: Date | null): string {
  if (!date) return ''
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// Função para criar data com horário
function createDateWithTime(date: Date | null, timeString: string): Date | null {
  if (!date || !timeString) return null
  const [hours, minutes] = timeString.split(':').map(Number)
  const newDate = new Date(date)
  newDate.setHours(hours, minutes, 0, 0)
  return newDate
}

// Emitir mudanças
function emitUpdate() {
  emit('update:modelValue', {
    start: internalValue.value.start,
    end: internalValue.value.end
  })
}

// Handlers para start date/time
function handleStartDateChange(dateValue: DateValue | undefined) {
  const newDate = calendarDateToDate(dateValue)
  if (newDate) {
    // Preservar horário se já existe
    if (selectedStartTime.value) {
      internalValue.value.start = createDateWithTime(newDate, selectedStartTime.value)
    } else {
      // Horário padrão
      newDate.setHours(9, 0, 0, 0)
      internalValue.value.start = newDate
      selectedStartTime.value = '09:00'
    }
    emitUpdate()
  }
}

function handleStartTimeSelect(time: string) {
  selectedStartTime.value = time
  if (internalValue.value.start) {
    internalValue.value.start = createDateWithTime(internalValue.value.start, time)
  } else {
    // Se não há data, usar hoje
    const today = new Date()
    internalValue.value.start = createDateWithTime(today, time)
  }
  emitUpdate()
  isStartPickerOpen.value = false
}

// Handlers para end date/time
function handleEndDateChange(dateValue: DateValue | undefined) {
  const newDate = calendarDateToDate(dateValue)
  if (newDate) {
    // Preservar horário se já existe
    if (selectedEndTime.value) {
      internalValue.value.end = createDateWithTime(newDate, selectedEndTime.value)
    } else {
      // Horário padrão (1 hora depois do início)
      newDate.setHours(10, 0, 0, 0)
      internalValue.value.end = newDate
      selectedEndTime.value = '10:00'
    }
    emitUpdate()
  }
}

function handleEndTimeSelect(time: string) {
  selectedEndTime.value = time
  if (internalValue.value.end) {
    internalValue.value.end = createDateWithTime(internalValue.value.end, time)
  } else {
    // Se não há data, usar hoje
    const today = new Date()
    internalValue.value.end = createDateWithTime(today, time)
  }
  emitUpdate()
  isEndPickerOpen.value = false
}

// Formatação para exibição
function formatDisplayDate(date: Date | null): string {
  return date ? df.format(date) : 'Pick a date'
}

function formatDisplayTime(date: Date | null): string {
  if (!date) return 'Pick time'
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  })
}
</script>

<template>
  <div class="grid gap-4">
    <!-- Start Date & Time -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">Start Date & Time</Label>
      <Popover v-model:open="isStartPickerOpen">
        <PopoverTrigger as-child>
          <Button variant="outline" class="w-full justify-start text-left font-normal">
            <CalendarIcon class="mr-2 h-4 w-4" />
            {{ formatDisplayDate(internalValue.start) }} 
            <span v-if="internalValue.start" class="ml-2 text-muted-foreground">
              at {{ formatDisplayTime(internalValue.start) }}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
          <div class="flex">
            <!-- Calendar -->
            <div class="p-3">
              <Calendar
                :model-value="dateToCalendarDate(internalValue.start)"
                @update:model-value="handleStartDateChange"
              />
            </div>
            <!-- Time Slots -->
            <div class="border-l p-3 min-w-[120px]">
              <div class="text-sm font-medium mb-2">
                {{ internalValue.start ? df.format(internalValue.start).split(',')[0] : 'Select time' }}
              </div>
              <div class="grid gap-1 max-h-[200px] overflow-y-auto">
                <Button
                  v-for="time in timeSlots"
                  :key="time"
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

    <!-- End Date & Time -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">End Date & Time</Label>
      <Popover v-model:open="isEndPickerOpen">
        <PopoverTrigger as-child>
          <Button variant="outline" class="w-full justify-start text-left font-normal">
            <CalendarIcon class="mr-2 h-4 w-4" />
            {{ formatDisplayDate(internalValue.end) }}
            <span v-if="internalValue.end" class="ml-2 text-muted-foreground">
              at {{ formatDisplayTime(internalValue.end) }}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
          <div class="flex">
            <!-- Calendar -->
            <div class="p-3">
              <Calendar
                :model-value="dateToCalendarDate(internalValue.end)"
                @update:model-value="handleEndDateChange"
              />
            </div>
            <!-- Time Slots -->
            <div class="border-l p-3 min-w-[120px]">
              <div class="text-sm font-medium mb-2">
                {{ internalValue.end ? df.format(internalValue.end).split(',')[0] : 'Select time' }}
              </div>
              <div class="grid gap-1 max-h-[200px] overflow-y-auto">
                <Button
                  v-for="time in timeSlots"
                  :key="time"
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

<style scoped>
/* Custom scrollbar for time slots */
.max-h-\[200px\]::-webkit-scrollbar {
  width: 4px;
}

.max-h-\[200px\]::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-\[200px\]::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 2px;
}
</style> 