<script setup lang="ts">
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

definePageMeta({
  middleware: ['auth'],
  title: 'Agentes IA',
})

const { agents, pending } = useWhatsAppAgents()

const providerLabel: Record<string, string> = {
  ollama: 'Ollama',
  openai: 'OpenAI',
}
</script>

<template>
  <div class="space-y-6">
    <WhatsAppPageHeader title="Agentes IA" description="Agentes com Ollama (qwen) e ferramentas para flows.">
      <template #actions>
        <NuxtLink to="/whatsapp/agents/new">
          <Button>
            Novo agente
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <Skeleton v-if="pending" class="h-40 w-full rounded-xl" />

    <Card v-else-if="!agents.length">
      <CardContent class="py-12 text-center text-sm text-muted-foreground">
        Nenhum agente criado. Use Ollama no servidor para respostas locais.
      </CardContent>
    </Card>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card v-for="agent in agents" :key="agent.id">
        <CardHeader class="pb-2">
          <div class="flex items-start justify-between gap-2">
            <CardTitle class="text-base">
              {{ agent.name }}
            </CardTitle>
            <Badge :variant="agent.isActive ? 'default' : 'secondary'">
              {{ agent.isActive ? 'Ativo' : 'Inativo' }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="space-y-2 text-sm text-muted-foreground">
          <p>{{ providerLabel[agent.llmProvider] || agent.llmProvider }} · {{ agent.model }}</p>
          <p v-if="agent.description" class="line-clamp-2">
            {{ agent.description }}
          </p>
          <NuxtLink :to="`/whatsapp/agents/${agent.id}`">
            <Button variant="outline" size="sm">
              Configurar
            </Button>
          </NuxtLink>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
