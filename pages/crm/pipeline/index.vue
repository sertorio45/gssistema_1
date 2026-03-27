<script setup lang="ts">
import type { Lead, SalesStage } from '~/types/crm'
import { DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import { useFetch } from '#app'

import { Icon } from '#components'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import Draggable from 'vuedraggable'

import { columns } from '~/components/crm/leads/columns'
import LeadEditForm from '~/components/crm/leads/LeadEditForm.vue'
import LeadStepperForm from '~/components/crm/leads/LeadStepperForm.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import Badge from '~/components/ui/badge/Badge.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import DialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogScrollContent from '~/components/ui/dialog/DialogScrollContent.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Progress from '~/components/ui/progress/Progress.vue'
import Sheet from '~/components/ui/sheet/Sheet.vue'
import SheetContent from '~/components/ui/sheet/SheetContent.vue'
import SheetDescription from '~/components/ui/sheet/SheetDescription.vue'
import SheetFooter from '~/components/ui/sheet/SheetFooter.vue'
import SheetHeader from '~/components/ui/sheet/SheetHeader.vue'
import SheetTitle from '~/components/ui/sheet/SheetTitle.vue'
import SheetTrigger from '~/components/ui/sheet/SheetTrigger.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import DataTableViewOptions from '~/components/tasks/components/DataTableViewOptions.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import Tooltip from '~/components/ui/tooltip/Tooltip.vue'
import { useTenant } from '~/composables/useTenant'

// SEO Meta
useSeoMeta({
  title: 'CRM Pipeline - SIEM SISTEMAS',
  description: 'Gerencie seu pipeline de vendas e leads com eficiência.',
})

interface Pipeline {
  id: string
  name: string
}
interface LeadExt extends Lead {
  sales_stage_id?: string
  pipeline_id?: string
}

const { tenantId } = useTenant()
const pipelines = ref<Pipeline[]>([])
const stages = ref<SalesStage[]>([])
const leads = ref<LeadExt[]>([])
const leadSources = ref<Array<{ id: string, name: string }>>([])
const selectedPipeline = ref<string | undefined>(undefined)
const selectedLead = ref<Lead | null>(null)
const isDialogOpen = ref(false)
const viewMode = ref<'kanban' | 'list'>('kanban')
const isAddLeadDialogOpen = ref(false)
const isEditLeadDialogOpen = ref(false)
const isSheetOpen = ref(false)
const showDeleteDialog = ref(false)
const leadToDelete = ref<Lead | null>(null)
const selectedItems = ref([])
const showMultiDeleteDialog = ref(false)
const isAddPipelineDialogOpen = ref(false)
const newPipeline = ref({ name: '', description: '' })
const isOrganizeStagesDialogOpen = ref(false)
const stagesOrder = ref<SalesStage[]>([])
const isLoading = ref(false)
const isSyncingTenant = ref(false)
const defaultLeadPipelineId = ref<string | null>(null)
const defaultLeadStageId = ref<string | null>(null)
const dateRangeFormatter = new DateFormatter('pt-BR', { dateStyle: 'medium' })
const leadDateRange = ref<any>({})
let loadingCount = 0

function setLoading(loading: boolean) {
  if (loading) loadingCount++
  else loadingCount = Math.max(0, loadingCount - 1)
  isLoading.value = loadingCount > 0
}

// Group leads by status
const leadsByStage = computed(() => {
  const grouped: Record<string, LeadExt[]> = {}
  stages.value.forEach((stage) => {
    grouped[stage.id] = leads.value.filter(lead => lead.sales_stage_id === stage.id)
  })
  return grouped
})

// Calculate stage statistics
const stageStats = computed(() => {
  const stats: Record<string, { count: number, value: number }> = {}
  stages.value.forEach((stage) => {
    const stageLeads = leadsByStage.value[stage.id] || []
    stats[stage.id] = {
      count: stageLeads.length,
      value: stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0),
    }
  })
  return stats
})

// Calcular a porcentagem de progresso para cada estágio
const stageProgress = computed(() => {
  const progress: Record<string, number> = {}
  const totalLeads = leads.value.length

  if (totalLeads > 0) {
    stages.value.forEach((stage) => {
      const stageCount = stageStats.value[stage.id]?.count || 0
      progress[stage.id] = (stageCount / totalLeads) * 100
    })
  }

  return progress
})

