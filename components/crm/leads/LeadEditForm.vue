<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import { computed, ref, watch } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// Removendo import de tabs temporariamente
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from '@/components/ui/tabs'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import { useTenant } from '~/composables/useTenant'

// Props
interface Props {
  lead: any
}

const props = defineProps<Props>()

// Define emits
const emit = defineEmits<{
  'lead-updated': [lead: any]
  cancel: []
}>()

const { tenantId } = useTenant()
const supabase = useSupabaseClient()

// Estados de loading
const loading = ref(false)
const isLoadingData = ref(true)

// Estado da tab ativa
const activeTab = ref<'lead' | 'contact' | 'company' | 'meeting'>('lead')

// Fetch lead sources and sales stages
const { data: leadSources, pending: leadSourcesPending } = await useLazyFetch<any[]>('/api/crm/lead_source', {
  query: computed(() => ({ tenant_id: tenantId.value })),
  watch: [tenantId],
  default: () => [],
  server: false,
})

const { data: salesStages, pending: salesStagesPending } = await useLazyFetch<any[]>('/api/crm/sales_stage', {
  query: computed(() => ({
    tenant_id: tenantId.value,
    active_only: 'true',
  })),
  watch: [tenantId],
  default: () => [],
  server: false,
})

// Computed para estado geral de loading
const isLoadingAnyData = computed(() => 
  leadSourcesPending.value || salesStagesPending.value
)

// Watch para gerenciar estado de loading geral
watch([leadSourcesPending, salesStagesPending], () => {
  isLoadingData.value = isLoadingAnyData.value
}, { immediate: true })

// Opções de prioridade
const priorityOptions = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
]

// Opções de status
const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

// Opções de segmentos de empresa
const companySegmentOptions = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
]

// Opções de tamanho de empresa
const companySizeOptions = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501+', label: '501+ employees' },
]

// Opções de tipo de meeting
const meetingTypeOptions = [
  { value: 'presential', label: 'Presential' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'phone', label: 'Phone' },
]

// Form data - pré-preenchido com dados do lead
const leadForm = ref({
  name: '',
  source: '',
  sales_stage_id: '',
  status: 'new',
  priority: 'medium',
  value: '',
  notes: '',
})

// Contact form data
const contactForm = ref({
  name: '',
  email: '',
  phone: '',
  position: '',
  notes: '',
})

// Company form data
const companyForm = ref({
  name: '',
  segment: '',
  size: '',
  website: '',
  address: '',
})

// Meeting form data
const meetingForm = ref({
  date: '',
  time: '',
  type: '',
  duration: '',
  agenda: '',
})

function formatLeadValueInput(value: string | number): string {
  const digits = String(value ?? '').replace(/\D/g, '')
  const cents = Number(digits || '0') / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents)
}

