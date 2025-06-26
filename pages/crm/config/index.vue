<script setup lang="ts">
import { Layers, ListChecks, Settings } from 'lucide-vue-next'
import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'

const configCards = [
  {
    title: 'Sources',
    description: 'Manage all lead sources for your CRM. Add, edit or remove sources to keep your pipeline organized.',
    icon: Settings,
    to: '/crm/config/sources',
  },
  {
    title: 'Sales Stages',
    description: 'Customize the sales stages that reflect your business process. Stages help track lead progress.',
    icon: ListChecks,
    to: '/crm/config/sales-stages',
  },
  {
    title: 'Pipelines',
    description: 'Create and manage sales pipelines to organize your leads and deals by workflow.',
    icon: Layers,
    to: '/crm/config/pipeline',
  },
]
</script>

<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center py-10">
    <h1 class="text-3xl font-bold mb-2 text-center">CRM Configurations</h1>
    <p class="text-muted-foreground mb-8 text-center max-w-xl">Centralize and customize your CRM settings. Configure sources, sales stages, and pipelines to match your business workflow.</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
      <NuxtLink v-for="card in configCards" :key="card.title" :to="card.to" class="group">
        <Card class="transition-shadow hover:shadow-xl h-full flex flex-col items-center text-center py-8 px-6">
          <CardHeader class="flex flex-col items-center justify-center mb-2">
            <component :is="card.icon" class="w-12 h-12 mb-3 text-primary group-hover:scale-110 transition-transform" />
            <CardTitle class="text-xl font-semibold">{{ card.title }}</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-muted-foreground text-sm">{{ card.description }}</p>
          </CardContent>
        </Card>
      </NuxtLink>
    </div>
  </div>
</template> 