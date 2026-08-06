<script setup lang="ts">
import type { Company } from '~/types/crm'
import { toast } from 'vue-sonner'

import CompanyAddressFields from '~/components/crm/company/CompanyAddressFields.vue'
import { useTenant } from '~/composables/useTenant'
import { DEFAULT_COUNTRY_LABEL } from '~/constants/countries'

interface Props {
  initialData?: Partial<Company>
}

interface Emits {
  success: [company?: Company]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { tenantId } = useTenant()
const isSubmitting = ref(false)

const formData = reactive({
  name: props.initialData?.name || '',
  website: props.initialData?.website || '',
  notes: props.initialData?.notes || '',
  address: {
    cep: props.initialData?.cep || '',
    address: props.initialData?.address || '',
    address_number: props.initialData?.address_number || '',
    address_complement: props.initialData?.address_complement || '',
    city: props.initialData?.city || '',
    country: props.initialData?.country || DEFAULT_COUNTRY_LABEL,
  },
})

watch(
  () => props.initialData,
  (data) => {
    if (!data)
      return
    formData.name = data.name || ''
    formData.website = data.website || ''
    formData.notes = data.notes || ''
    formData.address = {
      cep: data.cep || '',
      address: data.address || '',
      address_number: data.address_number || '',
      address_complement: data.address_complement || '',
      city: data.city || '',
      country: data.country || DEFAULT_COUNTRY_LABEL,
    }
  },
)

async function handleSubmit() {
  if (!formData.name.trim()) {
    toast.error('Nome da empresa é obrigatório')
    return
  }

  if (!tenantId.value) {
    toast.error('Nenhuma empresa disponível')
    return
  }

  isSubmitting.value = true

  try {
    const payload = {
      name: formData.name.trim(),
      website: formData.website,
      notes: formData.notes,
      cep: formData.address.cep,
      address: formData.address.address,
      address_number: formData.address.address_number,
      address_complement: formData.address.address_complement,
      city: formData.address.city,
      country: formData.address.country,
      tenant_id: tenantId.value,
    }

    if (props.initialData?.id) {
      const response = await $fetch<{ data: Company }>(`/api/crm/company/${props.initialData.id}`, {
        method: 'PUT',
        body: payload,
      })
      toast.success('Empresa atualizada com sucesso')
      emit('success', response.data)
    }
    else {
      const response = await $fetch<{ data: Company }>('/api/crm/company', {
        method: 'POST',
        body: payload,
      })
      toast.success('Empresa criada com sucesso')
      emit('success', response.data)
    }
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.data?.message || 'Erro ao salvar empresa')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form id="company-form" class="space-y-5" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="md:col-span-2 space-y-2">
        <Label for="name">Nome da empresa <span class="text-destructive">*</span></Label>
        <Input id="name" v-model="formData.name" placeholder="Nome da empresa" required />
      </div>

      <div class="md:col-span-2 space-y-2">
        <Label for="website">Site</Label>
        <Input id="website" v-model="formData.website" placeholder="https://exemplo.com" type="url" />
      </div>
    </div>

    <CompanyAddressFields v-model="formData.address" />

    <div class="space-y-2">
      <Label for="notes">Observações</Label>
      <Textarea id="notes" v-model="formData.notes" placeholder="Observações sobre a empresa" :rows="3" />
    </div>
  </form>
</template>
