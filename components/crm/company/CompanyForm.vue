<script setup lang="ts">
import type { Company } from '~/types/crm'
import { Loader2 } from 'lucide-vue-next'

import { toast } from 'vue-sonner'
import { useCEP } from '~/composables/useCEP'
import { useTenant } from '~/composables/useTenant'

interface Props {
  initialData?: Partial<Company>
}

interface Emits {
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { tenantId } = useTenant()
const { fetchCEP, formatCEP, isLoading: cepLoading } = useCEP()

const isSubmitting = ref(false)

const formData = reactive({
  name: props.initialData?.name || '',
  website: props.initialData?.website || '',
  address: props.initialData?.address || '',
  cep: props.initialData?.cep || '',
  city: props.initialData?.city || '',
  country: props.initialData?.country || '',
  notes: props.initialData?.notes || '',
})

async function handleSubmit() {
  if (!formData.name.trim()) {
    toast.error('Nome da empresa é obrigatório')
    return
  }

  if (!tenantId.value) {
    toast.error('Nenhum tenant disponível')
    return
  }

  isSubmitting.value = true

  try {
    const payload = {
      ...formData,
      tenant_id: tenantId.value,
    }

    if (props.initialData?.id) {
      await $fetch(`/api/crm/company/${props.initialData.id}`, {
        method: 'PUT',
        body: payload,
      })
      toast.success('Empresa atualizada com sucesso')
    }
    else {
      await $fetch('/api/crm/company', {
        method: 'POST',
        body: payload,
      })
      toast.success('Empresa criada com sucesso')
    }

    emit('success')
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Erro ao salvar empresa')
  }
  finally {
    isSubmitting.value = false
  }
}

async function handleCEPLookup(cep: string) {
  if (!cep || cep.length < 8)
    return

  const cepData = await fetchCEP(cep)
  if (cepData) {
    formData.address = cepData.logradouro || ''
    formData.city = cepData.localidade || ''
    formData.country = 'Brasil'
    formData.cep = formatCEP(cep)
    toast.success('Dados do CEP carregados')
  }
}
</script>

<template>
  <form id="company-form" class="space-y-5" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="space-y-2 md:col-span-2">
        <Label for="name">Nome da empresa <span class="text-destructive">*</span></Label>
        <Input id="name" v-model="formData.name" placeholder="Nome da empresa" required />
      </div>

      <div class="space-y-2 md:col-span-2">
        <Label for="website">Site</Label>
        <Input id="website" v-model="formData.website" placeholder="https://exemplo.com" type="url" />
      </div>
    </div>

    <div class="space-y-4">
      <h3 class="text-sm font-medium text-muted-foreground">
        Endereço
      </h3>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="space-y-2">
          <Label for="cep">CEP</Label>
          <div class="relative">
            <Input
              id="cep"
              v-model="formData.cep"
              placeholder="00000-000"
              :disabled="cepLoading"
              @blur="handleCEPLookup(($event.target as HTMLInputElement).value)"
            />
            <Loader2
              v-if="cepLoading"
              class="absolute right-3 top-1/2 h-4 w-4 animate-spin text-muted-foreground -translate-y-1/2"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="city">Cidade</Label>
          <Input id="city" v-model="formData.city" placeholder="Cidade" />
        </div>

        <div class="space-y-2">
          <Label for="country">País</Label>
          <Input id="country" v-model="formData.country" placeholder="País" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="address">Endereço</Label>
        <Textarea id="address" v-model="formData.address" placeholder="Endereço completo" :rows="2" />
      </div>
    </div>

    <div class="space-y-2">
      <Label for="notes">Observações</Label>
      <Textarea id="notes" v-model="formData.notes" placeholder="Observações sobre a empresa" :rows="3" />
    </div>
  </form>
</template>
