<script setup lang="ts">
import type { Company, Contact, CrmCompanyLookupResult } from '~/types/crm'
import { Loader2 } from 'lucide-vue-next'

import { toast } from 'vue-sonner'
import CompanyNameAutofillInput from '~/components/crm/leads/CompanyNameAutofillInput.vue'
import CompanyForm from '~/components/crm/company/CompanyForm.vue'
import Button from '~/components/ui/button/Button.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { BR_PHONE_MASKS } from '~/composables/crm/useCrmLeadValue'
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
const isCompanyDialogOpen = ref(false)
const companyName = ref('')

const formData = reactive({
  name: props.initialData?.name || '',
  email: props.initialData?.email || '',
  phone: props.initialData?.phone || '',
  position: props.initialData?.position || '',
  company_id: props.initialData?.company_id ?? (null as string | null),
  notes: props.initialData?.notes || '',
})

async function hydrateCompanyName() {
  if (!tenantId.value || !formData.company_id) {
    companyName.value = props.initialData?.company_name || ''
    return
  }

  try {
    const response = await $fetch<{ data: Company }>(`/api/crm/company/${formData.company_id}`, {
      query: { tenant_id: tenantId.value },
    })
    companyName.value = response.data?.name || props.initialData?.company_name || ''
  }
  catch {
    companyName.value = props.initialData?.company_name || ''
  }
}

onMounted(() => {
  hydrateCompanyName()
})

function handleCompanyAutofill(match: CrmCompanyLookupResult) {
  formData.company_id = match.id
  companyName.value = match.name
}

function openNewCompanyDialog() {
  isCompanyDialogOpen.value = true
}

function handleCompanyCreated(company?: Company) {
  if (company?.id) {
    formData.company_id = company.id
    companyName.value = company.name
  }
  isCompanyDialogOpen.value = false
}

function clearCompany() {
  formData.company_id = null
  companyName.value = ''
}

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
          v-maska="{ mask: [...BR_PHONE_MASKS] }"
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
        <div class="flex items-center justify-between gap-2">
          <Label for="company">Empresa</Label>
          <div class="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-7 px-2 text-xs"
              @click="clearCompany"
            >
              Limpar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-7"
              @click="openNewCompanyDialog"
            >
              <Icon name="lucide:plus" class="mr-1 h-3.5 w-3.5" />
              Nova empresa
            </Button>
          </div>
        </div>
        <CompanyNameAutofillInput
          v-model="companyName"
          input-id="company"
          placeholder="Buscar empresa pelo nome"
          @autofill="handleCompanyAutofill"
        />
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

  <Dialog v-model:open="isCompanyDialogOpen">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Nova empresa</DialogTitle>
        <DialogDescription>
          Cadastre uma empresa no tenant e vincule a este contato.
        </DialogDescription>
      </DialogHeader>
      <CompanyForm @success="handleCompanyCreated" />
      <DialogFooter>
        <Button type="button" variant="outline" @click="isCompanyDialogOpen = false">
          Cancelar
        </Button>
        <Button type="submit" form="company-form">
          Salvar empresa
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
