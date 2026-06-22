<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import { Check, Circle, Dot } from 'lucide-vue-next'
import { computed, nextTick, ref, watch } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Stepper, StepperDescription, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper'
import LeadNameAutofillInput from '~/components/crm/leads/LeadNameAutofillInput.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import { formatLeadValueInput, parseLeadValueInput } from '~/composables/crm/useCrmLeadValue'
import { applyCrmLeadAutofill } from '~/composables/crm/useCrmLeadAutofill'
import type { CrmLeadLookupResult } from '~/types/crm'
import { useTenant } from '~/composables/useTenant'

const props = withDefaults(
  defineProps<{
    defaultFunnelId?: string | null
    /** @deprecated use defaultFunnelId */
    defaultPipelineId?: string | null
    defaultSalesStageId?: string | null
  }>(),
  { defaultFunnelId: null, defaultPipelineId: null, defaultSalesStageId: null },
)

// Define emits
const emit = defineEmits<{
  'lead-created': [lead: any]
}>()

const { tenantId } = useTenant()
const supabase = useSupabaseClient()

// Estados de loading
const isLoadingData = ref(true)
const dataError = ref<string | null>(null)

// Fetch lead sources and sales stages baseado no tenant com lazy loading
const { data: leadSources, pending: leadSourcesPending, error: leadSourcesError } = await useLazyFetch<any[]>('/api/crm/lead_source', {
  query: computed(() => ({ tenant_id: tenantId.value })),
  watch: [tenantId],
  default: () => [],
  server: false,
})

const { data: salesStages, pending: salesStagesPending, error: salesStagesError } = await useLazyFetch<any[]>('/api/crm/sales_stage', {
  query: computed(() => ({
    tenant_id: tenantId.value,
    active_only: 'true', // Filtrar apenas estágios de pipelines ativos
  })),
  watch: [tenantId],
  default: () => [],
  server: false,
})

// Buscar pipeline ativo para usar como default
const { data: activePipelines, pending: pipelinesPending, error: pipelinesError } = await useLazyFetch<any[]>('/api/crm/funnel', {
  query: computed(() => ({ tenant_id: tenantId.value })),
  watch: [tenantId],
  default: () => [],
  server: false,
})

// Computed para estado geral de loading
const isLoadingAnyData = computed(() => 
  leadSourcesPending.value || salesStagesPending.value || pipelinesPending.value
)

// Computed para verificar se há algum erro
const hasDataError = computed(() => 
  leadSourcesError.value || salesStagesError.value || pipelinesError.value
)

// Watch para gerenciar estado de loading geral
watch([leadSourcesPending, salesStagesPending, pipelinesPending], () => {
  isLoadingData.value = isLoadingAnyData.value
  
  if (hasDataError.value) {
    dataError.value = 'Erro ao carregar dados. Tente novamente.'
  } else {
    dataError.value = null
  }
}, { immediate: true })

// Opções de prioridade para leads
const priorityOptions = [
  { value: 'low', label: 'Baixa', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'Alta', color: 'bg-red-100 text-red-800' },
]

const steps = [
  {
    step: 1,
    title: 'Lead',
    description: 'Informações do lead (obrigatório)',
    required: true,
  },
  {
    step: 2,
    title: 'Contato',
    description: 'Detalhes do contato (obrigatório)',
    required: true,
  },
  {
    step: 3,
    title: 'Empresa',
    description: 'Informações da empresa (opcional)',
    required: false,
  },
  {
    step: 4,
    title: 'Reunião',
    description: 'Detalhes da reunião (opcional)',
    required: false,
  },
]

const step = ref(0)
const totalSteps = steps.length

// Estados reativos para cada etapa
const leadForm = ref({
  name: '',
  source: '',
  status: '',
  priority: 'medium', // Valor padrão
  value: '',
  notes: '',
})
const contactForm = ref({
  name: '',
  email: '',
  phone: '',
  position: '',
  notes: '',
})
const companyForm = ref({
  name: '',
  segment: '',
  size: '',
  website: '',
  address: '',
})
const meetingForm = ref({
  date: '',
  time: '',
  type: '',
  duration: '',
  agenda: '',
})

