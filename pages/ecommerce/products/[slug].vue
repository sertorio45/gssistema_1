<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
import { useRoute, useRouter } from '#imports'
import { useProducts } from '~/composables/ecommerce/useProducts'
import { useCurrency } from '~/composables/useCurrency'

const route = useRoute()
const router = useRouter()
const { formatCurrency } = useCurrency()
const { getProductBySlug } = useProducts()

const product = ref(await getProductBySlug(route.params.slug as string))

if (!product.value) {
  throw createError({
    statusCode: 404,
    message: 'Produto não encontrado',
  })
}

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
      <h1 class="text-2xl font-bold">{{ product.title }}</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Images -->
      <Card>
        <CardHeader>
          <CardTitle>Imagens</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="product.images?.length" class="grid grid-cols-2 gap-4">
            <div
              v-for="image in product.images"
              :key="image.id"
              class="relative aspect-square rounded-lg overflow-hidden bg-muted"
            >
              <img
                :src="image.url"
                :alt="image.alt_text || ''"
                class="w-full h-full object-cover"
              >
              <Badge
                v-if="image.is_thumbnail"
                variant="secondary"
                class="absolute top-2 right-2"
              >
                Thumb
              </Badge>
            </div>
          </div>
          <div v-else class="text-center py-8 text-muted-foreground">
            Nenhuma imagem disponível
          </div>
        </CardContent>
      </Card>

      <!-- Details -->
      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent>
            <dl class="space-y-4">
              <div>
                <dt class="text-sm text-muted-foreground">SKU</dt>
                <dd>{{ product.sku }}</dd>
              </div>
              <div>
                <dt class="text-sm text-muted-foreground">Preço</dt>
                <dd>{{ formatCurrency(product.price) }}</dd>
              </div>
              <div>
                <dt class="text-sm text-muted-foreground">Estoque</dt>
                <dd>{{ product.inventory_quantity }} unidades</dd>
              </div>
              <div>
                <dt class="text-sm text-muted-foreground">Status</dt>
                <dd>
                  <Badge :variant="product.status === 'active' ? 'default' : 'secondary'">
                    {{ product.status }}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="product.description" v-html="product.description" />
            <div v-else class="text-muted-foreground">
              Nenhuma descrição disponível
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex gap-4">
              <Button asChild>
                <NuxtLink :to="`/ecommerce/products/edit/${product.slug}`">
                  <Icon name="lucide:edit" class="w-4 h-4 mr-2" />
                  Editar
                </NuxtLink>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template> 