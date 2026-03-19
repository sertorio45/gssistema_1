<script setup lang="ts">
import type { Meeting } from '~/types/crm'

import { toast } from 'vue-sonner'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'

import Textarea from '@/components/ui/textarea/Textarea.vue'
import AppointmentPicker from '~/components/ui/calendar/AppointmentPicker.vue'
import { useTenant } from '~/composables/useTenant'

import SelectWithAdd from './SelectWithAdd.vue'

interface Props {
  initialData?: Partial<Meeting>
}

interface Emits {
  (e: 'success'): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { tenantId } = useTenant()

const isSubmitting = ref(false)
const leads = ref<any[]>([])
const contacts = ref<any[]>([])
const companies = ref<any[]>([])

const form = ref({
  title: props.initialData?.title || '',
  description: props.initialData?.description || '',
  lead_id: props.initialData?.lead_id || '',
  contact_id: props.initialData?.contact_id || '',
  company_id: props.initialData?.company_id || '',
  start_time: props.initialData?.start_time || '',
  end_time: props.initialData?.end_time || '',
  location: props.initialData?.location || '',
  type: props.initialData?.type || 'meeting',
  status: props.initialData?.status || 'scheduled',
  attendees: props.initialData?.attendees || '',
  notes: props.initialData?.notes || '',
  outcome: props.initialData?.outcome || '',
})

onMounted(() => {
  fetchOptions()
})

async function fetchOptions() {
  if (!tenantId.value)
    return

  await Promise.all([fetchLeads(), fetchContacts(), fetchCompanies()])
}

async function fetchLeads() {
  try {
    const { data: leadsData } = await $fetch('/api/crm/leads', {
      params: { tenant_id: tenantId.value, limit: 1000 },
    })

    if (Array.isArray(leadsData)) {
      leads.value = leadsData || []
    }
    else {
      leads.value = []
    }
  }
  catch (error) {
    console.error('Error fetching leads:', error)
    leads.value = []
  }
}

async function fetchContacts() {
  try {
    const { data: contactsData } = await $fetch('/api/crm/contacts', {
      params: { tenant_id: tenantId.value, limit: 1000 },
    })
    contacts.value = contactsData || []
  }
  catch (error) {
    console.error('Error fetching contacts:', error)
    contacts.value = []
  }
}

async function fetchCompanies() {
  try {
    const { data: companiesData } = await $fetch('/api/crm/company', {
      params: { tenant_id: tenantId.value, limit: 1000 },
    })
    companies.value = companiesData || []
  }
  catch (error) {
    console.error('Error fetching companies:', error)
    companies.value = []
  }
}

function handleDateTimeUpdate(data: { start: string, end: string }) {
  form.value.start_time = data.start
  form.value.end_time = data.end
}

async function handleSubmit() {
  if (!tenantId.value)
    return

  isSubmitting.value = true

  try {
    const payload = {
      ...form.value,
      tenant_id: tenantId.value,
    }

    if (props.initialData?.id) {
      await $fetch(`/api/crm/meetings/${props.initialData.id}`, {
        method: 'PUT',
        body: payload,
      })
      toast.success('Reunião atualizada com sucesso')
    }
    else {
      await $fetch('/api/crm/meetings', {
        method: 'POST',
        body: payload,
      })
      toast.success('Reunião criada com sucesso')
    }

    emit('success')
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Erro ao salvar reunião')
  }
  finally {
    isSubmitting.value = false
  }
}

function handleCancel() {
  emit('cancel')
}

// Lead creation fields - Campos obrigatórios: name, email, phone + outros essenciais
const leadCreateFields = [
  { key: 'name', label: 'Nome', placeholder: 'Nome do lead' },
  { key: 'email', label: 'E-mail', placeholder: 'E-mail', type: 'email' },
  { key: 'phone', label: 'Telefone', placeholder: 'Telefone' },
  { key: 'company', label: 'Empresa', placeholder: 'Nome da empresa' },
]

// Valores padrão para lead (campos obrigatórios que não são capturados no form)
const leadDefaultValues = {
  status: 'new',
  source: 'manual',
  priority: 'medium',
  value: 0,
}

// Contact creation fields - Campos obrigatórios: name, email, phone + position opcional
const contactCreateFields = [
  { key: 'name', label: 'Nome', placeholder: 'Nome do contato' },
  { key: 'email', label: 'E-mail', placeholder: 'E-mail', type: 'email' },
  { key: 'phone', label: 'Telefone', placeholder: 'Telefone' },
  { key: 'position', label: 'Cargo', placeholder: 'Cargo' },
]

// Company creation fields - Apenas name é obrigatório, resto opcional
const companyCreateFields = [
  { key: 'name', label: 'Nome', placeholder: 'Nome da empresa' },
  { key: 'website', label: 'Site', placeholder: 'URL do site', type: 'url' },
  { key: 'industry', label: 'Indústria', placeholder: 'Indústria' },
]
</script>

<template>
  <form id="meeting-form" class="space-y-6" @submit.prevent="handleSubmit">
    <div class="grid gap-6">
      <!-- Basic Information -->
      <div class="space-y-4">
        <div>
          <Label for="title">Título</Label>
          <Input id="title" v-model="form.title" placeholder="Título da reunião" required />
        </div>
        <div>
          <Label for="description">Descrição</Label>
          <Textarea id="description" v-model="form.description" placeholder="Descrição da reunião" rows="3" />
        </div>
      </div>
      <!-- Related Records with Add Functionality -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SelectWithAdd
          v-model="form.lead_id"
          label="Lead"
          :items="leads"
          placeholder="Selecione o lead..."
          api-endpoint="/api/crm/lead"
          :create-fields="leadCreateFields"
          :default-values="leadDefaultValues"
          @refresh="fetchLeads"
        />
        <SelectWithAdd
          v-model="form.contact_id"
          label="Contato"
          :items="contacts"
          placeholder="Selecione o contato..."
          api-endpoint="/api/crm/contacts"
          :create-fields="contactCreateFields"
          @refresh="fetchContacts"
        />
        <SelectWithAdd
          v-model="form.company_id"
          label="Empresa"
          :items="companies"
          placeholder="Selecione a empresa..."
          api-endpoint="/api/crm/company"
          :create-fields="companyCreateFields"
          @refresh="fetchCompanies"
        />
      </div>
      <!-- Date and Time -->
      <div class="space-y-4">
        <AppointmentPicker :start-time="form.start_time" :end-time="form.end_time" @update="handleDateTimeUpdate" />
      </div>
      <!-- Additional Details -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label for="location">Local</Label>
          <Input id="location" v-model="form.location" placeholder="Local da reunião" />
        </div>
        <div>
          <Label for="type">Tipo</Label>
          <Input id="type" v-model="form.type" placeholder="Tipo da reunião" />
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label for="status">Status</Label>
          <Input id="status" v-model="form.status" placeholder="Status da reunião" />
        </div>
        <div>
          <Label for="attendees">Participantes</Label>
          <Input id="attendees" v-model="form.attendees" placeholder="Participantes" />
        </div>
      </div>
      <!-- Notes and Outcome -->
      <div class="space-y-4">
        <div>
          <Label for="notes">Observações</Label>
          <Textarea id="notes" v-model="form.notes" placeholder="Observações da reunião" rows="3" />
        </div>
        <div>
          <Label for="outcome">Resultado</Label>
          <Textarea id="outcome" v-model="form.outcome" placeholder="Resultado da reunião" rows="3" />
        </div>
      </div>
    </div>
  </form>
</template>