const loading = ref(false)

function handleLeadValueInput(event: Event) {
  const input = event.target as HTMLInputElement
  leadForm.value.value = formatLeadValueInput(input.value)
}

function handleLeadAutofill(match: CrmLeadLookupResult, scope: 'lead' | 'contact' = 'lead') {
  applyCrmLeadAutofill(match, { leadForm, contactForm, companyForm }, {
    leadSources: leadSources.value || [],
    fillLeadFields: scope === 'lead',
  })
}

// Função para recarregar dados
function refreshData() {
  dataError.value = null
  // Simplesmente recarrega a página de forma suave para refetch
  window.location.reload()
}

function nextStep() {
  if (step.value < totalSteps - 1) {
    step.value++
  }
}
function prevStep() {
  if (step.value > 0) {
    step.value--
  }
}

function validateStep() {
  if (step.value === 0) {
    return !!leadForm.value.name
  }

  if (step.value === 1) {
    return !!contactForm.value.name && !!contactForm.value.email
  }

  return true
}

// Mapeamento para converter lead source ID para enum value
function getSourceEnumValue(sourceId: string | null): 'website' | 'referral' | 'social' | 'email' | 'phone' | 'other' {
  if (!sourceId || !leadSources.value) {
    return 'other'
  }

  const source = leadSources.value.find(s => s.id === sourceId)
  if (!source) {
    return 'other'
  }

  // Mapear nome do source da tabela para valor do enum da crm_lead.source
  const sourceName = source.name.toLowerCase()
  if (sourceName.includes('website') || sourceName.includes('web')) {
    return 'website'
  }
  if (sourceName.includes('referral') || sourceName.includes('indica')) {
    return 'referral'
  }
  if (sourceName.includes('social') || sourceName.includes('redes')) {
    return 'social'
  }
  if (sourceName.includes('email') || sourceName.includes('e-mail')) {
    return 'email'
  }
  if (sourceName.includes('phone') || sourceName.includes('telefone') || sourceName.includes('whatsapp') || sourceName.includes('whats')) {
    return 'phone'
  }

  return 'other'
}

// Função para buscar o pipeline ativo (fallback quando não vem por prop)
function getActiveFunnelId(): string | null {
  if (props.defaultFunnelId || props.defaultPipelineId)
    return props.defaultFunnelId || props.defaultPipelineId || null
  if (!activePipelines.value || activePipelines.value.length === 0)
    return null
  const activeFunnel = activePipelines.value.find(p => p.is_active === true)
  return activeFunnel ? activeFunnel.id : null
}

function getFirstStageIdForFunnel(funnelId: string | null): string | null {
  if (!funnelId || !salesStages.value?.length)
    return null
  const funnelStages = salesStages.value
    .filter((s: any) => s.funnel_id === funnelId)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  return funnelStages[0]?.id ?? null
}

