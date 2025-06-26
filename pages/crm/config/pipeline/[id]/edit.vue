<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { pipelineColumns } from '~/components/crm/config/pipelineColumns'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'
import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import PipelineForm from '~/components/crm/config/PipelineForm.vue'
import PipelineKanban from '~/components/crm/pipeline/PipelineKanban.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import { toast } from '~/components/ui/toast/use-toast'

const { tenantId, setTenantFromJWT, tenants, setCurrentTenantById, listTenants } = useTenant()
const { currentRole } = useAuth()
const selectedItems = ref<any[]>([])
const showDialog = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formModel = ref<any>({ name: '', description: '', is_default: false })
const showDeleteDialog = ref(false)
const pipelineToDelete = ref<any | null>(null)
const showMultiDeleteDialog = ref(false)
const nameError = ref('')
const route = useRoute()
const pipelineId = computed(() => route.params.id as string)

// Dados do pipeline selecionado
const pipeline = ref<any>(null)
const loadingPipeline = ref(true)
const stages = ref<any[]>([])
const loadingStages = ref(true)

// Buscar pipeline selecionado
async function fetchPipeline() {
  if (!pipelineId.value || pipelineId.value === 'undefined') {
    console.warn('Pipeline ID não disponível')
    return
  }
  loadingPipeline.value = true
  const { data } = await useFetch(`/api/crm/pipeline/${pipelineId.value}`)
  pipeline.value = data.value
  if (pipeline.value) {
    formModel.value = {
      name: pipeline.value.name,
      description: pipeline.value.description,
      is_default: pipeline.value.is_default,
      id: pipeline.value.id,
    }
  }
  loadingPipeline.value = false
}

// Buscar stages do pipeline selecionado
async function fetchStages() {
  if (!pipelineId.value || pipelineId.value === 'undefined') {
    console.warn('Pipeline ID não disponível para buscar stages')
    return
  }
  loadingStages.value = true
  const { data } = await useFetch(`/api/crm/sales_stage?pipeline_id=${pipelineId.value}`)
  stages.value = Array.isArray(data.value) ? data.value : []
  // Filtrar e ordenar stages customizados corretamente
  customStages.value = stages.value
    .filter((s: any) => !s.is_default)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  loadingStages.value = false
}

const {
  data: pipelinesRaw,
  refresh: refreshPipelines,
} = await useAsyncData('crm-pipeline', () => $fetch('/api/crm/pipeline'), { watch: [tenantId] })

const pipelinesArray = computed(() => Array.isArray(pipelinesRaw.value) ? pipelinesRaw.value : [])
const { filteredData: pipelinesByTenant } = useTenantRoleFilter<any>(pipelinesArray, 'tenant_id')

const filteredPipelines = computed(() => {
  if (!tenantId.value) return []
  const all = pipelinesArray.value
  const defaults = all.filter((item: any) => item.is_default === true)
  if (currentRole.value === 'cliente') {
    return all.filter((item: any) => item.is_default === true || item.tenant_id === tenantId.value)
  }
  const ids = new Set(defaults.map((i: any) => i.id))
  return [...defaults, ...pipelinesByTenant.value.filter((i: any) => !ids.has(i.id))]
})

function handleEdit(pipeline: any) {
  if (!pipeline || typeof pipeline !== 'object') return
  if (pipeline.is_default) return
  formMode.value = 'edit'
  formModel.value = {
    name: pipeline.name ?? '',
    description: pipeline.description ?? '',
    is_default: Boolean(pipeline.is_default),
    id: pipeline.id ?? undefined,
  }
  showDialog.value = true
}

function handleCreate() {
  formMode.value = 'create'
  formModel.value = { name: '', description: '', is_default: false }
  showDialog.value = true
}

