<script setup lang="ts">
import type { WhatsAppCampaign } from '~/types/whatsapp'

import { columns } from '~/components/whatsapp/campaigns/columns'
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
  title: 'Campanhas',
  description: 'Disparos em massa via Evolution API',
})

const {
  campaigns,
  pending,
  search,
  statusFilter,
  refresh,
  deleteCampaign,
} = useWhatsAppCampaigns()

const actionLoadingId = ref<string | null>(null)

function handleView(campaign: WhatsAppCampaign) {
  navigateTo(`/whatsapp/campaigns/${campaign.id}`)
}

function handleEdit(campaign: WhatsAppCampaign) {
  if (!['draft', 'paused'].includes(campaign.status)) {
    toast.message('Somente rascunhos ou campanhas pausadas podem ser editadas')
    return
  }
  navigateTo(`/whatsapp/campaigns/${campaign.id}/edit`)
}

async function handleDelete(campaign: WhatsAppCampaign) {
  if (!import.meta.client || !confirm(`Excluir campanha "${campaign.name}"?`))
    return

  actionLoadingId.value = campaign.id
  try {
    await deleteCampaign(campaign.id)
    toast.success('Campanha excluída')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao excluir')
  }
  finally {
    actionLoadingId.value = null
  }
}
</script>

<template>
  <div>
    <WhatsAppPageHeader
      title="Campanhas"
      description="Envie mensagens em massa para contatos via Evolution API."
    >
      <template #actions>
        <Button @click="navigateTo('/whatsapp/campaigns/new')">
          <span class="i-lucide-plus mr-2 h-4 w-4" />
          Nova campanha
        </Button>
      </template>
    </WhatsAppPageHeader>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Input
        v-model="search"
        class="max-w-xs"
        placeholder="Buscar campanha..."
      />
      <Select v-model="statusFilter">
        <SelectTrigger class="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            Todos os status
          </SelectItem>
          <SelectItem value="draft">
            Rascunho
          </SelectItem>
          <SelectItem value="running">
            Enviando
          </SelectItem>
          <SelectItem value="paused">
            Pausada
          </SelectItem>
          <SelectItem value="completed">
            Concluída
          </SelectItem>
          <SelectItem value="failed">
            Falhou
          </SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" :disabled="pending" @click="refresh()">
        Atualizar
      </Button>
    </div>

    <Skeleton v-if="pending" class="h-64 w-full rounded-xl" />

    <div v-else-if="!campaigns.length" class="rounded-xl border border-dashed p-12 text-center">
      <span class="i-lucide-megaphone mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <h3 class="text-lg font-medium">
        Nenhuma campanha criada
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Crie sua primeira campanha de disparo em massa.
      </p>
      <Button class="mt-6" @click="navigateTo('/whatsapp/campaigns/new')">
        Nova campanha
      </Button>
    </div>

    <DataTable
      v-else
      :data="campaigns"
      :columns="columns"
      :meta="{ onView: handleView, onEdit: handleEdit, onDelete: handleDelete }"
    />
  </div>
</template>
