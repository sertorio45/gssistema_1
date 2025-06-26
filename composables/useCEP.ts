export interface CEPData {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  gia: string
  ddd: string
  siafi: string
}

export interface CEPError {
  erro: boolean
}

export function useCEP() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const data = ref<CEPData | null>(null)

  const fetchCEP = async (cep: string): Promise<CEPData | null> => {
    if (!cep) {
      error.value = 'CEP is required'
      return null
    }

    // Remove formatting from CEP (keep only numbers)
    const cleanCEP = cep.replace(/\D/g, '')

    if (cleanCEP.length !== 8) {
      error.value = 'CEP must have 8 digits'
      return null
    }

    isLoading.value = true
    error.value = null
    data.value = null

    try {
      const response = await $fetch<CEPData | CEPError>(`https://viacep.com.br/ws/${cleanCEP}/json/`)

      if ('erro' in response) {
        error.value = 'CEP not found'
        return null
      }

      data.value = response as CEPData
      return response as CEPData
    }
    catch (err) {
      error.value = 'Failed to fetch CEP data'
      console.error('CEP fetch error:', err)
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  const formatCEP = (cep: string): string => {
    const cleaned = cep.replace(/\D/g, '')
    return cleaned.replace(/^(\d{5})(\d{3})$/, '$1-$2')
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    data: readonly(data),
    fetchCEP,
    formatCEP,
  }
}