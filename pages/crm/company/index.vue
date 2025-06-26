<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useSupabaseClient } from '#imports'
import { columns } from '~/components/crm/company/columns'
import CompanyForm from '~/components/crm/company/CompanyForm.vue'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import DialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableRowActions from '~/components/ui/table/DataTableRowActions.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import DataTableViewOptions from '@/components/tasks/components/DataTableViewOptions.vue'
import type { Company } from '~/types/crm'
import { toast } from 'vue-sonner'
import Input from '~/components/ui/input/Input.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'

definePageMeta({
  title: 'Companies',
  description: 'Manage your client companies and prospects',
})

// Composables
const { tenantId, listTenants, setCurrentTenantById, setTenantFromJWT, tenants } = useTenant()
const { currentRole } = useAuth()

const companiesData = ref<Company[]>([])
const isLoading = ref(false)
const selectedItems = ref<Company[]>([])
const showMultiDeleteDialog = ref(false)
const isFormOpen = ref(false)
const editingCompany = ref<Company | undefined>(undefined)
const search = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)

const filteredCompanies = computed(() => {
  if (!search.value) return companiesData.value
  const term = search.value.toLowerCase()
  return companiesData.value.filter(company =>
    (company.name && company.name.toLowerCase().includes(term))
    || (company.website && company.website.toLowerCase().includes(term))
    || (company.industry && company.industry.toLowerCase().includes(term)),
  )
})

async function fetchCompanies() {
  if (!tenantId.value) {
    console.warn('No tenant ID available')
    return
  }

  isLoading.value = true
  try {
    const { data, total: totalCount } = await $fetch('/api/crm/company', {
      query: { tenant_id: tenantId.value, page: page.value, limit: limit.value, search: search.value }
    })
    companiesData.value = data || []
    total.value = totalCount || 0
  } catch (error) {
    console.error('Failed to fetch companies:', error)
    companiesData.value = []
    total.value = 0
  } finally {
    isLoading.value = false
  }
}

function handleCreate() {
  editingCompany.value = undefined
  isFormOpen.value = true
}

function handleEdit(company: Company) {
  editingCompany.value = company
  isFormOpen.value = true
}

function handleFormSuccess() {
  isFormOpen.value = false
  editingCompany.value = undefined
  fetchCompanies()
}

function updateSelectedItems(items: Company[]) {
  selectedItems.value = items
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchCompanies()
}

function handleLimitChange(newLimit: number) {
  limit.value = newLimit
  page.value = 1
  fetchCompanies()
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
    await fetchCompanies()
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
    await fetchCompanies()
  }
})

watch(tenantId, (val) => {
  if (val) {
    fetchCompanies()
  }
  isFormOpen.value = false
  editingCompany.value = undefined
}, { immediate: true })

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleDelete(company: Company) {
  if (!company || !tenantId.value) return
  try {
    await $fetch(`/api/crm/company/${company.id}?tenant_id=${tenantId.value}`, { method: 'DELETE' })
    toast.success('Company deleted successfully')
    fetchCompanies()
  } catch (error: any) {
    toast.error(error?.data?.message || 'Failed to delete company')
  }
}

function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  const toDelete = selectedItems.value.map(item => item.id)
  companiesData.value = companiesData.value.filter(c => !toDelete.includes(c.id))
  selectedItems.value = []
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
        <Button @click="handleCreate">
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
          <CardTitle class="text-sm font-medium">With Website</CardTitle>
          <Icon name="lucide:globe" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ companiesData.filter(company => company.website && company.website.trim()).length }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">By Industry</CardTitle>
          <Icon name="lucide:briefcase" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ new Set(companiesData.filter(c => c.industry).map(c => c.industry)).size }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Enterprise Size</CardTitle>
          <Icon name="lucide:trending-up" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ companiesData.filter(company => company.size === 'enterprise' || company.size === 'large').length }}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Search Input -->
    <div class="mb-4 flex items-center gap-2">
      <Input v-model="search" placeholder="Search by name, website or industry..." class="max-w-xs" />
    </div>

    <!-- DataTable with Skeleton -->
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
    <!-- DataTable -->
    <DataTable
      :data="filteredCompanies"
      :columns="columns"
      @delete="handleDelete"
      @selection-change="updateSelectedItems"
      :meta="{ onEdit: handleEdit, onDelete: handleDelete }"
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
    </template>

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

    <!-- Dialog de Criação/Edição -->
    <Dialog v-model:open="isFormOpen">
      <DialogContent class="w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto p-0 overflow-hidden">
        <DialogHeader class="border-b p-4 md:p-6">
          <DialogTitle class="text-xl">{{ editingCompany ? 'Edit Company' : 'Create Company' }}</DialogTitle>
          <DialogDescription class="text-sm text-muted-foreground mt-1">
            {{ editingCompany ? 'Edit the company details.' : 'Add a new company to your database.' }}
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-[calc(80vh-10rem)] overflow-y-auto p-4 md:p-6">
          <CompanyForm :initial-data="editingCompany" @success="handleFormSuccess" />
        </div>
        <div class="border-t p-4 flex justify-end gap-2">
          <Button variant="outline" @click="isFormOpen = false">Cancel</Button>
          <Button type="submit" form="company-form">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template> 