// Métricas do topo (Total Pipeline, Taxa Conversão, Ticket Médio, Ganhos no Mês)
const pipelineTotal = computed(() =>
  leads.value
    .filter(l => l.status !== 'won' && l.status !== 'lost')
    .reduce((sum, l) => sum + (Number(l.value) || 0), 0),
)
const totalLeadsCount = computed(() => leads.value.length)
const conversionRate = computed(() => {
  const total = totalLeadsCount.value
  if (total === 0)
    return 0
  const won = leads.value.filter(l => l.status === 'won').length
  return Math.round((won / total) * 10000) / 100
})
const ticketMedio = computed(() => {
  const total = totalLeadsCount.value
  if (total === 0)
    return 0
  const sum = leads.value.reduce((s, l) => s + (Number(l.value) || 0), 0)
  return sum / total
})
const ganhosNoMes = computed(() => {
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  return leads.value
    .filter(l => {
      if (l.status !== 'won')
        return false
      const closed = l.closed_at ? new Date(l.closed_at) : null
      return closed && closed.getFullYear() === thisYear && closed.getMonth() === thisMonth
    })
    .reduce((sum, l) => sum + (Number(l.value) || 0), 0)
})

function handleLeadClick(lead: Lead) {
  selectedLead.value = lead
  isDialogOpen.value = true
}

function handleQuickEditLead(lead: Lead) {
  selectedLead.value = lead
  isEditLeadDialogOpen.value = true
}

function closeDialog() {
  isDialogOpen.value = false
  selectedLead.value = null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'border-l-red-500'
    case 'medium':
      return 'border-l-yellow-500'
    case 'low':
      return 'border-l-gray-500'
    default:
      return 'border-l-gray-300'
  }
}

function getPriorityLabel(priority: string) {
  const labels: Record<string, string> = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  }
  return labels[priority] || priority
}

function getSourceLabel(source?: string, sourceId?: string | null) {
  if (sourceId) {
    const bySourceId = leadSources.value.find(item => item.id === sourceId)
    if (bySourceId?.name)
      return bySourceId.name
  }

  if (!source)
    return 'Sem origem'

  const byId = leadSources.value.find(item => item.id === source)
  if (byId?.name)
    return byId.name

  const key = source.toLowerCase()
  const byName = leadSources.value.find(item => item.name.toLowerCase() === key)
  if (byName?.name)
    return byName.name

  const sourceFromTable = leadSources.value.find((item) => {
    const name = item.name.toLowerCase()
    if (key === 'website')
      return name.includes('website') || name.includes('site')
    if (key === 'referral')
      return name.includes('referral') || name.includes('indica')
    if (key === 'social')
      return name.includes('social') || name.includes('rede')
    if (key === 'email')
      return name.includes('mail')
    if (key === 'phone')
      return name.includes('phone') || name.includes('telefone') || name.includes('whatsapp') || name.includes('whats')
    return false
  })

  if (sourceFromTable?.name)
    return sourceFromTable.name

  const fallback: Record<string, string> = {
    website: 'Website',
    referral: 'Indicação',
    social: 'Redes sociais',
    email: 'E-mail',
    phone: 'Telefone',
    other: 'Outros',
  }
  return fallback[key] || source
}

function toIsoDate(value?: any): string | undefined {
  if (!value)
    return undefined
  const date = value.toDate(getLocalTimeZone())
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const leadDateRangeLabel = computed(() => {
  const start = leadDateRange.value?.start
  const end = leadDateRange.value?.end
  if (start && end) {
    return `${dateRangeFormatter.format(start.toDate(getLocalTimeZone()))} - ${dateRangeFormatter.format(end.toDate(getLocalTimeZone()))}`
  }
  if (start) {
    return dateRangeFormatter.format(start.toDate(getLocalTimeZone()))
  }
  return 'Selecionar período'
})

function clearLeadDateRange() {
  leadDateRange.value = {}
}

function setLeadDatePreset(preset: 'today' | '7d' | '30d' | 'month') {
  const now = today(getLocalTimeZone())
  if (preset === 'today') {
    leadDateRange.value = { start: now, end: now }
    return
  }
  if (preset === '7d') {
    leadDateRange.value = { start: now.subtract({ days: 6 }), end: now }
    return
  }
  if (preset === '30d') {
    leadDateRange.value = { start: now.subtract({ days: 29 }), end: now }
    return
  }
  if (preset === 'month') {
    const monthStart = now.set({ day: 1 })
    leadDateRange.value = { start: monthStart, end: now }
  }
}

// Função para lidar com o drag and drop
function handleDragStart(event: DragEvent, leadId: string, currentStageId: string | undefined) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', JSON.stringify({ leadId, currentStageId: String(currentStageId) }))
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function isStageWonOrLost(stageName: string): 'won' | 'lost' | null {
  const name = (stageName || '').toLowerCase()
  if (['won', 'ganho'].some(k => name.includes(k)))
    return 'won'
  if (['lost', 'perdido'].some(k => name.includes(k)))
    return 'lost'
  return null
}

async function handleDrop(event: DragEvent, newStageId: string) {
  event.preventDefault()
  if (!event.dataTransfer)
    return
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    const { leadId, currentStageId } = data
    if (currentStageId === newStageId)
      return

    const lead = leads.value.find(l => l.id === leadId)
    const newStage = stages.value.find(s => s.id === newStageId)
    const wonOrLost = newStage ? isStageWonOrLost(newStage.name) : null
    const closedAt = wonOrLost ? new Date().toISOString() : null
    const newStatus = wonOrLost ?? lead?.status

    const previousLeads = [...leads.value]
    const updatedLeads = leads.value.map((l) => {
      if (l.id !== leadId)
        return l
      return {
        ...l,
        sales_stage_id: newStageId,
        status: newStatus,
        closed_at: closedAt,
      } as LeadExt
    })
    leads.value = updatedLeads

    try {
      await $fetch(`/api/crm/lead/${leadId}`, {
        method: 'PUT',
        body: {
          sales_stage_id: newStageId,
          ...(wonOrLost ? { status: wonOrLost } : {}),
          closed_at: closedAt,
        },
      })
      toast.success('Lead movido com sucesso!')
    }
    catch {
      leads.value = previousLeads
      toast.error('Erro ao atualizar lead. Tente novamente.')
    }
  }
  catch (error) {
    console.error('Error processing drop:', error)
  }
}