async function handleFormSubmit(_data: any) {
  nameError.value = ''
  const currentTenantId = tenantId.value || (typeof window !== 'undefined' ? localStorage.getItem('tenantId') : '')
  if (!currentTenantId) {
    console.warn('Select a tenant before creating a pipeline.')
    return
  }
  
  // Na página de edição, sempre é uma edição
  const isEdit = true
  const currentPipelineId = pipelineId.value
  
  if (!currentPipelineId) {
    toast({ title: 'Error', description: 'Pipeline ID not found', variant: 'destructive' })
    return
  }
  
  const nameToCheck = (_data.name || '').trim().toLowerCase()
  const alreadyExists = filteredPipelines.value.some(pipeline =>
    pipeline.name?.trim().toLowerCase() === nameToCheck &&
    pipeline.id !== currentPipelineId
  )
  if (alreadyExists) {
    nameError.value = 'A pipeline with this name already exists.'
    return
  }
  
  // Validar stages customizados - apenas stages com nome válido
  const validCustomStages = customStages.value
    .filter(stage => stage.name && stage.name.trim().length > 0)
    .map((stage, idx) => ({
      id: stage.id || undefined,
      name: stage.name.trim(),
      order: stage.order || idx + 2,
      description: stage.description || '',
      color: stage.color || '#cccccc',
      tenant_id: currentTenantId,
      pipeline_id: currentPipelineId,
      is_default: false,
    }))
  
  const url = `/api/crm/pipeline/${currentPipelineId}`
  const method = 'PUT'
  const payload: any = {
    name: _data.name?.trim() || '',
    description: _data.description?.trim(),
    is_default: false,
    tenant_id: currentTenantId,
    customStages: validCustomStages,
    id: currentPipelineId,
  }
  
  try {
    const response = await useFetch(url, { method, body: payload })
    await refreshPipelines()
    await fetchPipeline()
    await fetchStages()
    toast({ title: 'Success', description: 'Pipeline updated successfully!', variant: 'default' })
  } catch (err: any) {
    toast({ title: 'Error', description: 'Failed to update pipeline: ' + (err?.message || 'Unknown error'), variant: 'destructive' })
  }
}

function handleDeleteClick(pipeline: any) {
  pipelineToDelete.value = pipeline
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!pipelineToDelete.value) return
  showDeleteDialog.value = false
  if (!tenantId.value || !pipelineToDelete.value.id) return
  const tenantUuid = typeof tenantId.value === 'object' && tenantId.value !== null ? (tenantId.value as { id: string }).id : tenantId.value
  await useFetch(`/api/crm/pipeline/${pipelineToDelete.value.id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })
  pipelineToDelete.value = null
  await refreshPipelines()
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  if (!tenantId.value) return
  const tenantUuid = typeof tenantId.value === 'object' && tenantId.value !== null ? (tenantId.value as { id: string }).id : tenantId.value
  const idsToDelete = (selectedItems.value as any[]).filter(item => item && !item.is_default && item.id).map(item => item.id)
  await Promise.all(idsToDelete.map(id => useFetch(`/api/crm/pipeline/${id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })))
  selectedItems.value = []
  await refreshPipelines()
}

// Stages fixos
const fixedStages = [
  { id: 'new', name: 'New', probability: 100 },
  { id: 'won', name: 'Won', probability: 100 },
  { id: 'lost', name: 'Lost', probability: 0 },
]

type LeadPriority = 'high' | 'medium' | 'low'
interface Lead {
  id: string
  name: string
  sales_stage_id: 'new' | 'won' | 'lost'
  value: number
  priority: LeadPriority
  company: string
  createdAt: Date
  assignedTo: string
  source: string
  tags: string[]
}
const leads = ref<Lead[]>([
  { id: '1', name: 'Lead 1', sales_stage_id: 'new', value: 1000, priority: 'high', company: 'Company A', createdAt: new Date(), assignedTo: 'User 1', source: 'website', tags: [] },
  { id: '2', name: 'Lead 2', sales_stage_id: 'won', value: 2000, priority: 'medium', company: 'Company B', createdAt: new Date(), assignedTo: 'User 2', source: 'email', tags: [] },
  { id: '3', name: 'Lead 3', sales_stage_id: 'lost', value: 500, priority: 'low', company: 'Company C', createdAt: new Date(), assignedTo: 'User 3', source: 'phone', tags: [] },
])

const leadsByStage = computed<Record<'new' | 'won' | 'lost', Lead[]>>(() => {
  const grouped: Record<'new' | 'won' | 'lost', Lead[]> = { new: [], won: [], lost: [] }
  for (const lead of leads.value) {
    if (grouped[lead.sales_stage_id]) grouped[lead.sales_stage_id].push(lead)
  }
  return grouped
})

