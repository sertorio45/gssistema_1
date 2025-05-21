/**
 * Plugin para lidar com o comportamento do router no cliente
 * Resolve o problema de perder a rota atual após recarregar a página
 */
export default defineNuxtPlugin((nuxtApp) => {
  // Após o app estar montado
  nuxtApp.hook('app:mounted', () => {
    // Registra a rota atual sempre que mudar de página
    nuxtApp.$router?.afterEach((to: any) => {
      if (to.fullPath !== '/login' && !to.fullPath.includes('/confirm')) {
        sessionStorage.setItem('lastRoute', to.fullPath)
      }
    })

    // Verifica se acabamos de recarregar a página e houve um erro 404
    // Isso acontece quando recebemos erro 404 em um path que funcionava antes de recarregar
    if (window.location.pathname === '/404' || window.location.pathname === '/') {
      // Recupera a última rota armazenada
      const lastRoute = sessionStorage.getItem('lastRoute')
      
      if (lastRoute && lastRoute !== '/login' && !lastRoute.includes('/confirm')) {
        // Navega de volta para a última rota conhecida
        setTimeout(() => {
          // Usa setTimeout para garantir que o redirecionamento aconteça após a página carregar
          nuxtApp.$router?.push(lastRoute)
        }, 100)
      }
    }
  })
}) 