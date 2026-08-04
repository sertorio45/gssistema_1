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
import { deleteWithConfirm } from '~/composables/useConfirmDelete'
import { useTenantPage } from '~/composables/useTenantPage'
import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'

definePageMeta({
  middleware: ['auth'],
})

const { tenantId, currentRole, whenTenantReady } = useTenantPage()
const selectedItems = ref<any[]>([])
const showDialog = ref(false)
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

async function handleDelete(funil: any) {
  if (!tenantId.value || !funil?.id || funil.is_default)
    return

  const tenantUuid = typeof tenantId.value === 'object' ? tenantId.value.id : tenantId.value

  const deleted = await deleteWithConfirm(
    () => $fetch(`/api/crm/funnel/${funil.id}?tenant_id=${tenantUuid}`, { method: 'DELETE' }),
    {
      title: 'Excluir funil?',
      description: `Tem certeza que deseja excluir "${funil.name}"? Esta ação não pode ser desfeita.`,
      successMessage: 'Funil excluído com sucesso.',
      errorMessage: 'Não foi possível excluir o funil.',
    },
  )

  if (deleted)
    await refreshFunnels()
}

async function handleMultiDelete() {
  if (!tenantId.value || !selectedItems.value.length)
    return

  const tenantUuid = typeof tenantId.value === 'object' ? tenantId.value.id : tenantId.value
  const toDelete = (selectedItems.value as any[]).filter(item => item && !item.is_default && item.id)
  const count = toDelete.length

  if (!count)
    return

  const deleted = await deleteWithConfirm(
    () => Promise.all(toDelete.map(item =>
      $fetch(`/api/crm/funnel/${item.id}?tenant_id=${tenantUuid}`, { method: 'DELETE' }),
    )),
    {
      title: 'Excluir vários funis?',
      description: `Tem certeza que deseja excluir ${count} funis? Esta ação não pode ser desfeita.`,
      successMessage: `${count} funil(is) excluído(s) com sucesso.`,
      errorMessage: 'Não foi possível excluir os funis.',
    },
  )

  if (deleted) {
    selectedItems.value = []
    await refreshFunnels()
  }
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
        :meta="{ onEdit: handleEdit, onDelete: handleDelete }"
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
        :on-delete="handleMultiDelete"
      />
    </template>
  </div>
</template>
