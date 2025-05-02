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
                :disabled="isLoading"
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
                :disabled="isLoading"
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
                <Popover v-model:open="categoryOpen" class="flex-1">
                  <PopoverTrigger as-child>
                    <Button
                      variant="outline"
                      role="combobox"
                      :aria-expanded="categoryOpen"
                      class="w-full justify-between"
                    >
                      <span v-if="isLoadingCategories">Carregando...</span>
                      <template v-else>
                        {{ form.category
                          ? categories.find((cat) => cat.id.toString() === form.category)?.title
                          : "Selecione uma categoria..." }}
                      </template>
                      <Icon name="lucide:chevron-down" class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar categoria..." />
                      <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            v-for="category in categories"
                            :key="category.id"
                            :value="category.id.toString()"
                            @select="() => {
                              form.category = category.id.toString()
                              categoryOpen = false
                            }"
                          >
                            <Icon
                              name="lucide:check"
                              class="mr-2 h-4 w-4"
                              :class="form.category === category.id.toString() ? 'opacity-100' : 'opacity-0'"
                            />
                            {{ category.title }}
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="secondary"
                  :disabled="isLoading"
                  @click="showNewCategoryInput = !showNewCategoryInput"
                >
                  <Icon name="lucide:plus" class="h-4 w-4" />
                </Button>
              </div>

              <!-- Input para nova categoria -->
              <div v-if="showNewCategoryInput" class="mt-2 space-y-2">
                <div class="flex gap-2">
                  <Input
                    v-model="newCategory"
                    placeholder="Digite o nome da categoria"
                    :disabled="isLoading"
                    @keyup.enter.prevent="addCategory"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    :disabled="isLoading"
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
                Escolha a categoria que melhor se encaixa com o tema do artigo
              </p>
            </div>

            <!-- Tags -->
            <div class="space-y-2">
              <Label>Tags</Label>
              <div class="flex gap-2">
                <Input
                  v-model="newTag"
                  placeholder="Digite uma tag e pressione Enter"
                  :disabled="isLoading"
                  @keyup.enter.prevent="addTag"
                />
                <Button
                  type="button"
                  variant="secondary"
                  :disabled="isLoading"
                  @click="addTag"
                >
                  <Icon name="lucide:plus" class="h-4 w-4" />
                </Button>
              </div>
              <p v-if="tagError" class="text-sm text-destructive">
                {{ tagError }}
              </p>
              <!-- Tags Preview -->
              <div v-if="form.tags.length > 0" class="flex flex-wrap gap-2 mt-2">
                <Badge
                  v-for="(tag, index) in form.tags"
                  :key="index"
                  variant="secondary"
                  class="px-2 py-1"
                >
                  {{ tag }}
                  <button
                    type="button"
                    class="ml-1 hover:text-destructive"
                    @click="removeTag(index)"
                  >
                    <Icon name="lucide:x" class="h-3 w-3" />
                  </button>
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground">
                Adicione tags relevantes para ajudar na descoberta do seu artigo
              </p>
            </div>

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
          {{ form.status === 'published' ? 'Publicar' : 'Salvar' }} Artigo
        </Button>
      </div>
    </form>
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

interface ArticleForm {
  id?: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  description: string
  category: string
  tags: string[]
}

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

// Lista de categorias
const categories = ref<Category[]>([])
const isLoadingCategories = ref(true)
const { toast } = useToast()

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
        category => category.status === 'published'
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

// Estado para nova categoria
const newCategory = ref('')
const categoryError = ref('')
const showNewCategoryInput = ref(false)

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

const isLoading = ref(false)
const categoryOpen = ref(false)

const form = ref<ArticleForm>({
  title: '',
  slug: '',
  content: '',
  description: '',
  category: '',
  tags: [],
  status: 'draft',
})

// Função para atualizar o slug
function updateSlug() {
  if (form.value.title) {
    form.value.slug = generateSlug(form.value.title)
  }
}

// Tag input
const newTag = ref('')
const tagError = ref('')

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

// Salvar artigo
async function saveArticle() {
  isLoading.value = true

  try {
    // Validação básica antes do envio
    if (!form.value.title || !form.value.slug || !form.value.content || !form.value.description) {
      throw new Error('Preencha todos os campos obrigatórios')
    }

    const articleData = {
      title: form.value.title,
      slug: form.value.slug,
      content: form.value.content,
      description: form.value.description,
      status: form.value.status,
    }

    // Se tiver ID, é uma atualização
    if (form.value.id) {
      const { error } = await useFetch('/api/articles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: form.value.id,
          ...articleData,
        }),
      })

      if (error.value) {
        throw new Error(error.value.message)
      }

      toast({
        title: 'Sucesso',
        description: 'Artigo atualizado com sucesso!',
      })
    } else {
      // Se não tiver ID, é uma criação
      const { error } = await useFetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      })

      if (error.value) {
        throw new Error(error.value.message)
      }

      toast({
        title: 'Sucesso',
        description: 'Artigo criado com sucesso!',
      })
    }

    // Redirecionar para lista de artigos
    navigateTo('/articles')
  } catch (error: any) {
    toast({
      title: 'Erro',
      description: error.message || 'Ocorreu um erro ao salvar o artigo',
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