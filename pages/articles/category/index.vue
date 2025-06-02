<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { columns } from '~/components/articles/category/columns'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableRowActions from '~/components/ui/table/DataTableRowActions.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'
import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'

const { tenantId } = useTenant()
const { currentRole } = useAuth()

const showDeleteDialog = ref(false)
const categoryToDelete = ref<any | null>(null)
const selectedItems = ref([])
const showMultiDeleteDialog = ref(false)

// Debug: log tenantId and categoriesRaw
watch(tenantId, (val) => {
  console.warn('[DEBUG] tenantId:', val)
}, { immediate: true })

const { data: categoriesRaw, pending: loading, refresh: refreshCategories } = useFetch<any[]>('/api/articles/category')

const { filteredData: categories } = useTenantRoleFilter<any>(categoriesRaw as any, 'tenant_id') // Filter categories by tenantId

watch(categoriesRaw, (val) => {
  console.warn('[DEBUG] categoriesRaw:', val)
}, { immediate: true })

function handleDeleteClick(category: any) {
  categoryToDelete.value = category
  showDeleteDialog.value = true
}

function handleEditClick(category: any) {
  navigateTo(`/articles/category/edit/${category.id}`)
}

async function handleDeleteConfirm() {
  if (!categoryToDelete.value)
    return
  showDeleteDialog.value = false
  const tenantId = useTenant().tenantId
  await $fetch(`/api/articles/category/${categoryToDelete.value.id}?tenant_id=${tenantId}`, { method: 'DELETE' as any })
  categoryToDelete.value = null
  await refreshCategories()
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  const tenantId = useTenant().tenantId
  for (const idx of selectedItems.value) {
    const category = categories.value[idx]
    if (category) {
      await $fetch(`/api/articles/category/${category.id}?tenant_id=${tenantId}`, { method: 'DELETE' as any })
    }
  }
  selectedItems.value = []
  await refreshCategories()
}

function updateSelectedItems(items: any) {
  selectedItems.value = items
}

watch(tenantId, () => {
  refreshCategories()
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Categories
        </h1>
        <p class="text-muted-foreground">
          Manage your article categories
        </p>
      </div>
      <Button
        class="bg-primary hover:bg-primary/90"
        @click="() => navigateTo('/articles/category/new')"
      >
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        New Category
      </Button>
    </div>

    <div v-if="loading" class="space-y-4">
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
        :data="categories"
        :columns="columns"
        @delete="handleDeleteClick"
        @selection-change="updateSelectedItems"
        :meta="{ onEdit: handleEditClick, onDelete: handleDeleteClick }"
      >
        <template #toolbar="{ table }">
          <DataTableToolbar :table="table" placeholder="Filter categories..." />
        </template>
        <template #pagination="{ table }">
          <DataTablePagination :table="table" />
        </template>
        <template #actions="{ row }">
          <DataTableRowActions :row="row" :onEdit="handleEditClick" :onDelete="handleDeleteClick" />
        </template>
      </DataTable>
      <div v-if="categories.length === 0 && tenantId && (currentRole === 'admin' || currentRole === 'funcionario')" class="p-6 text-center text-muted-foreground">
        No categories found for this tenant.
      </div>
      <div v-else-if="!tenantId && (currentRole === 'admin' || currentRole === 'funcionario')" class="p-6 text-center text-muted-foreground">
        Select a tenant to view categories.
      </div>
      <div v-else-if="categories.length === 0" class="p-6 text-center text-muted-foreground">
        No categories found.
      </div>
    </template>

    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="showMultiDeleteConfirmation"
    />

    <!-- Delete Dialog -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Delete Category
        </h2>
        <p class="mb-4">
          Are you sure you want to delete the category "{{ categoryToDelete?.title }}"? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showDeleteDialog = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="handleDeleteConfirm">
            Delete
          </Button>
        </div>
      </div>
    </div>

    <!-- Multi Delete Dialog -->
    <div v-if="showMultiDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Delete Multiple Categories
        </h2>
        <p class="mb-4">
          Are you sure you want to delete {{ selectedItems.length }} categories? This action cannot be undone.
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

<style>
</style>
