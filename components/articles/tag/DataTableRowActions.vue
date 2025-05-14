<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { Tag } from './columns'

interface DataTableRowActionsProps {
  row: Row<Tag>
}

const props = defineProps<DataTableRowActionsProps>()
const emit = defineEmits(['edit', 'delete'])
const tag = computed(() => props.row.original)

function handleEdit() {
  emit('edit', tag.value)
}

function handleDelete() {
  emit('delete', tag.value)
}
</script>

<template>
  <div class="flex justify-end gap-2">
    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-8 text-muted-foreground hover:text-primary"
      @click="handleEdit"
    >
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