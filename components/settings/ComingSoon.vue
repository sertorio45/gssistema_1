<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div>
    <div class="flex items-center gap-2">
      <h3 class="text-lg font-medium">
        {{ title }}
      </h3>
      <Badge variant="secondary">
        Em breve
      </Badge>
    </div>
    <p class="mt-1 text-sm text-muted-foreground">
      {{ description || 'Esta seção ainda não está disponível.' }}
    </p>
  </div>
  <Separator />
  <div class="flex flex-col items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-6">
    <div class="flex size-10 items-center justify-center rounded-full bg-muted">
      <Icon name="i-lucide-clock" class="size-5 text-muted-foreground" />
    </div>
    <div class="space-y-1">
      <p class="text-sm font-medium">
        Em breve
      </p>
      <p class="text-sm text-muted-foreground">
        Estamos preparando esta funcionalidade. Por enquanto, use o Perfil para gerenciar suas informações.
      </p>
    </div>
  </div>
</template>
