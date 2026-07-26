<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  title: 'Marketing',
})

const { tenantId } = useTenant()
const { isAgencyWorkspace, can, organizationRelationshipType } = useWorkspace()

/** End-user of a managed client: keep the surface simple and approval-first. */
const isClientExperience = computed(() =>
  !can('agency.clients.read')
  && (organizationRelationshipType.value === 'managed' || !isAgencyWorkspace.value),
)

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

const pendingApprovals = computed(() => overview.value.pending_approval || 0)

const cards = computed(() => {
  const base = [
    { label: 'Aguardando aprovação', value: overview.value.pending_approval || 0, icon: 'lucide:circle-dashed', link: '/marketing/approvals', highlight: true },
    { label: 'Agendados', value: overview.value.scheduled || 0, icon: 'lucide:calendar-clock', link: '/marketing/calendar' },
    { label: 'Publicados', value: overview.value.published || 0, icon: 'lucide:circle-check', link: '/marketing/production?status=published' },
  ]
  if (isClientExperience.value)
    return base
  return [
    { label: 'Rascunhos', value: overview.value.draft || 0, icon: 'lucide:file-pen-line', link: '/marketing/production?status=draft' },
    ...base,
  ]
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          {{ isClientExperience ? 'Conteúdo' : 'Marketing' }}
        </h1>
        <p class="mt-1 text-muted-foreground">
          <template v-if="isClientExperience">
            Aprovações, calendário e publicações da sua empresa.
          </template>
          <template v-else>
            Produção, aprovação e distribuição de conteúdo em um só fluxo.
          </template>
        </p>
      </div>
      <Button v-if="!isClientExperience" @click="navigateTo('/marketing/production/new')">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Nova publicação
      </Button>
      <Button v-else-if="pendingApprovals > 0" @click="navigateTo('/marketing/approvals')">
        Revisar aprovações ({{ pendingApprovals }})
      </Button>
    </div>

    <Card
      v-if="isClientExperience && pendingApprovals > 0"
      class="border-primary/30 bg-primary/5"
    >
      <CardContent class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="font-medium">
            Você tem {{ pendingApprovals }} publicação(ões) aguardando aprovação
          </p>
          <p class="text-sm text-muted-foreground">
            Revise o conteúdo antes da publicação.
          </p>
        </div>
        <Button @click="navigateTo('/marketing/approvals')">
          Ir para aprovações
        </Button>
      </CardContent>
    </Card>

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
                {{ pending ? '—' : card.value }}
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
              ? 'Calendário, conteúdo publicado e aprovações.'
              : 'Atalhos para as etapas mais usadas pela equipe.' }}
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-2">
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
            v-if="!isClientExperience"
            variant="outline"
            class="h-auto justify-start p-4"
            @click="navigateTo('/marketing/production')"
          >
            <Icon name="lucide:layout-list" class="mr-3 h-5 w-5" />
            <span class="text-left">
              <span class="block font-medium">Produção</span>
              <span class="block text-xs text-muted-foreground">Crie e acompanhe as peças</span>
            </span>
          </Button>
          <Button
            v-if="!isClientExperience"
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
          <Button
            v-else
            variant="outline"
            class="h-auto justify-start p-4"
            @click="navigateTo('/marketing/production?status=published')"
          >
            <Icon name="lucide:circle-check" class="mr-3 h-5 w-5" />
            <span class="text-left">
              <span class="block font-medium">Publicados</span>
              <span class="block text-xs text-muted-foreground">Conteúdo já no ar</span>
            </span>
          </Button>
        </CardContent>
      </Card>

      <Card v-if="can('marketing.social.reports')">
        <CardHeader>
          <CardTitle>Relatórios</CardTitle>
          <CardDescription>
            {{ isClientExperience
              ? 'Resultados permitidos para a sua empresa.'
              : 'Acompanhe mídia paga, tráfego e resultados das campanhas.' }}
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