function parseLeadValueInput(value: string): number {
  const normalized = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function handleLeadValueInput(event: Event) {
  const input = event.target as HTMLInputElement
  leadForm.value.value = formatLeadValueInput(input.value)
}

// Watch para pré-preencher todos os formulários quando os dados carregarem
watch([() => props.lead, leadSources], () => {
  if (props.lead) {
    // Pré-preencher lead form
    leadForm.value = {
      name: props.lead.name || '',
      source: findLeadSourceId(props.lead.source_id || props.lead.source) || '',
      sales_stage_id: props.lead.sales_stage_id || '',
      status: props.lead.status || 'new',
      priority: props.lead.priority || 'medium',
      value: props.lead.value ? formatLeadValueInput(props.lead.value) : '',
      notes: props.lead.notes || '',
    }

    // TODO: Carregar dados relacionados do lead (contact, company, meeting)
    // Por enquanto, campos ficam vazios para edição
    contactForm.value = {
      name: '',
      email: '',
      phone: '',
      position: '',
      notes: '',
    }

    companyForm.value = {
      name: '',
      segment: '',
      size: '',
      website: '',
      address: '',
    }

    meetingForm.value = {
      date: '',
      time: '',
      type: '',
      duration: '',
      agenda: '',
    }
  }
}, { immediate: true })

// Função para encontrar o ID do lead source baseado no valor enum
function findLeadSourceId(sourceEnum: string): string {
  if (!sourceEnum || !leadSources.value) return ''

  const exactId = leadSources.value.find(s => s.id === sourceEnum)
  if (exactId)
    return exactId.id

  const exactName = leadSources.value.find(s => s.name.toLowerCase() === sourceEnum.toLowerCase())
  if (exactName)
    return exactName.id
  
  const source = leadSources.value.find(s => {
    const sourceName = s.name.toLowerCase()
    const enumValue = sourceEnum.toLowerCase()
    
    if (enumValue === 'website' && (sourceName.includes('website') || sourceName.includes('web'))) return true
    if (enumValue === 'referral' && (sourceName.includes('referral') || sourceName.includes('indica'))) return true
    if (enumValue === 'social' && (sourceName.includes('social') || sourceName.includes('redes'))) return true
    if (enumValue === 'email' && (sourceName.includes('email') || sourceName.includes('e-mail'))) return true
    if (enumValue === 'phone' && (sourceName.includes('phone') || sourceName.includes('telefone') || sourceName.includes('whatsapp') || sourceName.includes('whats'))) return true
    if (enumValue === 'other' && (sourceName.includes('other') || sourceName.includes('outro'))) return true
    
    return false
  })
  
  return source?.id || ''
}

// Função para converter lead source ID para enum value
function getSourceEnumValue(sourceId: string | null): 'website' | 'referral' | 'social' | 'email' | 'phone' | 'other' {
  if (!sourceId || !leadSources.value) {
    return 'other'
  }

  const source = leadSources.value.find(s => s.id === sourceId)
  if (!source) {
    return 'other'
  }

  const sourceName = source.name.toLowerCase()
  if (sourceName.includes('website') || sourceName.includes('web')) return 'website'
  if (sourceName.includes('referral') || sourceName.includes('indica')) return 'referral'
  if (sourceName.includes('social') || sourceName.includes('redes')) return 'social'
  if (sourceName.includes('email') || sourceName.includes('e-mail')) return 'email'
  if (sourceName.includes('phone') || sourceName.includes('telefone') || sourceName.includes('whatsapp') || sourceName.includes('whats')) return 'phone'
  
  return 'other'
}

// Função para validar formulário
function validateForm() {
  return !!leadForm.value.name
}

// Função para atualizar lead e entidades relacionadas
async function updateLead() {
  if (!tenantId.value || !props.lead?.id) {
    return
  }

  loading.value = true
  try {
    // Validar campos obrigatórios
    if (!leadForm.value.name) {
      throw new Error('Please fill in all required fields')
    }

    // 1. Atualizar Lead
    const leadUpdateData = {
      id: props.lead.id,
      name: leadForm.value.name,
      source: getSourceEnumValue(leadForm.value.source),
      source_id: leadForm.value.source || null,
      sales_stage_id: leadForm.value.sales_stage_id || null,
      status: leadForm.value.status,
      priority: leadForm.value.priority,
      value: parseLeadValueInput(leadForm.value.value),
      notes: leadForm.value.notes || null,
      tenant_id: tenantId.value,
    }

    const leadResponse = await $fetch('/api/crm/lead', {
      method: 'PUT',
      body: leadUpdateData,
    })

    // A API retorna { statusCode: 200, body: data }
    const updatedLead = leadResponse.body || leadResponse

    // 2. Criar/Atualizar Contact (se preenchido)
    if (contactForm.value.name || contactForm.value.email) {
      const contactData = {
        name: contactForm.value.name,
        email: contactForm.value.email,
        phone: contactForm.value.phone,
        position: contactForm.value.position,
        notes: contactForm.value.notes,
        tenant_id: tenantId.value,
      }

      try {
        await $fetch('/api/crm/contacts', {
          method: 'POST',
          body: contactData,
        })
      }
      catch (contactErr) {
        console.warn('Failed to create/update contact:', contactErr)
      }
    }

    // 3. Criar/Atualizar Company (se preenchido)
    if (companyForm.value.name) {
      const companyData = {
        name: companyForm.value.name,
        industry: companyForm.value.segment,
        website: companyForm.value.website,
        address: companyForm.value.address,
        tenant_id: tenantId.value,
      }

      try {
        await $fetch('/api/crm/company', {
          method: 'POST',
          body: companyData,
        })
      }
      catch (companyErr) {
        console.warn('Failed to create/update company:', companyErr)
      }
    }

    // 4. Criar/Atualizar Meeting (se preenchido)
    if (meetingForm.value.date && meetingForm.value.time) {
      const meetingData = {
        date: meetingForm.value.date,
        time: meetingForm.value.time,
        type: meetingForm.value.type,
        duration: meetingForm.value.duration ? Number(meetingForm.value.duration) : null,
        agenda: meetingForm.value.agenda,
        tenant_id: tenantId.value,
      }

      try {
        await $fetch('/api/crm/meetings', {
          method: 'POST',
          body: meetingData,
        })
      }
      catch (meetingErr) {
        console.warn('Failed to create/update meeting:', meetingErr)
      }
    }

    // Emitir evento para o componente pai
    emit('lead-updated', updatedLead)
  }
  catch (err: any) {
    console.error('Error updating lead:', err)
  }
  finally {
    loading.value = false
  }
}

// Função para cancelar edição
function cancel() {
  emit('cancel')
}
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoadingData" class="space-y-6">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div v-for="i in 6" :key="i" class="space-y-2">
          <div class="w-24 h-4 bg-muted rounded animate-pulse" />
          <div class="w-full h-10 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div class="space-y-2">
        <div class="w-16 h-4 bg-muted rounded animate-pulse" />
        <div class="w-full h-20 bg-muted rounded animate-pulse" />
      </div>
    </div>

    <!-- Edit Form with Custom Tabs -->
    <div v-else class="space-y-6">
      <!-- Custom Tab Navigation -->
      <div class="flex border-b border-border">
        <button
          v-for="tab in ['lead', 'contact', 'company', 'meeting']"
          :key="tab"
          @click="activeTab = tab as any"
          :class="[
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === tab
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
          ]"
        >
          {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </div>

        <!-- Lead Tab -->
        <div v-if="activeTab === 'lead'" class="space-y-6">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label for="lead-name">Nome do lead <span class="text-destructive">*</span></Label>
              <Input id="lead-name" v-model="leadForm.name" placeholder="Nome do lead" required />
            </div>
            
            <div class="space-y-2">
              <Label for="lead-priority">Prioridade</Label>
              <Select v-model="leadForm.priority">
                <SelectTrigger id="lead-priority">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="priority in priorityOptions" :key="priority.value" :value="priority.value">
                    {{ priority.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="lead-source">Origem</Label>
              <Select v-model="leadForm.source">
                <SelectTrigger id="lead-source">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="source in leadSources" :key="source.id" :value="source.id">
                    {{ source.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="lead-status">Status</Label>
              <Select v-model="leadForm.status">
                <SelectTrigger id="lead-status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="status in statusOptions" :key="status.value" :value="status.value">
                    {{ status.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="lead-stage">Estágio de vendas</Label>
              <Select v-model="leadForm.sales_stage_id">
                <SelectTrigger id="lead-stage">
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="stage in salesStages" :key="stage.id" :value="stage.id">
                    {{ stage.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="lead-value">Valor estimado</Label>
              <Input
                id="lead-value"
                v-model="leadForm.value"
                placeholder="R$ 0,00"
                type="text"
                inputmode="numeric"
                @input="handleLeadValueInput"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="lead-notes">Observações</Label>
            <Textarea id="lead-notes" v-model="leadForm.notes" placeholder="Observações sobre o lead" rows="3" />
          </div>
        </div>

        <!-- Contact Tab -->
        <div v-if="activeTab === 'contact'" class="space-y-6">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label for="contact-name">Nome do contato</Label>
              <Input id="contact-name" v-model="contactForm.name" placeholder="Nome do contato" />
            </div>
            
            <div class="space-y-2">
              <Label for="contact-email">Email</Label>
              <Input id="contact-email" v-model="contactForm.email" placeholder="email@example.com" type="email" />
            </div>

            <div class="space-y-2">
              <Label for="contact-phone">Telefone</Label>
              <Input id="contact-phone" v-model="contactForm.phone" placeholder="(00) 00000-0000" />
            </div>

            <div class="space-y-2">
              <Label for="contact-position">Cargo</Label>
              <Input id="contact-position" v-model="contactForm.position" placeholder="Cargo do contato" />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="contact-notes">Observações</Label>
            <Textarea id="contact-notes" v-model="contactForm.notes" placeholder="Observações sobre o contato" rows="3" />
          </div>
        </div>

        <!-- Company Tab -->
        <div v-if="activeTab === 'company'" class="space-y-6">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label for="company-name">Nome da empresa</Label>
              <Input id="company-name" v-model="companyForm.name" placeholder="Nome da empresa" />
            </div>
            
            <div class="space-y-2">
              <Label for="company-segment">Segmento</Label>
              <Select v-model="companyForm.segment">
                <SelectTrigger id="company-segment">
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="segment in companySegmentOptions" :key="segment.value" :value="segment.value">
                    {{ segment.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="company-size">Porte da empresa</Label>
              <Select v-model="companyForm.size">
                <SelectTrigger id="company-size">
                  <SelectValue placeholder="Selecione o porte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="size in companySizeOptions" :key="size.value" :value="size.value">
                    {{ size.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="company-website">Site</Label>
              <Input id="company-website" v-model="companyForm.website" placeholder="www.example.com" />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="company-address">Endereço</Label>
            <Input id="company-address" v-model="companyForm.address" placeholder="Endereço da empresa" />
          </div>
        </div>

        <!-- Meeting Tab -->
        <div v-if="activeTab === 'meeting'" class="space-y-6">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label for="meeting-date">Data</Label>
              <Input id="meeting-date" v-model="meetingForm.date" type="date" />
            </div>
            
            <div class="space-y-2">
              <Label for="meeting-time">Horário</Label>
              <Input id="meeting-time" v-model="meetingForm.time" type="time" />
            </div>

            <div class="space-y-2">
              <Label for="meeting-type">Tipo de reunião</Label>
              <Select v-model="meetingForm.type">
                <SelectTrigger id="meeting-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="type in meetingTypeOptions" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="meeting-duration">Duração (minutos)</Label>
              <Input id="meeting-duration" v-model="meetingForm.duration" type="number" placeholder="30" />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="meeting-agenda">Pauta</Label>
            <Textarea id="meeting-agenda" v-model="meetingForm.agenda" placeholder="Descreva a pauta da reunião" rows="3" />
          </div>
        </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-2 pt-4">
        <Button variant="outline" @click="cancel">
          Cancel
        </Button>
        <Button :loading="loading" :disabled="!validateForm()" @click="updateLead">
          Update Lead
        </Button>
      </div>
    </div>
  </div>
</template>
