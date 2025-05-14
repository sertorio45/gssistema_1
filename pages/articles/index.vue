<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { columns } from '~/components/articles/columns'
import DataTable from '~/components/articles/DataTable.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import { useToast } from '~/components/ui/toast'
import { useArticles } from '~/composables/useArticles'

const { articles, fetchArticles, deleteArticle, loading, error } = useArticles()
const { toast } = useToast()

const showDeleteDialog = ref(false)
const articleToDelete = ref<any | null>(null)
const selectedItems = ref([])
const showMultiDeleteDialog = ref(false)

function handleDeleteClick(article: any) {
  articleToDelete.value = article
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!articleToDelete.value)
    return
  const success = await deleteArticle(articleToDelete.value.id)
  if (success) {
    toast({ title: 'Sucesso', description: 'Artigo excluído com sucesso!' })
    showDeleteDialog.value = false
    articleToDelete.value = null
    await fetchArticles()
  }
  else {
    toast({ title: 'Erro', description: error.value || 'Erro ao excluir artigo', variant: 'destructive' })
  }
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  const itemIds = selectedItems.value.map((index: number) => articles.value[index].id)
  let allSuccess = true

  for (const id of itemIds) {
    const success = await deleteArticle(id)
    if (!success) {
      allSuccess = false
    }
  }

  if (allSuccess) {
    toast({ title: 'Sucesso', description: `${itemIds.length} artigos excluídos com sucesso!` })
  } else {
    toast({
      title: 'Aviso',
      description: 'Alguns artigos não puderam ser excluídos.',
      variant: 'destructive',
    })
  }

  showMultiDeleteDialog.value = false
  selectedItems.value = []
  await fetchArticles()
}

function updateSelectedItems(items: any) {
  selectedItems.value = items
}

onMounted(() => {
  fetchArticles()
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

    <!-- Tabela de artigos com o novo DataTable -->
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
    <DataTable
      v-else
      :data="articles || []"
      :columns="columns"
      @delete="handleDeleteClick"
      @selectionChange="updateSelectedItems"
    />

    <!-- Barra de ações para múltiplos itens -->
    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="showMultiDeleteConfirmation"
    />

    <!-- Diálogo de confirmação de exclusão individual -->
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
