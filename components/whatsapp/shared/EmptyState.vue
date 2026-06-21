<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: string
}>(), {
  title: 'Em breve',
  description: 'Esta funcionalidade está sendo implementada.',
  icon: 'i-lucide-construction',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-16 text-center">
    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
      <span :class="icon" class="h-6 w-6" />
    </div>
    <h3 class="text-lg font-medium">
      {{ title }}
    </h3>
    <p class="mt-1 max-w-md text-sm text-muted-foreground">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-6">
      <slot />
    </div>
  </div>
</template>
