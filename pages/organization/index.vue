<script setup lang="ts">
import type { AgencyDashboardMetrics } from '~/types/workspace'

import { computed } from 'vue'

import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'agency.clients.read',
  allowedOrganizationTypes: ['agency'],
  title: 'Visão geral da agência',
})

const { organization } = useWorkspace()
const organizationId = computed(() => organization.value?.id ?? null)

const { data: metricsRaw, pending, refresh, showSkeleton } = await useCachedAsyncData<AgencyDashboardMetrics | null>(
  computed(() => `agency-dashboard-${organizationId.value ?? 'none'}`),
  async () => {
    if (!organizationId.value)
      return null
    const response = await $fetch<{ data: AgencyDashboardMetrics }>(
      `/api/organizations/${organizationId.value}/dashboard`,
    )
    return response.data
  },
  { default: () => null, watch: [organizationId] },
)

const metrics = computed(() => metricsRaw.value)

const cards = computed(() => {
  const m = metrics.value
  return [
    { label: 'Clientes ativos', value: m?.active_clients ?? 0, icon: 'lucide:building-2', link: '/organization/clients' },
    { label: 'Integração social pendente', value: m?.pending_social_integrations ?? 0, icon: 'lucide:plug-zap', link: '/organization/clients' },
    { label: 'Revisão interna', value: m?.pending_internal_reviews ?? 0, icon: 'lucide:clipboard-check', link: '/marketing/approvals' },
    { label: 'Aguardando cliente', value: m?.pending_client_reviews ?? 0, icon: 'lucide:user-round-check', link: '/marketing/approvals' },
    { label: 'Alterações solicitadas', value: m?.changes_requested ?? 0, icon: 'lucide:message-square-warning', link: '/marketing/posts?status=changes_requested' },
    { label: 'Aprovados sem agenda', value: m?.approved_awaiting_schedule ?? 0, icon: 'lucide:calendar-plus', link: '/marketing/posts?status=approved' },
    { label: 'Publicações com erro', value: m?.publication_errors ?? 0, icon: 'lucide:circle-alert', link: '/marketing/posts?status=failed' },
    { label: 'Aprovações atrasadas', value: m?.overdue_approvals ?? 0, icon: 'lucide:alarm-clock', link: '/marketing/approvals' },
    { label: 'Minhas tarefas', value: m?.assigned_tasks ?? 0, icon: 'lucide:list-todo', link: '/marketing/posts' },
    { label: 'Próximos posts agendados', value: m?.upcoming_scheduled_posts ?? 0, icon: 'lucide:calendar-clock', link: '/marketing/calendar' },
  ]
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Visão geral
        </h1>
        <p class="mt-1 text-muted-foreground">
          {{ organization?.name }} — indicadores dos clientes que você pode acessar.
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="pending" @click="refresh()">
          Atualizar
        </Button>
        <Button size="sm" @click="navigateTo('/organization/clients/onboarding')">
          Novo cliente
        </Button>
      </div>
    </div>

    <div v-if="showSkeleton" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Card v-for="n in 10" :key="n" class="h-full">
        <CardContent class="flex items-start gap-3 p-5">
          <Skeleton class="h-9 w-9 shrink-0 rounded-lg" />
          <div class="min-w-0 flex-1 space-y-2">
            <Skeleton class="h-3 w-24" />
            <Skeleton class="h-8 w-12" />
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <NuxtLink v-for="card in cards" :key="card.label" :to="card.link">
        <Card class="h-full transition-colors hover:bg-muted/40">
          <CardContent class="flex items-start gap-3 p-5">
            <div class="h-9 w-9 flex shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon :name="card.icon" class="h-4 w-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground leading-snug">
                {{ card.label }}
              </p>
              <p class="mt-1 text-2xl font-semibold tabular-nums">
                {{ card.value }}
              </p>
            </div>
          </CardContent>
        </Card>
      </NuxtLink>
    </div>
  </div>
</template>
