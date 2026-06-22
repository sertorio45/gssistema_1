<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { salesStageColumns } from '~/components/crm/config/salesStageColumns'
import SalesStageForm from '~/components/crm/config/SalesStageForm.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import DataTableViewOptions from '~/components/ui/table/DataTableViewOptions.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { toast } from '~/components/ui/toast'
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
const formModel = ref<any>({ name: '', order: 1, color: '#cccccc', description: '', is_default: false })
const showDeleteDialog = ref(false)
const stageToDelete = ref<any | null>(null)
const showMultiDeleteDialog = ref(false)
const nameError = ref('')
const isLoading = ref(false)

const {
  data: stagesRaw,
  pending,
  refresh: refreshStages,
} = await useAsyncData('crm-sales-stages', () => $fetch('/api/crm/sales_stage', { query: { tenant_id: tenantId.value } }), { watch: [tenantId] })

const stagesArray = computed(() => (Array.isArray(stagesRaw.value) ? stagesRaw.value : []))
const { filteredData: stagesByTenant } = useTenantRoleFilter<any>(stagesArray, 'tenant_id')

const filteredStages = computed(() => {
  if (!tenantId.value) {
    return []
  }

  const all = stagesArray.value
  const defaults = all.filter((item: any) => item.is_default === true)
  if (isTenantScopedRole(currentRole.value)) {
    return all.filter((item: any) => item.is_default === true || item.tenant_id === tenantId.value)
  }
  const ids = new Set(defaults.map((i: any) => i.id))
  return [...defaults, ...stagesByTenant.value.filter((i: any) => !ids.has(i.id))]
})

function updateSelectedItems(indices: number[]) {
  const items = indices.map(idx => filteredStages.value[idx]).filter(Boolean)
  selectedItems.value = items
}

function randomColor(): string {
  let color = ''
  do {
    const h = Math.floor(Math.random() * 360)
    const s = 60 + Math.floor(Math.random() * 30)
    const l = 40 + Math.floor(Math.random() * 30)
    color = hslToHex(h, s, l)
  } while (color === lastColor)
  lastColor = color
  return color
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const color = l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1)
    return Math.round(255 * color)
  }
  return `#${[f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

function handleEdit(stage: any) {
  if (!stage || typeof stage !== 'object') {
    return
  }
  if (stage.is_default) {
    return
  }
  formMode.value = 'edit'
  formModel.value = {
    name: stage.name ?? '',
    order: stage.order ?? 1,
    color: stage.color ?? '#cccccc',
    description: stage.description ?? '',
    is_default: Boolean(stage.is_default),
    id: stage.id ?? undefined,
  }
  showDialog.value = true
}

function handleCreate() {
  formMode.value = 'create'
  formModel.value = { name: '', order: 1, color: randomColor(), description: '', is_default: false }
  showDialog.value = true
}

async function handleFormSubmit(_data: any) {
  nameError.value = ''
  const currentTenantId = tenantId.value || (typeof window !== 'undefined' ? localStorage.getItem('tenantId') : '')
  if (!currentTenantId) {
    console.warn('Select a tenant before creating a stage.')
    return
  }

  // Validação de nome duplicado (case insensitive)
  const nameToCheck = (_data.name || '').trim().toLowerCase()
  const isEdit = formMode.value === 'edit'
  const alreadyExists = filteredStages.value.some(
    stage => stage.name?.trim().toLowerCase() === nameToCheck && (!isEdit || stage.id !== formModel.value.id),
  )
  if (alreadyExists) {
    nameError.value = 'Já existe um estágio com este nome.'
    return
  }

  const url = isEdit ? `/api/crm/sales_stage/${formModel.value.id}` : '/api/crm/sales_stage'
  const method = isEdit ? 'PUT' : 'POST'
  const payload: any = {
    name: _data.name?.trim() || '',
    order: Number(_data.order) || 1,
    color: _data.color || '#cccccc',
    description: _data.description?.trim(),
    is_default: false,
    tenant_id: currentTenantId,
  }
  if (isEdit && formModel.value.id) {
    payload.id = String(formModel.value.id)
  }

  try {
    await useFetch(url, { method, body: payload })
    showDialog.value = false
    await refreshStages()
  }
  catch {
    // Trate erro se quiser
  }
}

function handleDeleteClick(stage: any) {
  stageToDelete.value = stage
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!stageToDelete.value) {
    return
  }
  showDeleteDialog.value = false
  const tenantUuid = typeof tenantId.value === 'object' ? tenantId.value.id : tenantId.value || ''
  await useFetch(`/api/crm/sales_stage/${stageToDelete.value.id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })
  stageToDelete.value = null
  await refreshStages()
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  const tenantUuid = typeof tenantId.value === 'object' ? tenantId.value.id : tenantId.value || ''
  const idsToDelete = selectedItems.value.filter(item => item && !item.is_default).map(item => item.id)
  await Promise.all(
    idsToDelete.map(id => useFetch(`/api/crm/sales_stage/${id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })),
  )
  selectedItems.value = []
  await refreshStages()
}

async function fetchSalesStages() {
  if (!tenantId.value)
    return

  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('crm_sales_stage')
      .select('*')
      .eq('tenant_id', tenantId.value)
      .order('sequence_order', { ascending: true })

    if (error) {
      console.error('Error fetching sales stages:', error)
      toast({
        title: 'Error',
        description: 'Failed to load sales stages',
        variant: 'destructive',
      })
      salesStages.value = []
    }
    else {
      salesStages.value = data || []
    }
  }
  finally {
    isLoading.value = false
  }
}

whenTenantReady(() => {
  refreshStages()
})

watch(tenantId, (val) => {
  if (val)
    refreshStages()
  showDialog.value = false
  formModel.value = { name: '', order: 1, color: '#cccccc', description: '', is_default: false }
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Estágios de Vendas
        </h1>
        <p class="text-muted-foreground">
          Gerencie todos os estágios de vendas do seu funil CRM.
        </p>
      </div>
      <Button class="bg-primary hover:bg-primary/90" @click="handleCreate">
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        Novo Estágio
      </Button>
    </div>
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
        :data="filteredStages"
        :columns="salesStageColumns"
        :meta="{ onEdit: handleEdit, onDelete: handleDeleteClick }"
        @selection-change="updateSelectedItems"
      >
        <template #toolbar="{ table }">
          <DataTableToolbar :table="table" filter-column="name" placeholder="Filtrar estágios...">
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
    </template>
    <!-- Dialog de criar/editar -->
    <Dialog :open="showDialog" @update:open="showDialog = $event">
      <DialogContent class="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{{ formMode === 'edit' ? 'Editar Estágio' : 'Novo Estágio' }}</DialogTitle>
        </DialogHeader>
        <SalesStageForm
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
          Excluir estágio
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir o estágio "{{ stageToDelete?.name }}"? Esta ação não pode ser desfeita.
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
    <div
      v-if="showMultiDeleteDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Excluir vários estágios
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir {{ selectedItems.length }} estágios? Esta ação não pode ser desfeita.
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
  </div>
</template>
