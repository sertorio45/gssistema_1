<script setup lang="ts">
import { Folder, Package } from 'lucide-vue-next'

import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'

definePageMeta({
  middleware: ['auth', 'tenant'],
  title: 'Configurações - Produtos',
  description: 'Produtos e categorias do CRM',
})

const productCards = [
  {
    title: 'Produtos & Serviços',
    description: 'Gerencie o catálogo de produtos e serviços. Cadastre preços, tipos, recorrência e vincule às categorias.',
    icon: Package,
    to: '/crm/products',
  },
  {
    title: 'Categorias de Produtos',
    description: 'Crie e edite categorias para organizar produtos e serviços. Use as categorias ao cadastrar cada produto.',
    icon: Folder,
    to: '/crm/products/categories',
  },
]
</script>

<template>
  <div class="min-h-[60vh] flex flex-col py-10">
    <div class="mb-8">
      <NuxtLink to="/crm/config" class="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
        Voltar às Configurações
      </NuxtLink>
    </div>
    <h1 class="mb-2 text-3xl font-bold">
      Produtos
    </h1>
    <p class="mb-8 max-w-xl text-muted-foreground">
      Configure o catálogo de produtos e serviços e as categorias para organizar sua oferta no CRM.
    </p>
    <div class="grid grid-cols-1 max-w-4xl gap-6 sm:grid-cols-2">
      <NuxtLink v-for="card in productCards" :key="card.title" :to="card.to" class="group">
        <Card class="h-full flex flex-col items-center px-6 py-8 text-center transition-shadow hover:shadow-xl">
          <CardHeader class="mb-2 flex flex-col items-center justify-center">
            <component :is="card.icon" class="mb-3 h-12 w-12 text-primary transition-transform group-hover:scale-110" />
            <CardTitle class="text-xl font-semibold">
              {{ card.title }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">
              {{ card.description }}
            </p>
          </CardContent>
        </Card>
      </NuxtLink>
    </div>
  </div>
</template>
