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
import DataTableViewOptions from '~/components/ui/table/DataTableViewOptions.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import Tooltip from '~/components/ui/tooltip/Tooltip.vue'
import { useCrmLeadWhatsapp } from '~/composables/crm/useCrmLeadWhatsapp'
import { useTenantTeam } from '~/composables/crm/useTenantTeam'
import { useTenantPage } from '~/composables/useTenantPage'

// SEO Meta
useSeoMeta({
  title: 'CRM Funil - SIEM SISTEMAS',
  description: 'Gerencie seu funil de vendas e leads com eficiência.',
})

definePageMeta({
  middleware: ['auth'],
})

interface Funnel {
  id: string
  name: string
}
interface LeadExt extends Lead {
  sales_stage_id?: string
  funnel_id?: string
  assigned_to?: string | null
  created_at?: string
  whatsapp_conversation_id?: string | null
  whatsapp_conversation_status?: string | null
}

const { tenantId, whenTenantReady } = useTenantPage()
const { getMemberName } = useTenantTeam({ attendantsOnly: true })
const funnels = ref<Funnel[]>([])
const stages = ref<SalesStage[]>([])
const leads = ref<LeadExt[]>([])
const leadSources = ref<Array<{ id: string, name: string }>>([])
const selectedFunnel = ref<string | undefined>(undefined)
const selectedLead = ref<LeadExt | null>(null)
const isDialogOpen = ref(false)
const viewMode = ref<'kanban' | 'list'>('kanban')
const isAddLeadDialogOpen = ref(false)
const isEditLeadDialogOpen = ref(false)
const isSheetOpen = ref(false)
const showDeleteDialog = ref(false)
const leadToDelete = ref<Lead | null>(null)
const selectedItems = ref<LeadExt[]>([])
const showMultiDeleteDialog = ref(false)
const isAddFunnelDialogOpen = ref(false)
const newFunnel = ref({ name: '', description: '' })
const isOrganizeStagesDialogOpen = ref(false)
const stagesOrder = ref<SalesStage[]>([])
const initialLoading = ref(true)
const isSyncingTenant = ref(false)
const defaultLeadFunnelId = ref<string | null>(null)
const defaultLeadStageId = ref<string | null>(null)
const dateRangeFormatter = new DateFormatter('pt-BR', { dateStyle: 'medium' })
const leadDateRange = ref<any>({})

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

// Métricas do topo (Total do Funil, Taxa de Conversão, Valor em Negociação, Ganhos do Mês)
const negotiationStageIds = computed(() =>
  stages.value
    .filter(stage => stage.name?.toLowerCase().includes('negocia') || stage.name?.toLowerCase().includes('negoti'))
    .map(stage => String(stage.id)),
)
const wonStageIds = computed(() =>
  stages.value
    .filter(stage => stage.name?.toLowerCase().includes('ganh') || stage.name?.toLowerCase().includes('won'))
    .map(stage => String(stage.id)),
)
const negotiationValue = computed(() => {
  const ids = negotiationStageIds.value
  return leads.value
    .filter((lead) => {
      if (ids.length > 0)
        return ids.includes(String(lead.sales_stage_id || ''))
      // Fallback quando não existir estágio de negociação configurado.
      return lead.status === 'negotiation'
    })
    .reduce((sum, l) => sum + (Number(l.value) || 0), 0)
})
const totalLeadsCount = computed(() => leads.value.length)
const conversionRate = computed(() => {
  const total = totalLeadsCount.value
  if (total === 0)
    return 0
  const wonIds = wonStageIds.value
  const won = leads.value.filter((lead) => {
    if (wonIds.length > 0)
      return wonIds.includes(String(lead.sales_stage_id || ''))
    return lead.status === 'won'
  }).length
  return Math.round((won / total) * 10000) / 100
})
const funnelTotalValue = computed(() =>
  leads.value.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0),
)
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

function updateLeadWhatsappState(leadId: string, patch: { whatsapp_conversation_id: string, whatsapp_conversation_status: string }) {
  leads.value = leads.value.map(lead =>
    lead.id === leadId ? { ...lead, ...patch } : lead,
  )

  if (selectedLead.value?.id === leadId)
    selectedLead.value = { ...selectedLead.value, ...patch }
}

