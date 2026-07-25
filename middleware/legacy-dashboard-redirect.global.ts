/**
 * Rotas antigas `/dashboard/*` → `/marketing/*`.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/dashboard')) {
    const path = to.path.replace(/^\/dashboard/, '/marketing') || '/marketing'
    return navigateTo({ path, query: to.query, hash: to.hash }, { redirectCode: 301 })
  }

  if (to.path === '/crm/reports' || to.path === '/crm/marketing')
    return navigateTo({ path: '/marketing/reports', query: to.query, hash: to.hash }, { redirectCode: 301 })

  if (to.path.startsWith('/crm/marketing/')) {
    const path = to.path.replace(/^\/crm\/marketing/, '/marketing')
    return navigateTo({ path, query: to.query, hash: to.hash }, { redirectCode: 301 })
  }
})