const stageStats = computed<Record<'new' | 'won' | 'lost', { count: number; value: number }>>(() => {
  const stats: Record<'new' | 'won' | 'lost', { count: number; value: number }> = { new: { count: 0, value: 0 }, won: { count: 0, value: 0 }, lost: { count: 0, value: 0 } }
  for (const stage of fixedStages) {
    const stageLeads = leadsByStage.value[stage.id as 'new' | 'won' | 'lost'] || []
    stats[stage.id as 'new' | 'won' | 'lost'] = {
      count: stageLeads.length,
      value: stageLeads.reduce((sum: number, lead: Lead) => sum + (lead.value || 0), 0),
    }
  }
  return stats
})

const stageProgress = computed<Record<'new' | 'won' | 'lost', number>>(() => {
  const progress: Record<'new' | 'won' | 'lost', number> = { new: 0, won: 0, lost: 0 }
  const totalLeads = leads.value.length
  for (const stage of fixedStages) {
    const stageCount = stageStats.value[stage.id as 'new' | 'won' | 'lost']?.count || 0
    progress[stage.id as 'new' | 'won' | 'lost'] = totalLeads > 0 ? (stageCount / totalLeads) * 100 : 0
  }
  return progress
})

function handleDragOver(event: DragEvent) { event.preventDefault() }
function handleDrop() {}
function handleDragStart() {}
function getPriorityColor() { return '' }
function formatCurrency(val) { return `R$ ${val}` }

// Funções para editar/remover/adicionar stages customizados
const defaultStages = computed(() => Array.isArray(stages.value) ? stages.value.filter(s => s.is_default) : [])
const customStages = ref<any[]>([])

