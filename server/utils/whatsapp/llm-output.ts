/**
 * Normaliza saída de LLMs (especialmente modelos reasoning como DeepSeek R1).
 */
const THINK_BLOCK_RE = /\x3cthink\x3e[\s\S]*?\x3c\/think\x3e\s*/gi
const THINK_CLOSE_RE = /^\x3c\/think\x3e\s*/i

export function stripLlmThinking(content: string): string {
  let text = String(content || '').trim()
  if (!text)
    return ''

  text = text.replace(THINK_BLOCK_RE, '').trim()
  text = text.replace(THINK_CLOSE_RE, '').trim()

  return text
}

export function sanitizeLlmOutput(content: string, options?: { stripThinking?: boolean }): string {
  if (!content)
    return ''

  let text = content.trim()

  if (options?.stripThinking)
    text = stripLlmThinking(text)

  return text.trim()
}
