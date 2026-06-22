<script setup lang="ts">
import { Layers, ListChecks, Package, Plug, Settings, Users } from 'lucide-vue-next'

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
  ...(canManageTeam.value
    ? [{
    title: 'Usuários',
    description: 'Atendentes e administradores da sua empresa.',
        icon: Users,
        to: '/settings/team',
      }]
    : []),
  {
    title: 'Integrações',
    description: 'Google Ads, Analytics e Meta.',
    icon: Plug,
    to: '/crm/marketing/integrations',
  },
])
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
    <header class="mb-8 md:mb-10">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        Configurações do CRM
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Origens, funis, produtos e integrações em um só lugar.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      <NuxtLink
        v-for="card in configCards"
        :key="card.title"
        :to="card.to"
        class="group block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      >
        <Card
          class="h-full border border-border/60 bg-muted/15 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-muted/30 hover:shadow-sm"
        >
          <CardContent class="flex flex-row items-start gap-4 p-5 sm:p-6">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground shadow-sm transition-colors group-hover:border-border group-hover:text-foreground"
            >
              <component :is="card.icon" class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-base font-semibold leading-snug text-foreground">
                {{ card.title }}
              </h2>
              <p class="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-3">
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
