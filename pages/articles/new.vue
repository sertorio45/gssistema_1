<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ArticleFloatingMenu from '~/components/articles/ArticleFloatingMenu.vue'
import Tiny from '~/components/articles/Tiny.vue'
import { useToast } from '~/components/ui/toast'
import { useTenant } from '~/composables/useTenant'

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
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
}

const { toast } = useToast()
const { tenantId } = useTenant()

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
const articleTags = ref<Array<{ id: string, title: string, value?: string }>>([])
const loadingTags = ref(false)
const searchTagTerm = ref('')
const showTagSuggestions = ref(false)
const showNewCategoryInput = ref(false)
const newCategory = ref('')
const categoryError = ref('')
const loadingNewCategory = ref(false)

function updateSlug() {
  if (form.value.title) {
    form.value.slug = generateSlug(form.value.title)
  }
}

onMounted(() => {
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
    tenant_id: tenantId.value
  }
  if (form.value.category_id) {
    articleData.category_id = form.value.category_id
  }
  try {
    await $fetch('/api/articles', { method: 'POST', body: articleData })
    toast({ title: 'Sucesso', description: 'Artigo criado com sucesso!' })
    form.value = {
      title: '', slug: '', content: '', description: '', category_id: '', status: 'draft',
    }
    navigateTo('/articles')
  } catch (e: any) {
    toast({ title: 'Erro', description: e?.data?.message || 'Ocorreu um erro ao salvar o artigo', variant: 'destructive' })
  }
}

