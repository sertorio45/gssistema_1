<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FunnelForm from '~/components/crm/config/FunnelForm.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import { toast } from '~/components/ui/toast/use-toast'
import { isTenantScopedRole } from '~/constants/roles'
import { useTenantPage } from '~/composables/useTenantPage'
import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'

definePageMeta({
  middleware: ['auth'],
})

const { tenantId, currentRole, whenTenantReady } = useTenantPage()
const selectedItems = ref<any[]>([])
const showDialog = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formModel = ref<any>({ name: '', description: '', is_default: false })
const showDeleteDialog = ref(false)
const funnelToDelete = ref<any | null>(null)
const showMultiDeleteDialog = ref(false)
const nameError = ref('')
const route = useRoute()
const funnelId = computed(() => route.params.id as string)

// Dados do funil selecionado
const funil = ref<any>(null)
const loadingFunil = ref(true)
const stages = ref<any[]>([])
const loadingStages = ref(true)

// Buscar funil selecionado
async function fetchFunil() {
  if (!funnelId.value || funnelId.value === 'undefined') {
    console.warn('Funil ID não disponível')
    return
  }
  loadingFunil.value = true
  const { data } = await useFetch(`/api/crm/funnel/${funnelId.value}`, { params: { tenant_id: tenantId.value } })
  funil.value = data.value
  if (funil.value) {
    formModel.value = {
      name: funil.value.name,
      description: funil.value.description,
      is_default: funil.value.is_default,
      is_active: funil.value.is_active ?? true,
      priority: funil.value.priority ?? 0,
      id: funil.value.id,
    }
  }
  loadingFunil.value = false
}

// Buscar stages do funil selecionado
async function fetchStages() {
  if (!funnelId.value || funnelId.value === 'undefined') {
    console.warn('Funil ID não disponível para buscar stages')
    return
  }
  loadingStages.value = true
  const { data } = await useFetch(`/api/crm/sales_stage?funnel_id=${funnelId.value}&tenant_id=${tenantId.value}`)
  stages.value = Array.isArray(data.value) ? data.value : []
  // Filtrar e ordenar stages customizados corretamente
  customStages.value = stages.value
    .filter((s: any) => !s.is_default)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  loadingStages.value = false
}

const {
  data: funnelsRaw,
  refresh: refreshFunnels,
} = await useAsyncData('crm-funnel', () => $fetch('/api/crm/funnel', { query: { tenant_id: tenantId.value } }), { watch: [tenantId] })

const funnelsArray = computed(() => Array.isArray(funnelsRaw.value) ? funnelsRaw.value : [])
const { filteredData: funnelsByTenant } = useTenantRoleFilter<any>(funnelsArray, 'tenant_id')

const filteredFunnels = computed(() => {
  if (!tenantId.value)
    return []
  const all = funnelsArray.value
  const defaults = all.filter((item: any) => item.is_default === true)
  if (isTenantScopedRole(currentRole.value)) {
    return all.filter((item: any) => item.is_default === true || item.tenant_id === tenantId.value)
  }
  const ids = new Set(defaults.map((i: any) => i.id))
  return [...defaults, ...funnelsByTenant.value.filter((i: any) => !ids.has(i.id))]
})

