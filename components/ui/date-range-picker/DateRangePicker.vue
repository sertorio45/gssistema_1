<script setup lang="ts">
import { CalendarDate, DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'
import type { DateRange } from 'radix-vue'
import {
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  RangeCalendarGrid,
  RangeCalendarGridBody,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarNext,
  RangeCalendarPrev,
  RangeCalendarRoot,
} from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { computed, ref, watch } from 'vue'

import { buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    start?: string
    end?: string
    placeholder?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    start: '',
    end: '',
    placeholder: 'Selecione o período',
  },
)

const emit = defineEmits<{
  'update:start': [value: string]
  'update:end': [value: string]
}>()

const open = ref(false)

function toRange(s: string, e: string): DateRange | undefined {
  if (!s || !e)
    return undefined
  try {
    return { start: parseDate(s), end: parseDate(e) }
  }
  catch {
    return undefined
  }
}

const modelValue = ref<DateRange | undefined>(toRange(props.start, props.end))

watch(
  () => [props.start, props.end] as const,
  ([s, e]) => {
    const next = toRange(s, e)
    const cur = modelValue.value
    if (
      next?.start && next?.end && cur?.start && cur?.end
      && next.start.toString() === cur.start.toString()
      && next.end.toString() === cur.end.toString()
    ) {
      return
    }
    modelValue.value = next
  },
  { immediate: true },
)

watch(
  modelValue,
  (v) => {
    if (v?.start && v?.end) {
      const s = (v.start as CalendarDate).toString()
      const e = (v.end as CalendarDate).toString()
      if (s !== props.start)
        emit('update:start', s)
      if (e !== props.end)
        emit('update:end', e)
      open.value = false
    }
  },
  { deep: true },
)

const df = new DateFormatter('pt-BR', { dateStyle: 'medium' })

const label = computed(() => {
  if (!props.start || !props.end)
    return props.placeholder
  try {
    const a = parseDate(props.start).toDate(getLocalTimeZone())
    const b = parseDate(props.end).toDate(getLocalTimeZone())
    return `${df.format(a)} – ${df.format(b)}`
  }
  catch {
    return props.placeholder
  }
})

function onOpenChange(v: boolean) {
  open.value = v
}
</script>

<template>
  <div :class="cn('inline-flex', props.class)">
    <Popover :open="open" @update:open="onOpenChange">
    <PopoverTrigger as-child>
      <button
        type="button"
        :class="cn(
          buttonVariants({ variant: 'outline' }),
          'min-w-[260px] justify-start text-left font-normal',
        )"
      >
        <Icon name="lucide:calendar-range" class="mr-2 h-4 w-4 shrink-0 opacity-70" />
        <span class="truncate">{{ label }}</span>
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <RangeCalendarRoot
        v-model="modelValue as any"
        :number-of-months="2"
        locale="pt-BR"
        weekday-format="short"
        class="p-3"
      >
        <template #default="{ grid, weekDays }">
          <div class="flex flex-col gap-y-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
            <template v-for="month in grid" :key="month.value.toString()">
              <div class="space-y-4">
                <RangeCalendarHeader class="flex w-full items-center justify-between gap-1 pt-1">
                  <RangeCalendarPrev
                    aria-label="Mês anterior"
                    :class="cn(
                      buttonVariants({ variant: 'outline' }),
                      'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                    )"
                  >
                    <Icon name="radix-icons:chevron-left" class="h-4 w-4" />
                  </RangeCalendarPrev>
                  <RangeCalendarHeading class="text-sm font-medium" />
                  <RangeCalendarNext
                    aria-label="Próximo mês"
                    :class="cn(
                      buttonVariants({ variant: 'outline' }),
                      'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                    )"
                  >
                    <Icon name="radix-icons:chevron-right" class="h-4 w-4" />
                  </RangeCalendarNext>
                </RangeCalendarHeader>
                <RangeCalendarGrid>
                  <RangeCalendarGridHead>
                    <RangeCalendarGridRow class="mb-1 flex w-full">
                      <RangeCalendarHeadCell
                        v-for="day in weekDays"
                        :key="day"
                        class="w-8 text-center text-[0.7rem] font-normal text-muted-foreground"
                      >
                        {{ day }}
                      </RangeCalendarHeadCell>
                    </RangeCalendarGridRow>
                  </RangeCalendarGridHead>
                  <RangeCalendarGridBody>
                    <RangeCalendarGridRow
                      v-for="(weekDates, rowIdx) in month.rows"
                      :key="`week-${rowIdx}`"
                      class="mt-2 flex w-full"
                    >
                      <RangeCalendarCell
                        v-for="weekDate in weekDates"
                        :key="weekDate.toString()"
                        :date="weekDate"
                      >
                        <RangeCalendarCellTrigger
                          :day="weekDate"
                          :month="month.value"
                          :class="cn(
                            buttonVariants({ variant: 'ghost' }),
                            'h-8 w-8 p-0 font-normal',
                            '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
                            'data-[selected]:bg-accent data-[selected]:text-accent-foreground',
                            'data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground',
                            'data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground',
                            'data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
                            'data-[outside-view]:pointer-events-none data-[outside-view]:text-muted-foreground data-[outside-view]:opacity-50',
                          )"
                        />
                      </RangeCalendarCell>
                    </RangeCalendarGridRow>
                  </RangeCalendarGridBody>
                </RangeCalendarGrid>
              </div>
            </template>
          </div>
        </template>
      </RangeCalendarRoot>
    </PopoverContent>
  </Popover>
  </div>
</template>
