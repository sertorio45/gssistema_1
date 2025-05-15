<template>
  <div class="flex flex-col gap-4">
    <!-- Cabeçalho e filtros -->
    <div class="flex flex-col md:flex-row justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('Products') }}</h1>
        <p class="text-muted-foreground">{{ $t('Manage your products') }}</p>
      </div>

      <div class="flex flex-col sm:flex-row gap-2">
        <NuxtLink to="/ecommerce/products/new" class="flex items-center">
          <Button>
            <PlusIcon class="mr-2 h-4 w-4" />
            {{ $t('Add Product') }}
          </Button>
        </NuxtLink>

        <Button variant="outline" @click="showFilters = !showFilters">
          <Filter class="mr-2 h-4 w-4" />
          {{ $t('Filters') }}
        </Button>
      </div>
    </div>

    <!-- Filtros -->
    <Card v-if="showFilters" class="mb-4">
      <CardHeader>
        <CardTitle>{{ $t('Filter Products') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="applyFilters">
          <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div class="grid gap-2">
              <Label for="search">{{ $t('Search') }}</Label>
              <Input id="search" v-model="filters.search" :placeholder="$t('Search products...')" />
            </div>
            
            <div class="grid gap-2">
              <Label for="category">{{ $t('Category') }}</Label>
              <Select v-model="filters.category_id">
                <option value="">{{ $t('All Categories') }}</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </Select>
            </div>
            
            <div class="grid gap-2">
              <Label for="status">{{ $t('Status') }}</Label>
              <Select v-model="filters.status">
                <option value="">{{ $t('All Status') }}</option>
                <option value="published">{{ $t('Published') }}</option>
                <option value="draft">{{ $t('Draft') }}</option>
                <option value="archived">{{ $t('Archived') }}</option>
              </Select>
            </div>
            
            <div class="grid gap-2">
              <Label for="sort">{{ $t('Sort By') }}</Label>
              <Select v-model="filters.sort">
                <option value="created_at">{{ $t('Date Added') }}</option>
                <option value="title">{{ $t('Title') }}</option>
                <option value="price">{{ $t('Price') }}</option>
                <option value="inventory">{{ $t('Inventory') }}</option>
              </Select>
            </div>
            
            <div class="grid gap-2">
              <Label>{{ $t('Price Range') }}</Label>
              <div class="flex items-center gap-2">
                <Input 
                  v-model="filters.minPrice" 
                  type="number" 
                  :placeholder="$t('Min')" 
                  class="w-full"
                />
                <span>-</span>
                <Input 
                  v-model="filters.maxPrice" 
                  type="number" 
                  :placeholder="$t('Max')" 
                  class="w-full"
                />
              </div>
            </div>
            
            <div class="grid gap-2">
              <Label>{{ $t('Order') }}</Label>
              <Select v-model="filters.order">
                <option value="desc">{{ $t('Descending') }}</option>
                <option value="asc">{{ $t('Ascending') }}</option>
              </Select>
            </div>
          </div>
          
          <div class="flex justify-end gap-2 mt-4">
            <Button variant="outline" type="button" @click="resetFilters">
              {{ $t('Reset') }}
            </Button>
            <Button type="submit">
              {{ $t('Apply Filters') }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- Tabela de produtos -->
    <div class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t('Image') }}</TableHead>
            <TableHead>{{ $t('Product') }}</TableHead>
            <TableHead>{{ $t('Price') }}</TableHead>
            <TableHead class="hidden md:table-cell">{{ $t('Status') }}</TableHead>
            <TableHead class="hidden md:table-cell">{{ $t('Category') }}</TableHead>
            <TableHead class="hidden md:table-cell">{{ $t('Inventory') }}</TableHead>
            <TableHead class="text-right">{{ $t('Actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell colspan="7" class="text-center py-10">
              <Loader2 class="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </TableCell>
          </TableRow>
          <TableRow v-else-if="!products.length">
            <TableCell colspan="7" class="text-center py-10 text-muted-foreground">
              {{ $t('No products found') }}
            </TableCell>
          </TableRow>
          <TableRow v-for="product in products" :key="product.id">
            <TableCell>
              <div class="w-10 h-10 rounded-md overflow-hidden">
                <img 
                  v-if="product.thumb" 
                  :src="product.thumb.url" 
                  :alt="product.thumb.alt || product.title"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  {{ $t('No image') }}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div class="font-medium">{{ product.title }}</div>
              <div class="text-sm text-muted-foreground">
                {{ product.sku || $t('No SKU') }}
              </div>
            </TableCell>
            <TableCell>
              <div class="font-medium">{{ formatPrice(product.price) }}</div>
              <div v-if="product.compare_at_price" class="text-sm line-through text-muted-foreground">
                {{ formatPrice(product.compare_at_price) }}
              </div>
            </TableCell>
            <TableCell class="hidden md:table-cell">
              <Badge :variant="getStatusVariant(product.status)">
                {{ $t(product.status.charAt(0).toUpperCase() + product.status.slice(1)) }}
              </Badge>
            </TableCell>
            <TableCell class="hidden md:table-cell">
              {{ product.category?.name || $t('Uncategorized') }}
            </TableCell>
            <TableCell class="hidden md:table-cell">
              {{ product.inventory }}
            </TableCell>
            <TableCell class="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal class="h-4 w-4" />
                    <span class="sr-only">{{ $t('Open menu') }}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-[160px]">
                  <DropdownMenuLabel>{{ $t('Actions') }}</DropdownMenuLabel>
                  <DropdownMenuItem @click="editProduct(product.id)">
                    <Edit class="mr-2 h-4 w-4" />
                    {{ $t('Edit') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="viewProduct(product.id)">
                    <Eye class="mr-2 h-4 w-4" />
                    {{ $t('View') }}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click="duplicateProduct(product.id)">
                    <Copy class="mr-2 h-4 w-4" />
                    {{ $t('Duplicate') }}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click="confirmDelete(product.id)" class="text-destructive">
                    <Trash class="mr-2 h-4 w-4" />
                    {{ $t('Delete') }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Paginação -->
    <div class="flex items-center justify-center md:justify-end space-x-2 py-4">
      <Pagination v-model:page="currentPage" :total="totalProducts" :per-page="perPage" />
    </div>

    <!-- Modal de exclusão -->
    <Dialog v-model:open="deleteDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('Delete Product') }}</DialogTitle>
          <DialogDescription>
            {{ $t('Are you sure you want to delete this product? This action cannot be undone.') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="deleteDialogOpen = false">
            {{ $t('Cancel') }}
          </Button>
          <Button variant="destructive" :loading="loadingDelete" @click="deleteProductConfirmed">
            {{ $t('Delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  PlusIcon, Loader2, MoreHorizontal, Edit, 
  Eye, Copy, Trash, Filter
} from 'lucide-vue-next'
import type { ProductFilters, ProductStatus } from '~/types/ecommerce'
import { useProducts } from '~/composables/ecommerce/useProducts'
import { useCategories } from '~/composables/ecommerce/useCategories'

const router = useRouter()
const { 
  products, 
  loading, 
  error, 
  totalProducts, 
  fetchProducts, 
  deleteProduct 
} = useProducts()

const { categories, fetchCategories } = useCategories()

// Estados locais
const showFilters = ref(false)
const currentPage = ref(1)
const perPage = ref(10)
const deleteDialogOpen = ref(false)
const loadingDelete = ref(false)
const productToDelete = ref<string | null>(null)

// Filtros
const filters = reactive<ProductFilters>({
  search: '',
  category_id: '',
  status: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  sort: 'created_at',
  order: 'desc',
  page: 1,
  pageSize: 10
})

// Carregar dados iniciais
onMounted(async () => {
  await Promise.all([
    fetchProducts(filters),
    fetchCategories()
  ])
})

// Observer para paginação
watch(currentPage, async (newPage) => {
  filters.page = newPage
  await fetchProducts(filters)
})

// Métodos
const applyFilters = async () => {
  currentPage.value = 1
  filters.page = 1
  await fetchProducts(filters)
}

const resetFilters = () => {
  Object.assign(filters, {
    search: '',
    category_id: '',
    status: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    sort: 'created_at',
    order: 'desc',
    page: 1,
    pageSize: 10
  })
  applyFilters()
}

const editProduct = (id: string) => {
  router.push(`/ecommerce/products/edit/${id}`)
}

const viewProduct = (id: string) => {
  // Implementar visualização de produto
  // router.push(`/ecommerce/products/${id}`)
}

const duplicateProduct = (id: string) => {
  // Implementar duplicação de produto
}

const confirmDelete = (id: string) => {
  productToDelete.value = id
  deleteDialogOpen.value = true
}

const deleteProductConfirmed = async () => {
  if (!productToDelete.value) return
  
  loadingDelete.value = true
  try {
    await deleteProduct(productToDelete.value)
    deleteDialogOpen.value = false
    productToDelete.value = null
    await fetchProducts(filters)
  } catch (e) {
    console.error('Error deleting product:', e)
  } finally {
    loadingDelete.value = false
  }
}

// Formatadores e utilitários
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price)
}

const getStatusVariant = (status: ProductStatus) => {
  switch(status) {
    case 'published': return 'success'
    case 'draft': return 'default'
    case 'archived': return 'destructive'
    default: return 'default'
  }
}
</script> 