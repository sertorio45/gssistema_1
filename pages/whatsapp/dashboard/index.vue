<script setup lang="ts">
import type { WhatsAppDashboardPeriod } from '~/composables/whatsapp/useWhatsAppDashboard'

import ConversationsStatusChart from '~/components/whatsapp/dashboard/ConversationsStatusChart.vue'
import DashboardKpiGrid from '~/components/whatsapp/dashboard/DashboardKpiGrid.vue'
import MessagesVolumeChart from '~/components/whatsapp/dashboard/MessagesVolumeChart.vue'
import RecentActivityFeed from '~/components/whatsapp/dashboard/RecentActivityFeed.vue'
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

definePageMeta({
  middleware: ['auth'],
  title: 'Painel WhatsApp',
  description: 'Visão geral do atendimento e métricas do WhatsApp',
})

const {
  periodDays,
  overview,
  messagesByDay,
  conversationsByStatus,
  recentActivity,
  pending,
  refresh,
} = useWhatsAppDashboard()

const periodModel = computed({
  get: () => String(periodDays.value),
  set: (value: string) => {
    periodDays.value = Number(value) as WhatsAppDashboardPeriod
  },
})
</script>

<template>
  <div class="space-y-6">
    <WhatsAppPageHeader
      title="Painel WhatsApp"
      description="Acompanhe conversas, volume de mensagens e desempenho do atendimento."
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <Select v-model="periodModel">
            <SelectTrigger class="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">
                Últimos 7 dias
              </SelectItem>
              <SelectItem value="14">
                Últimos 14 dias
              </SelectItem>
              <SelectItem value="30">
                Últimos 30 dias
              </SelectItem>
              <SelectItem value="90">
                Últimos 90 dias
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" :disabled="pending" @click="refresh()">
            <span class="i-lucide-refresh-cw mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </template>
    </WhatsAppPageHeader>

    <DashboardKpiGrid :overview="overview" :loading="pending" />

    <div class="grid gap-4 xl:grid-cols-3">
      <div class="xl:col-span-2">
        <MessagesVolumeChart
          :data="messagesByDay"
          :loading="pending"
          :period-days="periodDays"
        />
      </div>
      <ConversationsStatusChart
        :data="conversationsByStatus"
        :loading="pending"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <RecentActivityFeed :items="recentActivity" :loading="pending" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Ações rápidas
          </CardTitle>
        </CardHeader>
        <CardContent class="grid gap-2">
          <NuxtLink to="/whatsapp/conversations">
            <Button variant="outline" class="w-full justify-start">
              <span class="i-lucide-messages-square mr-2 h-4 w-4" />
              Abrir conversas
            </Button>
          </NuxtLink>
          <NuxtLink to="/whatsapp/contacts">
            <Button variant="outline" class="w-full justify-start">
              <span class="i-lucide-contact mr-2 h-4 w-4" />
              Ver contatos
            </Button>
          </NuxtLink>
          <NuxtLink to="/whatsapp/integrations">
            <Button variant="outline" class="w-full justify-start">
              <span class="i-lucide-plug mr-2 h-4 w-4" />
              Gerenciar integrações
            </Button>
          </NuxtLink>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
