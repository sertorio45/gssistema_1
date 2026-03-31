<script setup lang="ts">
/**
 * Card visual alinhado aos de Google Ads / Analytics / Meta; integração ainda sem backend.
 */
withDefaults(
  defineProps<{
    title: string
    accountLine?: string
    icon: string
    /** Classes do wrapper do ícone (cor / alinhamento), ex.: text-[#1877F2] */
    iconClass?: string
    badge?: string
    editLabel?: string
  }>(),
  {
    accountLine: '—',
    iconClass: '',
    badge: 'Em breve',
    editLabel: 'Edição disponível em breve',
  },
)
</script>

<template>
  <Card class="relative overflow-hidden rounded-2xl border bg-card shadow-md">
    <Badge
      variant="secondary"
      class="absolute left-3 top-3 z-10 text-[10px] font-medium uppercase tracking-wide"
    >
      {{ badge }}
    </Badge>
    <Button
      variant="ghost"
      size="icon"
      class="absolute right-2 top-2 z-10 h-9 w-9 text-muted-foreground opacity-50"
      disabled
      :aria-label="editLabel"
    >
      <Icon name="lucide:square-pen" class="h-4 w-4" />
    </Button>
    <CardContent class="flex flex-col items-center px-6 pb-8 pt-10 text-center">
      <div
        class="flex h-14 w-14 items-center justify-center"
        :class="iconClass"
      >
        <Icon :name="icon" class="h-8 w-8 shrink-0" aria-hidden="true" />
      </div>
      <h2 class="mt-4 text-lg font-semibold text-foreground">
        {{ title }}
      </h2>
      <Button
        class="mt-6 w-full max-w-[240px] rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
        disabled
      >
        Conectar conta
      </Button>
      <p class="mt-4 max-w-[240px] truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {{ accountLine }}
      </p>
    </CardContent>
  </Card>
</template>
