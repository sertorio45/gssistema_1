<script setup lang="ts">
import type { WhatsAppRecentActivity } from '~/types/whatsapp'

import WhatsAppStatusBadge from '~/components/whatsapp/shared/WhatsAppStatusBadge.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

defineProps<{
  items: WhatsAppRecentActivity[]
  loading?: boolean
}>()

function formatRelative(value?: string | null) {
  if (!value)
    return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Atividade recente</CardTitle>
      <CardDescription>
        Últimas conversas com movimentação.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="space-y-3">
        <Skeleton v-for="i in 5" :key="i" class="h-14 w-full" />
      </div>
      <div v-else-if="!items.length" class="py-8 text-center text-sm text-muted-foreground">
        Nenhuma atividade recente.
      </div>
      <div v-else class="divide-y">
        <NuxtLink
          v-for="item in items"
          :key="item.id"
          :to="{ path: '/whatsapp/conversations', query: { id: item.id } }"
          class="flex items-start justify-between gap-3 py-3 transition-colors hover:bg-muted/40"
        >
          <div class="min-w-0">
            <p class="truncate font-medium">
              {{ item.contactName }}
            </p>
            <p class="truncate text-sm text-muted-foreground">
              {{ item.lastMessagePreview || 'Sem mensagens' }}
            </p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-xs text-muted-foreground">
              {{ formatRelative(item.lastMessageAt) }}
            </p>
            <div class="mt-1 flex items-center justify-end gap-2">
              <span v-if="item.unreadCount" class="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                {{ item.unreadCount }}
              </span>
              <WhatsAppStatusBadge :status="item.status" />
            </div>
          </div>
        </NuxtLink>
      </div>
    </CardContent>
  </Card>
</template>
