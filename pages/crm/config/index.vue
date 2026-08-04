<script setup lang="ts">
import { Layers, ListChecks, Package, Settings, Share2, Users } from 'lucide-vue-next'

import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import { useAuth } from '~/composables/useAuth'

const { currentRole } = useAuth()

const canManageTeam = computed(
  () => ['admin', 'funcionario', 'cliente'].includes(currentRole.value || ''),
)

/** Layout inspirado em padrão 21st.dev: cards horizontais, grid 3 colunas, paleta neutra. */
const configCards = computed(() => [
  {
    title: 'Origens',
    description: 'Cadastre e edite as origens dos leads.',
    icon: Settings,
    to: '/crm/config/sources',
  },
  {
    title: 'Estágios de Vendas',
    description: 'Defina as etapas do seu funil de vendas.',
    icon: ListChecks,
    to: '/crm/config/sales-stages',
  },
  {
    title: 'Funis',
    description: 'Monte funis de vendas por tipo de negócio.',
    icon: Layers,
    to: '/crm/config/funnel',
  },
  {
    title: 'Produtos',
    description: 'Catálogo de produtos, serviços e categorias.',
    icon: Package,
    to: '/crm/config/products',
  },
  {
    title: 'Meta Conversões',
    description: 'Pixel e token CAPI — em Configurações → Integrações.',
    icon: Share2,
    to: '/settings/integrations/meta-capi',
  },
  ...(canManageTeam.value
    ? [{
        title: 'Usuários',
        description: 'Atendentes e administradores da sua empresa.',
        icon: Users,
        to: '/settings/team',
      }]
    : []),
])
</script>

<template>
  <div class="mx-auto max-w-6xl w-full px-4 py-8 md:py-10">
    <header class="mb-8 md:mb-10">
      <h1 class="text-2xl text-foreground font-semibold tracking-tight md:text-3xl">
        Configurações do CRM
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
        Origens, funis, produtos, conversões Meta e usuários em um só lugar.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-3 sm:grid-cols-2 sm:gap-4">
      <NuxtLink
        v-for="card in configCards"
        :key="card.title"
        :to="card.to"
        class="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring focus-visible:ring-offset-background"
      >
        <Card
          class="h-full border border-border/60 bg-muted/15 shadow-none transition-all duration-200 hover:border-border hover:bg-muted/30 hover:shadow-sm hover:-translate-y-0.5"
        >
          <CardContent class="flex flex-row items-start gap-4 p-5 sm:p-6">
            <div
              class="h-11 w-11 flex shrink-0 items-center justify-center border border-border/50 rounded-lg bg-background text-muted-foreground shadow-sm transition-colors group-hover:border-border group-hover:text-foreground"
            >
              <component :is="card.icon" class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-base text-foreground font-semibold leading-snug">
                {{ card.title }}
              </h2>
              <p class="line-clamp-3 mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {{ card.description }}
              </p>
            </div>
            <Icon
              name="lucide:chevron-right"
              class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
              aria-hidden="true"
            />
          </CardContent>
        </Card>
      </NuxtLink>
    </div>
  </div>
</template>
