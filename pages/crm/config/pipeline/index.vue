<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { pipelineColumns } from '~/components/crm/config/pipelineColumns'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableViewOptions from '~/components/tasks/components/DataTableViewOptions.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'
import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'

const { tenantId, setTenantFromJWT, tenants, setCurrentTenantById, listTenants } = useTenant()
const { currentRole } = useAuth()
const selectedItems = ref<any[]>([])
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const pipelineToDelete = ref<any | null>(null)
const showMultiDeleteDialog = ref(false)
const showActiveOnly = ref(true) // Novo estado para filtrar apenas ativos
const router = useRouter()

const {
  data: pipelinesRaw,
  pending,
  refresh: refreshPipelines,
} = await useAsyncData('crm-pipeline', () => $fetch('/api/crm/pipeline', { query: { tenant_id: tenantId.value } }), { watch: [tenantId] })

const pipelinesArray = computed(() => Array.isArray(pipelinesRaw.value) ? pipelinesRaw.value : [])
const { filteredData: pipelinesByTenant } = useTenantRoleFilter<any>(pipelinesArray, 'tenant_id')

const filteredPipelines = computed(() => {
  if (!tenantId.value) {
    return []
  }

  const all = pipelinesArray.value
  const defaults = all.filter((item: any) => item.is_default === true)
  let result = []

  if (currentRole.value === 'cliente') {
    result = all.filter((item: any) => item.is_default === true || item.tenant_id === tenantId.value)
  }
  else {
    const ids = new Set(defaults.map((i: any) => i.id))
    result = [...defaults, ...pipelinesByTenant.value.filter((i: any) => !ids.has(i.id))]
  }

  // Filtrar apenas pipelines que possuem 'name'
  result = result.filter((item: any) => typeof item.name === 'string')

  // Aplicar filtro de is_active se showActiveOnly for true
  if (showActiveOnly.value) {
    result = result.filter((item: any) => item.is_active === true)
  }

  return result
})

function updateSelectedItems(indices: number[]) {
  const items = indices.map(idx => filteredPipelines.value[idx]).filter(Boolean)
  selectedItems.value = items
}

function handleEdit(pipeline: any) {
  if (!pipeline || typeof pipeline !== 'object') {
    return
  }

  if (pipeline.is_default) {
    return
  }

  router.push(`/crm/config/pipeline/${pipeline.id}/edit`)
}

function handleDeleteClick(pipeline: any) {
  pipelineToDelete.value = pipeline
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!pipelineToDelete.value) {
    return
  }

  showDeleteDialog.value = false
  if (!tenantId.value || !pipelineToDelete.value.id) {
    return
  }

  const tenantUuid = typeof tenantId.value === 'object' ? tenantId.value.id : tenantId.value
  await useFetch(`/api/crm/pipeline/${pipelineToDelete.value.id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })
  pipelineToDelete.value = null
  await refreshPipelines()
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  if (!tenantId.value) {
    return
  }

  const tenantUuid = typeof tenantId.value === 'object' ? tenantId.value.id : tenantId.value
  const idsToDelete = (selectedItems.value as any[]).filter(item => item && !item.is_default && item.id).map(item => item.id)
  await Promise.all(idsToDelete.map(id => useFetch(`/api/crm/pipeline/${id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })))
  selectedItems.value = []
  await refreshPipelines()
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
}, { immediate: true })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Pipelines
        </h1>
        <p class="text-muted-foreground">
          Gerencie todos os pipelines do seu CRM.
        </p>
      </div>
      <NuxtLink to="/crm/config/pipeline/new">
        <Button class="bg-primary hover:bg-primary/90">
          <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
          Novo Pipeline
        </Button>
      </NuxtLink>
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
      <DataTable
        :data="filteredPipelines"
        :columns="pipelineColumns"
        :meta="{ onEdit: handleEdit, onDelete: handleDeleteClick }"
        @selection-change="updateSelectedItems"
      >
        <template #toolbar="{ table }">
          <DataTableToolbar :table="table" filter-column="name" placeholder="Filtrar pipelines...">
            <template #options>
              <DataTableViewOptions :table="table" />
            </template>
          </DataTableToolbar>
          <div class="flex items-center space-x-2">
            <div class="flex items-center space-x-2">
              <input
                id="active-only"
                v-model="showActiveOnly"
                type="checkbox"
                class="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
              >
              <label for="active-only" class="text-sm text-muted-foreground font-medium">
                Mostrar apenas ativos
              </label>
            </div>
          </div>
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
    <!-- Dialog de deletar -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Excluir pipeline
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir o pipeline "{{ pipelineToDelete?.name }}"? Esta ação não pode ser desfeita.
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
          Excluir vários pipelines
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir {{ selectedItems.length }} pipelines? Esta ação não pode ser desfeita.
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
