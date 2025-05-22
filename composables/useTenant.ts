import { useSupabaseClient } from '#imports'
import { computed, ref } from 'vue'
import type { Ref } from 'vue'

export interface Tenant {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useTenant() {
  const currentTenant: Ref<Tenant | null> = ref(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const supabase = useSupabaseClient()
  
  // Atualizar o tenant atual com base no slug
  async function setCurrentTenantBySlug(slug: string) {
    if (!slug) {
      return
    }

    isLoading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await supabase
        .from('tenant')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      
      if (err) {
        throw new Error(err.message)
      }
      if (!data) {
        throw new Error('Tenant não encontrado ou inativo')
      }
      
      currentTenant.value = data as Tenant
      
      // Salvar no localStorage para persistência entre sessões
      localStorage.setItem('currentTenantSlug', slug)
    } 
    catch (err: any) {
      error.value = err
      console.error('Erro ao buscar tenant:', err)
    } 
    finally {
      isLoading.value = false
    }
  }

  // Buscar tenant por ID
  async function getTenantById(id: string): Promise<Tenant | null> {
    try {
      const { data, error: err } = await supabase
        .from('tenant')
        .select('*')
        .eq('id', id)
        .single()
      
      if (err) throw err
      return data as Tenant
    } 
    catch (err) {
      console.error('Erro ao buscar tenant por ID:', err)
      return null
    }
  }

  // Listar todos os tenants
  async function listTenants() {
    try {
      const { data, error: err } = await supabase
        .from('tenant')
        .select('*')
        .order('name')
      
      if (err) throw err
      return data as Tenant[]
    } 
    catch (err) {
      console.error('Erro ao listar tenants:', err)
      return []
    }
  }

  // Restaurar tenant de sessão anterior
  async function restoreLastTenant() {
    const savedSlug = localStorage.getItem('currentTenantSlug')
    if (savedSlug) {
      await setCurrentTenantBySlug(savedSlug)
    }
  }

  // Limpar tenant selecionado
  function clearCurrentTenant() {
    currentTenant.value = null
    localStorage.removeItem('currentTenantSlug')
  }

  // Verificar se o tenant atual existe e está ativo
  const hasTenant = computed(() => !!currentTenant.value?.is_active)

  return {
    currentTenant,
    isLoading,
    error,
    hasTenant,
    setCurrentTenantBySlug,
    getTenantById,
    listTenants,
    restoreLastTenant,
    clearCurrentTenant
  }
} 