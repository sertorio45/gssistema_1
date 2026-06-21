import type { SupabaseClient } from '@supabase/supabase-js'

import { syncWhatsAppContactToCrm } from '~/server/utils/whatsapp/crm-sync'

export interface AgentToolContext {
  tenantId: string
  contactId: string | null
  conversationId: string | null
  contactPhone: string
  contactName?: string | null
  isTest?: boolean
}

export interface AgentToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface AgentToolCall {
  tool: string
  args: Record<string, unknown>
}

const INTERNAL_TOOLS: Record<string, AgentToolDefinition> = {
  lookup_contact: {
    name: 'lookup_contact',
    description: 'Busca dados do contato WhatsApp atual (nome, telefone, tags, opt-in).',
    parameters: { type: 'object', properties: {} },
  },
  sync_crm: {
    name: 'sync_crm',
    description: 'Sincroniza o contato WhatsApp com o CRM.',
    parameters: { type: 'object', properties: {} },
  },
  add_tag: {
    name: 'add_tag',
    description: 'Adiciona uma etiqueta ao contato.',
    parameters: {
      type: 'object',
      properties: { tag: { type: 'string', description: 'Nome da etiqueta' } },
      required: ['tag'],
    },
  },
  resolve_conversation: {
    name: 'resolve_conversation',
    description: 'Marca a conversa atual como resolvida.',
    parameters: { type: 'object', properties: {} },
  },
}

export function getInternalToolDefinitions(): AgentToolDefinition[] {
  return Object.values(INTERNAL_TOOLS)
}

export function buildToolsSystemPrompt(tools: AgentToolDefinition[]): string {
  if (!tools.length)
    return ''

  const lines = tools.map(tool => `- ${tool.name}: ${tool.description}`)
  return [
    'Ferramentas disponíveis:',
    ...lines,
    '',
    'Para usar uma ferramenta, responda APENAS com JSON válido no formato:',
    '{"tool":"nome_da_ferramenta","args":{}}',
    'Quando tiver a resposta final para o usuário, responda em português sem JSON.',
  ].join('\n')
}

export function parseToolCall(content: string): AgentToolCall | null {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{'))
    return null

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const tool = String(parsed.tool || parsed.name || '').trim()
    if (!tool)
      return null

    return {
      tool,
      args: (parsed.args || parsed.arguments || {}) as Record<string, unknown>,
    }
  }
  catch {
    return null
  }
}

export async function executeAgentTool(
  client: SupabaseClient,
  ctx: AgentToolContext,
  call: AgentToolCall,
): Promise<string> {
  if (ctx.isTest)
    return `[teste] Ferramenta ${call.tool} simulada`

  switch (call.tool) {
    case 'lookup_contact': {
      if (!ctx.contactId)
        return 'Contato não identificado.'

      const { data } = await client
        .from('whatsapp_contact')
        .select('name, phone, tags, opt_in, blocked, crm_contact_id')
        .eq('id', ctx.contactId)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle()

      return JSON.stringify(data || { phone: ctx.contactPhone, name: ctx.contactName })
    }

    case 'sync_crm': {
      if (!ctx.contactId)
        return 'Contato não identificado para sync CRM.'

      const result = await syncWhatsAppContactToCrm(client, ctx.tenantId, ctx.contactId)
      return JSON.stringify(result)
    }

    case 'add_tag': {
      const tag = String(call.args.tag || '').trim()
      if (!tag || !ctx.contactId)
        return 'Etiqueta ou contato inválido.'

      const { data: contact } = await client
        .from('whatsapp_contact')
        .select('tags')
        .eq('id', ctx.contactId)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle()

      const tags = Array.from(new Set([...(contact?.tags || []), tag]))
      await client
        .from('whatsapp_contact')
        .update({ tags, updated_at: new Date().toISOString() })
        .eq('id', ctx.contactId)
        .eq('tenant_id', ctx.tenantId)

      return `Etiqueta "${tag}" adicionada.`
    }

    case 'resolve_conversation': {
      if (!ctx.conversationId)
        return 'Conversa não identificada.'

      await client
        .from('whatsapp_conversation')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', ctx.conversationId)
        .eq('tenant_id', ctx.tenantId)

      return 'Conversa marcada como resolvida.'
    }

    default:
      return `Ferramenta desconhecida: ${call.tool}`
  }
}

export async function loadEnabledAgentTools(
  client: SupabaseClient,
  tenantId: string,
  agentId: string,
): Promise<AgentToolDefinition[]> {
  const { data: rows } = await client
    .from('whatsapp_agent_tool')
    .select('name, type, config, mcp_tool_name, is_enabled')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .eq('is_enabled', true)

  const tools: AgentToolDefinition[] = [...getInternalToolDefinitions()]

  for (const row of rows || []) {
    if (row.type === 'internal' && INTERNAL_TOOLS[row.name])
      continue

    tools.push({
      name: row.name,
      description: String((row.config as Record<string, unknown>)?.description || row.mcp_tool_name || row.name),
      parameters: (row.config as Record<string, unknown>)?.parameters as Record<string, unknown> || {},
    })
  }

  return tools
}
