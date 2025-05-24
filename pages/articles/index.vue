<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { columns } from '~/components/articles/columns'
import DataTable from '~/components/articles/DataTable.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'

const { tenantId, tenants, setCurrentTenantById, listTenants, setTenantFromJWT } = useTenant()
const { currentRole } = useAuth()

const showDeleteDialog = ref(false)
const articleToDelete = ref<any | null>(null)
const selectedItems = ref([])
const showMultiDeleteDialog = ref(false)

// Debug: logar tenantId e articlesRaw
watch(tenantId, (val) => {
  console.warn('[DEBUG] tenantId do cliente:', val)
}, { immediate: true })

const { data: articlesRaw, pending: loading, refresh: refreshArticles } = useFetch('/api/articles')

watch(articlesRaw, (val) => {
  console.warn('[DEBUG] articlesRaw:', val)
}, { immediate: true })

const articles = computed(() => {
  if (!articlesRaw.value) {
    return []
  }
  if (Array.isArray(articlesRaw.value)) {
    // Cliente: filtra pelo tenantId do JWT
    if (currentRole.value === 'cliente' && tenantId.value) {
      return articlesRaw.value.filter((a: any) => a.tenant_id === tenantId.value)
    }
    // Admin/funcionário: filtra pelo tenant selecionado
    if ((currentRole.value === 'admin' || currentRole.value === 'funcionario') && tenantId.value) {
      return articlesRaw.value.filter((a: any) => a.tenant_id === tenantId.value)
    }
    return []
  }
  // Se vier erro da API (status/message), retorna array vazio
  if (typeof articlesRaw.value === 'object' && 'status' in articlesRaw.value) {
    return []
  }
  return []
})

// Para cliente, filtrar no backend (API já faz isso)

function handleDeleteClick(article: any) {
  articleToDelete.value = article
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!articleToDelete.value)
    return
  showDeleteDialog.value = false
  await $fetch(`/api/articles/${articleToDelete.value.id}`, { method: 'DELETE' })
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
      await $fetch(`/api/articles/${article.id}`, { method: 'DELETE' })
    }
  }
  selectedItems.value = []
  await refreshArticles()
}

function updateSelectedItems(items: any) {
  selectedItems.value = items
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
    refreshArticles()
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
    refreshArticles()
  }
})

watch(tenantId, () => {
  refreshArticles()
})
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
        v-if="articles.length > 0"
        :data="articles"
        :columns="columns"
        @delete="handleDeleteClick"
        @selectionChange="updateSelectedItems"
      />
      <div v-else-if="!tenantId && (currentRole === 'admin' || currentRole === 'funcionario')" class="p-6 text-center text-muted-foreground">
        Selecione um tenant para visualizar os artigos.
      </div>
      <div v-else class="p-6 text-center text-muted-foreground">
        Nenhum artigo encontrado.
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
