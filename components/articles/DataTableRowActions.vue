<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { Article } from './columns'

interface DataTableRowActionsProps {
  row: Row<Article>
}

const props = defineProps<DataTableRowActionsProps>()
const emit = defineEmits(['edit', 'delete'])
const article = computed(() => props.row.original)

function handleEdit() {
  navigateTo(`/articles/edit/${article.value.id}`)
}

function handleDelete() {
  emit('delete', article.value)
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
