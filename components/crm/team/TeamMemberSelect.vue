<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useTenantTeam } from '~/composables/crm/useTenantTeam'

const props = defineProps<{
  modelValue?: string | null
  placeholder?: string
  includeUnassigned?: boolean
  disabled?: boolean
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { members, pending } = useTenantTeam({ attendantsOnly: true })

function handleChange(value: unknown) {
  const next = String(value || '')
  if (!next || next === '__none__') {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', next)
}
</script>

<template>
  <Select
    :model-value="modelValue || (includeUnassigned ? '__none__' : undefined)"
    :disabled="disabled || pending"
    @update:model-value="handleChange"
  >
    <SelectTrigger :class="props.class || 'h-9'">
      <SelectValue :placeholder="placeholder || 'Selecionar responsável'" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-if="includeUnassigned" value="__none__">
        Não atribuído
      </SelectItem>
      <SelectItem
        v-for="member in members"
        :key="member.userId"
        :value="member.userId"
      >
        {{ member.name }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
