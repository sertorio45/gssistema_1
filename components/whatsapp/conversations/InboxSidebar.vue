<script setup lang="ts">
import type { WhatsAppInstanceView } from '~/types/whatsapp'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

const props = defineProps<{
  instances: WhatsAppInstanceView[]
  activeInstanceId: string | null
  totalUnread?: number
  loading?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  select: [instanceId: string | null]
}>()

function formatPhone(phone?: string | null) {
  if (!phone)
    return 'Sem número'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  return phone
}

function statusDotClass(status: WhatsAppInstanceView['status']) {
  if (status === 'connected')
    return 'bg-emerald-500'
  if (status === 'connecting')
    return 'bg-amber-500'
  if (status === 'error')
    return 'bg-destructive'
  return 'bg-muted-foreground/50'
}

function statusLabel(status: WhatsAppInstanceView['status']) {
  const labels: Record<WhatsAppInstanceView['status'], string> = {
    connected: 'Conectado',
    connecting: 'Conectando',
    disconnected: 'Desconectado',
    error: 'Erro',
  }
  return labels[status] || status
}
</script>

<template>
  <div
    class="flex h-full min-h-0 flex-col border-r bg-muted/20"
    :class="compact ? 'w-full border-r-0' : 'hidden w-56 shrink-0 md:flex'"
  >
    <div class="flex items-center justify-between border-b px-3 py-3">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Caixas de entrada
        </p>
        <p v-if="!compact" class="text-[11px] text-muted-foreground">
          Uma caixa por número conectado
        </p>
      </div>
      <NuxtLink v-if="!compact" to="/whatsapp/integrations">
        <Button variant="ghost" size="icon" class="h-8 w-8" title="Gerenciar integrações">
          <span class="i-lucide-plus h-4 w-4" />
        </Button>
      </NuxtLink>
    </div>

    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="loading" class="space-y-2 p-1">
        <Skeleton v-for="i in 4" :key="i" class="h-14 w-full rounded-lg" />
      </div>

      <template v-else>
        <button
          type="button"
          class="mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-muted/60"
          :class="activeInstanceId === null ? 'bg-background shadow-sm ring-1 ring-border' : ''"
          @click="emit('select', null)"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <span class="i-lucide-inbox h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">
              Todas as caixas
            </p>
            <p class="truncate text-[11px] text-muted-foreground">
              {{ instances.length }} {{ instances.length === 1 ? 'instância' : 'instâncias' }}
            </p>
          </div>
          <Badge
            v-if="totalUnread"
            variant="secondary"
            class="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5"
          >
            {{ totalUnread > 99 ? '99+' : totalUnread }}
          </Badge>
        </button>

        <div v-if="!instances.length" class="rounded-lg border border-dashed p-4 text-center">
          <p class="text-sm text-muted-foreground">
            Nenhuma instância conectada
          </p>
          <NuxtLink to="/whatsapp/integrations" class="mt-2 inline-block text-sm text-primary hover:underline">
            Conectar WhatsApp
          </NuxtLink>
        </div>

        <button
          v-for="instance in instances"
          :key="instance.id"
          type="button"
          class="mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-muted/60"
          :class="activeInstanceId === instance.id ? 'bg-background shadow-sm ring-1 ring-border' : ''"
          @click="emit('select', instance.id)"
        >
          <span class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border">
            <span class="i-lucide-smartphone h-4 w-4 text-muted-foreground" />
            <span
              class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background"
              :class="statusDotClass(instance.status)"
              :title="statusLabel(instance.status)"
            />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">
              {{ instance.name }}
            </p>
            <p class="truncate text-[11px] text-muted-foreground">
              {{ formatPhone(instance.phoneNumber) }}
            </p>
          </div>
          <Badge
            v-if="instance.unreadCount"
            variant="secondary"
            class="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5"
          >
            {{ instance.unreadCount > 99 ? '99+' : instance.unreadCount }}
          </Badge>
        </button>
      </template>
    </div>
  </div>
</template>
