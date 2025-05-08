<script setup lang="ts">
defineProps<{
  onSave: () => void
  onBack: () => void
  onCancel: () => void
  isLoading?: boolean
  show?: boolean
}>()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed bottom-3 right-1/6 z-50 flex -translate-x-1/2 transform items-center gap-4 rounded-full bg-primary px-6 py-3 shadow-2xl dark:bg-primary max-w-[calc(100%-2rem)] sm:max-w-md"
    >
      <Button
        variant="ghost"
        @click="onBack"
        :disabled="isLoading"
        class="flex items-center gap-2 text-secondary bg-transparent shadow-none"
      >
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        Voltar
      </Button>
      <Button
        variant="ghost"
        @click="onCancel"
        :disabled="isLoading"
        class="flex items-center gap-2 text-secondary bg-transparent shadow-none"
      >
        <Icon name="lucide:x" class="h-4 w-4" />
        Cancelar
      </Button>
      <Button
        variant="default"
        @click="onSave"
        :disabled="isLoading"
        class="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-primary"
      >
        <Icon v-if="isLoading" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
        <Icon v-else name="lucide:save" class="h-4 w-4" />
        Salvar
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