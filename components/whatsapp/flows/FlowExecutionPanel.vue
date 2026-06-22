<script setup lang="ts">
import type { WhatsAppFlowExecutionDetail, WhatsAppFlowExecutionSummary } from '~/types/whatsapp'

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

const props = defineProps<{
  executions: WhatsAppFlowExecutionSummary[]
  selectedExecutionId: string | null
  executionDetail: WhatsAppFlowExecutionDetail | null
  loadingDetail?: boolean
}>()

const emit = defineEmits<{
  selectExecution: [executionId: string]
}>()

const statusClass: Record<string, string> = {
  completed: 'text-emerald-600 dark:text-emerald-400',
  failed: 'text-destructive',
  running: 'text-primary',
  waiting: 'text-amber-600 dark:text-amber-400',
  waiting_reply: 'text-sky-600 dark:text-sky-400',
  skipped: 'text-muted-foreground',
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    completed: 'Concluída',
    failed: 'Falhou',
    running: 'Em execução',
    waiting: 'Aguardando timer',
    waiting_reply: 'Aguardando resposta',
    skipped: 'Ignorada',
  }
  return labels[status] || status
}
</script>

<template>
  <div class="space-y-4 xl:sticky xl:top-4">
    <Card class="border-border/60 shadow-none">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-semibold">
          Execuções recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="!executions.length" class="py-6 text-center text-sm text-muted-foreground">
          Nenhuma execução registrada ainda.
        </div>
        <div v-else class="space-y-2">
          <button
            v-for="execution in executions"
            :key="execution.id"
            type="button"
            class="w-full rounded-lg border px-3 py-2.5 text-left transition-all hover:border-primary/30 hover:bg-muted/40"
            :class="selectedExecutionId === execution.id ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border/60'"
            @click="emit('selectExecution', execution.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium" :class="statusClass[execution.status] || 'text-foreground'">
                {{ formatStatus(execution.status) }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ new Date(execution.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ new Date(execution.startedAt).toLocaleDateString('pt-BR') }}
            </p>
          </button>
        </div>
      </CardContent>
    </Card>

    <Card v-if="selectedExecutionId" class="border-border/60 shadow-none">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-semibold">
          Linha do tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="loadingDetail" class="h-28 w-full rounded-lg" />
        <div v-else-if="executionDetail?.logs?.length" class="relative space-y-0">
          <div
            v-for="(log, index) in executionDetail.logs"
            :key="log.id"
            class="relative flex gap-3 pb-4 last:pb-0"
          >
            <div class="flex flex-col items-center">
              <div
                class="mt-1 h-2.5 w-2.5 rounded-full ring-4 ring-background"
                :class="log.error ? 'bg-destructive' : 'bg-primary'"
              />
              <div
                v-if="index < executionDetail.logs.length - 1"
                class="mt-1 w-px flex-1 bg-border"
              />
            </div>
            <div class="min-w-0 flex-1 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium capitalize">{{ log.action }}</span>
                <span class="text-xs text-muted-foreground">
                  {{ new Date(log.executedAt).toLocaleTimeString('pt-BR') }}
                </span>
              </div>
              <p v-if="log.error" class="mt-1 text-xs text-destructive">
                {{ log.error }}
              </p>
              <p v-else-if="Object.keys(log.output || {}).length" class="mt-1 break-all text-xs text-muted-foreground">
                {{ JSON.stringify(log.output) }}
              </p>
            </div>
          </div>
        </div>
        <p v-else class="py-4 text-sm text-muted-foreground">
          Nenhum log registrado para esta execução.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
