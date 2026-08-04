<script setup lang="ts">
import { toast } from 'vue-sonner'

import Alert from '@/components/ui/alert/Alert.vue'
import AlertDescription from '@/components/ui/alert/AlertDescription.vue'
import AlertTitle from '@/components/ui/alert/AlertTitle.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Button from '@/components/ui/button/Button.vue'
import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import CardDescription from '@/components/ui/card/CardDescription.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'
import Switch from '@/components/ui/switch/Switch.vue'
import { useTenant } from '~/composables/useTenant'

interface CapiSettings {
  enabled: boolean
  pixel_id: string | null
  has_token: boolean
  test_event_code: string | null
  meta_connected: boolean
  pending_won_count: number
}

interface CapiEventRow {
  id: string
  lead_id: string
  lead_name: string | null
  lead_value: number | null
  event_name: string
  status: string
  attempts: number
  last_error: string | null
  sent_at: string | null
  created_at: string
}

const props = defineProps<{
  autoFocus?: boolean
}>()

const { tenantId } = useTenant()
const rootEl = ref<HTMLElement | null>(null)

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const syncing = ref(false)
const settings = ref<CapiSettings | null>(null)
const events = ref<CapiEventRow[]>([])
const enabled = ref(false)
const pixelId = ref('')
const accessToken = ref('')
const testEventCode = ref('')
const lastError = ref('')

async function loadAll() {
  if (!tenantId.value)
    return
  loading.value = true
  lastError.value = ''
  try {
    const [settingsRes, eventsRes] = await Promise.all([
      $fetch<{ data: CapiSettings }>('/api/crm/meta-capi/settings', {
        query: { tenant_id: tenantId.value },
      }),
      $fetch<{ data: CapiEventRow[] }>('/api/crm/meta-capi/events', {
        query: { tenant_id: tenantId.value, limit: 20 },
      }),
    ])
    settings.value = settingsRes.data
    enabled.value = Boolean(settingsRes.data.enabled)
    pixelId.value = settingsRes.data.pixel_id || ''
    testEventCode.value = settingsRes.data.test_event_code || ''
    events.value = eventsRes.data || []
  }
  catch (error: any) {
    lastError.value = error?.data?.statusMessage || error?.message || 'Erro ao carregar CAPI'
  }
  finally {
    loading.value = false
  }
}

async function saveSettings() {
  if (!tenantId.value)
    return
  saving.value = true
  lastError.value = ''
  try {
    const body: Record<string, unknown> = {
      tenant_id: tenantId.value,
      enabled: enabled.value,
      pixel_id: pixelId.value,
      test_event_code: testEventCode.value,
    }
    if (accessToken.value.trim())
      body.access_token = accessToken.value.trim()

    const res = await $fetch<{ data: CapiSettings }>('/api/crm/meta-capi/settings', {
      method: 'PUT',
      body,
    })
    settings.value = res.data
    enabled.value = Boolean(res.data.enabled)
    pixelId.value = res.data.pixel_id || ''
    testEventCode.value = res.data.test_event_code || ''
    accessToken.value = ''
    toast.success('Configuração CAPI salva')
    await loadAll()
  }
  catch (error: any) {
    lastError.value = error?.data?.statusMessage || error?.message || 'Erro ao salvar'
    toast.error(lastError.value)
  }
  finally {
    saving.value = false
  }
}

async function sendTest() {
  if (!tenantId.value)
    return
  testing.value = true
  lastError.value = ''
  try {
    const body: Record<string, unknown> = {
      tenant_id: tenantId.value,
      enabled: enabled.value,
      pixel_id: pixelId.value,
      test_event_code: testEventCode.value,
    }
    if (accessToken.value.trim())
      body.access_token = accessToken.value.trim()

    await $fetch('/api/crm/meta-capi/settings', { method: 'PUT', body })
    accessToken.value = ''

    await $fetch('/api/crm/meta-capi/test', {
      method: 'POST',
      body: { tenant_id: tenantId.value },
    })
    toast.success('Evento de teste enviado. Confira no Events Manager.')
    await loadAll()
  }
  catch (error: any) {
    lastError.value = error?.data?.statusMessage || error?.message || 'Falha no teste'
    toast.error(lastError.value)
  }
  finally {
    testing.value = false
  }
}

