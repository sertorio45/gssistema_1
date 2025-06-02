<script setup lang="ts">
import type { Company } from '~/types/crm'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import { columns } from '~/components/companies/columns'
import DataTableRowActions from '~/components/ui/table/DataTableRowActions.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import DataTableViewOptions from '@/components/tasks/components/DataTableViewOptions.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import { useSupabaseClient } from '#imports'
import { useTenant } from '~/composables/useTenant'

definePageMeta({
  title: 'Companies',
  description: 'Manage your client companies and prospects',
})

const supabase = useSupabaseClient()
const { tenantId } = useTenant()

const companiesData = ref<Company[]>([])

const selectedItems = ref<number[]>([])
const showMultiDeleteDialog = ref(false)

async function fetchCompanies() {
  if (!tenantId.value) return
  const { data, error } = await supabase
    .from('crm_company')
    .select('*')
    .eq('tenant_id', tenantId.value)
    .order('created_at', { ascending: false })
  if (!error && data) companiesData.value = data
}

watch(tenantId, fetchCompanies, { immediate: true })

function updateSelectedItems(items: number[]) {
  selectedItems.value = items
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  const toDelete = selectedItems.value.map(idx => companiesData.value[idx]?.id)
  companiesData.value = companiesData.value.filter(c => !toDelete.includes(c.id))
  selectedItems.value = []
}

function handleEdit(_company: Company) {
  // Implementar navegação ou modal de edição
}

function handleDelete(company: Company) {
  // Exemplo: remover do array local (mock)
  const index = companiesData.value.findIndex(c => c.id === company.id)
  if (index > -1) {
    companiesData.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Companies</h1>
        <p class="text-muted-foreground">Manage your client companies and prospects</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button>
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          New Company
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Companies</CardTitle>
          <Icon name="lucide:building" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ companiesData.length }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Contacts</CardTitle>
          <Icon name="lucide:users" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ companiesData.reduce((sum, company) => sum + company.contactsCount, 0) }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Leads</CardTitle>
          <Icon name="lucide:target" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ companiesData.reduce((sum, company) => sum + company.leadsCount, 0) }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Value</CardTitle>
          <Icon name="lucide:dollar-sign" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 0,
            }).format(companiesData.reduce((sum, company) => sum + company.totalValue, 0)) }}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- DataTable -->
    <DataTable
      :data="companiesData"
      :columns="columns"
      @delete="handleDelete"
      @selection-change="updateSelectedItems"
    >
      <template #toolbar="{ table }">
        <DataTableToolbar :table="table" placeholder="Search companies..." column-key="name">
          <template #options>
            <DataTableViewOptions :table="table" />
          </template>
        </DataTableToolbar>
      </template>
      <template #pagination="{ table }">
        <DataTablePagination :table="table" />
      </template>
      <template #actions="{ row }">
        <DataTableRowActions :row="row" :onEdit="handleEdit" :onDelete="handleDelete" />
      </template>
    </DataTable>

    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="showMultiDeleteConfirmation"
    />

    <!-- Multi Delete Dialog -->
    <div v-if="showMultiDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Delete Multiple Companies
        </h2>
        <p class="mb-4">
          Are you sure you want to delete {{ selectedItems.length }} companies? This action cannot be undone.
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
  </div>
</template> 