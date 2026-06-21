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

const { agents } = useWhatsAppAgents()

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
        <Label>Tipo de conteúdo</Label>
        <Select
          :model-value="String(localData.contentType || 'text')"
          @update:model-value="(value) => {
            localData.contentType = value
            applyUpdate()
          }"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">
              Texto
            </SelectItem>
            <SelectItem value="media">
              Mídia (URL)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <template v-if="localData.contentType === 'media'">
        <div class="space-y-2">
          <Label>Tipo de mídia</Label>
          <Select
            :model-value="String(localData.mediaType || 'image')"
            @update:model-value="(value) => {
              localData.mediaType = value
              applyUpdate()
            }"
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">
                Imagem
              </SelectItem>
              <SelectItem value="video">
                Vídeo
              </SelectItem>
              <SelectItem value="audio">
                Áudio
              </SelectItem>
              <SelectItem value="document">
                Documento
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <Label>URL da mídia</Label>
          <Input
            :model-value="String(localData.mediaUrl || '')"
            placeholder="https://..."
            @update:model-value="(value) => { localData.mediaUrl = value }"
            @blur="applyUpdate"
          />
        </div>
        <div class="space-y-2">
          <Label>Legenda (opcional)</Label>
          <Textarea
            :model-value="String(localData.mediaCaption || localData.text || '')"
            rows="3"
            @update:model-value="(value) => {
              localData.mediaCaption = value
              localData.text = value
            }"
            @blur="applyUpdate"
          />
        </div>
      </template>

      <template v-else>
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
        <Label>Segundos (máx. 3600)</Label>
        <Input
          type="number"
          min="1"
          max="3600"
          :model-value="String(localData.seconds || 2)"
          @update:model-value="(value) => {
            localData.seconds = Math.min(Math.max(Number(value) || 1, 1), 3600)
            applyUpdate()
          }"
        />
      </div>
      <p class="text-xs text-muted-foreground">
        Até 10s executa na hora. Acima disso agenda retomada automática.
      </p>
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

    <template v-else-if="nodeType === 'action'">
      <div class="space-y-2">
        <Label>Tipo de ação</Label>
        <Select
          :model-value="String(localData.actionType || 'mark_read')"
          @update:model-value="(value) => {
            localData.actionType = value
            applyUpdate()
          }"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mark_read">
              Marcar conversa como lida
            </SelectItem>
            <SelectItem value="resolve_conversation">
              Resolver conversa
            </SelectItem>
            <SelectItem value="set_priority">
              Definir prioridade
            </SelectItem>
            <SelectItem value="block_contact">
              Bloquear contato
            </SelectItem>
            <SelectItem value="unblock_contact">
              Desbloquear contato
            </SelectItem>
            <SelectItem value="opt_out">
              Opt-out (sem campanhas)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div v-if="localData.actionType === 'set_priority'" class="space-y-2">
        <Label>Prioridade (0-5)</Label>
        <Input
          type="number"
          min="0"
          max="5"
          :model-value="String(localData.priority || 1)"
          @update:model-value="(value) => {
            localData.priority = Math.min(Math.max(Number(value) || 1, 0), 5)
            applyUpdate()
          }"
        />
      </div>
    </template>

    <template v-else-if="nodeType === 'ai_agent'">
      <div class="space-y-2">
        <Label>Agente</Label>
        <Select
          :model-value="String(localData.agentId || '')"
          @update:model-value="(value) => {
            localData.agentId = value
            applyUpdate()
          }"
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="agent in agents"
              :key="agent.id"
              :value="agent.id"
            >
              {{ agent.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p v-if="!agents.length" class="text-xs text-muted-foreground">
          Crie agentes em WhatsApp → Agentes IA.
        </p>
      </div>
      <div class="flex items-center justify-between rounded-lg border px-3 py-2">
        <div>
          <p class="text-sm font-medium">
            Enviar resposta no chat
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          @click="() => {
            localData.sendReply = localData.sendReply === false
            applyUpdate()
          }"
        >
          {{ localData.sendReply !== false ? 'Sim' : 'Não' }}
        </Button>
      </div>
    </template>
  </div>
</template>
