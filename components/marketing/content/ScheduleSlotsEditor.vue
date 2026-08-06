<script setup lang="ts">
import type { SocialPlatform, SocialPostFormat } from '~/types/marketing-social'
import type { MarketingPostScheduleInput } from '~/types/marketing-schedules'
import SocialDateTimePicker from '~/components/marketing/social/SocialDateTimePicker.vue'

const props = defineProps<{
  modelValue: MarketingPostScheduleInput[]
  /** Optional variants to bind a slot to a specific channel/format. */
  variants?: Array<{
    id?: string
    platform: SocialPlatform
    format: SocialPostFormat
  }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MarketingPostScheduleInput[]]
}>()

const slots = computed({
  get: () => props.modelValue,
  set: (value: MarketingPostScheduleInput[]) => emit('update:modelValue', value),
})

const platformOptions: Array<{ value: SocialPlatform | 'any', label: string }> = [
  { value: 'any', label: 'Todas as redes' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
]

const formatOptions: Array<{ value: SocialPostFormat | 'any', label: string }> = [
  { value: 'any', label: 'Formato geral' },
  { value: 'static', label: 'Post / Feed' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'video', label: 'Reels / Vídeo' },
  { value: 'story', label: 'Stories' },
]

function addSlot() {
  const next = [...slots.value]
  const base = new Date()
  base.setMinutes(0, 0, 0)
  base.setHours(base.getHours() + 2)
  next.push({
    scheduledAt: base.toISOString().slice(0, 16),
    platform: null,
    format: null,
    notes: null,
  })
  slots.value = next
}

function removeSlot(index: number) {
  slots.value = slots.value.filter((_, i) => i !== index)
}

function updateSlot(index: number, patch: Partial<MarketingPostScheduleInput>) {
  slots.value = slots.value.map((slot, i) => (i === index ? { ...slot, ...patch } : slot))
}

function platformModel(index: number) {
  return props.modelValue[index]?.platform || 'any'
}

function formatModel(index: number) {
  return props.modelValue[index]?.format || 'any'
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium">
          Agendamentos
        </p>
        <p class="text-xs text-muted-foreground">
          Um conteúdo pode ter várias datas (ex.: Reels na segunda e Stories na quarta).
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" @click="addSlot">
        <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
        Adicionar data
      </Button>
    </div>

    <div
      v-if="!slots.length"
      class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
    >
      Nenhuma data. Adicione slots ou deixe sem agendamento (rascunho).
    </div>

    <div
      v-for="(slot, index) in slots"
      :key="slot.id || `new-${index}`"
      class="rounded-xl border p-3 space-y-3"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-medium text-muted-foreground">
          Slot {{ index + 1 }}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-8 text-muted-foreground hover:text-destructive"
          @click="removeSlot(index)"
        >
          <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
        </Button>
      </div>

      <SocialDateTimePicker
        :model-value="slot.scheduledAt?.slice(0, 16) || ''"
        label="Data e horário"
        placeholder="Escolher data"
        @update:model-value="updateSlot(index, { scheduledAt: $event })"
      />

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label>Rede</Label>
          <Select
            :model-value="platformModel(index)"
            @update:model-value="updateSlot(index, {
              platform: $event === 'any' ? null : ($event as SocialPlatform),
            })"
          >
            <SelectTrigger>
              <SelectValue placeholder="Rede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in platformOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label>Formato</Label>
          <Select
            :model-value="formatModel(index)"
            @update:model-value="updateSlot(index, {
              format: $event === 'any' ? null : ($event as SocialPostFormat),
            })"
          >
            <SelectTrigger>
              <SelectValue placeholder="Formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in formatOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
</template>
