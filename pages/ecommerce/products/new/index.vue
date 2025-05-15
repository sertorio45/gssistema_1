<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
import type { Product } from '~/types/ecommerce/product'
import { useProducts } from '~/composables/ecommerce/useProducts'
import { useRouter } from '#imports'
import { ref } from 'vue'
import { useToast } from '@/components/ui/toast/use-toast'
import ProductStepperForm from '~/components/ecommerce/product/ProductStepperForm.vue'

const router = useRouter()
const { createProduct } = useProducts()
const { toast } = useToast()

const loading = ref(false)
const error = ref<string | null>(null)

async function handleSubmit(product: Product) {
  try {
    loading.value = true
    error.value = null

    // Gerar o slug a partir do título
    const slug = product.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036F]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')

    const newProduct = await createProduct({
      ...product,
      slug,
    })

    if (newProduct) {
      toast({
        title: 'Sucesso',
        description: 'Produto criado com sucesso!',
      })
      router.push('/ecommerce/products')
    }
  }
  catch (err) {
    error.value = (err as Error).message
    toast({
      variant: 'destructive',
      title: 'Erro',
      description: (err as Error).message,
    })
  }
  finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Criar Produto</h1>
      <Button variant="outline" @click="router.back()">
        <Icon name="lucide:arrow-left" class="w-4 h-4 mr-2" />
        Voltar
      </Button>
    </div>

    <Card>
      <CardContent class="pt-6">
        <ProductStepperForm
          :loading="loading"
          @submit="handleSubmit"
        />
      </CardContent>
    </Card>

    <Alert
      v-if="error"
      variant="destructive"
      class="mt-6"
    >
      <Icon name="lucide:alert-circle" class="w-4 h-4" />
      <AlertTitle>Erro</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
  </div>
</template> 