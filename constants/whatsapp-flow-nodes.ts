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
      contentType: 'text',
      text: 'Olá! Como posso ajudar?',
      mediaUrl: '',
      mediaType: 'image',
      mediaCaption: '',
      fileName: '',
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
    description: 'Até 10s imediato; acima agenda retomada',
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
    type: 'wait_reply',
    label: 'Aguardar resposta',
    description: 'Pausa o fluxo até o cliente enviar uma nova mensagem',
    icon: 'i-lucide-message-circle-reply',
    inputs: 1,
    outputs: 1,
    className: 'wf-node-wait-reply',
    defaultData: {
      nodeType: 'wait_reply',
    },
  },
  {
    type: 'action',
    label: 'Ação',
    description: 'Marca lida, resolve, bloqueia contato etc.',
    icon: 'i-lucide-settings-2',
    inputs: 1,
    outputs: 1,
    className: 'wf-node-action',
    defaultData: {
      nodeType: 'action',
      actionType: 'mark_read',
      priority: 1,
    },
  },
  {
    type: 'ai_agent',
    label: 'Agente IA',
    description: 'Responde com agente configurado (OpenAI)',
    icon: 'i-lucide-bot',
    inputs: 1,
    outputs: 1,
    className: 'wf-node-ai',
    defaultData: {
      nodeType: 'ai_agent',
      agentId: '',
      sendReply: true,
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
) as Partial<Record<WhatsAppFlowNodeType, WhatsAppFlowNodeDefinition>>

export const WHATSAPP_FLOW_NODE_CATEGORIES: Array<{
  id: string
  label: string
  types: WhatsAppFlowNodeType[]
}> = [
  { id: 'start', label: 'Início', types: ['trigger'] },
  { id: 'messages', label: 'Mensagens', types: ['message'] },
  { id: 'logic', label: 'Lógica', types: ['condition', 'delay', 'wait_reply'] },
  { id: 'automation', label: 'Automação', types: ['action', 'tag', 'webhook'] },
  { id: 'crm', label: 'CRM & IA', types: ['crm_update', 'ai_agent', 'handoff'] },
]

export const WHATSAPP_FLOW_VARIABLES = [
  { key: '{{phone}}', label: 'Telefone' },
  { key: '{{name}}', label: 'Nome do contato' },
  { key: '{{message}}', label: 'Última mensagem' },
  { key: '{{last_reply}}', label: 'Resposta do cliente' },
  { key: '{{conversation_id}}', label: 'ID da conversa' },
]

const FLOW_ACTION_LABELS: Record<string, string> = {
  mark_read: 'Marcar como lida',
  resolve_conversation: 'Resolver conversa',
  set_priority: 'Definir prioridade',
  block_contact: 'Bloquear contato',
  unblock_contact: 'Desbloquear contato',
  opt_out: 'Opt-out de campanhas',
}

const FLOW_OPERATOR_LABELS: Record<string, string> = {
  contains: 'contém',
  equals: 'igual a',
  starts_with: 'começa com',
  not_contains: 'não contém',
}

const FLOW_HANDOFF_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  open: 'Aberta',
  resolved: 'Resolvida',
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderFlowNode(options: {
  icon: string
  label: string
  badge?: string
  preview: string
  previewMuted?: boolean
  className?: string
}) {
  const badge = options.badge
    ? `<span class="wf-node__badge">${escapeHtml(options.badge)}</span>`
    : ''

  return `
    <div class="wf-node ${escapeHtml(options.className || '')}">
      <aside class="wf-node__rail" aria-hidden="true">
        <span class="wf-node__rail-icon ${options.icon}"></span>
      </aside>
      <div class="wf-node__body">
        <div class="wf-node__header">
          <span class="wf-node__label">${escapeHtml(options.label)}</span>
          ${badge}
        </div>
        <div class="wf-node__preview${options.previewMuted ? ' wf-node__preview--muted' : ''}">${escapeHtml(options.preview)}</div>
      </div>
    </div>
  `
}

export function getWhatsAppFlowNodeDisplay(
  def: WhatsAppFlowNodeDefinition,
  data: Record<string, unknown>,
) {
  const nodeType = String(data.nodeType || def.type)

  if (nodeType === 'trigger') {
    const triggerLabel = data.triggerType === 'keyword' ? 'Palavra-chave' : 'Mensagem recebida'
    return {
      icon: def.icon,
      label: 'Gatilho',
      badge: 'Início',
      preview: triggerLabel,
      previewMuted: false,
    }
  }

  if (nodeType === 'message') {
    const isMedia = data.contentType === 'media'
    const preview = isMedia
      ? `Mídia · ${String(data.mediaType || 'arquivo')}`
      : String(data.text || 'Digite a mensagem no painel lateral...')
    return {
      icon: def.icon,
      label: 'Mensagem',
      badge: isMedia ? 'Mídia' : 'Texto',
      preview,
      previewMuted: !data.text && !isMedia,
    }
  }

  if (nodeType === 'condition') {
    const operator = FLOW_OPERATOR_LABELS[String(data.operator || 'contains')] || String(data.operator)
    const value = String(data.value || '...')
    return {
      icon: def.icon,
      label: 'Condição',
      badge: 'If / Else',
      preview: `Se mensagem ${operator} "${value.slice(0, 32)}"`,
      previewMuted: false,
    }
  }

  if (nodeType === 'delay') {
    return {
      icon: def.icon,
      label: 'Aguardar',
      badge: 'Timer',
      preview: `${data.seconds}s antes de continuar`,
      previewMuted: false,
    }
  }

  if (nodeType === 'wait_reply') {
    return {
      icon: def.icon,
      label: 'Aguardar resposta',
      badge: 'Pausa',
      preview: 'Continua quando o cliente responder',
      previewMuted: false,
    }
  }

  if (nodeType === 'webhook') {
    return {
      icon: def.icon,
      label: 'Webhook',
      badge: String(data.method || 'POST'),
      preview: String(data.url || 'Configure a URL no painel lateral'),
      previewMuted: !data.url,
    }
  }

  if (nodeType === 'tag') {
    const actionLabel = data.action === 'remove' ? 'Remover' : 'Adicionar'
    return {
      icon: def.icon,
      label: 'Etiqueta',
      badge: actionLabel,
      preview: String(data.tagName || 'Nome da etiqueta'),
      previewMuted: !data.tagName,
    }
  }

  if (nodeType === 'crm_update') {
    return {
      icon: def.icon,
      label: 'CRM',
      badge: 'Sync',
      preview: data.createIfMissing ? 'Criar contato se não existir' : 'Somente vincular existente',
      previewMuted: false,
    }
  }

  if (nodeType === 'handoff') {
    const status = FLOW_HANDOFF_STATUS_LABELS[String(data.status || 'pending')] || String(data.status)
    return {
      icon: def.icon,
      label: 'Handoff',
      badge: 'Humano',
      preview: `Conversa → ${status}`,
      previewMuted: false,
    }
  }

  if (nodeType === 'action') {
    const actionType = String(data.actionType || 'mark_read')
    return {
      icon: def.icon,
      label: 'Ação',
      badge: 'Auto',
      preview: FLOW_ACTION_LABELS[actionType] || actionType,
      previewMuted: false,
    }
  }

  if (nodeType === 'ai_agent') {
    return {
      icon: def.icon,
      label: 'Agente IA',
      badge: 'GPT',
      preview: data.agentId ? `Agente ${String(data.agentId).slice(0, 8)}…` : 'Selecione um agente',
      previewMuted: !data.agentId,
    }
  }

  return {
    icon: def.icon,
    label: def.label,
    preview: def.description,
    previewMuted: true,
  }
}

export function buildDrawflowNodeHtml(def: WhatsAppFlowNodeDefinition, data: Record<string, unknown>) {
  return renderFlowNode({
    ...getWhatsAppFlowNodeDisplay(def, data),
    className: def.className,
  })
}

export function createDefaultDrawflowCanvas(): DrawflowExport {
  const def = WHATSAPP_FLOW_NODE_MAP.trigger!
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
