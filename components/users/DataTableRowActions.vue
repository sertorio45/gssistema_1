<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { User } from './columns'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Icon } from '#components'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DataTableRowActionsProps {
  row: Row<User>
}

const props = defineProps<DataTableRowActionsProps>()
const emit = defineEmits(['edit', 'delete'])
const user = computed(() => props.row.original)

function handleEdit() {
  emit('edit', user.value)
}

function handleDelete() {
  emit('delete', user.value)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        class="h-8 w-8 flex p-0 data-[state=open]:bg-muted"
      >
        <Icon name="lucide:more-horizontal" class="h-4 w-4" />
        <span class="sr-only">Open menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[160px]">
      <DropdownMenuItem @click="handleEdit">
        <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
        Edit
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem @click="handleDelete" class="text-destructive focus:text-destructive">
        <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template> 