<script setup lang="ts">
import type { Category, CategoryForm, CategoryUpdateForm } from '~/types/articles'
import { onMounted, ref } from 'vue'
import { columns } from '~/components/articles/category/columns'
import DataTable from '~/components/articles/category/DataTable.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useToast } from '~/components/ui/toast'
import { useArticles } from '~/composables/useArticles'

const { categories, fetchCategories, deleteCategory, createCategory, updateCategory, loading, error } = useArticles()
const { toast } = useToast()

const showDeleteDialog = ref(false)
const categoryToDelete = ref<Category | null>(null)
const selectedItems = ref<number[]>([])
const showMultiDeleteDialog = ref(false)

// Modal de criação/edição
const showModal = ref(false)
const isEditing = ref(false)
const form = ref<CategoryForm | CategoryUpdateForm>({
  title: '',
  status: 'published',
})

function handleDeleteClick(category: Category) {
  categoryToDelete.value = category
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!categoryToDelete.value)
    return
  const success = await deleteCategory(categoryToDelete.value.id)
  if (success) {
    toast({ title: 'Sucesso', description: 'Categoria excluída com sucesso!' })
    showDeleteDialog.value = false
    categoryToDelete.value = null
    await fetchCategories()
  }
  else {
    toast({ title: 'Erro', description: error.value || 'Erro ao excluir categoria', variant: 'destructive' })
  }
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  const itemIds = selectedItems.value.map((index: number) => categories.value[index].id)
  let allSuccess = true

  for (const id of itemIds) {
    const success = await deleteCategory(id)
    if (!success) {
      allSuccess = false
    }
  }

  if (allSuccess) {
    toast({ title: 'Sucesso', description: `${itemIds.length} categorias excluídas com sucesso!` })
  }
  else {
    toast({
      title: 'Aviso',
      description: 'Algumas categorias não puderam ser excluídas.',
      variant: 'destructive',
    })
  }

  showMultiDeleteDialog.value = false
  selectedItems.value = []
  await fetchCategories()
}

function updateSelectedItems(items: number[]) {
  selectedItems.value = items
}

function handleCreateClick() {
  isEditing.value = false
  form.value = {
    title: '',
    status: 'published',
  }
  showModal.value = true
}

function handleEditClick(category: Category) {
  isEditing.value = true
  form.value = {
    id: category.id,
    title: category.title,
    status: category.status || 'published',
  } as CategoryUpdateForm
  showModal.value = true
}

async function handleSaveCategory() {
  if (!form.value.title?.trim()) {
    toast({ title: 'Erro', description: 'Digite o nome da categoria', variant: 'destructive' })
    return
  }

  let success = false
  if (isEditing.value && 'id' in form.value) {
    success = await updateCategory(form.value.id, {
      name: form.value.title.trim(),
      slug: generateSlug(form.value.title.trim()),
      is_active: form.value.status === 'published',
    })
    if (success) {
      toast({ title: 'Sucesso', description: 'Categoria atualizada com sucesso!' })
    }
  }
  else {
    const newCategory: CategoryForm = {
      name: form.value.title.trim(),
      slug: generateSlug(form.value.title.trim()),
      is_active: form.value.status === 'published',
    }
    success = await createCategory(newCategory)
    if (success) {
      toast({ title: 'Sucesso', description: 'Categoria criada com sucesso!' })
    }
  }

  if (success) {
    showModal.value = false
    await fetchCategories()
  }
  else {
    toast({
      title: 'Erro',
      description: error.value || `Erro ao ${isEditing.value ? 'atualizar' : 'criar'} categoria`,
      variant: 'destructive',
    })
  }
}

// Adicionar função de geração de slug
function generateSlug(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Categorias
        </h1>
        <p class="text-muted-foreground">
          Gerencie as categorias de artigos do seu site
        </p>
      </div>
      <Button
        class="bg-primary hover:bg-primary/90"
        @click="handleCreateClick"
      >
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        Nova Categoria
      </Button>
    </div>

    <!-- Tabela de categorias com o novo DataTable -->
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
      :data="categories || []"
      :columns="columns"
      @delete="handleDeleteClick"
      @edit="handleEditClick"
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
          Excluir Categoria
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir a categoria "{{ categoryToDelete?.title }}"? Esta ação não pode ser desfeita.
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
          Excluir Múltiplas Categorias
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir {{ selectedItems.length }} categorias? Esta ação não pode ser desfeita.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showMultiDeleteDialog = false">
            Cancelar
          </Button>
          <Button variant="destructive" @click="handleMultiDeleteConfirm">
            Excluir Todas
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal para criar/editar categoria -->
    <Dialog :open="showModal" @update:open="showModal = $event">
      <DialogContent class="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Editar Categoria' : 'Nova Categoria' }}</DialogTitle>
          <DialogDescription>
            {{ isEditing ? 'Edite os dados da categoria' : 'Preencha os dados da categoria' }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="handleSaveCategory">
          <div class="space-y-6 py-4">
            <div class="space-y-2">
              <Label for="title">Nome</Label>
              <Input id="title" v-model="form.title" placeholder="Nome da categoria" :disabled="loading" required />
            </div>
            <div class="space-y-2">
              <Label for="status">Status</Label>
              <Select v-model="form.status" :disabled="loading">
                <SelectTrigger id="status">
                  <SelectValue :placeholder="form.status === 'published' ? 'Publicado' : 'Rascunho'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showModal = false">Cancelar</Button>
            <Button type="submit" class="bg-primary" :disabled="loading">
              <Icon name="lucide:save" class="mr-2 h-4 w-4" /> Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style>
</style>