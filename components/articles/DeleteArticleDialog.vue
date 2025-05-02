<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Excluir Artigo</DialogTitle>
        <DialogDescription>
          Tem certeza que deseja excluir o artigo "{{ article?.title }}"?
          Esta ação não pode ser desfeita.
        </DialogDescription>
      </DialogHeader>
      <div class="flex justify-end gap-4 mt-4">
        <Button
          variant="outline"
          :disabled="isDeleting"
          @click="$emit('update:open', false)"
        >
          Cancelar
        </Button>
        <Button
          variant="destructive"
          :disabled="isDeleting"
          @click="handleDelete"
        >
          <Icon
            v-if="isDeleting"
            name="lucide:loader-2"
            class="mr-2 h-4 w-4 animate-spin"
          />
          {{ isDeleting ? 'Excluindo...' : 'Excluir' }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
interface Props {
  open: boolean
  article?: {
    id: string
    title: string
  }
  isDeleting: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  delete: [article: { id: string; title: string }]
}>()

function handleDelete() {
  if (props.article) {
    emit('delete', props.article)
  }
}
</script> 