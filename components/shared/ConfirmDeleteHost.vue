<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { useConfirmDeleteHost } from '~/composables/useConfirmDelete'

const { state, acceptConfirm, cancelConfirm } = useConfirmDeleteHost()

const open = computed({
  get: () => state.value.open,
  set: (value: boolean) => {
    if (!value)
      cancelConfirm()
  },
})
</script>

<template>
  <AlertDialog :open="open" @update:open="open = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ state.title }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ state.description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="cancelConfirm">
          {{ state.cancelLabel }}
        </AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click.prevent="acceptConfirm"
        >
          {{ state.confirmLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
