<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useToast } from '@/components/ui/toast/use-toast'
import type { Product, ProductStatus } from '~/types/ecommerce'
import { useProducts } from '~/composables/ecommerce/useProducts'
import { useCurrency } from '~/composables/useCurrency'

const { products, loading, totalProducts, fetchProducts, deleteProduct } = useProducts()
const { formatCurrency } = useCurrency()
const { toast } = useToast()

const searchQuery = ref('')
const currentPage = ref(1)
const selectedStatus = ref<ProductStatus | undefined>()
const selectedCategory = ref<string | undefined>()
const showDeleteDialog = ref(false)
const productToDelete = ref<Product | null>(null)

const statusOptions = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' as ProductStatus },
  { label: 'Active', value: 'active' as ProductStatus },
  { label: 'Inactive', value: 'inactive' as ProductStatus },
  { label: 'Archived', value: 'archived' as ProductStatus },
]

function fetchData() {
  return fetchProducts({
    page: currentPage.value,
    search: searchQuery.value,
    status: selectedStatus.value,
    category_id: selectedCategory.value,
  })
}

async function confirmDelete(product: Product) {
  productToDelete.value = product
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!productToDelete.value) {
    return
  }

  try {
    const success = await deleteProduct(productToDelete.value.id)
    if (success) {
      toast({
        title: 'Sucesso',
        description: 'Produto excluído com sucesso!',
      })
      fetchData()
    }
  }
  catch (err) {
    toast({
      variant: 'destructive',
      title: 'Erro',
      description: (err as Error).message,
    })
  }
  finally {
    showDeleteDialog.value = false
    productToDelete.value = null
  }
}

// Watch for changes in filters
watch([searchQuery, selectedStatus, selectedCategory], () => {
  currentPage.value = 1
  fetchData()
})

// Watch for page changes
watch(currentPage, () => {
  fetchData()
})

// Initial fetch
onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Products</h1>
      <NuxtLink
        to="/ecommerce/products/new"
        class="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
      >
        <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
        Add Product
      </NuxtLink>
    </div>

    <div class="grid gap-4 mb-6">
      <div class="flex gap-4">
        <div class="flex-1">
          <Input
            v-model="searchQuery"
            placeholder="Search products..."
            class="w-full"
          >
            <template #prefix>
              <Icon name="lucide:search" class="w-4 h-4 text-muted-foreground" />
            </template>
          </Input>
        </div>
        <Select v-model="selectedStatus" class="w-40">
          <template #trigger>
            <Button variant="outline" class="w-full justify-between">
              {{ selectedStatus || 'Status' }}
              <Icon name="lucide:chevron-down" class="w-4 h-4 ml-2" />
            </Button>
          </template>
          <SelectContent>
            <SelectItem v-for="option in statusOptions" :key="option.value || 'all'" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Inventory</TableHead>
            <TableHead>Price</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="product in products" :key="product.id">
            <TableCell>
              <div class="flex items-center gap-3">
                <img
                  v-if="product.images?.[0]"
                  :src="product.images[0].url"
                  :alt="product.title"
                  class="w-10 h-10 object-cover rounded"
                />
                <div v-else class="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <Icon name="lucide:image" class="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <div class="font-medium">{{ product.title }}</div>
                  <div class="text-sm text-muted-foreground">{{ product.sku }}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge :variant="product.status === 'active' ? 'default' : 'secondary'">
                {{ product.status }}
              </Badge>
            </TableCell>
            <TableCell>
              {{ product.inventory_quantity }}
              <span class="text-muted-foreground">in stock</span>
            </TableCell>
            <TableCell>
              {{ formatCurrency(product.price) }}
            </TableCell>
            <TableCell class="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger as="Button" variant="ghost" size="icon">
                  <Icon name="lucide:more-horizontal" class="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem as="NuxtLink" :to="`/ecommerce/products/${product.slug}`">
                    <Icon name="lucide:eye" class="w-4 h-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem as="NuxtLink" :to="`/ecommerce/products/edit/${product.slug}`">
                    <Icon name="lucide:edit" class="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click="confirmDelete(product)" class="text-destructive">
                    <Icon name="lucide:trash" class="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
          <TableRow v-if="!products.length && !loading">
            <TableCell colspan="5" class="text-center py-8">
              <div class="text-muted-foreground">No products found</div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>

    <div v-if="totalProducts > 10" class="mt-4 flex justify-center">
      <Pagination
        v-model="currentPage"
        :total="totalProducts"
        :per-page="10"
      />
    </div>

    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = false">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the product
            "{{ productToDelete?.title }}" and remove its data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="handleDelete">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <div v-if="loading" class="fixed inset-0 bg-background/50 flex items-center justify-center">
      <div class="animate-spin">
        <Icon name="lucide:loader-2" class="w-6 h-6" />
      </div>
    </div>
  </div>
</template> 