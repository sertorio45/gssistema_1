<script setup lang="ts">
import type { Lead, SalesStage } from '~/types/crm'
import { useFetch } from '#app'

import { computed, ref, watch } from 'vue'

// SEO Meta
useSeoMeta({
  title: 'CRM Pipeline - SIEM SISTEMAS',
  description: 'Manage your sales pipeline and leads efficiently with our CRM system.',
})

import Draggable from 'vuedraggable'
import { columns } from '~/components/crm/leads/columns'
import LeadStepperForm from '~/components/crm/leads/LeadStepperForm.vue'
import LeadEditForm from '~/components/crm/leads/LeadEditForm.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'
import SelectValue from '~/components/ui/select/SelectValue.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableRowActions from '~/components/ui/table/DataTableRowActions.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import Tooltip from '~/components/ui/tooltip/Tooltip.vue'
import { useTenant } from '~/composables/useTenant'

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
const selectedPipeline = ref<string | null>(null)
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

// Group leads by status
const leadsByStage = computed(() => {
  const grouped: Record<string, Lead[]> = {}
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

function handleLeadClick(lead: Lead) {
  selectedLead.value = lead
  isDialogOpen.value = true
}

function closeDialog() {
  isDialogOpen.value = false
  selectedLead.value = null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
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

async function handleDrop(event: DragEvent, newStageId: string) {
  event.preventDefault()
  if (event.dataTransfer) {
    try {
      const data = JSON.parse(event.dataTransfer.getData('text/plain'))
      const { leadId, currentStageId } = data

      if (currentStageId !== newStageId) {
        // Atualiza localmente para feedback instantâneo
        const updatedLeads = leads.value.map((lead) => {
          if (lead.id === leadId) {
            return { ...lead, sales_stage_id: newStageId }
          }
          return lead
        })
        leads.value = updatedLeads

        // Salva no backend
        try {
          await $fetch(`/api/crm/lead/${leadId}`, {
            method: 'put',
            body: { sales_stage_id: newStageId },
          })
          await fetchLeads()
          toast.success('Lead moved successfully!')
        }
        catch {
          toast.error('Error updating lead. Try again.')
        }
      }
    }
    catch (error) {
      console.error('Error processing drop:', error)
    }
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

// Função para adicionar um novo lead em um estágio específico
function handleAddLeadToStage(stageName: string) {
  console.warn(`Adicionar novo lead ao estágio: ${stageName}`)
  isAddLeadDialogOpen.value = true
}

// Handler para quando um lead é criado com sucesso
function handleLeadCreated(_newLead: any) {
  // Fechar o dialog
  isAddLeadDialogOpen.value = false
  
  // Refresh dos leads para mostrar o novo lead
  fetchLeads()
  
  // Lead criado com sucesso - sem log para evitar violação de linter
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
  const { data } = await useFetch<Pipeline[]>('/api/crm/pipeline', { params: { tenant_id: tenantId.value } })
  pipelines.value = Array.isArray(data.value) ? data.value : []
  if (!selectedPipeline.value && pipelines.value.length) {
    selectedPipeline.value = pipelines.value[0]?.id || null
  }
}

async function fetchStages() {
  if (!selectedPipeline.value)
    return
  const { data } = await useFetch<SalesStage[]>('/api/crm/sales_stage', {
    params: { pipeline_id: selectedPipeline.value },
  })
  stages.value = Array.isArray(data.value) ? data.value : []
}

async function fetchLeads() {
  if (!selectedPipeline.value)
    return
  const { data } = await useFetch<LeadExt[]>('/api/crm/lead', { params: { pipeline_id: selectedPipeline.value } })
  leads.value = Array.isArray(data.value) ? data.value : []
}

watch(tenantId, fetchPipelines, { immediate: true })
watch(selectedPipeline, () => {
  fetchStages()
  fetchLeads()
})

let toast: any
try {
  toast = require('~/components/ui/sonner/useSonner').toast
}
catch {
  toast = {
    success: (msg: string) => {
      /* noop */
    },
    error: (msg: string) => {
      /* noop */
    },
  }
}

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
    pipelines.value.push(data.value.body)
    selectedPipeline.value = data.value.body.id
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
  for (let i = 0; i < stagesOrder.value.length; i++) {
    const stage = stagesOrder.value[i]
    await useFetch('/api/crm/sales_stage', {
      method: 'PUT',
      body: { id: stage.id, order: i + 1, tenant_id: tenantId.value },
    })
  }
  isOrganizeStagesDialogOpen.value = false
  fetchStages()
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
          Manage your sales pipeline and leads
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button @click="isAddLeadDialogOpen = true">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </div>
    </div>

    <!-- Barra de pesquisa unificada -->
    <div class="mb-4 flex items-center justify-between">
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

    <!-- Pipeline Stats -->
    <div class="grid mb-4 gap-4 lg:grid-cols-4 md:grid-cols-2">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Total Pipeline
          </CardTitle>
          <Icon name="lucide:trending-up" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ formatCurrency(Object.values(stageStats).reduce((sum, stat) => sum + stat.value, 0)) }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ Object.values(stageStats).reduce((sum, stat) => sum + stat.count, 0) }} leads
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Qualified Leads
          </CardTitle>
          <Icon name="lucide:check-circle" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ stageStats.qualified?.count || 0 }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ formatCurrency(stageStats.qualified?.value || 0) }}
          </p>
          <Progress class="mt-2 h-2" :model-value="stageProgress.qualified || 0" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            In Negotiation
          </CardTitle>
          <Icon name="lucide:handshake" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ stageStats.negotiation?.count || 0 }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ formatCurrency(stageStats.negotiation?.value || 0) }}
          </p>
          <Progress class="mt-2 h-2" :model-value="stageProgress.negotiation || 0" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Won This Month
          </CardTitle>
          <Icon name="lucide:trophy" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ stageStats.won?.count || 0 }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ formatCurrency(stageStats.won?.value || 0) }}
          </p>
          <Progress class="mt-2 h-2" :model-value="stageProgress.won || 0" />
        </CardContent>
      </Card>
    </div>

    <!-- Visualização Kanban -->
    <div v-if="viewMode === 'kanban'" class="flex flex-col gap-4">
      <!-- Visualização de cards do Kanban -->
      <div class="mb-2 flex items-center gap-2">
        <div class="flex items-center gap-2">
          <Select v-model="selectedPipeline">
            <SelectTrigger class="w-64">
              <SelectValue placeholder="Select pipeline..." />
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
          @drop="event => handleDrop(event, String(stage.id))"
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
                  @click="handleAddLeadToStage(stage.name.toLowerCase().replace(' ', ''))"
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
                @dragstart="event => handleDragStart(event, lead.id, lead.sales_stage_id)"
              >
                <!-- Lead Card Content -->
                <div class="space-y-1">
                  <div class="flex items-start justify-between">
                    <div>
                      <h4 class="text-xs font-medium">
                        {{ lead.name }}
                      </h4>
                      <p class="text-xs text-muted-foreground">
                        {{ lead.company || 'No company' }}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      class="h-4 py-0 text-xs"
                      :class="{
                        'bg-red-50 text-red-700 border-red-200': lead.priority === 'high',
                        'bg-yellow-50 text-yellow-700 border-yellow-200': lead.priority === 'medium',
                        'bg-gray-50 text-gray-700 border-gray-200': lead.priority === 'low',
                      }"
                    >
                      {{ lead.priority }}
                    </Badge>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium">{{ formatCurrency(lead.value) }}</span>
                    <div class="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon name="lucide:calendar" class="h-3 w-3" />
                      {{ new Date(lead.createdAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }) }}
                    </div>
                  </div>

                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-1 text-muted-foreground">
                      <Icon name="lucide:user" class="h-3 w-3" />
                      {{ lead.assignedTo || 'Unassigned' }}
                    </div>
                    <div class="flex items-center gap-1 text-muted-foreground">
                      <Icon name="lucide:tag" class="h-3 w-3" />
                      {{ lead.source }}
                    </div>
                  </div>

                  <div v-if="lead.tags.length" class="flex flex-wrap gap-1">
                    <Badge
                      v-for="tag in lead.tags.slice(0, 2)"
                      :key="tag"
                      variant="outline"
                      class="h-4 px-1 py-0 text-[10px]"
                    >
                      {{ tag }}
                    </Badge>
                    <span v-if="lead.tags.length > 2" class="text-[10px] text-muted-foreground">
                      +{{ lead.tags.length - 2 }}
                    </span>
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
                  @click="handleAddLeadToStage(stage.name.toLowerCase().replace(' ', ''))"
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
      <div v-if="isLoading" class="space-y-4">
        <Card class="border shadow-sm">
          <CardContent class="p-4">
            <div class="space-y-2">
              <Skeleton class="h-8 w-[250px]" />
              <Skeleton class="h-8 w-full" />
              <Skeleton class="h-8 w-full" />
              <Skeleton class="h-8 w-full" />
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
            <DataTableToolbar :table="table" placeholder="Search leads..." column-key="name" />
          </template>
          <template #pagination="{ table }">
            <DataTablePagination :table="table" />
          </template>
          <template #actions="{ row }">
            <DataTableRowActions :row="row" :on-edit="handleEdit" :on-delete="handleDelete" />
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
            Delete Multiple Leads
          </h2>
          <p class="mb-4">
            Are you sure you want to delete {{ selectedItems.length }} leads? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="showMultiDeleteDialog = false">
              Cancel
            </Button>
            <Button variant="destructive" @click="handleMultiDeleteConfirm">
              Delete All
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
          <SheetDescription> Filtre leads por diversos critérios </SheetDescription>
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

          <div class="space-y-2">
            <Label for="tags">Tags</Label>
            <Input id="tags" placeholder="Separe as tags por vírgula" />
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
          <DialogTitle>Lead Details</DialogTitle>
          <DialogDescription> View and manage lead information </DialogDescription>
        </DialogHeader>

        <div v-if="selectedLead" class="space-y-4">
          <!-- Lead Information -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-sm font-medium">Name</Label>
              <p class="text-sm text-muted-foreground">
                {{ selectedLead.name }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Email</Label>
              <p class="text-sm text-muted-foreground">
                {{ selectedLead.email }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Phone</Label>
              <p class="text-sm text-muted-foreground">
                {{ selectedLead.phone }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Company</Label>
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
              <Label class="text-sm font-medium">Priority</Label>
              <Badge class="mt-1" variant="outline">
                {{ selectedLead.priority }}
              </Badge>
            </div>
            <div>
              <Label class="text-sm font-medium">Value</Label>
              <p class="text-sm text-muted-foreground">
                {{ formatCurrency(selectedLead.value) }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Source</Label>
              <p class="text-sm text-muted-foreground">
                {{ selectedLead.source }}
              </p>
            </div>
          </div>

          <div v-if="selectedLead.notes">
            <Label class="text-sm font-medium">Notes</Label>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ selectedLead.notes }}
            </p>
          </div>

          <div v-if="selectedLead.tags.length">
            <Label class="text-sm font-medium">Tags</Label>
            <div class="mt-1 flex flex-wrap gap-1">
              <Badge v-for="tag in selectedLead.tags" :key="tag" variant="outline" class="text-xs">
                {{ tag }}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeDialog">
            Close
          </Button>
          <Button @click="handleEditLead">Edit Lead</Button>
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
            Add New Lead
          </DialogTitle>
          <DialogDescription class="text-center text-sm text-muted-foreground">
            Fill in the details for the new lead using the step-by-step form below
          </DialogDescription>
        </DialogHeader>
        
        <div class="px-6 pb-6">
          <!-- Lead Stepper Form com melhor spacing -->
          <div class="bg-background">
            <LeadStepperForm @lead-created="handleLeadCreated" />
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
            Edit Lead: {{ selectedLead?.name }}
          </DialogTitle>
          <DialogDescription class="text-center text-sm text-muted-foreground">
            Update the lead information below
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
          Excluir Lead
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
          <DialogTitle>New Pipeline</DialogTitle>
          <DialogDescription>Create a new sales pipeline</DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <Input v-model="newPipeline.name" placeholder="Pipeline name" />
          <Textarea v-model="newPipeline.description" placeholder="Description (optional)" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isAddPipelineDialogOpen = false">
            Cancel
          </Button>
          <Button @click="handleCreatePipeline">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog para organizar stages -->
    <Dialog v-model:open="isOrganizeStagesDialogOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Organize Stages</DialogTitle>
          <DialogDescription>Drag and drop to reorder stages</DialogDescription>
        </DialogHeader>
        <Draggable v-model="stagesOrder" item-key="id" class="space-y-2">
          <template #item="{ element, index }">
            <div class="flex items-center gap-2 border rounded bg-muted p-2">
              <span class="font-medium">{{ element.name }}</span>
              <span class="ml-auto text-xs text-muted-foreground">Order: {{ index + 1 }}</span>
            </div>
          </template>
        </Draggable>
        <DialogFooter>
          <Button variant="outline" @click="isOrganizeStagesDialogOpen = false">
            Cancel
          </Button>
          <Button @click="saveStagesOrder">
            Save Order
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