function handleEdit(funil: any) {
  if (!funil || typeof funil !== 'object')
    return
  if (funil.is_default)
    return
  formMode.value = 'edit'
  formModel.value = {
    name: funil.name ?? '',
    description: funil.description ?? '',
    is_default: Boolean(funil.is_default),
    id: funil.id ?? undefined,
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
    console.warn('Select a tenant before creating a funil.')
    return
  }

  // Na página de edição, sempre é uma edição
  const isEdit = true
  const currentFunilId = funnelId.value

  if (!currentFunilId) {
    toast({ title: 'Error', description: 'Funil ID not found', variant: 'destructive' })
    return
  }

  const nameToCheck = (_data.name || '').trim().toLowerCase()
  const alreadyExists = filteredFunnels.value.some(funil =>
    funil.name?.trim().toLowerCase() === nameToCheck
    && funil.id !== currentFunilId,
  )
  if (alreadyExists) {
    nameError.value = 'A funil with this name already exists.'
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
      funnel_id: currentFunilId,
      is_default: false,
    }))

  const url = `/api/crm/funnel/${currentFunilId}`
  const method = 'PUT'
  const payload: any = {
    name: _data.name?.trim() || '',
    description: _data.description?.trim(),
    is_default: false,
    is_active: _data.is_active ?? true,
    priority: _data.priority ?? 0,
    tenant_id: currentTenantId,
    customStages: validCustomStages,
    id: currentFunilId,
  }

  try {
    const response = await useFetch(url, { method, body: payload })
    await refreshFunnels()
    await fetchFunil()
    await fetchStages()
    toast({ title: 'Success', description: 'Funil updated successfully!', variant: 'default' })
  }
  catch (err: any) {
    toast({ title: 'Error', description: `Failed to update funil: ${err?.message || 'Unknown error'}`, variant: 'destructive' })
  }
}

function handleDeleteClick(funil: any) {
  funnelToDelete.value = funil
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!funnelToDelete.value)
    return
  showDeleteDialog.value = false
  if (!tenantId.value || !funnelToDelete.value.id)
    return
  const tenantUuid = typeof tenantId.value === 'object' && tenantId.value !== null ? (tenantId.value as { id: string }).id : tenantId.value
  await useFetch(`/api/crm/funnel/${funnelToDelete.value.id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })
  funnelToDelete.value = null
  await refreshFunnels()
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  if (!tenantId.value)
    return
  const tenantUuid = typeof tenantId.value === 'object' && tenantId.value !== null ? (tenantId.value as { id: string }).id : tenantId.value
  const idsToDelete = (selectedItems.value as any[]).filter(item => item && !item.is_default && item.id).map(item => item.id)
  await Promise.all(idsToDelete.map(id => useFetch(`/api/crm/funnel/${id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })))
  selectedItems.value = []
  await refreshFunnels()
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
    if (grouped[lead.sales_stage_id])
      grouped[lead.sales_stage_id].push(lead)
  }
  return grouped
})

