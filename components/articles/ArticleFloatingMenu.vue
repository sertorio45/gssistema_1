<script setup lang="ts">
defineProps<{
  onSave: () => void
  onCancel: () => void
  isLoading?: boolean
  show?: boolean
  cancelLabel?: string
}>()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed bottom-3 left-1/2 z-50 max-w-[calc(100%-2rem)] flex transform -translate-x-1/2 items-center gap-4 rounded-full bg-primary px-6 py-3 shadow-2xl sm:max-w-md dark:bg-primary"
    >
      <Button
        variant="ghost"
        :disabled="isLoading"
        class="flex items-center gap-2 bg-transparent text-secondary shadow-none"
        @click="onCancel"
        aria-label="Cancel"
      >
        <Icon name="lucide:x" class="h-4 w-4" />
        {{ cancelLabel || 'Cancel' }}
      </Button>
      <Button
        variant="default"
        :disabled="isLoading"
        class="flex items-center gap-2 bg-secondary text-primary hover:bg-secondary/90"
        @click="onSave"
        aria-label="Save"
      >
        <Icon v-if="isLoading" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
        <Icon v-else name="lucide:save" class="h-4 w-4" />
        Save
      </Button>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
@media (max-width: 640px) {
  /* Remover estilos específicos de mobile se o posicionamento centralizado já funcionar bem */
}
</style>
