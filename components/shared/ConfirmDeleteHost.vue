<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import Button from '~/components/ui/button/Button.vue'
import { useConfirmDeleteHost } from '~/composables/useConfirmDelete'

const { state, acceptConfirm, cancelConfirm } = useConfirmDeleteHost()

/**
 * Radix AlertDialogAction closes the dialog before our click handler can resolve
 * the promise as `true`, which made @update:open(false) cancel the delete.
 * Plain Buttons keep open state fully controlled by our composable.
 */
function onOpenChange(value: boolean) {
  if (!value)
    cancelConfirm()
}
</script>

<template>
  <AlertDialog :open="state.open" @update:open="onOpenChange">
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
        <Button type="button" variant="outline" @click="cancelConfirm">
          {{ state.cancelLabel }}
        </Button>
        <Button
          type="button"
          variant="destructive"
          @click="acceptConfirm"
        >
          {{ state.confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
