<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { sourceColumns } from '~/components/crm/config/columns'
import SourceForm from '~/components/crm/config/SourceForm.vue'
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
import DataTableViewOptions from '~/components/tasks/components/DataTableViewOptions.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'
import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'

const { tenantId, setTenantFromJWT, tenants, setCurrentTenantById, listTenants } = useTenant()
const { currentRole } = useAuth()
const selectedItems = ref<any[]>([])
const showDialog = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formModel = ref<any>({ name: '', description: '', is_default: false })
const showDeleteDialog = ref(false)
const sourceToDelete = ref<any | null>(null)
const showMultiDeleteDialog = ref(false)

// SSR-friendly fetch dos sources com tenant
const {
  data: sourcesRaw,
  pending,
  refresh: refreshSources,
} = await useAsyncData<any[]>(
  'crm-lead-sources',
  () =>
    $fetch('/api/crm/lead_source', {
      query: { tenant_id: tenantId.value },
    }),
  {
    watch: [tenantId],
    default: () => [],
    server: false,
  },
)

// Garante que sourcesRaw.value é sempre array
const sourcesArray = computed(() => (Array.isArray(sourcesRaw.value) ? sourcesRaw.value : []))
// Filtra por tenant (cliente/admin/funcionário)
const { filteredData: sourcesByTenant } = useTenantRoleFilter<any>(sourcesArray, 'tenant_id')

// Sempre inclui os is_default = true
const filteredSources = computed(() => {
  if (!tenantId.value)
    return []

  const all = sourcesArray.value
  const defaults = all.filter((item: any) => item.is_default === true)
  if (currentRole.value === 'cliente') {
    // Cliente: só vê os defaults e os do seu tenant
    return all.filter((item: any) => item.is_default === true || item.tenant_id === tenantId.value)
  }

  // Admin/fun: defaults + do tenant selecionado
  const ids = new Set(defaults.map((i: any) => i.id))
  return [...defaults, ...sourcesByTenant.value.filter((i: any) => !ids.has(i.id))]
})

function updateSelectedItems(indices: number[]) {
  // indices são índices do array filteredSources
  const items = indices.map(idx => filteredSources.value[idx]).filter(Boolean)
  selectedItems.value = items
}

function handleEdit(source: any) {
  if (!source || typeof source !== 'object')
    return

  if (source.is_default)
    return

  formMode.value = 'edit'
  formModel.value = {
    name: source.name ?? '',
    description: source.description ?? '',
    is_default: Boolean(source.is_default),
    id: source.id ?? undefined,
  }
  showDialog.value = true
}

function handleCreate() {
  formMode.value = 'create'
  formModel.value = { name: '', description: '', is_default: false }
  showDialog.value = true
}

async function handleFormSubmit(_data: any) {
  // Busca tenantId sempre atualizado e válido
  const currentTenantId = tenantId.value || (typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null)
  if (!currentTenantId) {
    console.warn('Select a tenant before creating a source.')
    return
  }
  const isEdit = formMode.value === 'edit'
  const url = isEdit ? `/api/crm/lead_source/${formModel.value.id}` : '/api/crm/lead_source'
  const method = isEdit ? 'PUT' : 'POST'
  const payload: any = {
    name: formModel.value.name?.trim() || '',
    description: formModel.value.description?.trim(),
    is_default: false,
    tenant_id: currentTenantId,
  }
  if (isEdit && formModel.value.id) {
    payload.id = String(formModel.value.id)
  }
  try {
    await useFetch(url, { method, body: payload })
    showDialog.value = false
    await refreshSources() // Sempre atualiza do backend
  }
  catch {
    // Trate erro se quiser
  }
}

function handleDeleteClick(source: any) {
  sourceToDelete.value = source
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!sourceToDelete.value)
    return

  showDeleteDialog.value = false
  await useFetch(`/api/crm/lead_source/${sourceToDelete.value.id}?tenant_id=${tenantId.value}`, { method: 'DELETE' })
  sourceToDelete.value = null
  await refreshSources()
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  const idsToDelete = selectedItems.value.filter(item => item && !item.is_default).map(item => item.id)
  await Promise.all(
    idsToDelete.map(id =>
      useFetch(`/api/crm/lead_source/${id}?tenant_id=${tenantId.value}`, { method: 'DELETE' }),
    ),
  )
  selectedItems.value = []
  await refreshSources()
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
    await refreshSources()
  }
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
    await refreshSources()
  }
})

watch(
  tenantId,
  (val) => {
    if (val) {
      refreshSources()
    }
    showDialog.value = false
    formModel.value = { name: '', description: '', is_default: false }
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Origens
        </h1>
        <p class="text-muted-foreground">
          Gerencie todas as origens de leads do seu CRM.
        </p>
      </div>
      <Button class="bg-primary hover:bg-primary/90" @click="handleCreate">
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        Nova Origem
      </Button>
    </div>
    <div v-if="pending" class="space-y-4">
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
      <!-- DataTable with Skeleton -->
      <div v-if="pending" class="space-y-4">
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
          :data="filteredSources"
          :columns="sourceColumns"
          :meta="{ onEdit: handleEdit, onDelete: handleDeleteClick }"
          @selection-change="updateSelectedItems"
        >
          <template #toolbar="{ table }">
<DataTableToolbar :table="table" filter-column="name" placeholder="Filtrar origens...">
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
    </template>
    <!-- Dialog de criar/editar -->
    <Dialog :open="showDialog" @update:open="showDialog = $event">
      <DialogContent class="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{{ formMode === 'edit' ? 'Editar Origem' : 'Nova Origem' }}</DialogTitle>
        </DialogHeader>
        <SourceForm v-model="formModel" :mode="formMode" :loading="false" @submit="handleFormSubmit" />
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
          Excluir origem
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir a origem "{{ sourceToDelete?.name }}"? Esta ação não pode ser desfeita.
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
          Excluir várias origens
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir {{ selectedItems.length }} origens? Esta ação não pode ser desfeita.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showMultiDeleteDialog = false">
            Cancelar
          </Button>
          <Button variant="destructive" @click="handleMultiDeleteConfirm">
            Excluir todas
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style></style>
