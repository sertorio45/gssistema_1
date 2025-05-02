<template>
<!-- Topo abaixo de breadcrumb -->
<div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Editar Artigo
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
    <form v-if="!pending" @submit.prevent="saveArticle" class="space-y-8">
      <!-- Grid com proporção 70/30 -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
        <!-- Coluna da Esquerda: Informações Básicas (70%) -->
        <Card class="md:col-span-8">
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Edite as informações principais do artigo
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
                :disabled="isLoading"
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
                  :disabled="isLoading"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  :disabled="isLoading"
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
                :disabled="isLoading"
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
              <Select v-model="form.status" :disabled="isLoading">
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
              <Label>Categoria</Label>
              <Select v-model="form.category" :disabled="isLoading">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="category in categories" :key="category.id" :value="category.id.toString()">
                      {{ category.title }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p class="text-sm text-muted-foreground">
                Selecione uma categoria para o artigo
              </p>
            </div>

            <!-- Tags -->
            <div class="space-y-2">
              <Label>Tags</Label>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="(tag, index) in form.tags"
                  :key="index"
                  variant="secondary"
                  class="flex items-center gap-1"
                >
                  {{ tag }}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="h-4 w-4 p-0"
                    @click="removeTag(index)"
                  >
                    <Icon name="lucide:x" class="h-3 w-3" />
                  </Button>
                </Badge>
              </div>
              <div class="flex gap-2">
                <Input
                  v-model="newTag"
                  placeholder="Adicionar tag"
                  :disabled="isLoading"
                  @keyup.enter="addTag"
                />
                <Button
                  type="button"
                  variant="outline"
                  :disabled="isLoading"
                  @click="addTag"
                >
                  <Icon name="lucide:plus" class="h-4 w-4" />
                </Button>
              </div>
              <p v-if="tagError" class="text-sm text-destructive">
                {{ tagError }}
              </p>
              <p class="text-sm text-muted-foreground">
                Adicione tags para melhorar a organização e busca do artigo
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
            Edite o conteúdo do seu artigo usando o editor abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tiny
            v-model="form.content"
            :height="500"
            :disabled="isLoading"
          />
        </CardContent>
      </Card>

      <!-- Botões -->
      <div class="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          :disabled="isLoading"
          @click="() => navigateTo('/articles')"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          :disabled="isLoading"
          class="bg-primary hover:bg-primary/90"
        >
          <Icon
            v-if="isLoading"
            name="lucide:loader-2"
            class="mr-2 h-4 w-4 animate-spin"
          />
          Salvar Alterações
        </Button>
      </div>
    </form>

    <!-- Loading State -->
    <div v-else class="space-y-8">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
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
          <CardContent>
            <Skeleton class="h-10 w-full" />
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/components/ui/toast'
import Tiny from '~/components/articles/Tiny.vue'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'],
})

const route = useRoute()
const { toast } = useToast()
const isLoading = ref(false)

interface ArticleForm {
  id: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  description: string
  category: string
  tags: string[]
}

const form = ref<ArticleForm>({
  id: '',
  title: '',
  slug: '',
  content: '',
  description: '',
  category: '',
  tags: [],
  status: 'draft',
})

// Lista de categorias
const categories = ref<Category[]>([])
const isLoadingCategories = ref(true)
const _categoryOpen = ref(false)

// Estado para nova categoria
const newCategory = ref('')
const categoryError = ref('')
const showNewCategoryInput = ref(false)

// Tag input
const newTag = ref('')
const tagError = ref('')

