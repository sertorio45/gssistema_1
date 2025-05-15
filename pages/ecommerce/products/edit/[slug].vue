<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
import { useRoute, useRouter } from '#imports'
import { useProducts } from '~/composables/ecommerce/useProducts'
import type { Product } from '~/types/ecommerce'
import { ref, onMounted } from 'vue'
import { useToast } from '@/components/ui/toast/use-toast'

const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const { getProductBySlug, updateProduct } = useProducts()

const product = ref(await getProductBySlug(route.params.slug as string))
const loading = ref(false)
const error = ref<string | null>(null)

if (!product.value) {
  throw createError({
    statusCode: 404,
    message: 'Produto não encontrado',
  })
}

const form = ref({
  title: '',
  description: '',
  short_description: '',
  sku: '',
  status: 'draft' as ProductStatus,
  price: 0,
  compare_at_price: 0,
  cost_price: 0,
  inventory_policy: 'deny' as InventoryPolicy,
  inventory_quantity: 0,
  weight: 0,
  weight_unit: 'kg',
  meta_title: '',
  meta_description: '',
  vendor: '',
})

async function loadProduct() {
  try {
    loading.value = true
    error.value = null

    const product = await getProductBySlug(route.params.slug as string)
    if (product) {
      form.value = {
        ...product,
        status: product.status as ProductStatus,
        inventory_policy: product.inventory_policy as InventoryPolicy,
      }
    } else {
      router.push('/ecommerce/products')
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Produto não encontrado',
      })
    }
  } catch (err) {
    error.value = (err as Error).message
    toast({
      variant: 'destructive',
      title: 'Erro',
      description: (err as Error).message,
    })
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  try {
    loading.value = true
    error.value = null

    const product = await updateProduct(form.value.id, {
      ...form.value,
      images: product.value?.images,
    })

    if (product) {
      toast({
        title: 'Sucesso',
        description: 'Produto atualizado com sucesso!',
      })
      router.push('/ecommerce/products')
    }
  } catch (err) {
    error.value = (err as Error).message
    toast({
      variant: 'destructive',
      title: 'Erro',
      description: (err as Error).message,
    })
  } finally {
    loading.value = false
  }
}

const handleImagesUpdate = (images: any[]) => {
  if (!product.value) return
  product.value.images = images
}

onMounted(() => {
  loadProduct()
})

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})
</script>

<template>
  <div class="p-6">
    <div class="flex items-center gap-4 mb-6">
      <Button variant="ghost" @click="router.back()">
        <Icon name="lucide:arrow-left" class="w-4 h-4 mr-2" />
        Voltar
      </Button>
      <h1 class="text-2xl font-bold">Editar Produto</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Form -->
      <div class="space-y-6">
        <ProductForm
          v-if="product"
          :initial-data="product"
          :loading="loading"
          @submit="onSubmit"
        />
      </div>

      <!-- Images -->
      <Card>
        <CardHeader>
          <CardTitle>Imagens</CardTitle>
          <CardDescription>
            Adicione ou remova imagens do produto. A primeira imagem será usada como thumbnail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            v-if="product"
            :product-id="product.id"
            :images="product.images"
            @update:images="handleImagesUpdate"
          />
        </CardContent>
      </Card>
    </div>

    <Alert
      v-if="error"
      variant="destructive"
      class="mt-6"
    >
      <Icon name="lucide:alert-circle" class="w-4 h-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
  </div>
</template> 