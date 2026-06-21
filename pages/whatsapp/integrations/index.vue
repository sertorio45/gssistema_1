<script setup lang="ts">
import InstanceSetupDialog from '~/components/whatsapp/integrations/InstanceSetupDialog.vue'
import IntegrationCard from '~/components/whatsapp/integrations/IntegrationCard.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Integrações WhatsApp',
  description: 'Evolution API e WhatsApp Cloud API',
})

const {
  instances,
  pending,
  refresh,
  connectInstance,
  disconnectInstance,
  deleteInstance,
  testConnection,
  syncInstance,
  pollStatus,
} = useWhatsAppInstances()

const setupOpen = ref(false)
const actionLoadingId = ref<string | null>(null)
const pollTimers = new Map<string, ReturnType<typeof setInterval>>()

function webhookUrlFor(instanceId: string, provider: string) {
  if (!import.meta.client)
    return ''
  const base = window.location.origin
  return provider === 'cloud_api'
    ? `${base}/api/whatsapp/webhooks/cloud/${instanceId}`
    : `${base}/api/whatsapp/webhooks/evolution/${instanceId}`
}

function startPolling(instanceId: string) {
  stopPolling(instanceId)
  const timer = setInterval(async () => {
    const status = await pollStatus(instanceId)
    if (status.status === 'connected') {
      toast.success('WhatsApp conectado com sucesso')
      stopPolling(instanceId)
    }
  }, 5000)
  pollTimers.set(instanceId, timer)
}

function stopPolling(instanceId: string) {
  const timer = pollTimers.get(instanceId)
  if (timer) {
    clearInterval(timer)
    pollTimers.delete(instanceId)
  }
}

onUnmounted(() => {
  pollTimers.forEach(timer => clearInterval(timer))
  pollTimers.clear()
})

async function handleConnect(id: string) {
  actionLoadingId.value = id
  try {
    const result = await connectInstance(id)
    if (result.alreadyConnected) {
      toast.success('Instância já estava conectada — status sincronizado')
    }
    else {
      startPolling(id)
      toast.message('QR Code gerado — escaneie com o WhatsApp')
    }
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao conectar')
  }
  finally {
    actionLoadingId.value = null
  }
}

async function handleSync(id: string) {
  actionLoadingId.value = id
  try {
    const result = await syncInstance(id)
    toast.success(`Sincronizado — status: ${result.data.status}`)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao sincronizar')
  }
  finally {
    actionLoadingId.value = null
  }
}

async function handleDisconnect(id: string) {
  actionLoadingId.value = id
  try {
    stopPolling(id)
    await disconnectInstance(id)
    toast.success('Instância desconectada')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao desconectar')
  }
  finally {
    actionLoadingId.value = null
  }
}

async function handleTest(id: string) {
  actionLoadingId.value = id
  try {
    const result = await testConnection(id) as any
    toast.success(`Conexão OK — status: ${result.status || 'connected'}`)
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Falha no teste de conexão')
  }
  finally {
    actionLoadingId.value = null
  }
}

async function handleDelete(id: string) {
  if (!import.meta.client || !confirm('Excluir esta instância? Esta ação não pode ser desfeita.'))
    return

  actionLoadingId.value = id
  try {
    stopPolling(id)
    await deleteInstance(id)
    toast.success('Instância excluída')
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
      title="Integrações"
      description="Conecte Evolution API ou WhatsApp Cloud API oficial."
    >
      <template #actions>
        <Button @click="setupOpen = true">
          <span class="i-lucide-plus mr-2 h-4 w-4" />
          Nova instância
        </Button>
      </template>
    </WhatsAppPageHeader>

    <Alert class="mb-6">
      <span class="i-lucide-info h-4 w-4" />
      <AlertTitle>Webhooks automáticos</AlertTitle>
      <AlertDescription>
        Ao criar uma instância Evolution, o webhook é registrado automaticamente. Para Cloud API, configure a URL e o verify token no painel da Meta.
      </AlertDescription>
    </Alert>

    <div v-if="pending" class="grid gap-4 md:grid-cols-2">
      <Skeleton v-for="i in 2" :key="i" class="h-64 w-full rounded-xl" />
    </div>

    <div v-else-if="!instances?.length" class="rounded-xl border border-dashed p-12 text-center">
      <span class="i-lucide-plug mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <h3 class="text-lg font-medium">
        Nenhuma instância configurada
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Crie sua primeira conexão WhatsApp para começar o atendimento.
      </p>
      <Button class="mt-6" @click="setupOpen = true">
        Nova instância
      </Button>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <IntegrationCard
        v-for="instance in instances"
        :key="instance.id"
        :instance="instance"
        :webhook-url="webhookUrlFor(instance.id, instance.provider)"
        :action-loading="actionLoadingId === instance.id"
        @connect="handleConnect(instance.id)"
        @disconnect="handleDisconnect(instance.id)"
        @test="handleTest(instance.id)"
        @sync="handleSync(instance.id)"
        @delete="handleDelete(instance.id)"
        @open="navigateTo(`/whatsapp/integrations/${instance.id}`)"
      />
    </div>

    <InstanceSetupDialog v-model:open="setupOpen" @created="refresh()" />
  </div>
</template>
