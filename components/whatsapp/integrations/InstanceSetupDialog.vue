<script setup lang="ts">
import type { EvolutionRemoteInstanceView, WhatsAppProvider } from '~/types/whatsapp'

import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { toast } from 'vue-sonner'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: []
}>()

const { createInstance, discoverEvolutionInstances } = useWhatsAppInstances()

const provider = ref<WhatsAppProvider>('evolution')
const evolutionMode = ref<'create' | 'link'>('link')
const name = ref('')
const apiUrl = ref('')
const apiToken = ref('')
const evolutionInstanceName = ref('')
const remoteInstances = ref<EvolutionRemoteInstanceView[]>([])
const cloudPhoneId = ref('')
const cloudBusinessId = ref('')
const cloudAccessToken = ref('')
const isDefault = ref(false)
const saving = ref(false)
const discovering = ref(false)

function resetForm() {
  name.value = ''
  apiUrl.value = ''
  apiToken.value = ''
  evolutionInstanceName.value = ''
  remoteInstances.value = []
  cloudPhoneId.value = ''
  cloudBusinessId.value = ''
  cloudAccessToken.value = ''
  isDefault.value = false
  provider.value = 'evolution'
  evolutionMode.value = 'link'
}

async function handleDiscover() {
  if (!apiUrl.value.trim() || !apiToken.value.trim()) {
    toast.error('Informe URL e token da Evolution API')
    return
  }

  discovering.value = true
  try {
    const response = await discoverEvolutionInstances({
      api_url: apiUrl.value.trim(),
      api_token: apiToken.value.trim(),
    })
    remoteInstances.value = response.data || []
    if (!remoteInstances.value.length) {
      toast.message('Nenhuma instância encontrada na Evolution API')
    }
    else {
      const connected = remoteInstances.value.find(item => item.isConnected)
      if (connected && !evolutionInstanceName.value)
        evolutionInstanceName.value = connected.instanceName
    }
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao buscar instâncias')
  }
  finally {
    discovering.value = false
  }
}

function formatRemoteLabel(item: EvolutionRemoteInstanceView) {
  const status = item.isConnected ? 'conectada' : item.status
  const phone = item.phoneNumber ? ` · ${item.phoneNumber}` : ''
  return `${item.instanceName} (${status})${phone}`
}

async function handleSubmit() {
  if (!name.value.trim()) {
    toast.error('Informe o nome da instância')
    return
  }

  if (provider.value === 'evolution' && evolutionMode.value === 'link' && !evolutionInstanceName.value.trim()) {
    toast.error('Informe o nome da instância na Evolution API')
    return
  }

  saving.value = true
  try {
    const result = await createInstance({
      name: name.value.trim(),
      provider: provider.value,
      is_default: isDefault.value,
      api_url: provider.value === 'evolution' ? apiUrl.value.trim() : undefined,
      api_token: provider.value === 'evolution' ? apiToken.value.trim() : undefined,
      evolution_instance_name: provider.value === 'evolution' && evolutionMode.value === 'link'
        ? evolutionInstanceName.value.trim()
        : undefined,
      link_existing: provider.value === 'evolution' && evolutionMode.value === 'link',
      cloud_phone_id: provider.value === 'cloud_api' ? cloudPhoneId.value.trim() : undefined,
      cloud_business_id: provider.value === 'cloud_api' ? cloudBusinessId.value.trim() : undefined,
      cloud_access_token: provider.value === 'cloud_api' ? cloudAccessToken.value.trim() : undefined,
    })

    const linked = evolutionMode.value === 'link'
    const status = result.data?.status
    if (linked && status === 'connected') {
      toast.success('Instância existente vinculada e sincronizada')
    }
    else {
      toast.success('Instância criada com sucesso')
    }

    open.value = false
    resetForm()
    emit('created')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao criar instância')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova instância WhatsApp</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <Label for="instance-name">Nome no sistema</Label>
          <Input id="instance-name" v-model="name" placeholder="Ex: Atendimento principal" />
        </div>

        <Tabs v-model="provider">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="evolution">
              Evolution API
            </TabsTrigger>
            <TabsTrigger value="cloud_api">
              Cloud API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evolution" class="mt-4 space-y-3">
            <div class="space-y-2">
              <Label for="api-url">URL da API</Label>
              <Input id="api-url" v-model="apiUrl" placeholder="https://sua-evolution.com" />
            </div>
            <div class="space-y-2">
              <Label for="api-token">Token (apikey)</Label>
              <Input id="api-token" v-model="apiToken" type="password" autocomplete="off" />
            </div>

            <Tabs v-model="evolutionMode" class="w-full">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="link">
                  Vincular existente
                </TabsTrigger>
                <TabsTrigger value="create">
                  Criar nova
                </TabsTrigger>
              </TabsList>

              <TabsContent value="link" class="mt-3 space-y-3">
                <p class="text-xs text-muted-foreground">
                  Use quando a instância já está conectada na Evolution API. O sistema sincroniza status e webhook.
                </p>
                <div class="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    class="shrink-0"
                    :disabled="discovering"
                    @click="handleDiscover"
                  >
                    {{ discovering ? 'Buscando...' : 'Buscar instâncias' }}
                  </Button>
                </div>
                <div v-if="remoteInstances.length" class="space-y-2">
                  <Label>Instâncias encontradas</Label>
                  <Select v-model="evolutionInstanceName">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma instância" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="item in remoteInstances"
                        :key="item.instanceName"
                        :value="item.instanceName"
                      >
                        {{ formatRemoteLabel(item) }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="evolution-instance-name">Nome na Evolution API</Label>
                  <Input
                    id="evolution-instance-name"
                    v-model="evolutionInstanceName"
                    placeholder="Ex: minha-instancia"
                  />
                </div>
              </TabsContent>

              <TabsContent value="create" class="mt-3">
                <p class="text-xs text-muted-foreground">
                  Cria uma nova instância na Evolution API e gera QR Code para conexão.
                </p>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="cloud_api" class="mt-4 space-y-3">
            <div class="space-y-2">
              <Label for="cloud-phone">Phone Number ID</Label>
              <Input id="cloud-phone" v-model="cloudPhoneId" placeholder="ID do número na Meta" />
            </div>
            <div class="space-y-2">
              <Label for="cloud-business">Business Account ID (opcional)</Label>
              <Input id="cloud-business" v-model="cloudBusinessId" />
            </div>
            <div class="space-y-2">
              <Label for="cloud-token">Access Token</Label>
              <Input id="cloud-token" v-model="cloudAccessToken" type="password" autocomplete="off" />
            </div>
          </TabsContent>
        </Tabs>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="isDefault" type="checkbox" class="rounded border">
          Definir como instância padrão
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">
          Cancelar
        </Button>
        <Button :disabled="saving" @click="handleSubmit">
          {{ saving ? 'Salvando...' : (provider === 'evolution' && evolutionMode === 'link' ? 'Vincular instância' : 'Criar instância') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