const stageStats = computed<Record<'new' | 'won' | 'lost', { count: number, value: number }>>(() => {
  const stats: Record<'new' | 'won' | 'lost', { count: number, value: number }> = { new: { count: 0, value: 0 }, won: { count: 0, value: 0 }, lost: { count: 0, value: 0 } }
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
    funnel_id: funnelId.value,
    tenant_id: tenantId.value,
    order: customStages.value.length + 2, // +2 porque New é 1
    is_default: false,
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

whenTenantReady(async () => {
  await refreshFunnels()
  await fetchFunil()
  await fetchStages()
})

watch(tenantId, (val) => {
  if (val)
    refreshFunnels()
  showDialog.value = false
  formModel.value = { name: '', description: '', is_default: false }
})

watch(funnelId, async () => {
  await fetchFunil()
  await fetchStages()
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Funis
        </h1>
        <p class="text-muted-foreground">
          Manage all funis for your CRM.
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/crm/config/funnel">
          <Button variant="outline">
            <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
            Back
          </Button>
        </NuxtLink>
        <NuxtLink to="/crm/config/funnel/new">
          <Button class="bg-primary hover:bg-primary/90">
            <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
            Novo Funil
          </Button>
        </NuxtLink>
      </div>
    </div>

    <!-- Dialog de criar/editar -->
    <Dialog :open="showDialog" @update:open="showDialog = $event">
      <DialogContent class="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{{ formMode === 'edit' ? 'Editar Funil' : 'Novo Funil' }}</DialogTitle>
        </DialogHeader>
        <FunnelForm
          v-model="formModel"
          :mode="formMode"
          :loading="false"
          :name-error="nameError"
          @submit="handleFormSubmit"
        />
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <!-- Dialog de deletar -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Excluir funil
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir o funil "{{ funnelToDelete?.name }}"? Esta ação não pode ser desfeita.
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
    <!-- Dialog de deletar múltiplos -->
    <div v-if="showMultiDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Excluir vários funis
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir {{ selectedItems.length }} funis? Esta ação não pode ser desfeita.
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

    <Card class="p-6">
      <form class="flex flex-col gap-4" @submit.prevent="handleFormSubmit(formModel)">
        <div class="flex items-center gap-4">
          <div class="w-64 flex flex-col gap-1">
            <label for="funil-name">Name *</label>
            <Input id="funil-name" v-model="formModel.name" placeholder="Name" required />
          </div>
          <div class="w-96 flex flex-col gap-1">
            <label for="funil-description">Description</label>
            <Input id="funil-description" v-model="formModel.description" placeholder="Description (optional)" />
          </div>
          <Button type="submit" class="ml-auto">
            Salvar Funil
          </Button>
        </div>
        <CardContent class="mt-6 flex gap-4 overflow-x-auto pb-2">
          <!-- Stages padrão (New) -->
          <template v-for="stage in defaultStages.filter(s => s.name === 'New')" :key="stage.id">
            <div class="min-w-[260px] flex flex-1 flex-col gap-3 border rounded-lg bg-card p-6">
              <h3 class="mb-2 text-base font-semibold">
                {{ stage.name }} (Default)
              </h3>
              <div class="flex flex-col gap-2">
                <label>Name *</label>
                <Input :value="stage.name" disabled />
              </div>
              <div class="flex flex-col gap-2">
                <label>Color</label>
                <div class="h-8 w-8 border rounded" :style="{ backgroundColor: stage.color }" />
              </div>
            </div>
          </template>

          <!-- Stages customizados -->
          <template v-for="(stage, idx) in customStages" :key="stage.id || `custom-${idx}`">
            <div class="min-w-[260px] flex flex-1 flex-col gap-3 border rounded-lg bg-card p-6">
              <h3 class="mb-2 text-base font-semibold">
                Custom Stage
              </h3>
              <div class="flex flex-col gap-2">
                <label>Name *</label>
                <Input v-model="stage.name" placeholder="Stage name" required />
              </div>
              <div class="flex flex-col gap-2">
                <label>Color</label>
                <div class="flex items-center gap-2">
                  <input v-model="stage.color" type="color" class="h-8 w-8 cursor-pointer border rounded">
                  <span class="text-sm text-muted-foreground">{{ stage.color }}</span>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label>Description</label>
                <Input v-model="stage.description" placeholder="Stage description (optional)" />
              </div>
              <Button type="button" variant="destructive" class="mt-2 w-fit self-end" @click="removeStage(idx)">
                Remove
              </Button>
            </div>
          </template>

          <!-- Stages padrão (Won, Lost) -->
          <template v-for="stage in defaultStages.filter(s => s.name === 'Won' || s.name === 'Lost')" :key="stage.id">
            <div class="min-w-[260px] flex flex-1 flex-col gap-3 border rounded-lg bg-card p-6">
              <h3 class="mb-2 text-base font-semibold">
                {{ stage.name }} (Default)
              </h3>
              <div class="flex flex-col gap-2">
                <label>Name *</label>
                <Input :value="stage.name" disabled />
              </div>
              <div class="flex flex-col gap-2">
                <label>Color</label>
                <div class="h-8 w-8 border rounded" :style="{ backgroundColor: stage.color }" />
              </div>
            </div>
          </template>

          <!-- Botão para adicionar novo stage -->
          <div class="min-w-[260px] flex flex-1 flex-col items-center justify-center border rounded-lg bg-card p-6 text-center">
            <h3 class="mb-2 text-base font-semibold">
              Adicionar novo estágio
            </h3>
            <p class="mb-3 text-sm text-muted-foreground">
              Adicione um novo estágio ao seu funil
            </p>
            <Button type="button" variant="outline" @click="addStage">
              Adicionar estágio
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  </div>
</template>
