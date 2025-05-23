import { useTenant } from '~/composables/useTenant'

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Se a rota contém um parâmetro de tenant, vamos verificar e configurar o contexto
  const tenantSlug = to.params.tenant as string | undefined
  
  // Verificar se a rota necessita de tenant
  const requiresTenant = to.meta.requiresTenant === true
  
  // Se não há slug de tenant na URL e a rota não requer tenant, continuar normalmente
  if (!tenantSlug && !requiresTenant) {
    return
  }
  
  // Obter o composable de tenant
  const { setCurrentTenantBySlug, currentTenant } = useTenant()
  
  // Se temos um slug na URL, tentar configurar o tenant atual
  if (tenantSlug) {
    await setCurrentTenantBySlug(tenantSlug)
    
    // Se não foi possível configurar o tenant e a rota o requer, redirecionar para erro
    if (!currentTenant.value && requiresTenant) {
      console.error(`Tenant não encontrado ou inativo: ${tenantSlug}`)
      return navigateTo('/404')
    }
  }
  
  // Se a rota requer tenant mas não temos um tenant válido configurado
  // (seja porque não há slug na URL ou porque o tenant não foi encontrado)
  if (requiresTenant && !currentTenant.value) {
    console.error('Esta rota requer um tenant válido')
    return navigateTo('/')
  }
}) 