async function handleDeleteConfirm() {
  if (!leadToDelete.value)
    return
  showDeleteDialog.value = false

  // Aqui seria a chamada para a API para excluir o lead
  // await $fetch(`/api/crm/leads/${leadToDelete.value.id}`, { method: 'DELETE' })

  // Simulando a exclusão localmente
  leads.value = leads.value.filter(lead => lead.id !== leadToDelete.value?.id)
  leadToDelete.value = null
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false

  // Simulando a exclusão múltipla localmente
  const leadIndicesToDelete = [...selectedItems.value]
  const leadsToDelete = leadIndicesToDelete.map(idx => leads.value[idx])
  const leadIdsToDelete = leadsToDelete.map(lead => lead.id)

  leads.value = leads.value.filter(lead => !leadIdsToDelete.includes(lead.id))
  selectedItems.value = []
}

function updateSelectedItems(items: any) {
  selectedItems.value = items
}

// Abre o dialog de novo lead atribuindo ao estágio "Novo" (primeiro da lista).
function openNewLeadDialog() {
  defaultLeadPipelineId.value = selectedPipeline.value ?? null
  defaultLeadStageId.value = stages.value[0]?.id ?? null
  isAddLeadDialogOpen.value = true
}

// Abre o dialog de novo lead atribuindo ao estágio da coluna clicada.
function handleAddLeadToStage(stage: SalesStage) {
  defaultLeadPipelineId.value = selectedPipeline.value ?? null
  defaultLeadStageId.value = stage.id ?? null
  isAddLeadDialogOpen.value = true
}

// Handler para quando um lead é criado com sucesso
function handleLeadCreated(_newLead: any) {
  isAddLeadDialogOpen.value = false
  defaultLeadPipelineId.value = null
  defaultLeadStageId.value = null
  fetchLeads()
}

// Handler para editar lead
function handleEditLead() {
  if (selectedLead.value) {
    // Fechar dialog de detalhes
    isDialogOpen.value = false
    // Abrir dialog de edição
    isEditLeadDialogOpen.value = true
  }
}

// Handler para quando um lead é editado com sucesso
function handleLeadUpdated(_updatedLead: any) {
  // Fechar o dialog
  isEditLeadDialogOpen.value = false

  // Refresh dos leads para mostrar as mudanças
  fetchLeads()

  // Lead editado com sucesso - sem log para evitar violação de linter
}

// Handlers para DataTable global
function handleEdit(lead: Lead) {
  navigateTo(`/crm/leads/edit/${lead.id}`)
}
function handleDelete(lead: Lead) {
  leadToDelete.value = lead
  showDeleteDialog.value = true
}

function handleSearch(e: Event) {
  const input = e.target as HTMLInputElement
  const searchTerm = input.value.toLowerCase()

  if (searchTerm) {
    leads.value = leads.value.filter(
      lead =>
        lead.name.toLowerCase().includes(searchTerm)
        || (lead.company && lead.company.toLowerCase().includes(searchTerm)),
    )
  }
  else {
    fetchLeads()
  }
}

async function fetchPipelines() {
  if (!tenantId.value)
    return
  setLoading(true)
  try {
    const data = await $fetch<Pipeline[]>('/api/crm/pipeline', { query: { tenant_id: tenantId.value } })
    const nextPipelines = Array.isArray(data) ? data : []
    pipelines.value = nextPipelines

    // Se o pipeline selecionado não existir para o tenant atual, selecione o primeiro.
    if (!selectedPipeline.value || !nextPipelines.some(p => p.id === selectedPipeline.value)) {
      selectedPipeline.value = nextPipelines[0]?.id || undefined
    }

    // Evita mostrar dados do tenant anterior quando o pipeline não existe.
    if (!selectedPipeline.value) {
      stages.value = []
      leads.value = []
    }
  }
  finally {
    setLoading(false)
  }
}

