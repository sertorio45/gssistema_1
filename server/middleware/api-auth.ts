// Middleware para autenticação de rotas admin da API
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  
  // Aplica apenas para rotas admin
  if (!path.startsWith('/api/admin/')) {
    return
  }
  
  // Verifica o cabeçalho com a chave API
  const apiKey = getHeader(event, 'x-api-secret')
  const config = useRuntimeConfig()
  
  // Pula verificação se não há API_SECRET configurado
  if (!config.apiSecret) {
    return
  }
  
  // Verifica se o token é válido
  if (!apiKey || apiKey !== config.apiSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Acesso não autorizado',
    })
  }
}) 