/**
 * Plugin para configurações adicionais do router
 * Resolve problemas com redirecionamentos após reload
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:created', () => {
    // Se estamos no cliente após um SSR
    if (import.meta.client) {
      nuxtApp.hook('page:finish', () => {
        // Guarda o último path que foi navegado
        const currentPath = window.location.pathname + window.location.search
        localStorage.setItem('lastPath', currentPath)
      })
    }
  })

  // Recupera o último path após reload
  if (import.meta.client && window.location.pathname === '/') {
    const lastPath = localStorage.getItem('lastPath')
    if (lastPath && lastPath !== '/' && lastPath !== '/login') {
      setTimeout(() => {
        nuxtApp.$router.push(lastPath)
      }, 100)
    }
  }
})
