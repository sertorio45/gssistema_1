<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { User } from './columns'
import { Icon } from '#components'
import { computed, ref } from 'vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface DataTableRowActionsProps {
  row: Row<User>
  onEdit: () => void
  onDelete: () => void
}

const props = defineProps<DataTableRowActionsProps>()
const user = computed(() => props.row.original)
const showDeleteDialog = ref(false)

function handleEdit() {
  props.onEdit()
}

function handleDelete() {
  showDeleteDialog.value = true
}

function confirmDelete() {
  props.onDelete()
  showDeleteDialog.value = false
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

    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário
            {{ user.email }} e removerá seus dados do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteDialog = false">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDelete"
          >
            Deletar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
