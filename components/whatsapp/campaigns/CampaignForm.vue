<script setup lang="ts">
import type { WhatsAppCampaign, WhatsAppCampaignAudienceFilter } from '~/types/whatsapp'

import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { toast } from 'vue-sonner'

const props = defineProps<{
  campaign?: WhatsAppCampaign | null
  loading?: boolean
}>()

const emit = defineEmits<{
  saved: [campaign: WhatsAppCampaign]
  cancel: []
}>()

const { instances } = useWhatsAppInstances()
const { createCampaign, updateCampaign } = useWhatsAppCampaigns()
const { contacts, refresh: refreshContacts, limit } = useWhatsAppContacts()

const name = ref('')
const instanceId = ref('')
const message = ref('')
const audienceType = ref<WhatsAppCampaignAudienceFilter['audience_type']>('all')
const tagsInput = ref('')
const selectedContactIds = ref<string[]>([])
const optInOnly = ref(true)
const excludeBlocked = ref(true)
const saving = ref(false)

const connectedInstances = computed(() =>
  (instances.value || []).filter(i => i.provider === 'evolution'),
)

const availableTags = computed(() => {
  const set = new Set<string>()
  for (const contact of contacts.value) {
    for (const tag of contact.tags || [])
      set.add(tag)
  }
  return Array.from(set).sort()
})

watch(
  () => props.campaign,
  (campaign) => {
    if (!campaign)
      return
    name.value = campaign.name
    instanceId.value = campaign.instanceId || ''
    message.value = campaign.audienceFilter.message || ''
    audienceType.value = campaign.audienceFilter.audience_type || 'all'
    tagsInput.value = (campaign.audienceFilter.tags || []).join(', ')
    selectedContactIds.value = [...(campaign.audienceFilter.contact_ids || [])]
    optInOnly.value = campaign.audienceFilter.opt_in_only ?? true
    excludeBlocked.value = campaign.audienceFilter.exclude_blocked ?? true
  },
  { immediate: true },
)

onMounted(async () => {
  limit.value = 100
  await refreshContacts()
  if (!instanceId.value && connectedInstances.value.length === 1)
    instanceId.value = connectedInstances.value[0].id
})

function buildAudienceFilter(): WhatsAppCampaignAudienceFilter {
  const tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  return {
    message: message.value.trim(),
    audience_type: audienceType.value || 'all',
    opt_in_only: optInOnly.value,
    exclude_blocked: excludeBlocked.value,
    tags: audienceType.value === 'tags' ? tags : [],
    contact_ids: audienceType.value === 'selected' ? selectedContactIds.value : [],
  }
}

function toggleContact(id: string) {
  if (selectedContactIds.value.includes(id))
    selectedContactIds.value = selectedContactIds.value.filter(item => item !== id)
  else
    selectedContactIds.value = [...selectedContactIds.value, id]
}

async function handleSubmit() {
  if (!name.value.trim()) {
    toast.error('Informe o nome da campanha')
    return
  }
  if (!instanceId.value) {
    toast.error('Selecione uma instância Evolution conectada')
    return
  }
  if (!message.value.trim()) {
    toast.error('Informe a mensagem')
    return
  }
  if (audienceType.value === 'selected' && !selectedContactIds.value.length) {
    toast.error('Selecione ao menos um contato')
    return
  }
  if (audienceType.value === 'tags' && !tagsInput.value.trim()) {
    toast.error('Informe ao menos uma tag')
    return
  }

  saving.value = true
  try {
    const audience_filter = buildAudienceFilter()
    let result: WhatsAppCampaign

    if (props.campaign?.id) {
      result = await updateCampaign(props.campaign.id, {
        name: name.value.trim(),
        instance_id: instanceId.value,
        audience_filter,
      })
      toast.success('Campanha atualizada')
    }
    else {
      result = await createCampaign({
        name: name.value.trim(),
        instance_id: instanceId.value,
        audience_filter,
      })
      toast.success('Campanha criada')
    }

    emit('saved', result)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao salvar campanha')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="grid gap-6 lg:grid-cols-3" @submit.prevent="handleSubmit">
    <div class="space-y-6 lg:col-span-2">
      <Card>
        <CardHeader>
          <CardTitle>Dados da campanha</CardTitle>
          <CardDescription>
            Disparo de texto livre via Evolution API (sem templates Meta).
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="campaign-name">Nome</Label>
            <Input id="campaign-name" v-model="name" placeholder="Ex: Promoção março" />
          </div>

          <div class="space-y-2">
            <Label>Instância WhatsApp</Label>
            <Select v-model="instanceId">
              <SelectTrigger>
                <SelectValue placeholder="Selecione a instância" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="instance in connectedInstances"
                  :key="instance.id"
                  :value="instance.id"
                >
                  {{ instance.name }}
                  <span class="text-muted-foreground"> · {{ instance.status }}</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="!connectedInstances.length" class="text-xs text-destructive">
              Nenhuma instância Evolution configurada. Crie uma em Integrações.
            </p>
          </div>

          <div class="space-y-2">
            <Label for="campaign-message">Mensagem</Label>
            <Textarea
              id="campaign-message"
              v-model="message"
              rows="6"
              placeholder="Olá {nome}, temos uma novidade para você..."
            />
            <p class="text-xs text-muted-foreground">
              Variáveis: <code>{nome}</code>, <code>{telefone}</code>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Público</CardTitle>
          <CardDescription>
            Apenas contatos com opt-in e não bloqueados entram por padrão.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>Tipo de audiência</Label>
            <Select v-model="audienceType">
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos os contatos elegíveis
                </SelectItem>
                <SelectItem value="tags">
                  Filtrar por tags
                </SelectItem>
                <SelectItem value="selected">
                  Selecionar contatos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="audienceType === 'tags'" class="space-y-2">
            <Label for="campaign-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="campaign-tags"
              v-model="tagsInput"
              placeholder="cliente-vip, lead-quente"
            />
            <p v-if="availableTags.length" class="text-xs text-muted-foreground">
              Tags existentes: {{ availableTags.slice(0, 8).join(', ') }}
            </p>
          </div>

          <div v-if="audienceType === 'selected'" class="space-y-2">
            <Label>Contatos</Label>
            <div class="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
              <label
                v-for="contact in contacts"
                :key="contact.id"
                class="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  :checked="selectedContactIds.includes(contact.id)"
                  @update:checked="(checked: boolean) => {
                    if (checked)
                      toggleContact(contact.id)
                    else if (selectedContactIds.includes(contact.id))
                      toggleContact(contact.id)
                  }"
                />
                <span>{{ contact.name || contact.phone }}</span>
                <span class="text-muted-foreground">· {{ contact.phone }}</span>
              </label>
              <p v-if="!contacts.length" class="text-sm text-muted-foreground">
                Nenhum contato cadastrado.
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model:checked="optInOnly" />
              Somente opt-in
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model:checked="excludeBlocked" />
              Excluir bloqueados
            </label>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card class="h-fit">
      <CardHeader>
        <CardTitle>Resumo</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4 text-sm text-muted-foreground">
        <p>
          A campanha será salva como <strong class="text-foreground">rascunho</strong>.
          Inicie o envio na tela de detalhes.
        </p>
        <p>
          Intervalo de ~2,5s entre mensagens para reduzir risco de bloqueio.
        </p>
        <div class="flex flex-col gap-2 pt-2">
          <Button type="submit" :disabled="saving || props.loading">
            {{ saving ? 'Salvando...' : (campaign ? 'Salvar alterações' : 'Criar campanha') }}
          </Button>
          <Button type="button" variant="outline" @click="emit('cancel')">
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  </form>
</template>
