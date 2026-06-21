<script setup lang="ts">
import type { WhatsAppFlow } from '~/types/whatsapp'

import { columns } from '~/components/whatsapp/flows/columns'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import DataTable from '~/components/ui/table/DataTable.vue'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Flows',
  description: 'Automações visuais com Drawflow',
})

const {
  flows,
  pending,
  search,
  statusFilter,
  refresh,
  deleteFlow,
} = useWhatsAppFlows()

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
      description="Construa automações visuais integradas ao chat WhatsApp com Drawflow."
    >
      <template #actions>
        <Button @click="navigateTo('/whatsapp/flows/new')">
          <span class="i-lucide-plus mr-2 h-4 w-4" />
          Novo flow
        </Button>
      </template>
    </WhatsAppPageHeader>

    <div class="flex flex-wrap items-center gap-3">
      <Input
        v-model="search"
        class="max-w-xs"
        placeholder="Buscar flow..."
      />
      <Select v-model="statusFilter">
        <SelectTrigger class="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            Todos
          </SelectItem>
          <SelectItem value="draft">
            Rascunho
          </SelectItem>
          <SelectItem value="active">
            Ativo
          </SelectItem>
          <SelectItem value="paused">
            Pausado
          </SelectItem>
          <SelectItem value="archived">
            Arquivado
          </SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" :disabled="pending" @click="refresh()">
        Atualizar
      </Button>
    </div>

    <Skeleton v-if="pending" class="h-64 w-full rounded-xl" />

    <div v-else-if="!flows.length" class="rounded-xl border border-dashed p-12 text-center">
      <span class="i-lucide-workflow mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <h3 class="text-lg font-medium">
        Nenhum flow criado
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Crie automações de atendimento conectadas ao inbox do WhatsApp.
      </p>
      <Button class="mt-6" @click="navigateTo('/whatsapp/flows/new')">
        Novo flow
      </Button>
    </div>

    <DataTable
      v-else
      :data="flows"
      :columns="columns"
      :meta="{ onOpen: handleOpen, onDelete: handleDelete }"
    />
  </div>
</template>
