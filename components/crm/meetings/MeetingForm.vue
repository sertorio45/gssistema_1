<script setup lang="ts">
import type { Meeting } from '~/types/crm'
import { toast } from 'vue-sonner'
import Button from '@/components/ui/button/Button.vue'
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

  await Promise.all([
    fetchLeads(),
    fetchContacts(),
    fetchCompanies(),
  ])
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
      toast.success('Meeting updated successfully')
    }
    else {
      await $fetch('/api/crm/meetings', {
        method: 'POST',
        body: payload,
      })
      toast.success('Meeting created successfully')
    }

    emit('success')
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Failed to save meeting')
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
  { key: 'name', label: 'Name', placeholder: 'Enter lead name' },
  { key: 'email', label: 'Email', placeholder: 'Enter email address', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: 'Enter phone number' },
  { key: 'company', label: 'Company', placeholder: 'Enter company name' },
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
  { key: 'name', label: 'Name', placeholder: 'Enter contact name' },
  { key: 'email', label: 'Email', placeholder: 'Enter email address', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: 'Enter phone number' },
  { key: 'position', label: 'Position', placeholder: 'Enter position' },
]

// Company creation fields - Apenas name é obrigatório, resto opcional 
const companyCreateFields = [
  { key: 'name', label: 'Name', placeholder: 'Enter company name' },
  { key: 'website', label: 'Website', placeholder: 'Enter website URL', type: 'url' },
  { key: 'industry', label: 'Industry', placeholder: 'Enter industry' },
]
</script>

<template>
  <form id="meeting-form" @submit.prevent="handleSubmit" class="space-y-6">
    <div class="grid gap-6">
      <!-- Basic Information -->
      <div class="space-y-4">
        <div>
          <Label for="title">Title</Label>
          <Input
            id="title"
            v-model="form.title"
            placeholder="Meeting title"
            required
          />
        </div>
        <div>
          <Label for="description">Description</Label>
          <Textarea
            id="description"
            v-model="form.description"
            placeholder="Meeting description"
            rows="3"
          />
        </div>
      </div>
      <!-- Related Records with Add Functionality -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectWithAdd
          v-model="form.lead_id"
          label="Lead"
          :items="leads"
          placeholder="Select lead..."
          api-endpoint="/api/crm/lead"
          :create-fields="leadCreateFields"
          :default-values="leadDefaultValues"
          @refresh="fetchLeads"
        />
        <SelectWithAdd
          v-model="form.contact_id"
          label="Contact"
          :items="contacts"
          placeholder="Select contact..."
          api-endpoint="/api/crm/contacts"
          :create-fields="contactCreateFields"
          @refresh="fetchContacts"
        />
        <SelectWithAdd
          v-model="form.company_id"
          label="Company"
          :items="companies"
          placeholder="Select company..."
          api-endpoint="/api/crm/company"
          :create-fields="companyCreateFields"
          @refresh="fetchCompanies"
        />
      </div>
      <!-- Date and Time -->
      <div class="space-y-4">
        <AppointmentPicker
          :start-time="form.start_time"
          :end-time="form.end_time"
          @update="handleDateTimeUpdate"
        />
      </div>
      <!-- Additional Details -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label for="location">Location</Label>
          <Input
            id="location"
            v-model="form.location"
            placeholder="Meeting location"
          />
        </div>
        <div>
          <Label for="type">Type</Label>
          <Input
            id="type"
            v-model="form.type"
            placeholder="Meeting type"
          />
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label for="status">Status</Label>
          <Input
            id="status"
            v-model="form.status"
            placeholder="Meeting status"
          />
        </div>
        <div>
          <Label for="attendees">Attendees</Label>
          <Input
            id="attendees"
            v-model="form.attendees"
            placeholder="Meeting attendees"
          />
        </div>
      </div>
      <!-- Notes and Outcome -->
      <div class="space-y-4">
        <div>
          <Label for="notes">Notes</Label>
          <Textarea
            id="notes"
            v-model="form.notes"
            placeholder="Meeting notes"
            rows="3"
          />
        </div>
        <div>
          <Label for="outcome">Outcome</Label>
          <Textarea
            id="outcome"
            v-model="form.outcome"
            placeholder="Meeting outcome"
            rows="3"
          />
        </div>
      </div>
    </div>
  </form>
</template> 