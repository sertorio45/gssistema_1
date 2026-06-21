import type { DrawflowExport } from '~/types/drawflow'
import type { WhatsAppFlowNodeType } from '~/types/whatsapp'

export interface WhatsAppFlowNodeDefinition {
  type: WhatsAppFlowNodeType
  label: string
  description: string
  icon: string
  inputs: number
  outputs: number
  className: string
  defaultData: Record<string, unknown>
}

export const WHATSAPP_FLOW_NODE_DEFINITIONS: WhatsAppFlowNodeDefinition[] = [
  {
    type: 'trigger',
    label: 'Gatilho',
    description: 'Inicia quando uma mensagem chega no WhatsApp',
    icon: 'i-lucide-zap',
    inputs: 0,
    outputs: 1,
    className: 'wf-node-trigger',
    defaultData: {
      nodeType: 'trigger',
      triggerType: 'message_received',
      keywords: [],
      instanceIds: [],
      onlyIncoming: true,
    },
  },
  {
    type: 'message',
    label: 'Enviar mensagem',
    description: 'Responde no chat do WhatsApp',
    icon: 'i-lucide-message-square',
    inputs: 1,
    outputs: 1,
    className: 'wf-node-message',
    defaultData: {
      nodeType: 'message',
      text: 'Olá! Como posso ajudar?',
    },
  },
  {
    type: 'condition',
    label: 'Condição',
    description: 'Ramifica conforme o texto da mensagem',
    icon: 'i-lucide-git-branch',
    inputs: 1,
    outputs: 2,
    className: 'wf-node-condition',
    defaultData: {
      nodeType: 'condition',
      operator: 'contains',
      value: '',
    },
  },
  {
    type: 'delay',
    label: 'Aguardar',
    description: 'Pausa antes do próximo passo (até 10s)',
    icon: 'i-lucide-timer',
    inputs: 1,
    outputs: 1,
    className: 'wf-node-delay',
    defaultData: {
      nodeType: 'delay',
      seconds: 2,
    },
  },
  {
    type: 'webhook',
    label: 'Webhook HTTP',
    description: 'Chama uma URL externa com dados do chat',
    icon: 'i-lucide-globe',
    inputs: 1,
    outputs: 1,
    className: 'wf-node-webhook',
    defaultData: {
      nodeType: 'webhook',
      url: '',
      method: 'POST',
    },
  },
  {
    type: 'tag',
    label: 'Etiqueta',
    description: 'Adiciona ou remove etiqueta do contato/conversa',
    icon: 'i-lucide-tag',
    inputs: 1,
    outputs: 1,
    className: 'wf-node-tag',
    defaultData: {
      nodeType: 'tag',
      tagName: '',
      action: 'add',
      target: 'contact',
    },
  },
  {
    type: 'crm_update',
    label: 'Sincronizar CRM',
    description: 'Vincula ou cria contato no CRM',
    icon: 'i-lucide-user-round-cog',
    inputs: 1,
    outputs: 1,
    className: 'wf-node-crm',
    defaultData: {
      nodeType: 'crm_update',
      createIfMissing: true,
    },
  },
  {
    type: 'handoff',
    label: 'Transferir humano',
    description: 'Encaminha conversa para atendimento humano',
    icon: 'i-lucide-user-check',
    inputs: 1,
    outputs: 1,
    className: 'wf-node-handoff',
    defaultData: {
      nodeType: 'handoff',
      status: 'pending',
      assignToUserId: '',
      stopFlow: true,
      note: '',
    },
  },
]

export const WHATSAPP_FLOW_NODE_MAP = Object.fromEntries(
  WHATSAPP_FLOW_NODE_DEFINITIONS.map(def => [def.type, def]),
) as Record<WhatsAppFlowNodeType, WhatsAppFlowNodeDefinition>

export const WHATSAPP_FLOW_VARIABLES = [
  { key: '{{phone}}', label: 'Telefone' },
  { key: '{{name}}', label: 'Nome do contato' },
  { key: '{{message}}', label: 'Última mensagem' },
  { key: '{{conversation_id}}', label: 'ID da conversa' },
]

export function buildDrawflowNodeHtml(def: WhatsAppFlowNodeDefinition, data: Record<string, unknown>) {
  const nodeType = String(data.nodeType || def.type)

  if (nodeType === 'trigger') {
    const triggerLabel = data.triggerType === 'keyword' ? 'Palavra-chave' : 'Mensagem recebida'
    return `
      <div class="wf-node">
        <div class="wf-node__title"><span class="i-lucide-zap"></span> Gatilho</div>
        <div class="wf-node__body">${triggerLabel}</div>
      </div>
    `
  }

  if (nodeType === 'message') {
    const text = String(data.text || '...').slice(0, 60)
    return `
      <div class="wf-node">
        <div class="wf-node__title"><span class="i-lucide-message-square"></span> Mensagem</div>
        <div class="wf-node__body">${text}</div>
      </div>
    `
  }

  if (nodeType === 'condition') {
    return `
      <div class="wf-node">
        <div class="wf-node__title"><span class="i-lucide-git-branch"></span> Condição</div>
        <div class="wf-node__body">${data.operator} "${String(data.value || '').slice(0, 24)}"</div>
      </div>
    `
  }

  if (nodeType === 'delay') {
    return `
      <div class="wf-node">
        <div class="wf-node__title"><span class="i-lucide-timer"></span> Aguardar</div>
        <div class="wf-node__body">${data.seconds}s</div>
      </div>
    `
  }

  if (nodeType === 'webhook') {
    return `
      <div class="wf-node">
        <div class="wf-node__title"><span class="i-lucide-globe"></span> Webhook</div>
        <div class="wf-node__body">${String(data.method || 'POST')} ${String(data.url || 'URL').slice(0, 28)}</div>
      </div>
    `
  }

  if (nodeType === 'tag') {
    const actionLabel = data.action === 'remove' ? 'Remover' : 'Adicionar'
    return `
      <div class="wf-node">
        <div class="wf-node__title"><span class="i-lucide-tag"></span> Etiqueta</div>
        <div class="wf-node__body">${actionLabel}: ${String(data.tagName || '...').slice(0, 24)}</div>
      </div>
    `
  }

  if (nodeType === 'crm_update') {
    return `
      <div class="wf-node">
        <div class="wf-node__title"><span class="i-lucide-user-round-cog"></span> CRM</div>
        <div class="wf-node__body">${data.createIfMissing ? 'Criar se ausente' : 'Somente vincular'}</div>
      </div>
    `
  }

  if (nodeType === 'handoff') {
    return `
      <div class="wf-node">
        <div class="wf-node__title"><span class="i-lucide-user-check"></span> Handoff</div>
        <div class="wf-node__body">Status: ${String(data.status || 'pending')}</div>
      </div>
    `
  }

  return `
    <div class="wf-node">
      <div class="wf-node__title">${def.label}</div>
    </div>
  `
}

export function createDefaultDrawflowCanvas(): DrawflowExport {
  const def = WHATSAPP_FLOW_NODE_MAP.trigger
  const data = { ...def.defaultData }

  return {
    drawflow: {
      Home: {
        data: {
          '1': {
            id: 1,
            name: 'trigger',
            data,
            class: def.className,
            html: buildDrawflowNodeHtml(def, data),
            typenode: false,
            inputs: {},
            outputs: {
              output_1: { connections: [] },
            },
            pos_x: 80,
            pos_y: 160,
          },
        },
      },
    },
  }
}
