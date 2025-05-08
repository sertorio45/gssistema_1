<script setup lang="ts">
import { useToast } from '~/components/ui/toast'
import { useArticles } from '~/composables/useArticles'

const { articles, fetchArticles, deleteArticle, loading, error } = useArticles()
const { toast } = useToast()

const showDeleteDialog = ref(false)
const articleToDelete = ref<any | null>(null)

function editArticle(article: any) {
  navigateTo(`/articles/edit/${article.id}`)
}

function handleDeleteClick(article: any) {
  articleToDelete.value = article
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!articleToDelete.value) return
  const success = await deleteArticle(articleToDelete.value.id)
  if (success) {
    toast({ title: 'Sucesso', description: 'Artigo excluído com sucesso!' })
    showDeleteDialog.value = false
    articleToDelete.value = null
    await fetchArticles()
  } else {
    toast({ title: 'Erro', description: error.value || 'Erro ao excluir artigo', variant: 'destructive' })
  }
}

onMounted(() => {
  fetchArticles()
})
</script>

<template>
  <!-- Topo abaixo de breadcrumb -->
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Meus Artigos
      </h1>
      <Button 
        class="bg-primary hover:bg-primary/90"
        @click="() => navigateTo('/articles/new')"
      >
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        Novo Artigo
      </Button>
    </div>

    <!-- Tabela de artigos -->
    <Card class="border shadow-sm">
      <CardContent class="p-0">
        <Table>
          <TableHeader class="bg-muted/50">
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="loading">
              <TableRow v-for="i in 5" :key="i">
                <TableCell><Skeleton class="h-5 w-[250px]" /></TableCell>
                <TableCell><Skeleton class="h-5 w-[180px]" /></TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-2">
                    <Skeleton class="h-8 w-8 rounded" />
                    <Skeleton class="h-8 w-8 rounded" />
                  </div>
                </TableCell>
              </TableRow>
            </template>
            <TableRow v-else-if="!articles || articles.length === 0">
              <TableCell colspan="3" class="h-24 text-center">
                <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Icon name="lucide:file-text" class="h-8 w-8" />
                  <p>Nenhum artigo encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
            <template v-else>
              <TableRow v-for="article in articles" :key="article.id" class="transition-colors hover:bg-muted/30">
                <TableCell class="text-muted-foreground">
                  {{ article.title }}
                </TableCell>
                <TableCell>
                  <div
                    class="inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="{
                      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300': article.status === 'published',
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300': article.status === 'draft',
                    }"
                  >
                    <Icon
                      :name="article.status === 'published' ? 'lucide:check-circle' : 'lucide:clock'"
                      class="mr-1 h-3.5 w-3.5"
                    />
                    {{ article.status === 'published' ? 'Publicado' : 'Rascunho' }}
                  </div>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-muted-foreground hover:text-primary"
                      @click="editArticle(article)"
                    >
                      <Icon name="lucide:pencil" class="h-4 w-4" />
                      <span class="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-muted-foreground hover:text-destructive"
                      @click="handleDeleteClick(article)"
                    >
                      <Icon name="lucide:trash-2" class="h-4 w-4" />
                      <span class="sr-only">Excluir</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Diálogo de confirmação de exclusão -->
    <div v-if="showDeleteDialog" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-lg w-full max-w-md">
        <h2 class="text-lg font-bold mb-2">Excluir Artigo</h2>
        <p class="mb-4">Tem certeza que deseja excluir o artigo "{{ articleToDelete?.title }}"? Esta ação não pode ser desfeita.</p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showDeleteDialog = false">Cancelar</Button>
          <Button variant="destructive" @click="handleDeleteConfirm">Excluir</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>

</style>