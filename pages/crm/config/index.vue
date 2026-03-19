<script setup lang="ts">
import { Folder, Layers, ListChecks, Package, Settings } from 'lucide-vue-next'

import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'

const configCards = [
  {
    title: 'Origens',
    description: 'Gerencie todas as origens de leads do seu CRM. Adicione, edite ou remova origens para manter o pipeline organizado.',
    icon: Settings,
    to: '/crm/config/sources',
  },
  {
    title: 'Estágios de Vendas',
    description: 'Personalize os estágios de vendas que refletem seu processo. Os estágios ajudam a acompanhar o progresso dos leads.',
    icon: ListChecks,
    to: '/crm/config/sales-stages',
  },
  {
    title: 'Pipelines',
    description: 'Crie e gerencie pipelines de vendas para organizar seus leads e negócios por fluxo de trabalho.',
    icon: Layers,
    to: '/crm/config/pipeline',
  },
  {
    title: 'Produtos',
    description: 'Configure produtos, serviços e categorias. Gerencie o catálogo e as categorias para organizar sua oferta.',
    icon: Package,
    to: '/crm/config/products',
  },
]
</script>

<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center py-10">
    <h1 class="mb-2 text-center text-3xl font-bold">
      Configurações do CRM
    </h1>
    <p class="mb-8 max-w-xl text-center text-muted-foreground">
      Centralize e personalize as configurações do seu CRM. Configure origens, estágios de vendas, pipelines e produtos para o fluxo do seu negócio.
    </p>
    <div class="grid grid-cols-1 max-w-5xl w-full gap-6 sm:grid-cols-2 md:grid-cols-4">
      <NuxtLink v-for="card in configCards" :key="card.title" :to="card.to" class="group">
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
