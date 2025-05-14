<script setup lang="ts">
import type { Tag, TagForm, TagUpdateForm } from '~/types/articles'
import { onMounted, ref } from 'vue'
import { columns } from '~/components/articles/tag/columns'
import DataTable from '~/components/articles/tag/DataTable.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useToast } from '~/components/ui/toast'
import { useArticles } from '~/composables/useArticles'

const { tags, fetchTags, deleteTag, createTag, updateTag, loading, error } = useArticles()
const { toast } = useToast()

const showDeleteDialog = ref(false)
const tagToDelete = ref<Tag | null>(null)
const selectedItems = ref<number[]>([])
const showMultiDeleteDialog = ref(false)

// Modal de criação/edição
const showModal = ref(false)
const isEditing = ref(false)
const form = ref<TagForm | TagUpdateForm>({
  title: '',
  status: 'published',
})

function handleDeleteClick(tag: Tag) {
  tagToDelete.value = tag
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  if (!tagToDelete.value)
    return
  const success = await deleteTag(tagToDelete.value.id)
  if (success) {
    toast({ title: 'Sucesso', description: 'Tag excluída com sucesso!' })
    showDeleteDialog.value = false
    tagToDelete.value = null
    await fetchTags()
  }
  else {
    toast({ title: 'Erro', description: error.value || 'Erro ao excluir tag', variant: 'destructive' })
  }
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  const itemIds = selectedItems.value.map((index: number) => tags.value[index].id)
  let allSuccess = true

  for (const id of itemIds) {
    const success = await deleteTag(id)
    if (!success) {
      allSuccess = false
    }
  }

  if (allSuccess) {
    toast({ title: 'Sucesso', description: `${itemIds.length} tags excluídas com sucesso!` })
  }
  else {
    toast({
      title: 'Aviso',
      description: 'Algumas tags não puderam ser excluídas.',
      variant: 'destructive',
    })
  }

  showMultiDeleteDialog.value = false
  selectedItems.value = []
  await fetchTags()
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

function handleEditClick(tag: Tag) {
  isEditing.value = true
  form.value = {
    id: tag.id,
    title: tag.title,
    status: tag.status || 'published',
  } as TagUpdateForm
  showModal.value = true
}

async function handleSaveTag() {
  if (!form.value.title.trim()) {
    toast({ title: 'Erro', description: 'Digite o nome da tag', variant: 'destructive' })
    return
  }

  let success = false
  if (isEditing.value && 'id' in form.value) {
    success = await updateTag(form.value.id, {
      title: form.value.title.trim(),
      status: form.value.status,
    })
    if (success) {
      toast({ title: 'Sucesso', description: 'Tag atualizada com sucesso!' })
    }
  }
  else {
    const newTag: TagForm = {
      title: form.value.title.trim(),
      status: form.value.status,
    }
    success = await createTag(newTag)
    if (success) {
      toast({ title: 'Sucesso', description: 'Tag criada com sucesso!' })
    }
  }

  if (success) {
    showModal.value = false
    await fetchTags()
  }
  else {
    toast({
      title: 'Erro',
      description: error.value || `Erro ao ${isEditing.value ? 'atualizar' : 'criar'} tag`,
      variant: 'destructive',
    })
  }
}

onMounted(() => {
  fetchTags()
})
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Tags
        </h1>
        <p class="text-muted-foreground">
          Gerencie as tags de artigos do seu site
        </p>
      </div>
      <Button
        class="bg-primary hover:bg-primary/90"
        @click="handleCreateClick"
      >
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        Nova Tag
      </Button>
    </div>

    <!-- Tabela de tags com o novo DataTable -->
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
      :data="tags || []"
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
          Excluir Tag
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir a tag "{{ tagToDelete?.title }}"? Esta ação não pode ser desfeita.
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
          Excluir Múltiplas Tags
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir {{ selectedItems.length }} tags? Esta ação não pode ser desfeita.
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

    <!-- Modal para criar/editar tag -->
    <Dialog :open="showModal" @update:open="showModal = $event">
      <DialogContent class="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Editar Tag' : 'Nova Tag' }}</DialogTitle>
          <DialogDescription>
            {{ isEditing ? 'Edite os dados da tag' : 'Preencha os dados da tag' }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="handleSaveTag">
          <div class="space-y-6 py-4">
            <div class="space-y-2">
              <Label for="title">Nome</Label>
              <Input id="title" v-model="form.title" placeholder="Nome da tag" :disabled="loading" required />
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