async function fetchStages() {
  if (!selectedPipeline.value)
    return
  setLoading(true)
  try {
    const data = await $fetch<SalesStage[]>('/api/crm/sales_stage', {
      query: { pipeline_id: selectedPipeline.value, tenant_id: tenantId.value },
    })
    stages.value = Array.isArray(data) ? data : []
  }
  finally {
    setLoading(false)
  }
}

async function fetchLeads() {
  if (!selectedPipeline.value)
    return
  setLoading(true)
  try {
    const startDate = toIsoDate(leadDateRange.value?.start)
    const endDate = toIsoDate(leadDateRange.value?.end)
    const data = await $fetch<LeadExt[]>('/api/crm/lead', {
      query: {
        pipeline_id: selectedPipeline.value,
        tenant_id: tenantId.value,
        start_date: startDate,
        end_date: endDate,
      },
    })
    leads.value = Array.isArray(data) ? data : []
  }
  finally {
    setLoading(false)
  }
}

async function fetchLeadSources() {
  if (!tenantId.value)
    return
  try {
    const data = await $fetch<Array<{ id: string, name: string }>>('/api/crm/lead_source', {
      query: { tenant_id: tenantId.value },
    })
    leadSources.value = Array.isArray(data) ? data : []
  }
  catch {
    leadSources.value = []
  }
}

watch(tenantId, async () => {
  isSyncingTenant.value = true
  try {
    await fetchPipelines()
    await fetchStages()
    await fetchLeadSources()
    await fetchLeads()
  }
  finally {
    isSyncingTenant.value = false
  }
}, { immediate: true })

watch(selectedPipeline, () => {
  if (isSyncingTenant.value)
    return
  fetchStages()
  fetchLeads()
})

watch(leadDateRange, () => {
  fetchLeads()
}, { deep: true })

async function handleCreatePipeline() {
  if (!newPipeline.value.name)
    return
  const { data, error } = await useFetch('/api/crm/pipeline', {
    method: 'POST',
    body: {
      name: newPipeline.value.name,
      description: newPipeline.value.description,
      tenant_id: tenantId.value,
    },
  })
  if (!error && data.value?.body) {
    const pipeline = data.value.body as unknown as Pipeline
    pipelines.value.push(pipeline)
    selectedPipeline.value = pipeline.id
    isAddPipelineDialogOpen.value = false
    newPipeline.value = { name: '', description: '' }
    toast.success('Pipeline criado com sucesso!')
  }
}

function openOrganizeStagesDialog() {
  stagesOrder.value = [...stages.value].sort((a, b) => a.order - b.order)
  isOrganizeStagesDialogOpen.value = true
}

