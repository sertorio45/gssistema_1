<script setup lang="ts">
import type { WhatsAppDashboardOverview } from '~/types/whatsapp'

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

defineProps<{
  overview?: WhatsAppDashboardOverview | null
  loading?: boolean
}>()

function formatResponseTime(seconds: number) {
  if (!seconds)
    return '—'
  if (seconds < 60)
    return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <template v-if="loading">
      <Card v-for="i in 8" :key="i">
        <CardHeader class="pb-2">
          <Skeleton class="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-8 w-16" />
        </CardContent>
      </Card>
    </template>
    <template v-else>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Conversas abertas
          </CardTitle>
          <span class="i-lucide-messages-square h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ overview?.openConversations ?? 0 }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Não lidas
          </CardTitle>
          <span class="i-lucide-mail h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ overview?.unreadMessages ?? 0 }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Mensagens hoje
          </CardTitle>
          <span class="i-lucide-send h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ overview?.messagesToday ?? 0 }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Tempo médio de resposta
          </CardTitle>
          <span class="i-lucide-timer h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ formatResponseTime(overview?.avgResponseTimeSec ?? 0) }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Enviadas no período
          </CardTitle>
          <span class="i-lucide-arrow-up-right h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ overview?.messagesSentPeriod ?? 0 }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Recebidas no período
          </CardTitle>
          <span class="i-lucide-arrow-down-left h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ overview?.messagesReceivedPeriod ?? 0 }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Contatos
          </CardTitle>
          <span class="i-lucide-contact h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ overview?.totalContacts ?? 0 }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Instâncias conectadas
          </CardTitle>
          <span class="i-lucide-smartphone h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ overview?.connectedInstances ?? 0 }}
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
