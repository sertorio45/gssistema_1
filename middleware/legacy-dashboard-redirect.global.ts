/**
 * Rotas antigas `/dashboard/*` → `/crm/marketing/*` (módulo Marketing integrado ao CRM).
 */
export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/dashboard'))
    return
  const path = to.path.replace(/^\/dashboard/, '/crm/marketing') || '/crm/marketing'
  return navigateTo({ path, query: to.query, hash: to.hash }, { redirectCode: 301 })
})