async function addCategory() {
  if (!newCategory.value) {
    categoryError.value = 'Digite um nome para a categoria'
    return
  }
  if (categories.value.some((cat: any) => 
    ((cat.name && cat.name.toLowerCase() === newCategory.value.toLowerCase()) || 
     (cat.title && cat.title.toLowerCase() === newCategory.value.toLowerCase()))
  )) {
    categoryError.value = 'Categoria já existe'
    return
  }
  loadingNewCategory.value = true
  await createCategory({ 
    name: newCategory.value,
    slug: generateSlug(newCategory.value),
    is_active: true
  })
  await fetchCategories()
  const nova = categories.value.find(
    (cat: any) => 
      ((cat.name && cat.name.toLowerCase() === newCategory.value.toLowerCase()) || 
       (cat.title && cat.title.toLowerCase() === newCategory.value.toLowerCase()))
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
  if (!form.value.category_id)
    return
  loadingDeleteCategory.value = true
  const success = await deleteCategory(form.value.category_id)
  await fetchCategories()
  if (success) {
    toast({ title: 'Sucesso', description: 'Categoria excluída com sucesso!' })
    // Se a categoria deletada era a selecionada, limpa o campo
    form.value.category_id = ''
  }
  else {
    toast({ title: 'Erro', description: error.value || 'Erro ao excluir categoria', variant: 'destructive' })
  }
  loadingDeleteCategory.value = false
  showDeleteCategoryDialog.value = false
}

// Sugestões de tags
const filteredTags = computed(() => {
  if (!searchTagTerm.value.trim()) {
    return []
  }
  const term = searchTagTerm.value.toLowerCase().trim()
  return (tags.value || [])
    .filter((tag) => {
      // Filtrar por termo de busca
      if (!tag.title.toLowerCase().includes(term)) {
        return false
      }
      // Excluir tags que já estão adicionadas ao artigo
      if (articleTags.value.some(t => t.id === tag.id)) {
        return false
      }
      return true
    })
    .slice(0, 5) // Limitar a 5 sugestões
})

function hideTagSuggestions() {
  window.setTimeout(() => {
    showTagSuggestions.value = false
  }, 200)
}

// Adicionar tag existente ao artigo
function addExistingTag(tag: { id: string, title: string }) {
  if (articleTags.value.some(t => t.id === tag.id)) {
    return
  }
  articleTags.value.push(tag)
  searchTagTerm.value = ''
}

// Adicionar nova tag a partir do input
async function addNewTagFromInput(e: Event) {
  e?.preventDefault()
  const value = searchTagTerm.value.trim()
  if (!value) {
    return
  }
  const existingTag = filteredTags.value.find(tag => tag.title.toLowerCase() === value.toLowerCase())
  if (existingTag) {
    addExistingTag(existingTag)
    return
  }
  if (articleTags.value.some(tag => tag.title.toLowerCase() === value.toLowerCase())) {
    searchTagTerm.value = ''
    return
  }
  try {
    const newTag = await createTag({ title: value, status: 'published' })
    if (newTag) {
      addExistingTag(newTag)
      await fetchTags()
    }
  } 
  catch (err: any) {
    error.value = String(err)
  }
}

// Remover tag do artigo
function removeTag(tagId: string) {
  articleTags.value = articleTags.value.filter(tag => tag.id !== tagId)
}
</script>

<template>
  <div>
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
      <form v-if="!loading" class="space-y-8" @submit.prevent="saveArticle">
        <!-- Grid com proporção 70/30 -->
        <div class="grid grid-cols-1 gap-8 md:grid-cols-12">
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
              </div>
            </CardContent>
          </Card>

          <!-- Coluna da Direita: Status (30%) -->
          <Card class="md:col-span-4">
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>
                Defina o status do artigo
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
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
              </div>

              <!-- Categoria -->
              <div class="space-y-2">
                <Label>Categorias <span class="text-xs text-muted-foreground ms-2"><a href="/articles/category" class="text-purple hover:text-purple/80">Gerenciar categorias</a></span></Label>

                <div class="flex gap-2 items-center">
                  <Select v-model="form.category_id" :disabled="loading" class="flex-1">
                    <SelectTrigger class="h-10">
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
                    variant="outline"
                    class="h-10 w-10 rounded-md p-0 border-2 hover:bg-secondary hover:text-secondary-foreground transition-colors duration-200"
                    :disabled="loading"
                    @click="showNewCategoryInput = !showNewCategoryInput"
                  >
                    <Icon :name="showNewCategoryInput ? 'lucide:minus' : 'lucide:plus'" class="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    class="h-10 w-10 rounded-md p-0 border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors duration-200"
                    :disabled="!form.category_id || loadingDeleteCategory"
                    title="Excluir categoria selecionada"
                    @click="showDeleteCategoryDialog = true"
                  >
                    <Icon name="lucide:trash-2" class="h-4 w-4" />
                  </Button>
                </div>
                <div v-if="showNewCategoryInput" class="mt-3 space-y-3 border-l-2 border-primary pl-3 py-1 bg-primary/5 rounded-sm animate-in slide-in-from-left duration-300">
                  <div class="flex gap-2">
                    <Input
                      v-model="newCategory"
                      placeholder="Digite o nome da categoria"
                      :disabled="loadingNewCategory"
                      class="flex-1 focus-visible:ring-primary"
                      @keyup.enter.prevent="addCategory"
                    />
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      class="h-10"
                      :disabled="loadingNewCategory"
                      @click="addCategory"
                    >
                      <Icon name="lucide:check" class="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <p v-if="categoryError" class="text-sm text-destructive flex items-center">
                    <Icon name="lucide:alert-circle" class="h-3.5 w-3.5 mr-1" />
                    {{ categoryError }}
                  </p>
                </div>
                <p class="text-sm text-muted-foreground">
                  Selecione uma categoria para o artigo<br> (opcional)
                </p>
                <!-- Modal de confirmação de exclusão -->
                <div v-if="showDeleteCategoryDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
                    <h2 class="mb-2 text-lg font-bold">
                      Excluir Categoria
                    </h2>
                    <p class="mb-4">
                      Tem certeza que deseja excluir a categoria selecionada? Esta ação não pode ser desfeita.
                    </p>
                    <div class="flex justify-end gap-2">
                      <Button variant="outline" @click="showDeleteCategoryDialog = false">
                        Cancelar
                      </Button>
                      <Button variant="destructive" :disabled="loadingDeleteCategory" @click="deleteSelectedCategory">
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div class="space-y-2">
                <Label>Tags <span class="text-xs text-muted-foreground ms-2"><a href="/articles/tags" class="text-purple hover:text-purple/80">Gerenciar tags</a></span></Label>
                <div class="space-y-3">
                  <!-- Mostrar skeleton durante o carregamento -->
                  <template v-if="loadingTags">
                    <div class="flex items-center overflow-x-auto whitespace-nowrap rounded-md border px-3 py-2">
                      <div class="flex items-center gap-1.5 max-w-full">
                        <Skeleton class="h-6 w-16 rounded-sm" />
                        <Skeleton class="h-6 w-14 rounded-sm" />
                        <Skeleton class="h-6 w-20 rounded-sm" />
                        <div class="flex-1" />
                      </div>
                    </div>
                    <Skeleton class="h-5 w-40" />
                  </template>
                  
                  <!-- Campo de entrada normal quando não estiver carregando -->
                  <template v-else>
                    <div class="relative">
                      <div class="flex items-center overflow-x-auto whitespace-nowrap rounded-md border px-3 py-2 focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-1">
                        <!-- Tags em linha -->
                        <TransitionGroup name="fade-tag" tag="div" class="flex items-center gap-1.5 max-w-full">
                          <div
                            v-for="tag in articleTags"
                            :key="tag.id"
                            class="inline-flex shrink-0 items-center rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium"
                          >
                            {{ tag.title }}
                            <button
                              type="button"
                              class="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                              @click="removeTag(tag.id)"
                            >
                              <Icon name="lucide:x" class="h-2.5 w-2.5" />
                              <span class="sr-only">Remover</span>
                            </button>
                          </div>
                        </TransitionGroup>

                        <!-- Input na mesma linha -->
                        <input
                          v-model="searchTagTerm"
                          class="min-w-[150px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                          @keydown.enter.prevent="addNewTagFromInput($event)"
                          @focus="showTagSuggestions = true"
                          @blur="hideTagSuggestions"
                        />
                      </div>

                      <p class="text-sm text-muted-foreground">
                        Digite e pressione enter para adicionar <br> (opcional)
                      </p>

                      <!-- Sugestões de tags -->
                      <div
                        v-if="showTagSuggestions && filteredTags.length > 0"
                        class="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto"
                      >
                        <div
                          v-for="tag in filteredTags"
                          :key="tag.id"
                          class="px-3 py-2 hover:bg-muted cursor-pointer"
                          @mousedown.prevent="addExistingTag(tag)"
                        >
                          {{ tag.title }}
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
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

      <!-- Loading State -->
      <div v-else class="space-y-8">
        <div class="grid grid-cols-1 gap-8 md:grid-cols-12">
          <Card class="md:col-span-8">
            <CardHeader>
              <Skeleton class="h-6 w-[200px]" />
              <Skeleton class="h-4 w-[300px]" />
            </CardHeader>
            <CardContent class="space-y-6">
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-24 w-full" />
            </CardContent>
          </Card>
          <Card class="md:col-span-4">
            <CardHeader>
              <Skeleton class="h-6 w-[150px]" />
              <Skeleton class="h-4 w-[200px]" />
            </CardHeader>
            <CardContent class="space-y-6">
              <!-- Status Skeleton -->
              <div class="space-y-2">
                <Skeleton class="h-5 w-16" />
                <Skeleton class="h-10 w-full" />
              </div>
              
              <!-- Categoria Skeleton -->
              <div class="space-y-2">
                <Skeleton class="h-5 w-24" />
                <div class="flex gap-2">
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-10" />
                  <Skeleton class="h-10 w-10" />
                </div>
                <Skeleton class="h-5 w-60" />
              </div>
              
              <!-- Tags Skeleton -->
              <div class="space-y-2">
                <Skeleton class="h-5 w-16" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-5 w-40" />
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton class="h-6 w-[180px]" />
            <Skeleton class="h-4 w-[250px]" />
          </CardHeader>
          <CardContent>
            <Skeleton class="h-[500px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
    <ArticleFloatingMenu
      :on-save="saveArticle"
      :on-back="() => navigateTo('/articles')"
      :on-cancel="() => navigateTo('/articles')"
      :is-loading="loading"
      :show="showFloatingMenu"
    />
  </div>
</template>

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

.fade-tag-enter-active,
.fade-tag-leave-active {
  transition: 
    opacity 0.25s,
    transform 0.25s;
}
.fade-tag-enter-from {
  opacity: 0;
  transform: scale(0.85);
}
.fade-tag-enter-to {
  opacity: 1;
  transform: scale(1);
}
.fade-tag-leave-from {
  opacity: 1;
  transform: scale(1);
}
.fade-tag-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
</style>
