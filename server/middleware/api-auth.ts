// Middleware para autenticação de rotas admin da API
import { createError, getHeader, getRequestURL } from 'h3'

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const config = useRuntimeConfig()

  // Aplica apenas para rotas admin (pode expandir para outras rotas sensíveis)
  if (!path.startsWith('/api/admin/')) {
    return
  }

  // Aceita múltiplos padrões de header para facilitar integração
  const apiKey = getHeader(event, 'x-api-secret') || getHeader(event, 'x-api-key')
  const authHeader = getHeader(event, 'authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  // Pula verificação se não há API_SECRET configurado
  if (!config.apiSecret) {
    return
  }

  // Verifica se algum dos métodos de autenticação é válido
  const isValid = [apiKey, bearerToken].includes(config.apiSecret)
  if (!isValid) {
    // Log de tentativa negada
    console.warn(`[API] Tentativa de acesso negado em ${path} - IP: ${event.node.req.socket.remoteAddress}`)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { success: false, error: 'API secret missing or invalid' },
    })
  }
})
