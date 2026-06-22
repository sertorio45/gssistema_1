<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { columns } from '~/components/articles/columns'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableRowActions from '~/components/ui/table/DataTableRowActions.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { isStaffRole } from '~/constants/roles'
import { useTenantPage } from '~/composables/useTenantPage'
import { useTenantRoleFilter } from '~/composables/useTenantRoleFilter'

definePageMeta({
  middleware: ['auth'],
})

const { tenantId, currentRole, whenTenantReady } = useTenantPage()
const isStaff = computed(() => isStaffRole(currentRole.value))

const showDeleteDialog = ref(false)
const articleToDelete = ref<any | null>(null)
const selectedItems = ref([])
const showMultiDeleteDialog = ref(false)

const { data: articlesRaw, pending: loading, refresh: refreshArticles } = useFetch<any[]>('/api/articles')
const { filteredData: articles } = useTenantRoleFilter<any>(articlesRaw as any, 'tenant_id')

function handleDeleteClick(article: any) {
  articleToDelete.value = article
  showDeleteDialog.value = true
}

function handleEditClick(article: any) {
  navigateTo(`/articles/edit/${article.id}`)
}

async function handleDeleteConfirm() {
  if (!articleToDelete.value)
    return
  showDeleteDialog.value = false
  await $fetch(`/api/articles/${articleToDelete.value.id}`, { method: 'DELETE' as any })
  articleToDelete.value = null
  await refreshArticles()
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  for (const idx of selectedItems.value) {
    const article = articles.value[idx]
    if (article) {
      await $fetch(`/api/articles/${article.id}`, { method: 'DELETE' as any })
    }
  }
  selectedItems.value = []
  await refreshArticles()
}

function updateSelectedItems(items: any) {
  selectedItems.value = items
}

whenTenantReady(() => {
  refreshArticles()
})

watch(tenantId, () => {
  refreshArticles()
})
</script>

<template>
  <div class="">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Articles
        </h1>
        <p class="text-muted-foreground">
          Manage your site articles
        </p>
      </div>
      <Button class="bg-primary hover:bg-primary/90" @click="() => navigateTo('/articles/new')">
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        New Article
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
        :data="articles"
        :columns="columns"
        :meta="{ onEdit: handleEditClick, onDelete: handleDeleteClick }"
        @delete="handleDeleteClick"
        @selection-change="updateSelectedItems"
      >
        <template #toolbar="{ table }">
          <DataTableToolbar :table="table" placeholder="Filter articles..." />
        </template>
        <template #pagination="{ table }">
          <DataTablePagination :table="table" />
        </template>
        <template #actions="{ row }">
          <DataTableRowActions :row="row" :on-edit="handleEditClick" :on-delete="handleDeleteClick" />
        </template>
      </DataTable>
      <div
        v-if="articles.length === 0 && tenantId && isStaff"
        class="p-6 text-center text-muted-foreground"
      >
        No articles found for this tenant.
      </div>
      <div
        v-else-if="!tenantId && isStaff"
        class="p-6 text-center text-muted-foreground"
      >
        Select a tenant to view articles.
      </div>
      <div v-else-if="articles.length === 0" class="p-6 text-center text-muted-foreground">
        No articles found.
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
          Delete Article
        </h2>
        <p class="mb-4">
          Are you sure you want to delete the article "{{ articleToDelete?.title }}"? This action cannot be undone.
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
    <div
      v-if="showMultiDeleteDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Delete Multiple Articles
        </h2>
        <p class="mb-4">
          Are you sure you want to delete {{ selectedItems.length }} articles? This action cannot be undone.
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

<style></style>
