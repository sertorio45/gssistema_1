/** Prompt padrão otimizado para atendimento WhatsApp (curto e direto). */
export const DEFAULT_AGENT_SYSTEM_PROMPT
  = 'Você é atendente virtual no WhatsApp. Responda em português, com mensagens curtas (1–3 parágrafos). Seja cordial e objetivo. Não invente preços, prazos ou dados. Se faltar informação, faça uma pergunta ou encaminhe para um humano.'

/** Detecta modelos reasoning (DeepSeek R1, QwQ, etc.) para dicas na UI. */
export function isReasoningModelName(model: string): boolean {
  const name = model.toLowerCase()
  return name.includes('deepseek-r1')
    || name.includes('deepseek_r1')
    || name.includes('r1:')
    || name.includes('r1-')
    || name.includes('qwq')
    || name.includes('reasoner')
    || name.includes('o1')
}
