<script setup lang="ts">
import type { MeetingStatus, MeetingType } from '~/constants/meetings'
import type { Meeting } from '~/types/crm'

import { CalendarClock, FileText, Link2, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Separator from '@/components/ui/separator/Separator.vue'
import Textarea from '@/components/ui/textarea/Textarea.vue'
import AppointmentPicker from '~/components/ui/calendar/AppointmentPicker.vue'
import { useTenant } from '~/composables/useTenant'
import {
  MEETING_STATUS_OPTIONS,
  MEETING_TYPE_OPTIONS,
} from '~/constants/meetings'

import SelectWithAdd from './SelectWithAdd.vue'

interface Props {
  initialData?: Partial<Meeting>
}

interface Emits {
  (e: 'success'): void
  (e: 'cancel'): void
  (e: 'submitting', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { tenantId } = useTenant()

const isSubmitting = ref(false)
const leads = ref<Array<{ id: string, name: string }>>([])
const contacts = ref<Array<{ id: string, name: string }>>([])
const companies = ref<Array<{ id: string, name: string }>>([])

const form = ref({
  title: props.initialData?.title || '',
  description: props.initialData?.description || '',
  lead_id: props.initialData?.lead_id || '',
  contact_id: props.initialData?.contact_id || '',
  company_id: props.initialData?.company_id || '',
  start_time: props.initialData?.start_time || '',
  end_time: props.initialData?.end_time || '',
  location: props.initialData?.location || '',
  type: (props.initialData?.type || 'call') as MeetingType,
  status: (props.initialData?.status || 'scheduled') as MeetingStatus,
  attendees: Array.isArray(props.initialData?.attendees)
    ? props.initialData.attendees.join(', ')
    : (props.initialData?.attendees as string) || '',
  notes: props.initialData?.notes || '',
  outcome: props.initialData?.outcome || '',
})

const isEditing = computed(() => Boolean(props.initialData?.id))

watch(
  () => props.initialData,
  (data) => {
    if (!data)
      return
    form.value = {
      title: data.title || '',
      description: data.description || '',
      lead_id: data.lead_id || '',
      contact_id: data.contact_id || '',
      company_id: data.company_id || '',
      start_time: data.start_time || '',
      end_time: data.end_time || '',
      location: data.location || '',
      type: (data.type || 'call') as MeetingType,
      status: (data.status || 'scheduled') as MeetingStatus,
      attendees: Array.isArray(data.attendees) ? data.attendees.join(', ') : (data.attendees as string) || '',
      notes: data.notes || '',
      outcome: data.outcome || '',
    }
  },
)

onMounted(() => {
  void fetchOptions()
})

async function fetchOptions() {
  if (!tenantId.value)
    return
  await Promise.all([fetchLeads(), fetchContacts(), fetchCompanies()])
}

async function fetchLeads() {
  try {
    const { data } = await $fetch<{ data: Array<{ id: string, name: string }> }>('/api/crm/leads', {
      params: { tenant_id: tenantId.value, limit: 1000 },
    })
    leads.value = Array.isArray(data) ? data : []
  }
  catch {
    leads.value = []
  }
}

async function fetchContacts() {
  try {
    const { data } = await $fetch<{ data: Array<{ id: string, name: string }> }>('/api/crm/contacts', {
      params: { tenant_id: tenantId.value, limit: 1000 },
    })
    contacts.value = data || []
  }
  catch {
    contacts.value = []
  }
}

async function fetchCompanies() {
  try {
    const { data } = await $fetch<{ data: Array<{ id: string, name: string }> }>('/api/crm/company', {
      params: { tenant_id: tenantId.value, limit: 1000 },
    })
    companies.value = data || []
  }
  catch {
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

  if (!form.value.title.trim()) {
    toast.error('Informe o título da reunião')
    return
  }

  if (!form.value.start_time || !form.value.end_time) {
    toast.error('Informe data e horário da reunião')
    return
  }

  isSubmitting.value = true
  emit('submitting', true)

  try {
    const attendees = String(form.value.attendees || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)

    const payload = {
      title: form.value.title.trim(),
      description: form.value.description || null,
      lead_id: form.value.lead_id || null,
      contact_id: form.value.contact_id || null,
      company_id: form.value.company_id || null,
      start_time: form.value.start_time,
      end_time: form.value.end_time,
      location: form.value.location || null,
      type: form.value.type,
      status: form.value.status,
      attendees,
      notes: form.value.notes || null,
      outcome: form.value.outcome || null,
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
      toast.success('Reunião agendada com sucesso')
    }

    emit('success')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.data?.message || 'Erro ao salvar reunião')
  }
  finally {
    isSubmitting.value = false
    emit('submitting', false)
  }
}

const leadCreateFields = [
  { key: 'name', label: 'Nome', placeholder: 'Nome do lead' },
  { key: 'email', label: 'E-mail', placeholder: 'E-mail', type: 'email' },
  { key: 'phone', label: 'Telefone', placeholder: 'Telefone' },
  { key: 'company', label: 'Empresa', placeholder: 'Nome da empresa' },
]

const leadDefaultValues = {
  status: 'new',
  source: 'manual',
  priority: 'medium',
  value: 0,
}

const contactCreateFields = [
  { key: 'name', label: 'Nome', placeholder: 'Nome do contato' },
  { key: 'email', label: 'E-mail', placeholder: 'E-mail', type: 'email' },
  { key: 'phone', label: 'Telefone', placeholder: 'Telefone' },
  { key: 'position', label: 'Cargo', placeholder: 'Cargo' },
]

const companyCreateFields = [
  { key: 'name', label: 'Nome', placeholder: 'Nome da empresa' },
  { key: 'website', label: 'Site', placeholder: 'https://...', type: 'url' },
]
</script>

<template>
  <form id="meeting-form" class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Detalhes -->
    <section class="space-y-4">
      <div class="flex items-center gap-2">
        <div class="flex size-7 items-center justify-center rounded-md bg-muted">
          <FileText class="size-3.5 text-muted-foreground" />
        </div>
        <div>
          <p class="text-sm font-medium leading-none">
            Detalhes
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Título e contexto da reunião
          </p>
        </div>
      </div>

      <div class="space-y-3 pl-0 sm:pl-9">
        <div class="space-y-2">
          <Label for="meeting-title">
            Título <span class="text-destructive">*</span>
          </Label>
          <Input
            id="meeting-title"
            v-model="form.title"
            placeholder="Ex.: Apresentação comercial"
            required
          />
        </div>
        <div class="space-y-2">
          <Label for="meeting-description">Descrição</Label>
          <Textarea
            id="meeting-description"
            v-model="form.description"
            placeholder="Assuntos, objetivos ou pauta da reunião"
            rows="2"
            class="resize-none"
          />
        </div>
      </div>
    </section>

    <Separator />

    <!-- Agenda -->
    <section class="space-y-4">
      <div class="flex items-center gap-2">
        <div class="flex size-7 items-center justify-center rounded-md bg-muted">
          <CalendarClock class="size-3.5 text-muted-foreground" />
        </div>
        <div>
          <p class="text-sm font-medium leading-none">
            Agenda
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Data, horário, tipo e local
          </p>
        </div>
      </div>

      <div class="space-y-3 sm:pl-9">
        <AppointmentPicker
          :start-time="form.start_time"
          :end-time="form.end_time"
          @update="handleDateTimeUpdate"
        />

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>Tipo</Label>
            <Select v-model="form.type">
              <SelectTrigger>
                <SelectValue placeholder="Tipo da reunião" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in MEETING_TYPE_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Status</Label>
            <Select v-model="form.status">
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in MEETING_STATUS_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="meeting-location">Local ou link</Label>
          <Input
            id="meeting-location"
            v-model="form.location"
            placeholder="Escritório, Google Meet, Zoom…"
          />
        </div>
      </div>
    </section>

    <Separator />

    <!-- Vínculos -->
    <section class="space-y-4">
      <div class="flex items-center gap-2">
        <div class="flex size-7 items-center justify-center rounded-md bg-muted">
          <Link2 class="size-3.5 text-muted-foreground" />
        </div>
        <div>
          <p class="text-sm font-medium leading-none">
            Vínculos
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Associação opcional com CRM
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:pl-9 sm:grid-cols-1">
        <SelectWithAdd
          v-model="form.lead_id"
          label="Lead"
          :items="leads"
          placeholder="Selecione um lead…"
          api-endpoint="/api/crm/lead"
          :create-fields="leadCreateFields"
          :default-values="leadDefaultValues"
          @refresh="fetchLeads"
        />
        <SelectWithAdd
          v-model="form.contact_id"
          label="Contato"
          :items="contacts"
          placeholder="Selecione um contato…"
          api-endpoint="/api/crm/contacts"
          :create-fields="contactCreateFields"
          @refresh="fetchContacts"
        />
        <SelectWithAdd
          v-model="form.company_id"
          label="Empresa"
          :items="companies"
          placeholder="Selecione uma empresa…"
          api-endpoint="/api/crm/company"
          :create-fields="companyCreateFields"
          @refresh="fetchCompanies"
        />
      </div>
    </section>

    <Separator />

    <!-- Participantes e registro -->
    <section class="space-y-4">
      <div class="flex items-center gap-2">
        <div class="flex size-7 items-center justify-center rounded-md bg-muted">
          <Users class="size-3.5 text-muted-foreground" />
        </div>
        <div>
          <p class="text-sm font-medium leading-none">
            Participantes e registro
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ isEditing ? 'Anote o que aconteceu na reunião' : 'Quem participa e anotações iniciais' }}
          </p>
        </div>
      </div>

      <div class="space-y-3 sm:pl-9">
        <div class="space-y-2">
          <Label for="meeting-attendees">Participantes</Label>
          <Input
            id="meeting-attendees"
            v-model="form.attendees"
            placeholder="Maria, João, time comercial…"
          />
          <p class="text-xs text-muted-foreground">
            Separe os nomes por vírgula
          </p>
        </div>
        <div class="space-y-2">
          <Label for="meeting-notes">Observações</Label>
          <Textarea
            id="meeting-notes"
            v-model="form.notes"
            placeholder="Anotações internas"
            rows="2"
            class="resize-none"
          />
        </div>
        <div v-if="isEditing || form.status === 'completed'" class="space-y-2">
          <Label for="meeting-outcome">Resultado</Label>
          <Textarea
            id="meeting-outcome"
            v-model="form.outcome"
            placeholder="Decisões, próximos passos, proposta enviada…"
            rows="2"
            class="resize-none"
          />
        </div>
      </div>
    </section>
  </form>
</template>
