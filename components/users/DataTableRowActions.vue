<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { User } from './columns'

import { Icon } from '#components'
import { Button } from '@/components/ui/button'

const props = defineProps<DataTableRowActionsProps>()

const emit = defineEmits(['edit', 'delete'])

interface DataTableRowActionsProps {
  row: Row<User>
  onEdit?: (row: User) => void
  onDelete?: (row: User) => void
}

function handleEdit() {
  if (props.onEdit)
    return props.onEdit(props.row.original)
  emit('edit', props.row.original)
}

function handleDelete() {
  if (props.onDelete)
    return props.onDelete(props.row.original)
  emit('delete', props.row.original)
}
</script>

<template>
  <div class="flex justify-end gap-2">
    <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary" @click="handleEdit">
      <Icon name="lucide:pencil" class="h-4 w-4" />
      <span class="sr-only">Editar</span>
    </Button>
    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-8 text-muted-foreground hover:text-destructive"
      @click="handleDelete"
    >
      <Icon name="lucide:trash-2" class="h-4 w-4" />
      <span class="sr-only">Excluir</span>
    </Button>
  </div>
</template>