function addStage() {
  const newStage = { 
    name: '', 
    color: randomColor(), 
    description: '',
    pipeline_id: pipelineId.value, 
    tenant_id: tenantId.value,
    order: customStages.value.length + 2, // +2 porque New é 1
    is_default: false
  }
  customStages.value.push(newStage)
}
function removeStage(idx: number) {
  customStages.value.splice(idx, 1)
}
function randomColor() {
  const h = Math.floor(Math.random() * 360)
  const s = 60 + Math.floor(Math.random() * 30)
  const l = 40 + Math.floor(Math.random() * 30)
  return hslToHex(h, s, l)
}
function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const color = l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1)
    return Math.round(255 * color)
  }
  return `#${[f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

onMounted(async () => {
  if (currentRole.value === 'admin' || currentRole.value === 'funcionario') {
    await listTenants()
    if (tenants.value.length > 0 && !tenantId.value) {
      setCurrentTenantById(tenants.value[0].id)
    }
  }
  if (currentRole.value === 'cliente') {
    await setTenantFromJWT()
    await refreshPipelines()
  }
  await fetchPipeline()
  await fetchStages()
})

watch(currentRole, async (role) => {
  if (role === 'admin' || role === 'funcionario') {
    await listTenants()
    if (tenants.value.length > 0 && !tenantId.value) {
      setCurrentTenantById(tenants.value[0].id)
    }
  }
  if (role === 'cliente') {
    await setTenantFromJWT()
    await refreshPipelines()
  }
})

watch(tenantId, (val) => {
  if (val) {
    refreshPipelines()
  }
  showDialog.value = false
  formModel.value = { name: '', description: '', is_default: false }
}, { immediate: true })

watch(pipelineId, async () => {
  await fetchPipeline()
  await fetchStages()
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Pipelines</h1>
        <p class="text-muted-foreground">Manage all pipelines for your CRM.</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/crm/config/pipeline">
          <Button variant="outline">
            <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
            Back
          </Button>
        </NuxtLink>
        <NuxtLink to="/crm/config/pipeline/new">
          <Button class="bg-primary hover:bg-primary/90">
            <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
            New Pipeline
          </Button>
        </NuxtLink>
      </div>
    </div>

    <!-- Dialog de criar/editar -->
    <Dialog :open="showDialog" @update:open="showDialog = $event">
      <DialogContent class="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{{ formMode === 'edit' ? 'Edit Pipeline' : 'New Pipeline' }}</DialogTitle>
        </DialogHeader>
        <PipelineForm
          v-model="formModel"
          :mode="formMode"
          :loading="false"
          :name-error="nameError"
          @submit="handleFormSubmit"
        />
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <!-- Dialog de deletar -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">Delete Pipeline</h2>
        <p class="mb-4">Are you sure you want to delete the pipeline "{{ pipelineToDelete?.name }}"? This action cannot be undone.</p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showDeleteDialog = false">Cancel</Button>
          <Button variant="destructive" @click="handleDeleteConfirm">Delete</Button>
        </div>
      </div>
    </div>
    <!-- Dialog de deletar múltiplos -->
    <div v-if="showMultiDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">Delete Multiple Pipelines</h2>
        <p class="mb-4">Are you sure you want to delete {{ selectedItems.length }} pipelines? This action cannot be undone.</p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showMultiDeleteDialog = false">Cancel</Button>
          <Button variant="destructive" @click="handleMultiDeleteConfirm">Delete All</Button>
        </div>
      </div>
    </div>

    <Card class="p-6">
      <form class="flex flex-col gap-4" @submit.prevent="handleFormSubmit(formModel)">
        <div class="flex gap-4 items-center">
          <div class="flex flex-col gap-1 w-64">
            <label for="pipeline-name">Name *</label>
            <Input id="pipeline-name" v-model="formModel.name" placeholder="Name" required />
          </div>
          <div class="flex flex-col gap-1 w-96">
            <label for="pipeline-description">Description</label>
            <Input id="pipeline-description" v-model="formModel.description" placeholder="Description (optional)" />
          </div>
          <Button type="submit" class="ml-auto">Save Pipeline</Button>
        </div>
        <CardContent class="flex gap-4 mt-6 overflow-x-auto pb-2">
          <!-- Stages padrão (New) -->
          <template v-for="stage in defaultStages.filter(s => s.name === 'New')" :key="stage.id">
            <div class="bg-card rounded-lg border p-6 flex-1 min-w-[260px] flex flex-col gap-3">
              <h3 class="font-semibold text-base mb-2">{{ stage.name }} (Default)</h3>
              <div class="flex flex-col gap-2">
                <label>Name *</label>
                <Input :value="stage.name" disabled />
              </div>
              <div class="flex flex-col gap-2">
                <label>Color</label>
                <div class="w-8 h-8 rounded border" :style="{ backgroundColor: stage.color }"></div>
              </div>
            </div>
          </template>
          
          <!-- Stages customizados -->
          <template v-for="(stage, idx) in customStages" :key="stage.id || `custom-${idx}`">
            <div class="bg-card rounded-lg border p-6 flex-1 min-w-[260px] flex flex-col gap-3">
              <h3 class="font-semibold text-base mb-2">Custom Stage</h3>
              <div class="flex flex-col gap-2">
                <label>Name *</label>
                <Input v-model="stage.name" placeholder="Stage name" required />
              </div>
              <div class="flex flex-col gap-2">
                <label>Color</label>
                <div class="flex gap-2 items-center">
                  <input type="color" v-model="stage.color" class="w-8 h-8 rounded border cursor-pointer" />
                  <span class="text-sm text-muted-foreground">{{ stage.color }}</span>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label>Description</label>
                <Input v-model="stage.description" placeholder="Stage description (optional)" />
              </div>
              <Button type="button" variant="destructive" class="mt-2 w-fit self-end" @click="removeStage(idx)">Remove</Button>
            </div>
          </template>
          
          <!-- Stages padrão (Won, Lost) -->
          <template v-for="stage in defaultStages.filter(s => s.name === 'Won' || s.name === 'Lost')" :key="stage.id">
            <div class="bg-card rounded-lg border p-6 flex-1 min-w-[260px] flex flex-col gap-3">
              <h3 class="font-semibold text-base mb-2">{{ stage.name }} (Default)</h3>
              <div class="flex flex-col gap-2">
                <label>Name *</label>
                <Input :value="stage.name" disabled />
              </div>
              <div class="flex flex-col gap-2">
                <label>Color</label>
                <div class="w-8 h-8 rounded border" :style="{ backgroundColor: stage.color }"></div>
              </div>
            </div>
          </template>
          
          <!-- Botão para adicionar novo stage -->
          <div class="bg-card rounded-lg border p-6 flex-1 min-w-[260px] flex flex-col items-center justify-center text-center">
            <h3 class="font-semibold text-base mb-2">Add New Stage</h3>
            <p class="text-sm text-muted-foreground mb-3">Add new stage for your Pipeline</p>
            <Button type="button" variant="outline" @click="addStage">Add Stage</Button>
          </div>
        </CardContent>
      </form>
    </Card>
  </div>
</template> 