<script setup lang="ts">
import type { Contact } from '~/types/crm'
import { Loader2 } from 'lucide-vue-next'

import { toast } from 'vue-sonner'
import { useTenant } from '~/composables/useTenant'

interface Props {
  initialData?: Partial<Contact>
}

interface Emits {
  (e: 'success'): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { tenantId } = useTenant()

const isSubmitting = ref(false)
const companiesData = ref<Array<{ id: string, name: string }>>([])
const isLoadingCompanies = ref(false)

const formData = reactive({
  name: props.initialData?.name || '',
  email: props.initialData?.email || '',
  phone: props.initialData?.phone || '',
  position: props.initialData?.position || '',
  company_id: props.initialData?.company_id ?? (null as string | null),
  notes: props.initialData?.notes || '',
})

async function fetchCompanies() {
  if (!tenantId.value)
    return

  isLoadingCompanies.value = true
  try {
    const response = await $fetch('/api/crm/company', {
      query: { tenant_id: tenantId.value, limit: 100 },
    })
    companiesData.value = response.data || []
    if (formData.company_id && !companiesData.value.find(c => c.id === formData.company_id)) {
      try {
        const company = await $fetch(`/api/crm/company/${formData.company_id}`, {
          query: { tenant_id: tenantId.value },
        })
        if (company?.data && !companiesData.value.find(c => c.id === company.data.id))
          companiesData.value.push(company.data)
      }
      catch {
        // ignore missing company
      }
    }
  }
  catch (error) {
    console.error('Failed to fetch companies:', error)
  }
  finally {
    isLoadingCompanies.value = false
  }
}

onMounted(() => {
  fetchCompanies()
})

async function handleSubmit() {
  if (!formData.name.trim()) {
    toast.error('Nome do contato é obrigatório')
    return
  }

  if (!formData.email.trim()) {
    toast.error('E-mail é obrigatório')
    return
  }

  if (!/^\S[^\s@]*@\S[^\s.]*\.\S+$/.test(formData.email)) {
    toast.error('Informe um e-mail válido')
    return
  }

  const phoneDigits = formData.phone.replace(/\D/g, '')
  if (formData.phone && phoneDigits.length < 10) {
    toast.error('Informe um telefone válido (mínimo 10 dígitos)')
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
      await $fetch(`/api/crm/contacts/${props.initialData.id}`, {
        method: 'PUT',
        body: payload,
      })
      toast.success('Contato atualizado com sucesso')
    }
    else {
      await $fetch('/api/crm/contacts', {
        method: 'POST',
        body: payload,
      })
      toast.success('Contato criado com sucesso')
    }

    emit('success')
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Erro ao salvar contato')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form id="contact-form" class="space-y-6" @submit.prevent="handleSubmit">
    <div class="space-y-2">
      <Label for="name">Nome do contato <span class="text-destructive">*</span></Label>
      <Input id="name" v-model="formData.name" placeholder="Nome do contato" required />
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="email">E-mail <span class="text-destructive">*</span></Label>
        <Input id="email" v-model="formData.email" placeholder="contato@exemplo.com" type="email" required />
      </div>

      <div class="space-y-2">
        <Label for="phone">Telefone</Label>
        <Input
          id="phone"
          v-model="formData.phone"
          v-maska="{ mask: ['(##) #####-####', '(##) ####-####'] }"
          placeholder="(00) 00000-0000"
          type="tel"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="position">Cargo</Label>
        <Input id="position" v-model="formData.position" placeholder="ex.: CEO, CTO, Gerente" />
      </div>

      <div class="space-y-2">
        <Label for="company">Empresa</Label>
        <Select v-model="formData.company_id" :disabled="isLoadingCompanies">
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="company in companiesData" :key="company.id" :value="company.id">
              {{ company.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <div v-if="isLoadingCompanies" class="flex items-center text-sm text-muted-foreground">
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          Carregando empresas...
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <Label for="notes">Observações</Label>
      <Textarea
        id="notes"
        v-model="formData.notes"
        placeholder="Observações sobre o contato"
        :rows="3"
      />
    </div>
  </form>
</template>
