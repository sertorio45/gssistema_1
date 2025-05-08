<template>
<!-- Topo abaixo de breadcrumb -->
<div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Criando Artigo
      </h1>
      <Button 
        class="bg-primary hover:bg-primary/90" 
        @click="() => navigateTo('/articles')"
      >
        <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
        Voltar
      </Button>
    </div>

    <!-- Formulário -->
    <form @submit.prevent="saveArticle" class="space-y-8">
      <!-- Grid com proporção 70/30 -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
        <!-- Coluna da Esquerda: Informações Básicas (70%) -->
        <Card class="md:col-span-8">
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Preencha as informações principais do artigo
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <!-- Título -->
            <div class="space-y-2">
              <Label for="title">Título</Label>
              <Input
                id="title"
                v-model="form.title"
                placeholder="Digite um título atrativo para seu artigo"
                :disabled="loading"
                required
                @blur="updateSlug"
              />
              <p class="text-sm text-muted-foreground">
                Um bom título é claro e direto, capturando a essência do seu artigo
              </p>
            </div>

            <!-- Slug -->
            <div class="space-y-2">
              <Label for="slug">URL do Artigo</Label>
              <div class="flex gap-2">
                <Input
                  id="slug"
                  v-model="form.slug"
                  placeholder="url-do-artigo"
                  :disabled="loading"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  :disabled="loading"
                  @click="updateSlug"
                >
                  <Icon name="lucide:refresh-cw" class="h-4 w-4" />
                </Button>
              </div>
              <p class="text-sm text-muted-foreground">
                URL amigável do artigo, gerada automaticamente a partir do título
              </p>
            </div>

            <!-- Descrição -->
            <div class="space-y-2">
              <Label for="description">Descrição</Label>
              <Textarea
                id="description"
                v-model="form.description"
                placeholder="Escreva um breve resumo do seu artigo"
                :disabled="loading"
                required
                rows="3"
              />
              <p class="text-sm text-muted-foreground">
                A descrição aparecerá nas listagens e resultados de busca
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- Coluna da Direita: Categorização (30%) -->
        <Card class="md:col-span-4">
          <CardHeader>
            <CardTitle>Categorização</CardTitle>
            <CardDescription>
              Defina a categoria e tags para melhor organização
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <!-- Categoria com Command -->
            <div class="space-y-2">
              <Label for="category">Categoria</Label>
              <div class="flex gap-2">
                <Select v-model="form.category_id" :disabled="loading">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-for="category in categories" :key="category.id" :value="category.id.toString()">
                        {{ category.title }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  :disabled="loading"
                  @click="showNewCategoryInput = !showNewCategoryInput"
                >
                  <Icon name="lucide:plus" class="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  :disabled="!form.category_id || loadingDeleteCategory"
                  @click="showDeleteCategoryDialog = true"
                  title="Excluir categoria selecionada"
                >
                  <Icon name="lucide:trash-2" class="h-4 w-4" />
                </Button>
              </div>
              <div v-if="showNewCategoryInput" class="mt-2 space-y-2">
                <div class="flex gap-2">
                  <Input
                    v-model="newCategory"
                    placeholder="Digite o nome da categoria"
                    :disabled="loadingNewCategory"
                    @keyup.enter.prevent="addCategory"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    :disabled="loadingNewCategory"
                    @click="addCategory"
                  >
                    Adicionar
                  </Button>
                </div>
                <p v-if="categoryError" class="text-sm text-destructive">
                  {{ categoryError }}
                </p>
              </div>
              <p class="text-sm text-muted-foreground">
                Escolha a categoria que melhor se encaixa com o tema do artigo (opcional)
              </p>
            </div>

            <!-- Status -->
            <div class="space-y-2">
              <Label>Status</Label>
              <Select v-model="form.status" :disabled="loading">
                <SelectTrigger>
                  <SelectValue :placeholder="form.status === 'draft' ? 'Rascunho' : 'Publicado'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="draft">
                      <div class="flex items-center">
                        <Icon name="lucide:file-text" class="mr-2 h-4 w-4" />
                        Rascunho
                      </div>
                    </SelectItem>
                    <SelectItem value="published">
                      <div class="flex items-center">
                        <Icon name="lucide:check-circle" class="mr-2 h-4 w-4" />
                        Publicado
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p class="text-sm text-muted-foreground">
                Salve como rascunho para continuar editando depois ou publique agora
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Editor de Conteúdo (Largura Total) -->
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo</CardTitle>
          <CardDescription>
            Escreva o conteúdo do seu artigo usando o editor abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tiny
            v-model="form.content"
            :height="500"
            :disabled="loading"
          />
        </CardContent>
      </Card>
    </form>

    <ArticleFloatingMenu
      :onSave="saveArticle"
      :onBack="() => navigateTo('/articles')"
      :onCancel="() => navigateTo('/articles')"
      :isLoading="loading"
      :show="showFloatingMenu"
    />
  </div>
  <!-- Diálogo de confirmação de exclusão -->
  <div v-if="showDeleteCategoryDialog" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div class="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-lg w-full max-w-md">
      <h2 class="text-lg font-bold mb-2">Excluir Categoria</h2>
      <p class="mb-4">Tem certeza que deseja excluir a categoria selecionada? Esta ação não pode ser desfeita.</p>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="showDeleteCategoryDialog = false">Cancelar</Button>
        <Button variant="destructive" :disabled="loadingDeleteCategory" @click="deleteSelectedCategory">Excluir</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/components/ui/toast'
import { useArticles } from '~/composables/useArticles'
import Tiny from '~/components/articles/Tiny.vue'
import ArticleFloatingMenu from '~/components/articles/ArticleFloatingMenu.vue'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'],
})

