<script setup lang="ts">
import { Button } from '~/components/ui/button'

defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm">
      <span class="i-lucide-workflow h-6 w-6 text-primary" />
    </div>
    <h3 class="text-lg font-semibold tracking-tight">
      {{ title || 'Nenhum flow criado' }}
    </h3>
    <p class="mt-2 max-w-md text-sm text-muted-foreground">
      {{ description || 'Monte automações visuais para responder, qualificar e encaminhar conversas do WhatsApp.' }}
    </p>
    <div class="mt-6 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