interface Category {
  id: number
  title: string
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

interface CategoryResponse {
  articlesCategory: Category[]
}

interface ArticleResponse {
  article: {
    id: string
    title: string
    slug: string
    content: string
    status: 'draft' | 'published'
    meta_description: string
    category: string
    tags: string[]
  }
}

// Função para gerar slug
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

// Função para atualizar o slug
function updateSlug() {
  if (form.value.title) {
    form.value.slug = generateSlug(form.value.title)
  }
}

// Carregar dados do artigo
const { data, pending, error } = await useFetch<ArticleResponse>(`/api/articles/${route.params.id}`)

// Carregar categorias da API
async function fetchCategories() {
  try {
    const { data, error } = await useFetch<CategoryResponse>('/api/articles/category')
    
    if (error.value) {
      throw new Error(error.value.message)
    }

    if (data.value?.articlesCategory) {
      // Filtrar apenas categorias publicadas
      categories.value = data.value.articlesCategory.filter(
        category => category.status === 'published',
      )
    }
  } catch (error: any) {
    toast({
      title: 'Erro',
      description: 'Erro ao carregar categorias',
      variant: 'destructive',
    })
  } finally {
    isLoadingCategories.value = false
  }
}

// Carregar categorias quando o componente montar
onMounted(() => {
  fetchCategories()
})

async function addCategory() {
  if (!newCategory.value) {
    categoryError.value = 'Digite um nome para a categoria'
    return
  }

  const slug = generateSlug(newCategory.value)
  
  if (categories.value.some(cat => cat.title.toLowerCase() === newCategory.value.toLowerCase())) {
    categoryError.value = 'Categoria já existe'
    return
  }

  try {
    const { error } = await useFetch('/api/articles/category', {
      method: 'POST',
      body: {
        title: newCategory.value,
        status: 'published',
      },
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    // Recarregar categorias após adicionar
    await fetchCategories()
    
    newCategory.value = ''
    categoryError.value = ''
    showNewCategoryInput.value = false

    toast({
      title: 'Sucesso',
      description: 'Categoria adicionada com sucesso!',
    })
  } catch (error: any) {
    toast({
      title: 'Erro',
      description: error.message || 'Erro ao adicionar categoria',
      variant: 'destructive',
    })
  }
}

function addTag() {
  if (!newTag.value) {
    tagError.value = 'Digite uma tag'
    return
  }

  if (form.value.tags.includes(newTag.value)) {
    tagError.value = 'Tag já existe'
    return
  }

  form.value.tags.push(newTag.value)
  newTag.value = ''
  tagError.value = ''
}

function removeTag(index: number) {
  form.value.tags.splice(index, 1)
}

// Atualizar formulário quando os dados forem carregados
watch(data, (newData) => {
  if (newData?.article) {
    form.value = {
      id: newData.article.id,
      title: newData.article.title,
      slug: newData.article.slug,
      content: newData.article.content,
      description: newData.article.meta_description,
      status: newData.article.status,
      category: newData.article.category || '',
      tags: newData.article.tags || [],
    }
  }
}, { immediate: true })

// Tratar erro de carregamento
watch(error, (newError) => {
  if (newError) {
    toast({
      title: 'Erro',
      description: 'Erro ao carregar artigo',
      variant: 'destructive',
    })
    navigateTo('/articles')
  }
})

// Salvar artigo
async function saveArticle() {
  isLoading.value = true

  try {
    // Validação básica antes do envio
    if (!form.value.title || !form.value.slug || !form.value.content || !form.value.description) {
      throw new Error('Preencha todos os campos obrigatórios')
    }

    const { error } = await useFetch('/api/articles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: form.value.id,
        title: form.value.title,
        slug: form.value.slug,
        content: form.value.content,
        description: form.value.description,
        status: form.value.status,
        category: form.value.category,
        tags: form.value.tags,
      }),
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    toast({
      title: 'Sucesso',
      description: 'Artigo atualizado com sucesso!',
    })

    // Redirecionar para lista de artigos
    navigateTo('/articles')
  } catch (error: any) {
    toast({
      title: 'Erro',
      description: error.message || 'Ocorreu um erro ao atualizar o artigo',
      variant: 'destructive',
    })
  } finally {
    isLoading.value = false
  }
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