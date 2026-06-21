<script setup lang="ts">
import type { WhatsAppReportsPeriod } from '~/composables/whatsapp/useWhatsAppReports'

import ConversationsStatusChart from '~/components/whatsapp/dashboard/ConversationsStatusChart.vue'
import DashboardKpiGrid from '~/components/whatsapp/dashboard/DashboardKpiGrid.vue'
import MessagesVolumeChart from '~/components/whatsapp/dashboard/MessagesVolumeChart.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'

definePageMeta({
  middleware: ['auth'],
  title: 'Relatórios',
  description: 'Relatórios e analytics do WhatsApp',
})

const { periodDays, analytics, pending, refresh, exportCsv } = useWhatsAppReports()

const periodModel = computed({
  get: () => String(periodDays.value),
  set: (value: string) => {
    periodDays.value = Number(value) as WhatsAppReportsPeriod
  },
})
</script>

<template>
  <div class="space-y-6">
    <WhatsAppPageHeader title="Relatórios" description="Análise de volume, campanhas, flows e agentes.">
      <template #actions>
        <div class="flex items-center gap-2">
          <Select v-model="periodModel">
            <SelectTrigger class="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">
                7 dias
              </SelectItem>
              <SelectItem value="14">
                14 dias
              </SelectItem>
              <SelectItem value="30">
                30 dias
              </SelectItem>
              <SelectItem value="90">
                90 dias
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" :disabled="pending" @click="refresh()">
            Atualizar
          </Button>
          <Button variant="outline" :disabled="pending" @click="exportCsv()">
            Exportar CSV
          </Button>
        </div>
      </template>
    </WhatsAppPageHeader>

    <DashboardKpiGrid :overview="analytics?.overview" :loading="pending" />

    <div class="grid gap-4 xl:grid-cols-3">
      <div class="xl:col-span-2">
        <MessagesVolumeChart
          :data="analytics?.messagesByDay ?? []"
          :loading="pending"
          :period-days="periodDays"
        />
      </div>
      <ConversationsStatusChart
        :data="analytics?.conversationsByStatus ?? []"
        :loading="pending"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="pending" class="h-24 w-full" />
          <div v-else-if="analytics?.campaigns.length" class="space-y-2 text-sm">
            <div
              v-for="campaign in analytics.campaigns"
              :key="campaign.id"
              class="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div>
                <p class="font-medium">
                  {{ campaign.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ campaign.status }}
                </p>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ campaign.sent }}/{{ campaign.total }}
              </p>
            </div>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            Nenhuma campanha no período.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Flows
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <Skeleton v-if="pending" class="h-24 w-full" />
          <template v-else-if="analytics">
            <div class="flex justify-between">
              <span>Execuções</span>
              <span class="font-medium">{{ analytics.flows.total }}</span>
            </div>
            <div class="flex justify-between">
              <span>Concluídas</span>
              <span class="font-medium">{{ analytics.flows.completed }}</span>
            </div>
            <div class="flex justify-between">
              <span>Falhas</span>
              <span class="font-medium">{{ analytics.flows.failed }}</span>
            </div>
            <div class="flex justify-between">
              <span>Aguardando</span>
              <span class="font-medium">{{ analytics.flows.waiting }}</span>
            </div>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Agentes IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="pending" class="h-24 w-full" />
          <div v-else-if="analytics" class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span>Sessões</span>
              <span class="font-medium">{{ analytics.agents.totalSessions }}</span>
            </div>
            <div class="flex justify-between">
              <span>Tokens</span>
              <span class="font-medium">{{ analytics.agents.totalTokens }}</span>
            </div>
            <div v-if="analytics.agents.topAgents.length" class="space-y-2 pt-2 border-t">
              <p class="text-xs text-muted-foreground">
                Top agentes
              </p>
              <div
                v-for="item in analytics.agents.topAgents"
                :key="item.agentId"
                class="flex justify-between"
              >
                <span>{{ item.agentName }}</span>
                <span>{{ item.sessions }}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