async function syncPending() {
  if (!tenantId.value)
    return
  if (!enabled.value) {
    toast.error('Ative o envio automático e clique em Salvar antes de sincronizar')
    return
  }
  if (!pixelId.value.trim() || !(settings.value?.has_token || accessToken.value.trim())) {
    toast.error('Informe o Pixel e o token da API de Conversões antes de sincronizar')
    return
  }
  syncing.value = true
  lastError.value = ''
  try {
    if (accessToken.value.trim() || pixelId.value !== settings.value?.pixel_id) {
      await saveSettings()
    }
    const res = await $fetch<{ data: { enqueued: number, sent: number, candidates: number } }>(
      '/api/crm/meta-capi/sync-pending',
      {
        method: 'POST',
        body: { tenant_id: tenantId.value, limit: 50 },
      },
    )
    if (res.data.candidates === 0)
      toast.info('Nenhum ganho pendente para enviar')
    else
      toast.success(`Sincronização: ${res.data.enqueued} enfileirados, ${res.data.sent} enviados`)
    await loadAll()
  }
  catch (error: any) {
    lastError.value = error?.data?.statusMessage || error?.message || 'Falha na sincronização'
    toast.error(lastError.value)
  }
  finally {
    syncing.value = false
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    sent: 'Enviado',
    failed: 'Erro',
    skipped: 'Ignorado',
  }
  return map[status] || status
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'sent')
    return 'default'
  if (status === 'failed')
    return 'destructive'
  if (status === 'skipped')
    return 'outline'
  return 'secondary'
}

function formatDate(value?: string | null) {
  if (!value)
    return '—'
  return new Date(value).toLocaleString('pt-BR')
}

watch(tenantId, () => {
  if (tenantId.value)
    loadAll()
}, { immediate: true })