interface ArticleForm {
  id?: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  description: string
  category_id: string
}

function generateSlug(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/\[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
}

const { createArticle, loading, error, categories, fetchCategories, createCategory, isLoadingCategories, categoryOpen, showNewCategoryInput, newCategory, categoryError, loadingNewCategory, deleteCategory } = useArticles()
const { toast } = useToast()

const form = ref<ArticleForm>({
  title: '',
  slug: '',
  content: '',
  description: '',
  category_id: '',
  status: 'draft',
})

const showDeleteCategoryDialog = ref(false)
const loadingDeleteCategory = ref(false)
const showFloatingMenu = ref(false)

function updateSlug() {
  if (form.value.title) {
    form.value.slug = generateSlug(form.value.title)
  }
}

onMounted(() => {
  fetchCategories()
  window.addEventListener('scroll', () => {
    showFloatingMenu.value = window.scrollY > 200
  })
})

async function saveArticle() {
  if (!form.value.title || !form.value.slug || !form.value.content || !form.value.description) {
    toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
    return
  }
  const articleData: any = {
    title: form.value.title,
    slug: form.value.slug,
    content: form.value.content,
    meta_description: form.value.description,
    status: form.value.status,
  }
  if (form.value.category_id) {
    articleData.category_id = form.value.category_id
  }
  const success = await createArticle(articleData)
  if (success) {
    toast({ title: 'Sucesso', description: 'Artigo criado com sucesso!' })
    form.value = {
      title: '',
      slug: '',
      content: '',
      description: '',
      category_id: '',
      status: 'draft',
    }
    navigateTo('/articles')
  } else {
    toast({ title: 'Erro', description: error.value || 'Ocorreu um erro ao salvar o artigo', variant: 'destructive' })
  }
}

async function addCategory() {
  if (!newCategory.value) {
    categoryError.value = 'Digite um nome para a categoria'
    return
  }
  if (categories.value.some((cat: any) => cat.title.toLowerCase() === newCategory.value.toLowerCase())) {
    categoryError.value = 'Categoria já existe'
    return
  }
  loadingNewCategory.value = true
  await createCategory({ title: newCategory.value, status: 'published' })
  await fetchCategories()
  const nova = categories.value.find(
    (cat: any) => cat.title.toLowerCase() === newCategory.value.toLowerCase()
  )
  if (nova) {
    form.value.category_id = nova.id.toString()
  }
  newCategory.value = ''
  categoryError.value = ''
  showNewCategoryInput.value = false
  loadingNewCategory.value = false
  toast({ title: 'Sucesso', description: 'Categoria adicionada com sucesso!' })
}

async function deleteSelectedCategory() {
  if (!form.value.category_id) return
  loadingDeleteCategory.value = true
  const success = await deleteCategory(form.value.category_id)
  await fetchCategories()
  if (success) {
    toast({ title: 'Sucesso', description: 'Categoria excluída com sucesso!' })
    // Se a categoria deletada era a selecionada, limpa o campo
    form.value.category_id = ''
  } else {
    toast({ title: 'Erro', description: error.value || 'Erro ao excluir categoria', variant: 'destructive' })
  }
  loadingDeleteCategory.value = false
  showDeleteCategoryDialog.value = false
}
</script>

<style>
.tox-tinymce {
  border-radius: 0.5rem;
  border-color: hsl(var(--border));
}

.dark .tox-tinymce {
  border-color: hsl(var(--border));
}

.dark .tox:not(.tox-tinymce-inline) .tox-editor-header {
  background-color: hsl(var(--background));
  border-bottom-color: hsl(var(--border));
}
</style>