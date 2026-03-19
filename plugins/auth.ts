export default defineNuxtPlugin(() => {
  addRouteMiddleware(
    'global-auth',
    async (to) => {
      const user = useSupabaseUser()

      // Páginas públicas que não precisam de autenticação
      const publicPages = ['/login', '/register', '/forgot-password', '/403', '/confirm']

      // Verificar se a página atual não é pública e o usuário não está autenticado
      if (!publicPages.includes(to.path) && !user.value) {
        // Redirecionar para a página de login
        return navigateTo('/login')
      }
    },
    { global: true },
  )
})