async function saveStagesOrder() {
  const tenant = tenantId.value
  if (!tenant)
    return
  const tenantUuid = typeof tenant === 'object' && tenant !== null && 'id' in tenant ? (tenant as { id: string }).id : tenant
  try {
    for (let i = 0; i < stagesOrder.value.length; i++) {
      const stage = stagesOrder.value[i]
      await $fetch(`/api/crm/sales_stage/${stage.id}`, {
        method: 'PUT',
        body: { id: stage.id, order: i + 1, tenant_id: tenantUuid },
      })
    }
    isOrganizeStagesDialogOpen.value = false
    await fetchStages()
    toast.success('Ordem dos estágios salva.')
  }
  catch (e: any) {
    const msg = e?.data?.message || e?.message || 'Erro ao salvar a ordem. Tente novamente.'
    toast.error(msg)
  }
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          Pipeline
        </h1>
        <p class="text-muted-foreground">
          Gerencie seu pipeline de vendas e leads
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Exportar
        </Button>
        <Button @click="openNewLeadDialog">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>
    </div>

    <!-- Barra de pesquisa unificada -->
    <div class="mb-4 flex items-center justify-between gap-2">
      <div class="flex flex-1 items-center space-x-2">
        <Input placeholder="Buscar leads..." class="h-10 max-w-xs w-full" @input="handleSearch" />

        <Sheet v-model:open="isSheetOpen">
          <SheetTrigger as-child>
            <Button variant="outline" size="sm" class="h-10 px-3">
              <Icon name="lucide:filter" class="mr-2 h-4 w-4" />
              Filtros avançados
            </Button>
          </SheetTrigger>
        </Sheet>
      </div>
      <div class="flex items-center gap-2">
        <Popover>
          <PopoverTrigger as-child>
            <Button variant="outline" size="sm" class="h-10 min-w-[260px] justify-start text-left font-normal">
              <Icon name="lucide:calendar-range" class="mr-2 h-4 w-4" />
              {{ leadDateRangeLabel }}
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="end">
            <div class="border-b p-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" class="h-7 px-2 text-xs" @click="setLeadDatePreset('today')">
                Hoje
              </Button>
              <Button variant="outline" size="sm" class="h-7 px-2 text-xs" @click="setLeadDatePreset('7d')">
                7 dias
              </Button>
              <Button variant="outline" size="sm" class="h-7 px-2 text-xs" @click="setLeadDatePreset('30d')">
                30 dias
              </Button>
              <Button variant="outline" size="sm" class="h-7 px-2 text-xs" @click="setLeadDatePreset('month')">
                Este mês
              </Button>
            </div>
            <RangeCalendar
              v-model="leadDateRange"
              locale="pt-BR"
              weekday-format="short"
              :number-of-months="2"
              initial-focus
              :placeholder="leadDateRange.start"
              @update:start-value="(startDate: any) => (leadDateRange.start = startDate)"
            />
            <div class="border-t p-2 flex justify-end">
              <Button
                v-if="leadDateRange.start || leadDateRange.end"
                variant="ghost"
                size="sm"
                class="h-8"
                @click="clearLeadDateRange"
              >
                Limpar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <!-- Alternador de visualização Kanban/Lista -->
        <div class="flex border rounded-md p-1">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 px-2"
            :class="{ 'bg-muted': viewMode === 'kanban' }"
            @click="viewMode = 'kanban'"
          >
            <Icon name="lucide:layout-grid" class="mr-2 h-4 w-4" />
            Kanban
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-8 px-2"
            :class="{ 'bg-muted': viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            <Icon name="lucide:list" class="mr-2 h-4 w-4" />
            Lista
          </Button>
        </div>
      </div>
    </div>

    <!-- Pipeline Stats (skeleton quando carregando) -->
    <div v-if="isLoading" class="grid mb-4 gap-4 lg:grid-cols-4 md:grid-cols-2">
      <Card v-for="i in 4" :key="i">
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-8 w-28 mb-2" />
          <Skeleton class="h-3 w-20" />
          <Skeleton v-if="i > 1" class="mt-2 h-2 w-full" />
        </CardContent>
      </Card>
    </div>
    <div v-else class="grid mb-4 gap-4 lg:grid-cols-4 md:grid-cols-2">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Total do Pipeline
          </CardTitle>
          <Icon name="lucide:trending-up" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ formatCurrency(pipelineTotal) }}
          </div>
          <p class="text-xs text-muted-foreground">
            Soma do valor dos leads ativos (excl. ganhos/perdidos)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Taxa de Conversão
          </CardTitle>
          <Icon name="lucide:percent" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ conversionRate }}%
          </div>
          <p class="text-xs text-muted-foreground">
            Ganhos / total de leads
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Ticket Médio
          </CardTitle>
          <Icon name="lucide:receipt" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ formatCurrency(ticketMedio) }}
          </div>
          <p class="text-xs text-muted-foreground">
            Valor total / total de leads
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Ganhos no Mês
          </CardTitle>
          <Icon name="lucide:calendar-check" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ formatCurrency(ganhosNoMes) }}
          </div>
          <p class="text-xs text-muted-foreground">
            Soma dos ganhos fechados este mês
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Visualização Kanban -->
    <div v-if="viewMode === 'kanban'" class="flex flex-col gap-4">
      <!-- Skeleton Kanban -->
      <div v-if="isLoading" class="space-y-4">
        <div class="mb-2 flex items-center gap-2">
          <Skeleton class="h-10 w-64" />
          <Skeleton class="h-10 w-10" />
          <Skeleton class="h-10 w-10" />
        </div>
        <div class="flex gap-3 overflow-hidden">
          <Card v-for="i in 4" :key="i" class="w-64 flex-shrink-0">
            <CardHeader class="px-2 pb-1">
              <div class="mb-2 flex items-center justify-between">
                <Skeleton class="h-4 w-24" />
                <Skeleton class="h-5 w-8" />
              </div>
              <Skeleton class="h-3 w-full" />
              <Skeleton class="mt-1 h-2 w-full" />
            </CardHeader>
            <CardContent class="min-h-[400px] space-y-2 p-2">
              <Skeleton v-for="j in 3" :key="j" class="h-24 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
      <!-- Visualização de cards do Kanban -->
      <template v-else>
      <div class="mb-2 flex items-center gap-2">
        <div class="flex items-center gap-2">
          <Select v-model="selectedPipeline">
            <SelectTrigger class="w-64">
              <SelectValue placeholder="Selecione o pipeline..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="pipeline in pipelines" :key="pipeline.id" :value="pipeline.id">
                {{ pipeline.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <div class="ml-2 flex gap-1">
            <Tooltip content="Criar novo pipeline">
              <Button
                variant="outline"
                size="icon"
                aria-label="Criar novo pipeline"
                @click="isAddPipelineDialogOpen = true"
              >
                <Icon name="lucide:plus" class="h-5 w-5" />
              </Button>
            </Tooltip>
            <Tooltip content="Organizar estágios do pipeline">
              <Button variant="outline" size="icon" aria-label="Organizar estágios" @click="openOrganizeStagesDialog">
                <Icon name="lucide:list" class="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
          <span class="ml-2 hidden text-xs text-muted-foreground md:inline">Selecione, crie ou organize seus pipelines</span>
        </div>
      </div>
      <div
        class="scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 dark:hover:scrollbar-thumb-gray-400 flex gap-3 overflow-x-auto pb-4"
      >
        <Card
          v-for="stage in stages"
          :key="stage.id"
          class="w-64 flex-shrink-0"
          @dragover="handleDragOver"
          @drop="handleDrop($event, String(stage.id))"
        >
          <!-- Stage Header -->
          <CardHeader class="px-2 pb-1">
            <div class="mb-1 flex items-center justify-between">
              <div class="flex items-center gap-1">
                <div class="h-3 w-3 rounded-full" :style="{ backgroundColor: stage.color }" />
                <CardTitle class="text-sm">
                  {{ stage.name }}
                </CardTitle>
              </div>
              <div class="flex items-center gap-1">
                <Badge variant="secondary" class="text-xs">
                  {{ stageStats[String(stage.id)]?.count || 0 }}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-5 w-5 p-0"
                  @click="handleAddLeadToStage(stage)"
                >
                  <Icon name="lucide:plus" class="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <p class="text-xs text-muted-foreground">
                {{ formatCurrency(stageStats[String(stage.id)]?.value || 0) }}
              </p>
              <Progress class="h-1" :model-value="stageProgress[String(stage.id)] || 0" />
            </div>
          </CardHeader>

          <!-- Stage Content -->
          <CardContent
            class="scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 dark:hover:scrollbar-thumb-gray-400 min-h-[400px] overflow-y-auto p-2"
          >
            <div class="space-y-2">
              <div
                v-for="lead in leadsByStage[String(stage.id)]"
                :key="lead.id"
                class="cursor-grab border border-l-4 rounded-lg bg-background p-3 transition-shadow hover:shadow-md"
                :class="getPriorityColor(lead.priority)"
                draggable="true"
                @click="handleLeadClick(lead)"
                @dragstart="handleDragStart($event, lead.id, lead.sales_stage_id)"
              >
                <!-- Lead Card Content -->
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h4 class="truncate text-sm font-semibold leading-tight">
                        {{ lead.name }}
                      </h4>
                      <p class="truncate text-xs text-muted-foreground">
                        {{ lead.company || 'Sem empresa' }}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      @click.stop="handleQuickEditLead(lead)"
                    >
                      <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-primary">
                      {{ formatCurrency(lead.value) }}
                    </p>
                    <Badge
                      variant="outline"
                      class="h-5 py-0 text-xs"
                      :class="{
                        'bg-red-50 text-red-700 border-red-200': lead.priority === 'high',
                        'bg-yellow-50 text-yellow-700 border-yellow-200': lead.priority === 'medium',
                        'bg-gray-50 text-gray-700 border-gray-200': lead.priority === 'low',
                      }"
                    >
                      {{ getPriorityLabel(lead.priority) }}
                    </Badge>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-muted-foreground">
                      <Icon name="lucide:user" class="h-3 w-3" />
                      <span class="truncate">{{ lead.assignedTo || 'Não atribuído' }}</span>
                    </div>
                    <div class="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-muted-foreground">
                      <Icon name="lucide:tag" class="h-3 w-3" />
                      <span class="truncate">{{ getSourceLabel(lead.source, lead.source_id) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div
                v-if="!leadsByStage[String(stage.id)]?.length"
                class="h-24 flex items-center justify-center border border-muted-foreground/25 rounded-lg border-dashed"
              >
                <Button
                  variant="ghost"
                  class="h-auto flex flex-col items-center gap-1 p-2"
                  @click="handleAddLeadToStage(stage)"
                >
                  <Icon name="lucide:plus" class="h-4 w-4 text-muted-foreground" />
                  <p class="text-xs text-muted-foreground">
                    Adicionar lead
                  </p>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </template>
    </div>

    <!-- Visualização em Lista (DataTable) -->
    <template v-else>
      <div v-if="isLoading" class="space-y-4">
        <Card class="border shadow-sm">
          <CardContent class="p-4">
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Skeleton class="h-9 w-[200px]" />
                <Skeleton class="h-9 w-[100px]" />
              </div>
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-12 w-full" />
              <Skeleton class="h-12 w-full" />
              <Skeleton class="h-12 w-full" />
              <Skeleton class="h-12 w-full" />
              <Skeleton class="h-12 w-full" />
              <div class="flex justify-between pt-2">
                <Skeleton class="h-8 w-24" />
                <Skeleton class="h-8 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <template v-else>
        <DataTable
          :data="leads"
          :columns="columns"
          :meta="{ onEdit: handleEdit, onDelete: handleDelete }"
          @delete="handleDelete"
          @selection-change="updateSelectedItems"
        >
          <template #toolbar="{ table }">
            <DataTableToolbar :table="table" placeholder="Buscar leads..." filter-column="name">
              <template #options>
                <DataTableViewOptions :table="table" />
              </template>
            </DataTableToolbar>
          </template>
          <template #pagination="{ table }">
            <DataTablePagination :table="table" />
          </template>
        </DataTable>
      </template>

      <MultiActionBar
        v-if="selectedItems.length > 0"
        :count="selectedItems.length"
        :on-delete="showMultiDeleteConfirmation"
      />

      <!-- Multi Delete Dialog -->
      <div
        v-if="showMultiDeleteDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
          <h2 class="mb-2 text-lg font-bold">
            Excluir vários leads
          </h2>
          <p class="mb-4">
            Tem certeza que deseja excluir {{ selectedItems.length }} leads? Esta ação não pode ser desfeita.
          </p>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="showMultiDeleteDialog = false">
              Cancelar
            </Button>
            <Button variant="destructive" @click="handleMultiDeleteConfirm">
              Excluir todos
            </Button>
          </div>
        </div>
      </div>
    </template>

    <!-- Sheet para filtros -->
    <Sheet v-model:open="isSheetOpen">
      <SheetContent class="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtrar Pipeline</SheetTitle>
          <SheetDescription>Filtre leads por diversos critérios</SheetDescription>
        </SheetHeader>

        <div class="grid gap-4 py-4">
          <div class="space-y-2">
            <Label for="status">Status</Label>
            <Select>
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  Novo Lead
                </SelectItem>
                <SelectItem value="contacted">
                  Contatado
                </SelectItem>
                <SelectItem value="qualified">
                  Qualificado
                </SelectItem>
                <SelectItem value="proposal">
                  Proposta
                </SelectItem>
                <SelectItem value="negotiation">
                  Negociação
                </SelectItem>
                <SelectItem value="won">
                  Ganho
                </SelectItem>
                <SelectItem value="lost">
                  Perdido
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="priority">Prioridade</Label>
            <Select>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Selecione uma prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  Alta
                </SelectItem>
                <SelectItem value="medium">
                  Média
                </SelectItem>
                <SelectItem value="low">
                  Baixa
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="source">Origem</Label>
            <Select>
              <SelectTrigger id="source">
                <SelectValue placeholder="Selecione uma origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">
                  Website
                </SelectItem>
                <SelectItem value="referral">
                  Indicação
                </SelectItem>
                <SelectItem value="social">
                  Redes Sociais
                </SelectItem>
                <SelectItem value="email">
                  Email
                </SelectItem>
                <SelectItem value="phone">
                  Telefone
                </SelectItem>
                <SelectItem value="other">
                  Outros
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="assigned-to">Responsável</Label>
            <Input id="assigned-to" placeholder="Nome do responsável" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="min-value">Valor mínimo</Label>
              <Input id="min-value" type="number" placeholder="R$ 0" />
            </div>
            <div class="space-y-2">
              <Label for="max-value">Valor máximo</Label>
              <Input id="max-value" type="number" placeholder="R$ 1.000.000" />
            </div>
          </div>

        </div>

        <SheetFooter>
          <Button variant="outline" @click="isSheetOpen = false">
            Cancelar
          </Button>
          <Button>Aplicar Filtros</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <!-- Lead Details Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogScrollContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Lead</DialogTitle>
          <DialogDescription>Visualize e gerencie as informações do lead</DialogDescription>
        </DialogHeader>

        <div v-if="selectedLead" class="space-y-4">
          <!-- Lead Information -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-sm font-medium">Nome</Label>
              <p class="text-sm text-muted-foreground">
                {{ selectedLead.name }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">E-mail</Label>
              <p class="text-sm text-muted-foreground">
                {{ selectedLead.email }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Telefone</Label>
              <p class="text-sm text-muted-foreground">
                {{ selectedLead.phone }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Empresa</Label>
              <p class="text-sm text-muted-foreground">
                {{ selectedLead.company || '-' }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Status</Label>
              <Badge class="mt-1" variant="secondary">
                {{ selectedLead.status }}
              </Badge>
            </div>
            <div>
              <Label class="text-sm font-medium">Prioridade</Label>
              <Badge class="mt-1" variant="outline">
                {{ selectedLead.priority }}
              </Badge>
            </div>
            <div>
              <Label class="text-sm font-medium">Valor</Label>
              <p class="text-sm text-muted-foreground">
                {{ formatCurrency(selectedLead.value) }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Origem</Label>
              <p class="text-sm text-muted-foreground">
                {{ getSourceLabel(selectedLead.source, selectedLead.source_id) }}
              </p>
            </div>
          </div>

          <div v-if="selectedLead.notes">
            <Label class="text-sm font-medium">Observações</Label>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ selectedLead.notes }}
            </p>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeDialog">
            Fechar
          </Button>
          <Button @click="handleEditLead">
            Editar Lead
          </Button>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>

    <!-- Add Lead Dialog -->
    <Dialog v-model:open="isAddLeadDialogOpen">
      <DialogScrollContent
        class="max-h-[90vh] max-w-lg min-h-[60vh] w-full overflow-y-auto p-0 lg:max-w-4xl md:max-w-3xl sm:max-w-2xl sm:p-6"
      >
        <DialogHeader class="pb-4">
          <DialogTitle class="text-center text-xl font-semibold">
            Adicionar Novo Lead
          </DialogTitle>
          <DialogDescription class="text-center text-sm text-muted-foreground">
            Preencha os dados do novo lead no formulário passo a passo abaixo
          </DialogDescription>
        </DialogHeader>

        <div class="px-6 pb-6">
          <!-- Lead Stepper Form com melhor spacing -->
          <div class="bg-background">
            <LeadStepperForm
              :default-pipeline-id="defaultLeadPipelineId"
              :default-sales-stage-id="defaultLeadStageId"
              @lead-created="handleLeadCreated"
            />
          </div>
        </div>
      </DialogScrollContent>
    </Dialog>

    <!-- Edit Lead Dialog -->
    <Dialog v-model:open="isEditLeadDialogOpen">
      <DialogScrollContent
        class="max-h-[90vh] max-w-lg min-h-[60vh] w-full overflow-y-auto p-0 lg:max-w-4xl md:max-w-3xl sm:max-w-2xl sm:p-6"
      >
        <DialogHeader class="pb-4">
          <DialogTitle class="text-center text-xl font-semibold">
            Editar Lead: {{ selectedLead?.name }}
          </DialogTitle>
          <DialogDescription class="text-center text-sm text-muted-foreground">
            Atualize as informações do lead abaixo
          </DialogDescription>
        </DialogHeader>

        <div class="px-6 pb-6">
          <div v-if="selectedLead" class="bg-background">
            <LeadEditForm
              :lead="selectedLead"
              @lead-updated="handleLeadUpdated"
              @cancel="isEditLeadDialogOpen = false"
            />
          </div>
        </div>
      </DialogScrollContent>
    </Dialog>

    <!-- Delete Dialog -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Excluir lead
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir o lead "{{ leadToDelete?.name }}"? Esta ação não pode ser desfeita.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showDeleteDialog = false">
            Cancelar
          </Button>
          <Button variant="destructive" @click="handleDeleteConfirm">
            Excluir
          </Button>
        </div>
      </div>
    </div>

    <!-- Dialog para criar pipeline -->
    <Dialog v-model:open="isAddPipelineDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Pipeline</DialogTitle>
          <DialogDescription>Criar um novo pipeline de vendas</DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <Input v-model="newPipeline.name" placeholder="Nome do pipeline" />
          <Textarea v-model="newPipeline.description" placeholder="Descrição (opcional)" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isAddPipelineDialogOpen = false">
            Cancelar
          </Button>
          <Button @click="handleCreatePipeline">
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog para organizar stages -->
    <Dialog v-model:open="isOrganizeStagesDialogOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Organizar Estágios</DialogTitle>
          <DialogDescription>Arraste e solte para reordenar os estágios</DialogDescription>
        </DialogHeader>
        <Draggable v-model="stagesOrder" item-key="id" class="space-y-2">
          <template #item="{ element, index }">
            <div class="flex items-center gap-2 border rounded bg-muted p-2">
              <span class="font-medium">{{ element.name }}</span>
              <span class="ml-auto text-xs text-muted-foreground">Ordem: {{ index + 1 }}</span>
            </div>
          </template>
        </Draggable>
        <DialogFooter>
          <Button variant="outline" @click="isOrganizeStagesDialogOpen = false">
            Cancelar
          </Button>
          <Button @click="saveStagesOrder">
            Salvar ordem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style>
/* Estilos para scrollbar personalizada */
.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thumb-gray-400::-webkit-scrollbar-thumb {
  background-color: #9ca3af;
  border-radius: 3px;
}
.dark .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
  background-color: #4b5563;
  border-radius: 3px;
}
.hover\:scrollbar-thumb-gray-500:hover::-webkit-scrollbar-thumb {
  background-color: #6b7280;
}
.dark .dark\:hover\:scrollbar-thumb-gray-400:hover::-webkit-scrollbar-thumb {
  background-color: #9ca3af;
}
</style>
