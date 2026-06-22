<script setup lang="ts">
import type { WhatsAppFlow } from '~/types/whatsapp'

import { columns } from '~/components/whatsapp/flows/columns'
import FlowEmptyState from '~/components/whatsapp/flows/FlowEmptyState.vue'
import FlowStatsCards from '~/components/whatsapp/flows/FlowStatsCards.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import DataTable from '~/components/ui/table/DataTable.vue'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Flows',
  description: 'Automações visuais para o WhatsApp',
})

const {
  flows,
  pending,
  search,
  statusFilter,
  refresh,
  deleteFlow,
} = useWhatsAppFlows()

const statusTabs = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'archived', label: 'Arquivados' },
] as const

function handleOpen(flow: WhatsAppFlow) {
  navigateTo(`/whatsapp/flows/${flow.id}`)
}

async function handleDelete(flow: WhatsAppFlow) {
  if (!import.meta.client || !confirm(`Excluir flow "${flow.name}"?`))
    return

  try {
    await deleteFlow(flow.id)
    toast.success('Flow excluído')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao excluir')
  }
}
</script>

<template>
  <div class="space-y-6">
    <WhatsAppPageHeader
      title="Flows"
      description="Automatize atendimento, qualificação e encaminhamento no WhatsApp com editor visual."
    >
      <template #actions>
        <Button @click="navigateTo('/whatsapp/flows/new')">
          <span class="i-lucide-plus mr-2 h-4 w-4" />
          Novo flow
        </Button>
      </template>
    </WhatsAppPageHeader>

    <Skeleton v-if="pending && !flows.length" class="h-24 w-full rounded-xl" />
    <FlowStatsCards v-else-if="flows.length" :flows="flows" />

    <div class="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          :model-value="statusFilter"
          @update:model-value="(value) => statusFilter = value as typeof statusFilter"
        >
          <TabsList class="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger
              v-for="tab in statusTabs"
              :key="tab.value"
              :value="tab.value"
              class="rounded-full border border-transparent px-3 py-1.5 text-xs data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {{ tab.label }}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="flex flex-wrap items-center gap-2">
          <Input
            v-model="search"
            class="w-full max-w-xs"
            placeholder="Buscar por nome ou descrição..."
          />
          <Button variant="outline" size="sm" :disabled="pending" @click="refresh()">
            <span class="i-lucide-refresh-cw mr-1.5 h-4 w-4" :class="{ 'animate-spin': pending }" />
            Atualizar
          </Button>
        </div>
      </div>

      <Skeleton v-if="pending" class="h-64 w-full rounded-xl" />

      <FlowEmptyState v-else-if="!flows.length">
        <Button @click="navigateTo('/whatsapp/flows/new')">
          <span class="i-lucide-plus mr-2 h-4 w-4" />
          Criar primeiro flow
        </Button>
      </FlowEmptyState>

      <DataTable
        v-else
        :data="flows"
        :columns="columns"
        :meta="{ onOpen: handleOpen, onDelete: handleDelete }"
      />
    </div>
  </div>
</template>
