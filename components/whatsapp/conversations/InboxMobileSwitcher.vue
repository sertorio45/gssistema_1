<script setup lang="ts">
import type { WhatsAppInstanceView } from '~/types/whatsapp'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

const props = defineProps<{
  instances: WhatsAppInstanceView[]
  activeInstanceId: string | null
  totalUnread?: number
}>()

const emit = defineEmits<{
  select: [instanceId: string | null]
}>()

const selectValue = computed(() => props.activeInstanceId || '__all__')

function handleSelect(value: unknown) {
  const id = String(value)
  emit('select', id === '__all__' ? null : id)
}

const activeLabel = computed(() => {
  if (!props.activeInstanceId)
    return 'Todas as caixas'
  return props.instances.find(item => item.id === props.activeInstanceId)?.name || 'Caixa'
})
</script>

<template>
  <div class="border-b bg-muted/20 px-4 py-2 lg:hidden">
    <Select :model-value="selectValue" @update:model-value="handleSelect">
      <SelectTrigger class="h-9 w-full">
        <div class="flex w-full items-center gap-2">
          <span class="i-lucide-inbox h-4 w-4 shrink-0 text-muted-foreground" />
          <SelectValue>
            {{ activeLabel }}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">
          Todas as caixas
          <span v-if="totalUnread" class="ml-1 text-muted-foreground">({{ totalUnread }})</span>
        </SelectItem>
        <SelectItem
          v-for="instance in instances"
          :key="instance.id"
          :value="instance.id"
        >
          {{ instance.name }}
          <span v-if="instance.unreadCount" class="ml-1 text-muted-foreground">({{ instance.unreadCount }})</span>
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
