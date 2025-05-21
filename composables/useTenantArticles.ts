import { useArticles } from './useArticles'
import { useTenant } from './useTenant'
import { storeToRefs } from 'pinia'
import { useTenantStore } from '~/stores/tenant'
import { useCurrentTenant } from './useCurrentTenant'

/**
 * Composable específico para integrar artigos com tenant
 * Garante que o contexto do tenant seja mantido ao gerenciar artigos
 */
export function useTenantArticles() {
  const articles = useArticles()
  const { tenantId } = useCurrentTenant()
  
  // Carregar artigos do tenant atual
  const loadArticlesByTenant = async () => {
    // Aguardar o tenantId estar definido
    if (!tenantId.value) {
      // Se estamos no cliente e temos um tenant armazenado, podemos restaurar
      if (process.client) {
        const storedTenantId = localStorage.getItem('current-tenant-id')
        if (storedTenantId) {
          useTenantStore().setTenant(storedTenantId)
        } else {
          console.warn('Não há tenant selecionado para carregar artigos')
          return []
        }
      } else {
        // No servidor sem tenant, não podemos fazer nada
        return []
      }
    }
    
    // Com o tenant definido, carregar artigos
    await articles.fetchArticles()
    return articles.articles.value
  }
  
  // Função para garantir que estamos no tenant correto antes de qualquer operação
  const ensureTenantContext = async () => {
    if (!tenantId.value && process.client) {
      // Tentar restaurar do storage
      const storedTenantId = localStorage.getItem('current-tenant-id')
      if (storedTenantId) {
        useTenantStore().setTenant(storedTenantId)
      }
    }
    
    // Se ainda não temos tenant e somos admin/funcionário, precisamos selecionar um
    if (!tenantId.value) {
      const userSession = await useSupabaseClient().auth.getSession()
      if (userSession.data.session) {
        const user = userSession.data.session.user
        const { data: userRole } = await useSupabaseClient()
          .from('user_roles')
          .select('role, tenant_id')
          .eq('user_id', user.id)
          .single()
          
        // Se é cliente, usar o tenant_id do user_roles
        if (userRole && userRole.role === 'cliente' && userRole.tenant_id) {
          useTenantStore().setTenant(userRole.tenant_id)
        } else if (userRole && ['admin', 'funcionario'].includes(userRole.role)) {
          // Admin/funcionário deveria ter um tenant selecionado
          console.warn('Admin/Funcionário sem tenant selecionado')
        }
      }
    }
    
    return !!tenantId.value
  }
  
  return {
    ...articles,
    loadArticlesByTenant,
    ensureTenantContext,
    tenantId
  }
} 