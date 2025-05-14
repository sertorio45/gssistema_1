<script setup lang="ts">
defineProps<{
  count: number
  onDelete: () => void
}>()
</script>

<template>
  <div
    class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 bg-primary text-primary-foreground shadow-lg rounded-lg px-4 py-3 flex items-center gap-4 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-5 duration-200"
  >
    <div class="flex items-center gap-2">
      <div class="bg-primary-foreground/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-medium">
        {{ count }}
      </div>
      <span class="text-sm font-medium">itens selecionados</span>
    </div>
    <div class="flex gap-2">
      <Button
        variant="destructive"
        size="sm"
        @click="onDelete"
      >
        <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
        Excluir selecionados
      </Button>
    </div>
  </div>
</template>

