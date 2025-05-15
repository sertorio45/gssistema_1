<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import { onMounted, ref } from 'vue'

const jwtToken = ref<string | null>(null)
const decodedToken = ref<any>(null)
const isLoading = ref(true)

function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) {
      return null
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => {
        return `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`
      }).join(''),
    )
    return JSON.parse(jsonPayload)
  }
  catch {
    return null
  }
}

onMounted(async () => {
  const client = useSupabaseClient()
  const { data: { session } } = await client.auth.getSession()
  
  if (session?.access_token) {
    jwtToken.value = session.access_token
    decodedToken.value = decodeJWT(session.access_token)
  }
  
  isLoading.value = false
})

// Extrai o role do token decodificado
const userRole = computed(() => {
  if (!decodedToken.value) return null
  
  // Verificar primeiro em app_metadata.role
  if (decodedToken.value.app_metadata?.role) {
    return decodedToken.value.app_metadata.role
  }
  
  // Fallback para os formatos antigos
  return decodedToken.value.user_roles || decodedToken.value.user_role || null
})
</script>

<template>
  <div class="container mx-auto py-10 px-4">
    <h1 class="text-2xl font-bold mb-6">Teste de JWT Token</h1>
    
    <div v-if="isLoading" class="my-4">
      <p>Carregando...</p>
    </div>
    
    <div v-else>
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-2">Papel do Usuário:</h2>
        <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
          <p class="font-mono">{{ userRole || 'Nenhum papel encontrado' }}</p>
        </div>
      </div>
      
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-2">Token JWT:</h2>
        <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto">
          <p class="font-mono break-all text-xs">{{ jwtToken || 'Nenhum token encontrado' }}</p>
        </div>
      </div>
      
      <div>
        <h2 class="text-xl font-semibold mb-2">Token Decodificado:</h2>
        <pre class="p-3 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto text-xs">{{ decodedToken ? JSON.stringify(decodedToken, null, 2) : 'Nenhum token decodificado' }}</pre>
      </div>
    </div>
  </div>
</template> 