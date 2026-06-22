<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { funnelColumns } from '~/components/crm/config/funnelColumns'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableViewOptions from '~/components/ui/table/DataTableViewOptions.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { isTenantScopedRole } from '~/constants/roles'
import { useTenantPage } from '~/composables/useTenantPage'
import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'

definePageMeta({
  middleware: ['auth'],
})

const { tenantId, currentRole, whenTenantReady } = useTenantPage()
const selectedItems = ref<any[]>([])
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const funnelToDelete = ref<any | null>(null)
const showMultiDeleteDialog = ref(false)
const showActiveOnly = ref(true) // Novo estado para filtrar apenas ativos
const router = useRouter()

const {
  data: funnelsRaw,
  pending,
  refresh: refreshFunnels,
} = await useAsyncData('crm-funnel', () => $fetch('/api/crm/funnel', { query: { tenant_id: tenantId.value } }), { watch: [tenantId] })

const funnelsArray = computed(() => Array.isArray(funnelsRaw.value) ? funnelsRaw.value : [])
const { filteredData: funnelsByTenant } = useTenantRoleFilter<any>(funnelsArray, 'tenant_id')

const filteredFunnels = computed(() => {
  if (!tenantId.value) {
    return []
  }

  const all = funnelsArray.value
  const defaults = all.filter((item: any) => item.is_default === true)
  let result = []

  if (isTenantScopedRole(currentRole.value)) {
    result = all.filter((item: any) => item.is_default === true || item.tenant_id === tenantId.value)
  }
  else {
    const ids = new Set(defaults.map((i: any) => i.id))
    result = [...defaults, ...funnelsByTenant.value.filter((i: any) => !ids.has(i.id))]
  }

  // Filtrar apenas funis que possuem 'name'
  result = result.filter((item: any) => typeof item.name === 'string')

  // Aplicar filtro de is_active se showActiveOnly for true
  if (showActiveOnly.value) {
    result = result.filter((item: any) => item.is_active === true)
  }

  return result
})

function updateSelectedItems(indices: number[]) {
  const items = indices.map(idx => filteredFunnels.value[idx]).filter(Boolean)
  selectedItems.value = items
}

function handleEdit(funil: any) {
  if (!funil || typeof funil !== 'object') {
    return
  }

  if (funil.is_default) {
    return
  }

  router.push(`/crm/config/funnel/${funil.id}/edit`)
}

function handleDeleteClick(funil: any) {
  funnelToDelete.value = funil
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!funnelToDelete.value) {
    return
  }

  showDeleteDialog.value = false
  if (!tenantId.value || !funnelToDelete.value.id) {
    return
  }

  const tenantUuid = typeof tenantId.value === 'object' ? tenantId.value.id : tenantId.value
  await useFetch(`/api/crm/funnel/${funnelToDelete.value.id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })
  funnelToDelete.value = null
  await refreshFunnels()
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
  await Promise.all(idsToDelete.map(id => useFetch(`/api/crm/funnel/${id}?tenant_id=${tenantUuid}`, { method: 'DELETE' })))
  selectedItems.value = []
  await refreshFunnels()
}

whenTenantReady(() => {
  refreshFunnels()
})

watch(tenantId, (val) => {
  if (val)
    refreshFunnels()
  showDialog.value = false
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
          Gerencie todos os funis do seu CRM.
        </p>
      </div>
      <NuxtLink to="/crm/config/funnel/new">
        <Button class="bg-primary hover:bg-primary/90">
          <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
          Novo Funil
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
        :data="filteredFunnels"
        :columns="funnelColumns"
        :meta="{ onEdit: handleEdit, onDelete: handleDeleteClick }"
        @selection-change="updateSelectedItems"
      >
        <template #toolbar="{ table }">
          <DataTableToolbar :table="table" filter-column="name" placeholder="Filtrar funis...">
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
  </div>
</template>
