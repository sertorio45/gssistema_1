<script setup lang="ts">
import {
  MARKETING_MVP_STATUS_LABELS,
  type MarketingMvpStatus,
} from '~/types/marketing-mvp'
import MarketingMvpStatusBadge from '~/components/marketing/MarketingMvpStatusBadge.vue'
import { resolveMarketingMvpStatus } from '~/utils/marketing-mvp-status'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth'],
  title: 'Publicações',
})

const route = useRoute()
const social = useMarketingSocial()
const workspace = useWorkspace()

const mvpStatus = ref(String(route.query.mvp_status || 'all'))
const canCreate = computed(() => workspace.can('marketing.social.create'))

const { data: response, showSkeleton, refresh } = useMarketingFetch({
  key: () => `marketing-publishing-${social.tenantId.value}-${mvpStatus.value}`,
  handler: () => social.listPosts({ status: 'all' }),
  default: () => ({ data: [] as any[], pagination: {} as Record<string, unknown> }),
  watch: [social.tenantId, mvpStatus],
  enabled: () => Boolean(social.tenantId.value),
})

watch(
  () => route.query.mvp_status,
  (value) => {
    mvpStatus.value = String(value || 'all')
  },
)

const rows = computed(() => {
  const items = ((response.value?.data || []) as any[])
    .map(post => ({
      id: post.id,
      title: post.title || 'Sem título',
      scheduledAt: post.scheduled_at,
      publishedAt: post.published_at,
      mvpStatus: resolveMarketingMvpStatus(post) as MarketingMvpStatus,
      href: `/marketing/content/${post.id}`,
    }))
    .filter((row) => {
      if (mvpStatus.value === 'all')
        return ['agendado', 'publicado', 'erro'].includes(row.mvpStatus)
      return row.mvpStatus === mvpStatus.value
    })

  return items
})

function formatDate(value?: string | null) {
  if (!value)
    return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Publicações
        </h1>
        <p class="mt-1 text-muted-foreground">
          Fila de envio — agendados, publicados e erros.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="navigateTo('/marketing/calendar')">
          <Icon name="lucide:calendar-days" class="mr-2 h-4 w-4" />
          Calendário
        </Button>
        <Button v-if="canCreate" @click="navigateTo('/marketing/content/new')">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Novo conteúdo
        </Button>
      </div>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Select v-model="mvpStatus">
          <SelectTrigger class="w-full sm:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Agendado / Publicado / Erro
            </SelectItem>
            <SelectItem value="agendado">
              {{ MARKETING_MVP_STATUS_LABELS.agendado }}
            </SelectItem>
            <SelectItem value="publicado">
              {{ MARKETING_MVP_STATUS_LABELS.publicado }}
            </SelectItem>
            <SelectItem value="erro">
              {{ MARKETING_MVP_STATUS_LABELS.erro }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" @click="refresh()">
          <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </CardContent>
    </Card>

    <MarketingPageSkeleton v-if="showSkeleton" variant="list" />

    <Card v-else>
      <CardContent class="p-0">
        <div v-if="!rows.length" class="p-10 text-center text-muted-foreground">
          Nenhuma publicação nesta fila.
        </div>
        <ul v-else class="divide-y">
          <li
            v-for="row in rows"
            :key="row.id"
            class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0 space-y-1">
              <NuxtLink :to="row.href" class="font-medium hover:underline">
                {{ row.title }}
              </NuxtLink>
              <p class="text-xs text-muted-foreground">
                Agenda: {{ formatDate(row.scheduledAt) }}
                <span v-if="row.publishedAt"> · Publicado: {{ formatDate(row.publishedAt) }}</span>
              </p>
            </div>
            <MarketingMvpStatusBadge :status="row.mvpStatus" />
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
