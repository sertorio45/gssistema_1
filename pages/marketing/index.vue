<script setup lang="ts">
import { useMarketingAudience } from '~/composables/marketing/useMarketingAudience'

definePageMeta({
  middleware: ['auth'],
  title: 'Marketing',
})

const { tenantId } = useTenant()
const { can } = useWorkspace()
const { isClientExperience } = useMarketingAudience()

const { data: overview, pending } = await useAsyncData<Record<string, number>>(
  () => `marketing-social-overview-${tenantId.value}`,
  async () => {
    const response = await $fetch<{ data: Record<string, number> }>('/api/marketing/social/overview', {
      query: { tenant_id: tenantId.value || undefined },
    })
    return response.data
  },
  { watch: [tenantId], default: () => ({}) },
)

const cards = computed(() => {
  if (isClientExperience.value) {
    return [
      { label: 'Agendados', value: overview.value.scheduled || 0, icon: 'lucide:calendar-clock', link: '/marketing/calendar', highlight: false },
      { label: 'Publicados', value: overview.value.published || 0, icon: 'lucide:circle-check', link: '/marketing/calendar', highlight: false },
      { label: 'Falhas', value: overview.value.failed || 0, icon: 'lucide:circle-alert', link: '/marketing/calendar', highlight: true },
    ]
  }

  return [
    { label: 'Rascunhos', value: overview.value.draft || 0, icon: 'lucide:file-pen-line', link: '/marketing/posts?status=draft', highlight: false },
    { label: 'Aguardando aprovação', value: overview.value.pending_approval || 0, icon: 'lucide:circle-dashed', link: '/marketing/approvals', highlight: true },
    { label: 'Agendados', value: overview.value.scheduled || 0, icon: 'lucide:calendar-clock', link: '/marketing/calendar', highlight: false },
    { label: 'Publicados', value: overview.value.published || 0, icon: 'lucide:circle-check', link: '/marketing/posts?status=published', highlight: false },
  ]
})
</script>

<template>
  <MarketingPageSkeleton v-if="pending" variant="dashboard" />
  <div v-else class="space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          {{ isClientExperience ? 'Conteúdo' : 'Marketing' }}
        </h1>
        <p class="mt-1 text-muted-foreground">
          <template v-if="isClientExperience">
            Acompanhe e publique conteúdo nas suas redes.
          </template>
          <template v-else>
            Produção, aprovação e distribuição de conteúdo em um só fluxo.
          </template>
        </p>
      </div>
      <Button v-if="!isClientExperience" @click="navigateTo('/marketing/posts/new')">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Nova publicação
      </Button>
      <Button
        v-else-if="can('marketing.social.create')"
        @click="navigateTo('/marketing/posts/new')"
      >
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Nova publicação
      </Button>
      <Button v-else @click="navigateTo('/marketing/calendar')">
        <Icon name="lucide:calendar-days" class="mr-2 h-4 w-4" />
        Calendário
      </Button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink v-for="card in cards" :key="card.label" :to="card.link">
        <Card
          class="h-full transition-colors hover:bg-muted/40"
          :class="{ 'border-primary/40': card.highlight && card.value > 0 }"
        >
          <CardContent class="flex items-center gap-4 p-6">
            <div class="h-10 w-10 flex items-center justify-center rounded-lg bg-muted">
              <Icon :name="card.icon" class="h-5 w-5" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                {{ card.label }}
              </p>
              <p class="text-2xl font-semibold">
                {{ card.value }}
              </p>
            </div>
          </CardContent>
        </Card>
      </NuxtLink>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle>{{ isClientExperience ? 'Acesso rápido' : 'Fluxo editorial' }}</CardTitle>
          <CardDescription>
            {{ isClientExperience
              ? 'Publicações, calendário, relatórios e integrações da sua empresa.'
              : 'Atalhos para as etapas mais usadas pela equipe.' }}
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-2">
          <template v-if="isClientExperience">
            <Button
              v-if="can('marketing.social.create')"
              variant="outline"
              class="h-auto justify-start p-4"
              @click="navigateTo('/marketing/posts')"
            >
              <Icon name="lucide:panels-top-left" class="mr-3 h-5 w-5" />
              <span class="text-left">
                <span class="block font-medium">Publicações</span>
                <span class="block text-xs text-muted-foreground">Crie, agende e publique conteúdo</span>
              </span>
            </Button>
            <Button variant="outline" class="h-auto justify-start p-4" @click="navigateTo('/marketing/calendar')">
              <Icon name="lucide:calendar-days" class="mr-3 h-5 w-5" />
              <span class="text-left">
                <span class="block font-medium">Calendário</span>
                <span class="block text-xs text-muted-foreground">Veja o que está agendado e no ar</span>
              </span>
            </Button>
            <Button
              v-if="can('marketing.social.reports')"
              variant="outline"
              class="h-auto justify-start p-4"
              @click="navigateTo('/marketing/reports')"
            >
              <Icon name="lucide:bar-chart-3" class="mr-3 h-5 w-5" />
              <span class="text-left">
                <span class="block font-medium">Relatórios</span>
                <span class="block text-xs text-muted-foreground">Resultados das publicações</span>
              </span>
            </Button>
            <Button
              v-if="can('marketing.social.integrations')"
              variant="outline"
              class="h-auto justify-start p-4"
              @click="navigateTo('/marketing/integrations')"
            >
              <Icon name="lucide:plug" class="mr-3 h-5 w-5" />
              <span class="text-left">
                <span class="block font-medium">Integrações</span>
                <span class="block text-xs text-muted-foreground">Contas e redes conectadas</span>
              </span>
            </Button>
          </template>
          <template v-else>
            <Button variant="outline" class="h-auto justify-start p-4" @click="navigateTo('/marketing/approvals')">
              <Icon name="lucide:badge-check" class="mr-3 h-5 w-5" />
              <span class="text-left">
                <span class="block font-medium">Aprovações</span>
                <span class="block text-xs text-muted-foreground">Revise artes e solicite ajustes</span>
              </span>
            </Button>
            <Button variant="outline" class="h-auto justify-start p-4" @click="navigateTo('/marketing/calendar')">
              <Icon name="lucide:calendar-days" class="mr-3 h-5 w-5" />
              <span class="text-left">
                <span class="block font-medium">Calendário</span>
                <span class="block text-xs text-muted-foreground">Visualize a agenda editorial</span>
              </span>
            </Button>
            <Button
              variant="outline"
              class="h-auto justify-start p-4"
              @click="navigateTo('/marketing/posts')"
            >
              <Icon name="lucide:layout-list" class="mr-3 h-5 w-5" />
              <span class="text-left">
                <span class="block font-medium">Produção</span>
                <span class="block text-xs text-muted-foreground">Crie e acompanhe as peças</span>
              </span>
            </Button>
            <Button
              variant="outline"
              class="h-auto justify-start p-4"
              @click="navigateTo('/marketing/library')"
            >
              <Icon name="lucide:images" class="mr-3 h-5 w-5" />
              <span class="text-left">
                <span class="block font-medium">Biblioteca</span>
                <span class="block text-xs text-muted-foreground">Encontre artes e vídeos</span>
              </span>
            </Button>
          </template>
        </CardContent>
      </Card>

      <Card v-if="can('marketing.social.reports') && !isClientExperience">
        <CardHeader>
          <CardTitle>Relatórios</CardTitle>
          <CardDescription>
            Acompanhe mídia paga, tráfego e resultados das campanhas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" class="w-full" @click="navigateTo('/marketing/reports')">
            Abrir relatórios
            <Icon name="lucide:arrow-right" class="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
