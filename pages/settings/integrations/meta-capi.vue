<script setup lang="ts">
import MetaCapiPanel from '@/components/crm/meta/MetaCapiPanel.vue'
import Button from '@/components/ui/button/Button.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Meta Conversões',
})

useSeoMeta({
  title: 'Meta Conversões',
  description: 'API de Conversões da Meta para o CRM.',
})
</script>

<template>
  <div class="mx-auto max-w-4xl w-full px-4 py-8 md:py-10 space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl text-foreground font-semibold tracking-tight md:text-3xl">
          Meta Conversões
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Integração do CRM com a API de Conversões da Meta — disponível sem o módulo de Marketing.
        </p>
      </div>
      <Button variant="outline" as-child>
        <NuxtLink to="/settings/integrations">
          <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
          Voltar às integrações
        </NuxtLink>
      </Button>
    </header>

    <MetaCapiPanel />
  </div>
</template>