const {
  isSyncingWhatsapp,
  canOpenWhatsappConversation,
  canSyncWhatsapp,
  openWhatsappForLead,
  syncWhatsappForLead,
} = useCrmLeadWhatsapp({
  onLeadUpdated: updateLeadWhatsappState,
})

function openWhatsappFromDialog() {
  if (!selectedLead.value || !canOpenWhatsappConversation(selectedLead.value))
    return

  openWhatsappForLead(selectedLead.value)
  closeDialog()
}

async function syncWhatsappFromDialog() {
  if (!selectedLead.value)
    return

  await syncWhatsappForLead(selectedLead.value)
  closeDialog()
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
const leadDateRangeKey = computed(() => {
  const start = toIsoDate(leadDateRange.value?.start) || ''
  const end = toIsoDate(leadDateRange.value?.end) || ''
  return `${start}__${end}`
})

function clearLeadDateRange() {
  leadDateRange.value = {}
}

function setLeadDatePreset(preset: 'all' | 'today' | '7d' | '30d' | 'month') {
  const now = today(getLocalTimeZone())
  if (preset === 'all') {
    leadDateRange.value = {}
    return
  }
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

function getStatusFromStageName(stageName: string): Lead['status'] | null {
  const name = (stageName || '').toLowerCase()
  if (name.includes('novo') || name.includes('new'))
    return 'new'
  if (name.includes('contat') || name.includes('contact'))
    return 'contacted'
  if (name.includes('qualific') || name.includes('qualif'))
    return 'qualified'
  if (name.includes('propost') || name.includes('proposal'))
    return 'proposal'
  if (name.includes('negocia') || name.includes('negoti'))
    return 'negotiation'
  if (name.includes('ganh') || name.includes('won'))
    return 'won'
  if (name.includes('perdid') || name.includes('lost'))
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

    const lead = leads.value.find(l => l.id === leadId)
    if (!lead)
      return
    if (currentStageId === newStageId) {
      // Soltou na mesma coluna (fora de um card alvo): move para o final da coluna.
      const previousLeads = [...leads.value]
      const remaining = leads.value.filter(l => l.id !== leadId)
      const sameStage = remaining.filter(l => String(l.sales_stage_id || '') === String(newStageId))
      if (sameStage.length === 0) {
        leads.value = [...remaining, lead]
      }
      else {
        const lastSameStageId = sameStage[sameStage.length - 1].id
        const insertAt = remaining.findIndex(l => l.id === lastSameStageId) + 1
        leads.value = [...remaining.slice(0, insertAt), lead, ...remaining.slice(insertAt)]
      }
      if (leads.value.length === 0)
        leads.value = previousLeads
      return
    }

    const newStage = stages.value.find(s => s.id === newStageId)
    const wonOrLost = newStage ? isStageWonOrLost(newStage.name) : null
    const statusFromStage = newStage ? getStatusFromStageName(newStage.name) : null
    let newStatus: Lead['status'] = statusFromStage ?? lead?.status ?? 'new'
    // Se sair de um estágio terminal para outro não-terminal, remove status de fechamento.
    if (!statusFromStage && (lead?.status === 'won' || lead?.status === 'lost'))
      newStatus = 'negotiation'
    const closedAt = wonOrLost ? new Date().toISOString() : null

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
          status: newStatus,
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

function handleDropOnLead(event: DragEvent, newStageId: string, targetLeadId: string) {
  event.preventDefault()
  if (!event.dataTransfer)
    return
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    const { leadId, currentStageId } = data
    if (!leadId || leadId === targetLeadId)
      return

    const movingLead = leads.value.find(l => l.id === leadId)
    const targetLead = leads.value.find(l => l.id === targetLeadId)
    if (!movingLead || !targetLead)
      return

    // Reordenação local para posicionar acima/abaixo do card alvo.
    const remaining = leads.value.filter(l => l.id !== leadId)
    const targetIndex = remaining.findIndex(l => l.id === targetLeadId)
    if (targetIndex < 0)
      return
    const targetElement = event.currentTarget as HTMLElement | null
    let insertIndex = targetIndex
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect()
      const isBelowHalf = event.clientY > rect.top + rect.height / 2
      insertIndex = isBelowHalf ? targetIndex + 1 : targetIndex
    }
    const moved: LeadExt = {
      ...movingLead,
      sales_stage_id: newStageId,
    }
    leads.value = [...remaining.slice(0, insertIndex), moved, ...remaining.slice(insertIndex)]

    // Se mudou de coluna, reaproveita a regra de status/fechamento já aplicada no drop padrão.
    if (String(currentStageId) !== String(newStageId)) {
      handleDrop(event, newStageId)
    }
  }
  catch (error) {
    console.error('Error processing card reordering:', error)
  }
}

async function handleDeleteConfirm() {
  if (!leadToDelete.value)
    return
  showDeleteDialog.value = false
  const leadId = leadToDelete.value.id
  const tenant = tenantId.value
  const tenantUuid = typeof tenant === 'object' && tenant !== null && 'id' in tenant
    ? (tenant as { id: string }).id
    : tenant
  try {
    await $fetch('/api/crm/lead', {
      method: 'DELETE',
      body: {
        id: leadId,
        tenant_id: tenantUuid,
      },
    })
    leads.value = leads.value.filter(lead => lead.id !== leadId)
    selectedItems.value = selectedItems.value.filter(item => item.id !== leadId)
    toast.success('Lead excluído com sucesso!')
  }
  catch (e: any) {
    const msg = e?.data?.message || e?.message || 'Erro ao excluir lead. Tente novamente.'
    toast.error(msg)
  }
  finally {
    leadToDelete.value = null
  }
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  if (!selectedItems.value.length)
    return

  const tenant = tenantId.value
  const tenantUuid = typeof tenant === 'object' && tenant !== null && 'id' in tenant
    ? (tenant as { id: string }).id
    : tenant
  const leadIdsToDelete = selectedItems.value.map(lead => lead.id)

  const results = await Promise.allSettled(
    leadIdsToDelete.map(id =>
      $fetch('/api/crm/lead', {
        method: 'DELETE',
        body: {
          id,
          tenant_id: tenantUuid,
        },
      }),
    ),
  )

  const successIds = leadIdsToDelete.filter((_, index) => results[index].status === 'fulfilled')
  const failedCount = results.length - successIds.length

  if (successIds.length) {
    leads.value = leads.value.filter(lead => !successIds.includes(lead.id))
    toast.success(
      successIds.length === 1
        ? '1 lead excluído com sucesso!'
        : `${successIds.length} leads excluídos com sucesso!`,
    )
  }

  if (failedCount > 0) {
    toast.error(
      failedCount === 1
        ? '1 lead não pôde ser excluído.'
        : `${failedCount} leads não puderam ser excluídos.`,
    )
  }

  selectedItems.value = []
}

function updateSelectedItems(indices: number[]) {
  selectedItems.value = indices
    .map(index => leads.value[index])
    .filter((lead): lead is LeadExt => Boolean(lead))
}

// Abre o dialog de novo lead atribuindo ao estágio "Novo" (primeiro da lista).
function openNewLeadDialog() {
  defaultLeadFunnelId.value = selectedFunnel.value ?? null
  defaultLeadStageId.value = stages.value[0]?.id ?? null
  isAddLeadDialogOpen.value = true
}

// Abre o dialog de novo lead atribuindo ao estágio da coluna clicada.
function handleAddLeadToStage(stage: SalesStage) {
  defaultLeadFunnelId.value = selectedFunnel.value ?? null
  defaultLeadStageId.value = stage.id ?? null
  isAddLeadDialogOpen.value = true
}

// Handler para quando um lead é criado com sucesso
function handleLeadCreated(_newLead: any) {
  isAddLeadDialogOpen.value = false
  defaultLeadFunnelId.value = null
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
  selectedLead.value = lead
  isEditLeadDialogOpen.value = true
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

async function fetchFunnels() {
  if (!tenantId.value)
    return
  const data = await $fetch<Funnel[]>('/api/crm/funnel', { query: { tenant_id: tenantId.value } })
  const nextFunnels = Array.isArray(data) ? data : []
  funnels.value = nextFunnels

  if (!selectedFunnel.value || !nextFunnels.some(p => p.id === selectedFunnel.value)) {
    selectedFunnel.value = nextFunnels[0]?.id || undefined
  }

  if (!selectedFunnel.value) {
    stages.value = []
    leads.value = []
  }
}

async function fetchStages() {
  if (!selectedFunnel.value)
    return
  const data = await $fetch<SalesStage[]>('/api/crm/sales_stage', {
    query: { funnel_id: selectedFunnel.value, tenant_id: tenantId.value },
  })
  stages.value = Array.isArray(data) ? data : []
}

async function fetchLeads() {
  if (!selectedFunnel.value)
    return
  const startDate = toIsoDate(leadDateRange.value?.start)
  const endDate = toIsoDate(leadDateRange.value?.end)
  const data = await $fetch<LeadExt[]>('/api/crm/lead', {
    query: {
      funnel_id: selectedFunnel.value,
      tenant_id: tenantId.value,
      start_date: startDate,
      end_date: endDate,
    },
  })
  leads.value = Array.isArray(data) ? data : []
}

async function loadInitialData() {
  if (!tenantId.value) {
    initialLoading.value = false
    return
  }

  initialLoading.value = true
  isSyncingTenant.value = true
  try {
    await fetchFunnels()
    await fetchStages()
    await fetchLeadSources()
    await fetchLeads()
  }
  finally {
    initialLoading.value = false
    isSyncingTenant.value = false
  }
}

async function reloadFunnelData() {
  if (!tenantId.value || !selectedFunnel.value)
    return
  await fetchStages()
  await fetchLeads()
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

whenTenantReady(loadInitialData)

watch(selectedFunnel, () => {
  if (isSyncingTenant.value)
    return
  void reloadFunnelData()
})

watch(leadDateRangeKey, () => {
  fetchLeads()
})

async function handleCreateFunnel() {
  if (!newFunnel.value.name)
    return
  const { data, error } = await useFetch('/api/crm/funnel', {
    method: 'POST',
    body: {
      name: newFunnel.value.name,
      description: newFunnel.value.description,
      tenant_id: tenantId.value,
    },
  })
  if (!error && data.value?.body) {
    const funnel = data.value.body as unknown as Funnel
    funnels.value.push(funnel)
    selectedFunnel.value = funnel.id
    isAddFunnelDialogOpen.value = false
    newFunnel.value = { name: '', description: '' }
    toast.success('Funil criado com sucesso!')
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
          Funil
        </h1>
        <p class="text-muted-foreground">
          Gerencie seu funil de vendas e leads
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
              <Button variant="outline" size="sm" class="h-7 px-2 text-xs" @click="setLeadDatePreset('all')">
                Todo o período
              </Button>
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

    <!-- Loading inicial unificado -->
    <div v-if="initialLoading" class="space-y-4">
      <div class="grid mb-4 gap-4 lg:grid-cols-4 md:grid-cols-2">
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

      <div v-if="viewMode === 'kanban'" class="space-y-4">
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

      <Card v-else class="border shadow-sm">
        <CardContent class="p-4">
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <Skeleton class="h-9 w-[200px]" />
              <Skeleton class="h-9 w-[100px]" />
            </div>
            <Skeleton class="h-10 w-full" />
            <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>

    <template v-else>
    <!-- Funil Stats -->
    <div class="grid mb-4 gap-4 lg:grid-cols-4 md:grid-cols-2">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Total do Funil
          </CardTitle>
          <Icon name="lucide:trending-up" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ formatCurrency(funnelTotalValue) }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ totalLeadsCount }} lead(s) no funil atual
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
            Valor em Negociação
          </CardTitle>
          <Icon name="lucide:receipt" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ formatCurrency(negotiationValue) }}
          </div>
          <p class="text-xs text-muted-foreground">
            Soma apenas dos leads no estágio de negociação
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Ganhos do Mês
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
      <div class="mb-2 flex items-center gap-2">
        <div class="flex items-center gap-2">
          <Select v-model="selectedFunnel">
            <SelectTrigger class="w-64">
              <SelectValue placeholder="Selecione o funil..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="funnel in funnels" :key="funnel.id" :value="funnel.id">
                {{ funnel.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <div class="ml-2 flex gap-1">
            <Tooltip content="Criar novo funil">
              <Button
                variant="outline"
                size="icon"
                aria-label="Criar novo funil"
                @click="isAddFunnelDialogOpen = true"
              >
                <Icon name="lucide:plus" class="h-5 w-5" />
              </Button>
            </Tooltip>
            <Tooltip content="Organizar estágios do funil">
              <Button variant="outline" size="icon" aria-label="Organizar estágios" @click="openOrganizeStagesDialog">
                <Icon name="lucide:list" class="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
          <span class="ml-2 hidden text-xs text-muted-foreground md:inline">Selecione, crie ou organize seus funis</span>
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
                v-for="(lead, leadIndex) in leadsByStage[String(stage.id)]"
                :key="lead.id"
                class="cursor-grab border border-l-4 rounded-lg bg-background p-3 transition-shadow hover:shadow-md"
                :class="getPriorityColor(lead.priority)"
                draggable="true"
                @click="handleLeadClick(lead)"
                @dragstart="handleDragStart($event, lead.id, lead.sales_stage_id)"
                @dragover.stop.prevent="handleDragOver"
                @drop.stop="handleDropOnLead($event, String(stage.id), lead.id)"
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
                    <Tooltip content="Editar lead">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                        @click.stop="handleQuickEditLead(lead)"
                      >
                        <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
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
                      <span class="truncate">{{ getMemberName(lead.assigned_to || lead.assignedTo) }}</span>
                    </div>
                    <div class="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-muted-foreground">
                      <Icon name="lucide:tag" class="h-3 w-3" />
                      <span class="truncate">{{ getSourceLabel(lead.source, lead.source_id) }}</span>
                    </div>
                  </div>

                  <Button
                    v-if="canOpenWhatsappConversation(lead)"
                    variant="outline"
                    size="sm"
                    class="h-10 w-full gap-2 text-sm"
                    @click.stop="openWhatsappForLead(lead)"
                  >
                    <Icon name="lucide:message-circle" class="h-4 w-4" />
                    Abrir conversa
                  </Button>
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
    </div>

    <!-- Visualização em Lista (DataTable) -->
    <template v-else>
      <DataTable
          :data="leads"
          :columns="columns"
          :meta="{ onEdit: handleEdit, onDelete: handleDelete, getMemberName }"
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
    </template>

    <!-- Sheet para filtros -->
    <Sheet v-model:open="isSheetOpen">
      <SheetContent class="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtrar Funil</SheetTitle>
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

        <DialogFooter
          class="gap-2"
          :class="canOpenWhatsappConversation(selectedLead) || canSyncWhatsapp(selectedLead) ? 'sm:justify-between' : 'sm:justify-end'"
        >
          <Button
            v-if="canOpenWhatsappConversation(selectedLead)"
            variant="outline"
            size="sm"
            class="h-8 gap-2"
            @click="openWhatsappFromDialog"
          >
            <Icon name="lucide:message-circle" class="h-4 w-4" />
            Abrir conversa
          </Button>
          <Button
            v-else-if="canSyncWhatsapp(selectedLead)"
            variant="outline"
            size="sm"
            class="h-8 gap-2"
            :disabled="isSyncingWhatsapp"
            @click="syncWhatsappFromDialog"
          >
            <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': isSyncingWhatsapp }" />
            Sincronizar no WhatsApp
          </Button>
          <div class="flex gap-2">
            <Button variant="outline" @click="closeDialog">
              Fechar
            </Button>
            <Button @click="handleEditLead">
              Editar Lead
            </Button>
          </div>
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
              :default-funnel-id="defaultLeadFunnelId"
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

    <!-- Dialog para criar funil -->
    <Dialog v-model:open="isAddFunnelDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Funil</DialogTitle>
          <DialogDescription>Criar um novo funil de vendas</DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <Input v-model="newFunnel.name" placeholder="Nome do funil" />
          <Textarea v-model="newFunnel.description" placeholder="Descrição (opcional)" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isAddFunnelDialogOpen = false">
            Cancelar
          </Button>
          <Button @click="handleCreateFunnel">
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
