import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useTenantStore } from '~/stores/tenant'

export default defineNuxtRouteMiddleware((to, _from) => {
  const tenantStore = useTenantStore()
  
  // Rotas que requerem tenant específico
  const routesRequiringTenant = [
    '/articles/new', 
    '/articles/edit', 
    // Adicione outras rotas que requerem tenant
  ]
  
  // Verificar se a rota atual requer tenant
  if (routesRequiringTenant.includes(to.path)) {
    // Se não houver tenant selecionado, redirecionar
    if (!tenantStore.tenantId) {
      return navigateTo('/tenants')
    }
  }
}) 