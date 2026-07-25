<script setup lang="ts">
import type { DateValue } from '@internationalized/date'

import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  label?: string
  description?: string
  placeholder?: string
  disablePast?: boolean
}>(), {
  modelValue: null,
  label: 'Data e hora',
  description: '',
  placeholder: 'Selecionar data e hora',
  disablePast: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const timeInputId = useId()
const open = ref(false)
const selectedDate = ref<DateValue>()
const selectedTime = ref('09:00')
const formatter = new DateFormatter('pt-BR', {
  dateStyle: 'long',
})

function parseValue(value?: string | null) {
  if (!value) {
    selectedDate.value = undefined
    selectedTime.value = '09:00'
    return
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return

  selectedDate.value = new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  )
  selectedTime.value = [
    date.getHours().toString().padStart(2, '0'),
    date.getMinutes().toString().padStart(2, '0'),
  ].join(':')
}

function emitValue() {
  if (!selectedDate.value) {
    emit('update:modelValue', null)
    return
  }

  const year = selectedDate.value.year.toString().padStart(4, '0')
  const month = selectedDate.value.month.toString().padStart(2, '0')
  const day = selectedDate.value.day.toString().padStart(2, '0')
  emit('update:modelValue', `${year}-${month}-${day}T${selectedTime.value || '09:00'}`)
}

function selectDate(value: DateValue | undefined) {
  selectedDate.value = value
  emitValue()
}

function selectTomorrow() {
  const tomorrow = today(getLocalTimeZone()).add({ days: 1 })
  selectedDate.value = tomorrow
  selectedTime.value = '09:00'
  emitValue()
}

function clearValue() {
  selectedDate.value = undefined
  selectedTime.value = '09:00'
  emit('update:modelValue', null)
  open.value = false
}

const displayValue = computed(() => {
  if (!selectedDate.value)
    return props.placeholder
  const date = selectedDate.value.toDate(getLocalTimeZone())
  return `${formatter.format(date)} às ${selectedTime.value}`
})

watch(() => props.modelValue, parseValue, { immediate: true })
watch(selectedTime, emitValue)
</script>

<template>
  <div class="space-y-2">
    <Label v-if="label">
      {{ label }}
    </Label>
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          class="w-full justify-start text-left font-normal"
          :class="{ 'text-muted-foreground': !selectedDate }"
        >
          <Icon name="lucide:calendar-clock" class="mr-2 h-4 w-4 shrink-0" />
          <span class="truncate">{{ displayValue }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <Calendar
          :model-value="selectedDate"
          :min-value="disablePast ? today(getLocalTimeZone()) : undefined"
          initial-focus
          @update:model-value="selectDate"
        />
        <div class="border-t p-3 space-y-3">
          <div class="space-y-2">
            <Label :for="timeInputId">
              Horário
            </Label>
            <Input
              :id="timeInputId"
              v-model="selectedTime"
              type="time"
              step="300"
            />
          </div>
          <div class="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" @click="clearValue">
              Limpar
            </Button>
            <div class="flex gap-2">
              <Button type="button" variant="outline" size="sm" @click="selectTomorrow">
                Amanhã, 09:00
              </Button>
              <Button type="button" size="sm" :disabled="!selectedDate" @click="open = false">
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
    <p v-if="description" class="text-xs text-muted-foreground">
      {{ description }}
    </p>
  </div>
</template>
