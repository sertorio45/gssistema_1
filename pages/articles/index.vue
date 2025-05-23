<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { columns } from '~/components/articles/columns'
import DataTable from '~/components/articles/DataTable.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import { useArticles } from '~/composables/useArticles'
import { useAuth } from '~/composables/useAuth'
import { useClientArticles } from '~/composables/useClientArticles'
import { useTenant } from '~/composables/useTenant'

const { tenantId } = useTenant()
const { currentRole } = useAuth()

const showDeleteDialog = ref(false)
const articleToDelete = ref<any | null>(null)
const selectedItems = ref([])
const showMultiDeleteDialog = ref(false)

const { articles, fetchArticles, loading } = useArticles()
const { articles: clientArticles, fetchClientArticles } = useClientArticles()

// Para admin/funcionário: só busca artigos se houver tenant selecionado
watch(tenantId, () => {
  if (currentRole.value !== 'cliente') {
    if (tenantId.value) {
      fetchArticles()
    }
  }
}, { immediate: true })

onMounted(() => {
  if (currentRole.value === 'cliente') {
    fetchClientArticles()
  }
  window.addEventListener('tenant-changed', () => fetchArticles())
})
onUnmounted(() => {
  window.removeEventListener('tenant-changed', () => fetchArticles())
})

function handleDeleteClick(article: any) {
  articleToDelete.value = article
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!articleToDelete.value)
    return
  showDeleteDialog.value = false
  articleToDelete.value = null
  if (currentRole.value === 'cliente') {
    await fetchClientArticles()
  }
  else {
    await fetchArticles()
  }
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  selectedItems.value = []
  if (currentRole.value === 'cliente') {
    await fetchClientArticles()
  }
  else {
    await fetchArticles()
  }
}

function updateSelectedItems(items: any) {
  selectedItems.value = items
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Meus Artigos
        </h1>
        <p class="text-muted-foreground">
          Gerencie os artigos do seu site
        </p>
      </div>
      <Button
        class="bg-primary hover:bg-primary/90"
        @click="() => navigateTo('/articles/new')"
      >
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        Novo Artigo
      </Button>
    </div>

    <div v-if="currentRole !== 'cliente' && loading" class="space-y-4">
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
        v-if="currentRole === 'cliente'"
        :data="clientArticles"
        :columns="columns"
        @delete="handleDeleteClick"
        @selectionChange="updateSelectedItems"
      />
      <DataTable
        v-else-if="tenantId"
        :data="articles || []"
        :columns="columns"
        @delete="handleDeleteClick"
        @selectionChange="updateSelectedItems"
      />
      <div v-else-if="!tenantId && (currentRole === 'admin' || currentRole === 'funcionário')" class="p-6 text-center text-muted-foreground">
        Selecione um tenant para visualizar os artigos.
      </div>
    </template>

    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="showMultiDeleteConfirmation"
    />

    <!-- Diálogos de exclusão ... -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Excluir Artigo
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir o artigo "{{ articleToDelete?.title }}"? Esta ação não pode ser desfeita.
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

    <!-- Diálogo de confirmação de exclusão múltipla -->
    <div v-if="showMultiDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Excluir Múltiplos Artigos
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir {{ selectedItems.length }} artigos? Esta ação não pode ser desfeita.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showMultiDeleteDialog = false">
            Cancelar
          </Button>
          <Button variant="destructive" @click="handleMultiDeleteConfirm">
            Excluir Todos
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
</style>