onMounted(() => {
  if (props.autoFocus && rootEl.value)
    rootEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
</script>

<template>
  <div ref="rootEl">
    <Card id="meta-capi" class="border rounded-2xl shadow-sm">
      <CardHeader class="pb-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle class="text-lg">
              Conversões CRM (Meta CAPI)
            </CardTitle>
            <CardDescription class="mt-1 max-w-2xl">
              Integração independente do Marketing. Informe o Pixel e o token do Events Manager
              (mesmo fluxo do RD Station). Envia Lead na criação e Purchase no ganho.
            </CardDescription>
          </div>
          <Badge
            v-if="settings"
            :variant="settings.meta_connected && settings.enabled ? 'default' : 'outline'"
          >
            {{ settings.enabled && settings.meta_connected ? 'Ativo' : settings.meta_connected ? 'Configurado' : 'Pendente' }}
          </Badge>
        </div>
      </CardHeader>

      <CardContent class="space-y-6">
        <Alert v-if="lastError" variant="destructive">
          <Icon name="lucide:triangle-alert" class="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{{ lastError }}</AlertDescription>
        </Alert>

        <div v-if="loading" class="text-sm text-muted-foreground">
          Carregando configuração...
        </div>

        <template v-else-if="settings">
          <Alert>
            <Icon name="lucide:info" class="h-4 w-4" />
            <AlertTitle>Como obter Pixel e token</AlertTitle>
            <AlertDescription class="text-sm">
              No Gerenciador de Eventos da Meta: abra o conjunto de dados (Pixel) →
              Configurações → Gere o token de acesso da API de Conversões. O ID do Pixel
              aparece abaixo do nome do conjunto de dados.
            </AlertDescription>
          </Alert>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="flex items-center justify-between gap-3 border rounded-xl px-4 py-3 md:col-span-2">
              <div>
                <p class="text-sm font-medium">
                  Ativar envio automático
                </p>
                <p class="text-xs text-muted-foreground">
                  Lead na criação e Purchase ao mover para Ganho
                </p>
              </div>
              <Switch v-model:checked="enabled" />
            </div>

            <div class="space-y-2">
              <Label>ID do Pixel</Label>
              <Input
                v-model="pixelId"
                autocomplete="off"
                placeholder="Ex: 123456789012345"
              />
            </div>

            <div class="space-y-2">
              <Label>Código de teste (opcional)</Label>
              <Input
                v-model="testEventCode"
                autocomplete="off"
                placeholder="TEST12345"
              />
            </div>

            <div class="space-y-2 md:col-span-2">
              <Label>Token da API de Conversões</Label>
              <Input
                v-model="accessToken"
                type="password"
                autocomplete="off"
                :placeholder="settings.has_token ? '•••••••• (já configurado — cole para substituir)' : 'Cole o token do Events Manager'"
              />
            </div>
          </div>

          <div class="rounded-xl border border-dashed bg-muted/20 p-4 space-y-3">
            <div>
              <p class="text-sm font-semibold">
                Envio manual (backfill)
              </p>
              <p class="text-xs text-muted-foreground">
                Envia leads em Ganho ainda não sincronizados com a Meta.
                {{ settings.pending_won_count
                  ? `Há ${settings.pending_won_count} ganho(s) pendente(s).`
                  : 'Nenhum ganho pendente no momento.' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button :disabled="saving" @click="saveSettings">
                <Icon name="lucide:save" class="mr-2 h-4 w-4" />
                {{ saving ? 'Salvando...' : 'Salvar' }}
              </Button>
              <Button variant="outline" :disabled="testing || saving" @click="sendTest">
                <Icon name="lucide:flask-conical" class="mr-2 h-4 w-4" />
                {{ testing ? 'Enviando...' : 'Evento de teste' }}
              </Button>
              <Button variant="default" :disabled="syncing || saving" @click="syncPending">
                <Icon name="lucide:share-2" class="mr-2 h-4 w-4" :class="{ 'animate-spin': syncing }" />
                {{ syncing ? 'Sincronizando...' : 'Sincronizar ganhos pendentes' }}
                <Badge v-if="settings.pending_won_count" variant="secondary" class="ml-2">
                  {{ settings.pending_won_count }}
                </Badge>
              </Button>
            </div>
            <p v-if="!enabled" class="text-xs text-amber-700 dark:text-amber-400">
              Ative o envio automático e salve antes de sincronizar.
            </p>
          </div>

          <div>
            <div class="mb-3 flex items-center justify-between gap-2">
              <h3 class="text-sm font-semibold">
                Últimos envios
              </h3>
              <Button variant="ghost" size="sm" @click="loadAll">
                <Icon name="lucide:rotate-cw" class="mr-1 h-3.5 w-3.5" />
                Atualizar
              </Button>
            </div>

            <div v-if="!events.length" class="text-sm text-muted-foreground">
              Nenhum evento enviado ainda.
            </div>

            <div v-else class="overflow-x-auto border rounded-xl">
              <table class="w-full text-sm">
                <thead class="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">
                      Lead
                    </th>
                    <th class="px-3 py-2 font-medium">
                      Evento
                    </th>
                    <th class="px-3 py-2 font-medium">
                      Status
                    </th>
                    <th class="px-3 py-2 font-medium">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in events" :key="row.id" class="border-t">
                    <td class="px-3 py-2">
                      <div class="font-medium">
                        {{ row.lead_name || row.lead_id }}
                      </div>
                      <div v-if="row.last_error" class="max-w-xs truncate text-xs text-destructive">
                        {{ row.last_error }}
                      </div>
                    </td>
                    <td class="px-3 py-2">
                      {{ row.event_name }}
                    </td>
                    <td class="px-3 py-2">
                      <Badge :variant="statusVariant(row.status)">
                        {{ statusLabel(row.status) }}
                      </Badge>
                    </td>
                    <td class="px-3 py-2 text-muted-foreground">
                      {{ formatDate(row.sent_at || row.created_at) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
