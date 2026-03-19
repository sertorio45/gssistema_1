<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { Tenant } from './tenant-columns'

import { Icon } from '#components'

import { computed } from 'vue'

import { Button } from '@/components/ui/button'

interface DataTableRowActionsProps {
  row: Row<Tenant>
  onEdit: () => void
  onDelete: () => void
}

const props = defineProps<DataTableRowActionsProps>()
const tenant = computed(() => props.row.original)

function handleEdit() {
  props.onEdit()
}

function handleDelete() {
  props.onDelete()
}
</script>

<template>
  <div class="flex justify-end gap-2">
    <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary" @click="handleEdit">
      <Icon name="lucide:pencil" class="h-4 w-4" />
      <span class="sr-only">Edit</span>
    </Button>
    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-8 text-muted-foreground hover:text-destructive"
      @click="handleDelete"
    >
      <Icon name="lucide:trash-2" class="h-4 w-4" />
      <span class="sr-only">Delete</span>
    </Button>
  </div>
</template>