async function submitLead() {
  if (!tenantId.value) {
    console.error('Tenant not found')
    return
  }

  loading.value = true
  try {
    // Validar campos obrigatórios
    if (!leadForm.value.name || !contactForm.value.name || !contactForm.value.email) {
      throw new Error('Preencha todos os campos obrigatórios')
    }

    const funnelId = getActiveFunnelId()
    const salesStageId = props.defaultSalesStageId ?? getFirstStageIdForFunnel(funnelId)

    // 1. Cria o Lead (sales_stage_id = estágio "Novo" ou o estágio clicado no Kanban)
    const leadData = {
      name: leadForm.value.name,
      source: getSourceEnumValue(leadForm.value.source),
      source_id: leadForm.value.source || null,
      sales_stage_id: salesStageId,
      funnel_id: funnelId,
      status: 'new' as any,
      priority: (leadForm.value.priority as any) || 'medium',
      value: parseLeadValueInput(leadForm.value.value),
      notes: leadForm.value.notes || null,
      tenant_id: tenantId.value,
      tags: [] as string[],
    }

    const { data: lead, error: leadError } = await supabase
      .from('crm_lead')
      .insert([leadData])
      .select()
      .single()

    if (leadError) {
      console.error('Erro ao criar lead:', leadError)
      throw new Error(`Falha ao criar lead: ${leadError.message}`)
    }

    if (!lead) {
      throw new Error('Falha ao criar lead: nenhum dado retornado')
    }

    // 2. Cria o Contact vinculado ao lead
    const { data: contact, error: contactError } = await supabase
      .from('crm_contact')
      .insert([{
        name: contactForm.value.name,
        email: contactForm.value.email,
        phone: contactForm.value.phone || '',
        position: contactForm.value.position,
        notes: contactForm.value.notes,
        tenant_id: tenantId.value,
        lead_id: lead.id,
      }])
      .select()
      .single()

    if (contactError) {
      console.error('Erro ao criar contato:', contactError)
      throw new Error(`Falha ao criar contato: ${contactError.message}`)
    }

    if (!contact) {
      throw new Error('Falha ao criar contato: nenhum dado retornado')
    }

    // 3. Cria a Company se preenchido - simplificado
    let company = null
    if (companyForm.value.name && companyForm.value.name.trim()) {
      const { data: companyResult, error: companyError } = await supabase
        .from('crm_company')
        .insert([{
          name: companyForm.value.name.trim(),
          industry: companyForm.value.segment || null,
          website: companyForm.value.website || null,
          address: companyForm.value.address || null,
          tenant_id: tenantId.value,
        }])
        .select()
        .single()

      if (companyError) {
        console.error('Erro ao criar empresa:', companyError)
        console.warn('Falha ao criar empresa, continuando sem empresa')
      }
      else {
        company = companyResult

        // Atualiza o contato com o company_id
        await supabase
          .from('crm_contact')
          .update({ company_id: company.id })
          .eq('id', contact.id)
      }
    }

    // 4. Não criar meeting por enquanto para evitar erros de tipo
    // O meeting pode ser adicionado depois com os tipos corretos

    // Resetar formulário
    leadForm.value = {
      name: '',
      source: '',
      status: '',
      priority: 'medium',
      value: '',
      notes: '',
    }
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

    step.value = 0

    // Emitir evento para o componente pai (inclui dados do contato para exibição imediata)
    emit('lead-created', {
      ...lead,
      email: contact.email,
      phone: contact.phone,
    })
    
    // Lead criado com sucesso - sem log para evitar violação de linter
  }
  catch (err: any) {
    console.error('Erro ao criar lead:', err)
    console.error(`Falha ao criar lead: ${err.message}`)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Loading State with Skeleton -->
    <div v-if="isLoadingData" class="space-y-6">
      <!-- Stepper Skeleton -->
      <div class="flex justify-center mb-8">
        <div class="flex items-center space-x-8 max-w-3xl w-full">
          <div v-for="i in 4" :key="i" class="flex flex-col items-center space-y-2">
            <div class="w-10 h-10 bg-muted rounded-full animate-pulse" />
            <div class="w-16 h-3 bg-muted rounded animate-pulse" />
            <div class="w-20 h-2 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      
      <!-- Form Skeleton -->
      <div class="max-w-3xl mx-auto">
        <div class="border rounded-lg p-6 space-y-6">
          <div class="space-y-2">
            <div class="w-32 h-5 bg-muted rounded animate-pulse" />
            <div class="w-full h-10 bg-muted rounded animate-pulse" />
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="i in 4" :key="i" class="space-y-2">
              <div class="w-24 h-4 bg-muted rounded animate-pulse" />
              <div class="w-full h-10 bg-muted rounded animate-pulse" />
            </div>
          </div>
          
          <div class="space-y-2">
            <div class="w-16 h-4 bg-muted rounded animate-pulse" />
            <div class="w-full h-20 bg-muted rounded animate-pulse" />
          </div>
          
          <div class="flex justify-between pt-4">
            <div class="w-20 h-10 bg-muted rounded animate-pulse" />
            <div class="w-20 h-10 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      
      <!-- Loading text -->
      <div class="text-center">
        <p class="text-sm text-muted-foreground">Carregando dados do formulário...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="dataError" class="flex flex-col items-center justify-center py-12 space-y-4">
      <div class="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div class="text-center">
        <h3 class="text-sm font-medium text-destructive">Falha ao carregar dados</h3>
        <p class="text-xs text-muted-foreground mt-1">{{ dataError }}</p>
      </div>
      <Button variant="outline" size="sm" @click="refreshData">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Tentar novamente
      </Button>
    </div>

    <!-- Main Form Content -->
    <div v-else>
    <!-- Stepper Horizontal -->
    <div class="w-full flex flex-col items-center">
      <Stepper v-model="step" orientation="horizontal" class="mb-8 max-w-3xl w-full flex flex-row justify-between gap-0">
        <StepperItem
          v-for="(item, index) in steps"
          :key="index"
          v-slot="{ state }"
          class="relative flex flex-1 flex-col items-center"
          :step="index"
        >
          <StepperTrigger as-child>
            <Button
              :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
              size="icon"
              class="z-10 shrink-0 rounded-full"
              :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
            >
              <Check v-if="state === 'completed'" class="size-5" />
              <Circle v-else-if="state === 'active'" />
              <Dot v-else />
            </Button>
          </StepperTrigger>
          <StepperTitle
            :class="[state === 'active' && 'text-primary']"
            class="mt-2 text-center text-sm font-semibold transition lg:text-base"
          >
            {{ item.title }}<span v-if="item.required" class="ml-1 text-xs text-destructive">*</span>
          </StepperTitle>
          <StepperDescription
            :class="[state === 'active' && 'text-primary']"
            class="text-center text-xs text-muted-foreground transition lg:text-sm"
          >
            {{ item.description }}
          </StepperDescription>
          <StepperSeparator
            v-if="index !== steps.length - 1"
            class="absolute left-auto right-0 top-5 h-0.5 w-full bg-muted group-data-[state=completed]:bg-primary"
            style="left: 50%; right: -50%; width: 100%; height: 2px; top: 24px; z-index: 0;"
          />
        </StepperItem>
      </Stepper>
    </div>
    <!-- Step Content -->
    <div class="w-full flex justify-center">
      <Card class="max-w-3xl w-full border p-2 shadow-lg">
        <CardHeader class="mb-4">
          <CardTitle>
            <span v-if="step === 0">Informações do lead <span class="text-destructive">*</span></span>
            <span v-else-if="step === 1">Detalhes do contato <span class="text-destructive">*</span></span>
            <span v-else-if="step === 2">Informações da empresa</span>
            <span v-else>Detalhes da reunião</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <template v-if="step === 0">
            <!-- Lead Information Form -->
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div class="space-y-2">
                <Label for="lead-name">Nome do lead <span class="text-destructive">*</span></Label>
                <LeadNameAutofillInput
                  v-model="leadForm.name"
                  input-id="lead-name"
                  placeholder="Nome do lead"
                  required
                  @autofill="handleLeadAutofill"
                />
              </div>
              <div class="space-y-2">
                <Label for="lead-priority">Prioridade</Label>
                <Select v-model="leadForm.priority">
                  <SelectTrigger id="lead-priority" class="w-full">
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
                  <SelectTrigger id="lead-source" class="w-full">
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
              <div class="md:col-span-2 space-y-2">
                <Label for="lead-notes">Observações</Label>
                <Textarea id="lead-notes" v-model="leadForm.notes" placeholder="Observações sobre o lead" rows="3" />
              </div>
            </div>
          </template>
          <template v-else-if="step === 1">
            <!-- Contact Details Form -->
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div class="space-y-2">
                <Label for="contact-name">Nome do contato <span class="text-destructive">*</span></Label>
                <LeadNameAutofillInput
                  v-model="contactForm.name"
                  input-id="contact-name"
                  placeholder="Nome do contato"
                  search-field="contact"
                  required
                  @autofill="handleLeadAutofill"
                />
              </div>
              <div class="space-y-2">
                <Label for="contact-email">Email <span class="text-destructive">*</span></Label>
                <Input id="contact-email" v-model="contactForm.email" placeholder="email@example.com" type="email" required />
              </div>
              <div class="space-y-2">
                <Label for="contact-phone">Telefone</Label>
                <Input id="contact-phone" v-model="contactForm.phone" placeholder="(00) 00000-0000" />
              </div>
              <div class="space-y-2">
                <Label for="contact-position">Cargo</Label>
                <Input id="contact-position" v-model="contactForm.position" placeholder="Cargo do contato" />
              </div>
              <div class="md:col-span-2 space-y-2">
                <Label for="contact-notes">Observações</Label>
                <Textarea id="contact-notes" v-model="contactForm.notes" placeholder="Observações sobre o contato" rows="3" />
              </div>
            </div>
          </template>
          <template v-else-if="step === 2">
            <!-- Company Info Form -->
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    <SelectItem value="technology">
                      Tecnologia
                    </SelectItem>
                    <SelectItem value="finance">
                      Finanças
                    </SelectItem>
                    <SelectItem value="healthcare">
                      Saúde
                    </SelectItem>
                    <SelectItem value="education">
                      Educação
                    </SelectItem>
                    <SelectItem value="retail">
                      Varejo
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
                    <SelectItem value="1-10">
                      1-10 colaboradores
                    </SelectItem>
                    <SelectItem value="11-50">
                      11-50 colaboradores
                    </SelectItem>
                    <SelectItem value="51-200">
                      51-200 colaboradores
                    </SelectItem>
                    <SelectItem value="201-500">
                      201-500 colaboradores
                    </SelectItem>
                    <SelectItem value="501+">
                      501+ colaboradores
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="company-website">Site</Label>
                <Input id="company-website" v-model="companyForm.website" placeholder="www.example.com" />
              </div>
              <div class="md:col-span-2 space-y-2">
                <Label for="company-address">Endereço</Label>
                <Input id="company-address" v-model="companyForm.address" placeholder="Endereço da empresa" />
              </div>
            </div>
          </template>
          <template v-else>
            <!-- Meeting Details Form -->
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    <SelectItem value="presential">
                      Presencial
                    </SelectItem>
                    <SelectItem value="virtual">
                      Virtual
                    </SelectItem>
                    <SelectItem value="phone">
                      Telefone
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="meeting-duration">Duração (minutos)</Label>
                <Input id="meeting-duration" v-model="meetingForm.duration" type="number" placeholder="30" />
              </div>
              <div class="md:col-span-2 space-y-2">
                <Label for="meeting-agenda">Pauta</Label>
                <Textarea id="meeting-agenda" v-model="meetingForm.agenda" placeholder="Descreva a pauta da reunião" rows="3" />
              </div>
            </div>
          </template>
        </CardContent>
        <div class="flex justify-between gap-2 px-5 py-2">
          <Button variant="outline" :disabled="step === 0" @click="prevStep">
            Voltar
          </Button>
          <Button v-if="step < totalSteps - 1" :disabled="!validateStep()" @click="nextStep">
            Próximo
          </Button>
          <Button v-else :loading="loading" :disabled="!validateStep()" @click="submitLead">
            Salvar lead
          </Button>
        </div>
      </Card>
    </div>
    </div>
  </div>
</template>
