<script setup lang="ts">
import type { WhatsAppInstanceView } from '~/types/whatsapp'

import ConnectionStatus from '~/components/whatsapp/integrations/ConnectionStatus.vue'
import QrCodeDisplay from '~/components/whatsapp/integrations/QrCodeDisplay.vue'
import WebhookUrlCopy from '~/components/whatsapp/integrations/WebhookUrlCopy.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Instância WhatsApp',
})

const route = useRoute()
const instanceId = computed(() => route.params.id as string)
const { tenantId } = useTenant()

const {
  connectInstance,
  disconnectInstance,
  testConnection,
  syncInstance,
  pollStatus,
} = useWhatsAppInstances()

const actionLoading = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const { data, pending, refresh } = await useAsyncData(
  () => `whatsapp-instance-${instanceId.value}-${tenantId.value}`,
  async () => {
    if (!tenantId.value || !instanceId.value)
      return null

    return $fetch<{
      data: WhatsAppInstanceView
      webhookUrl: string
      evolutionInstanceName?: string
    }>(`/api/whatsapp/instances/${instanceId.value}`, {
      query: { tenant_id: tenantId.value },
    })
  },
  { watch: [tenantId, instanceId] },
)

const instance = computed(() => data.value?.data)
const webhookUrl = computed(() => data.value?.webhookUrl || '')
const evolutionInstanceName = computed(() => data.value?.evolutionInstanceName || '')
const evolutionNameDraft = ref('')

watch(evolutionInstanceName, (value) => {
  evolutionNameDraft.value = value
}, { immediate: true })

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    const status = await pollStatus(instanceId.value)
    if (status.status === 'connected') {
      toast.success('WhatsApp conectado')
      stopPolling()
      await refresh()
    }
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onUnmounted(stopPolling)

async function handleConnect() {
  actionLoading.value = true
  try {
    const result = await connectInstance(instanceId.value)
    if (result.alreadyConnected) {
      toast.success('Instância já estava conectada — status sincronizado')
    }
    else {
      startPolling()
      toast.message('QR Code gerado — escaneie com o WhatsApp')
    }
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao conectar')
  }
  finally {
    actionLoading.value = false
  }
}

async function handleSync() {
  actionLoading.value = true
  try {
    const result = await syncInstance(instanceId.value)
    toast.success(`Sincronizado — status: ${result.data.status}`)
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao sincronizar')
  }
  finally {
    actionLoading.value = false
  }
}

async function handleSaveEvolutionName() {
  if (!evolutionNameDraft.value.trim() || !tenantId.value)
    return

  actionLoading.value = true
  try {
    await $fetch(`/api/whatsapp/instances/${instanceId.value}`, {
      method: 'PUT',
      body: {
        tenant_id: tenantId.value,
        evolution_instance_name: evolutionNameDraft.value.trim(),
      },
    })
    toast.success('Nome da instância Evolution atualizado')
    await refresh()
    await handleSync()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao salvar')
  }
  finally {
    actionLoading.value = false
  }
}

async function handleDisconnect() {
  actionLoading.value = true
  try {
    stopPolling()
    await disconnectInstance(instanceId.value)
    await refresh()
  }
  finally {
    actionLoading.value = false
  }
}

async function handleTest() {
  actionLoading.value = true
  try {
    await testConnection(instanceId.value)
    toast.success('Conexão verificada')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Falha no teste')
  }
  finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <div>
    <WhatsAppPageHeader
      :title="instance?.name || 'Instância'"
      description="Configure conexão, webhook e status."
    >
      <template #actions>
        <NuxtLink to="/whatsapp/integrations">
          <Button variant="outline">
            Voltar
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <div v-if="pending" class="space-y-4">
      <Skeleton class="h-40 w-full" />
      <Skeleton class="h-64 w-full" />
    </div>

    <div v-else-if="instance" class="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Status da conexão</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <ConnectionStatus :status="instance.status" :phone-number="instance.phoneNumber" />
          <p v-if="evolutionInstanceName" class="text-sm text-muted-foreground">
            Instância Evolution: <code class="rounded bg-muted px-1">{{ evolutionInstanceName }}</code>
          </p>
          <div v-if="instance.provider === 'evolution'" class="space-y-2">
            <Label for="evolution-name">Nome na Evolution API</Label>
            <div class="flex gap-2">
              <Input
                id="evolution-name"
                v-model="evolutionNameDraft"
                placeholder="nome-da-instancia"
              />
              <Button
                variant="outline"
                :disabled="actionLoading || !evolutionNameDraft.trim()"
                @click="handleSaveEvolutionName"
              >
                Salvar
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              Ajuste aqui se a instância já existia na Evolution antes de vincular ao sistema.
            </p>
          </div>
          <WebhookUrlCopy :url="webhookUrl" label="Webhook URL" />
          <p v-if="instance.integration?.webhookSecret" class="text-sm text-muted-foreground">
            Verify token: <code class="rounded bg-muted px-1">{{ instance.integration.webhookSecret }}</code>
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="instance.provider === 'evolution' && instance.status !== 'connected'"
              :disabled="actionLoading"
              @click="handleConnect"
            >
              Gerar QR Code
            </Button>
            <Button
              v-if="instance.status === 'connected' || instance.status === 'connecting'"
              variant="outline"
              :disabled="actionLoading"
              @click="handleDisconnect"
            >
              Desconectar
            </Button>
            <Button variant="outline" :disabled="actionLoading" @click="handleSync">
              Sincronizar
            </Button>
            <Button variant="outline" :disabled="actionLoading" @click="handleTest">
              Testar conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card v-if="instance.provider === 'evolution'">
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
        </CardHeader>
        <CardContent>
          <QrCodeDisplay
            :qr-code="instance.qrCode"
            :loading="actionLoading"
          />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
