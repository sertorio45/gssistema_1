<script setup lang="ts">
import type { WhatsAppFlowNodeType } from '~/types/whatsapp'

import { Button } from '~/components/ui/button'
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
import { WHATSAPP_FLOW_VARIABLES } from '~/constants/whatsapp-flow-nodes'

const props = defineProps<{
  nodeId: number | null
  nodeData: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  update: [nodeId: number, data: Record<string, unknown>]
  remove: [nodeId: number]
}>()

const localData = ref<Record<string, unknown>>({})

watch(
  () => [props.nodeId, props.nodeData] as const,
  ([id, data]) => {
    if (!id || !data) {
      localData.value = {}
      return
    }
    localData.value = { ...data }
  },
  { immediate: true },
)

const nodeType = computed(() => String(localData.value.nodeType || ''))

function applyUpdate() {
  if (!props.nodeId)
    return
  emit('update', props.nodeId, { ...localData.value })
}

function insertVariable(key: string) {
  const current = String(localData.value.text || '')
  localData.value.text = `${current}${key}`
  applyUpdate()
}
</script>

<template>
  <div v-if="!nodeId" class="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
    Selecione um bloco no canvas para editar propriedades.
  </div>

  <div v-else class="space-y-4 rounded-xl border p-4">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium capitalize">
        {{ nodeType }}
      </p>
      <Button
        v-if="nodeType !== 'trigger'"
        variant="ghost"
        size="sm"
        class="text-destructive"
        @click="emit('remove', nodeId!)"
      >
        Remover
      </Button>
    </div>

    <template v-if="nodeType === 'trigger'">
      <div class="space-y-2">
        <Label>Tipo de gatilho</Label>
        <Select
          :model-value="String(localData.triggerType || 'message_received')"
          @update:model-value="(value) => {
            localData.triggerType = value
            applyUpdate()
          }"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="message_received">
              Mensagem recebida
            </SelectItem>
            <SelectItem value="keyword">
              Palavra-chave
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div v-if="localData.triggerType === 'keyword'" class="space-y-2">
        <Label>Palavras-chave (vírgula)</Label>
        <Input
          :model-value="(localData.keywords as string[] | undefined)?.join(', ') || ''"
          placeholder="oi, menu, ajuda"
          @update:model-value="(value) => {
            localData.keywords = String(value).split(',').map(k => k.trim()).filter(Boolean)
            applyUpdate()
          }"
        />
      </div>
    </template>

    <template v-else-if="nodeType === 'message'">
      <div class="space-y-2">
        <Label>Texto da mensagem</Label>
        <Textarea
          :model-value="String(localData.text || '')"
          rows="4"
          @update:model-value="(value) => {
            localData.text = value
          }"
          @blur="applyUpdate"
        />
      </div>
      <div class="flex flex-wrap gap-1">
        <Button
          v-for="item in WHATSAPP_FLOW_VARIABLES"
          :key="item.key"
          variant="outline"
          size="sm"
          type="button"
          @click="insertVariable(item.key)"
        >
          {{ item.label }}
        </Button>
      </div>
    </template>

    <template v-else-if="nodeType === 'condition'">
      <div class="space-y-2">
        <Label>Operador</Label>
        <Select
          :model-value="String(localData.operator || 'contains')"
          @update:model-value="(value) => {
            localData.operator = value
            applyUpdate()
          }"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contains">
              Contém
            </SelectItem>
            <SelectItem value="equals">
              Igual a
            </SelectItem>
            <SelectItem value="starts_with">
              Começa com
            </SelectItem>
            <SelectItem value="not_contains">
              Não contém
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-2">
        <Label>Valor</Label>
        <Input
          :model-value="String(localData.value || '')"
          @update:model-value="(value) => { localData.value = value }"
          @blur="applyUpdate"
        />
      </div>
      <p class="text-xs text-muted-foreground">
        Saída superior = verdadeiro · inferior = falso
      </p>
    </template>

    <template v-else-if="nodeType === 'delay'">
      <div class="space-y-2">
        <Label>Segundos (máx. 10)</Label>
        <Input
          type="number"
          min="1"
          max="10"
          :model-value="String(localData.seconds || 2)"
          @update:model-value="(value) => {
            localData.seconds = Math.min(Math.max(Number(value) || 1, 1), 10)
            applyUpdate()
          }"
        />
      </div>
    </template>

    <template v-else-if="nodeType === 'webhook'">
      <div class="space-y-2">
        <Label>URL</Label>
        <Input
          :model-value="String(localData.url || '')"
          placeholder="https://..."
          @update:model-value="(value) => { localData.url = value }"
          @blur="applyUpdate"
        />
      </div>
      <div class="space-y-2">
        <Label>Método</Label>
        <Select
          :model-value="String(localData.method || 'POST')"
          @update:model-value="(value) => {
            localData.method = value
            applyUpdate()
          }"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="POST">
              POST
            </SelectItem>
            <SelectItem value="GET">
              GET
            </SelectItem>
            <SelectItem value="PUT">
              PUT
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </template>

    <template v-else-if="nodeType === 'tag'">
      <div class="space-y-2">
        <Label>Nome da etiqueta</Label>
        <Input
          :model-value="String(localData.tagName || '')"
          placeholder="Ex: lead-quente"
          @update:model-value="(value) => {
            localData.tagName = value
          }"
          @blur="applyUpdate"
        />
      </div>
      <div class="space-y-2">
        <Label>Ação</Label>
        <Select
          :model-value="String(localData.action || 'add')"
          @update:model-value="(value) => {
            localData.action = value
            applyUpdate()
          }"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">
              Adicionar
            </SelectItem>
            <SelectItem value="remove">
              Remover
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-2">
        <Label>Aplicar em</Label>
        <Select
          :model-value="String(localData.target || 'contact')"
          @update:model-value="(value) => {
            localData.target = value
            applyUpdate()
          }"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contact">
              Contato WhatsApp
            </SelectItem>
            <SelectItem value="conversation">
              Conversa
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </template>

    <template v-else-if="nodeType === 'crm_update'">
      <div class="flex items-center justify-between rounded-lg border px-3 py-2">
        <div>
          <p class="text-sm font-medium">
            Criar contato no CRM
          </p>
          <p class="text-xs text-muted-foreground">
            Se não existir vínculo por telefone
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          @click="() => {
            localData.createIfMissing = !localData.createIfMissing
            applyUpdate()
          }"
        >
          {{ localData.createIfMissing ? 'Sim' : 'Não' }}
        </Button>
      </div>
    </template>

    <template v-else-if="nodeType === 'handoff'">
      <div class="space-y-2">
        <Label>Status da conversa</Label>
        <Select
          :model-value="String(localData.status || 'pending')"
          @update:model-value="(value) => {
            localData.status = value
            applyUpdate()
          }"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">
              Pendente
            </SelectItem>
            <SelectItem value="open">
              Aberta
            </SelectItem>
            <SelectItem value="resolved">
              Resolvida
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-2">
        <Label>ID do atendente (opcional)</Label>
        <Input
          :model-value="String(localData.assignToUserId || '')"
          placeholder="UUID do usuário"
          @update:model-value="(value) => {
            localData.assignToUserId = value
          }"
          @blur="applyUpdate"
        />
      </div>
      <div class="flex items-center justify-between rounded-lg border px-3 py-2">
        <div>
          <p class="text-sm font-medium">
            Encerrar automação
          </p>
          <p class="text-xs text-muted-foreground">
            Para o flow após transferir
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          @click="() => {
            localData.stopFlow = localData.stopFlow === false
            applyUpdate()
          }"
        >
          {{ localData.stopFlow !== false ? 'Sim' : 'Não' }}
        </Button>
      </div>
    </template>
  </div>
</template>
