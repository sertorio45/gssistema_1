<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'],
  title: 'Logs de marketing',
})

const social = useMarketingSocial()
const search = ref('')
const action = ref('all')
const entityType = ref('all')
const page = ref(1)
const selectedLog = ref<any>(null)

const actionLabels: Record<string, string> = {
  'social_post.created': 'Publicação criada',
  'social_post.updated': 'Publicação atualizada',
  'social_post.deleted': 'Publicação excluída',
  'social_post.scheduled': 'Publicação agendada',
  'social_post.publish_now': 'Publicar agora',
  'social_post.stories_share': 'Compartilhado nos Stories',
  'social_post.submitted': 'Enviado para aprovação',
  'social_post.channel_published': 'Canal publicado',
  'social_post.published': 'Publicação concluída',
  'social_post.publish_retrying': 'Nova tentativa de publicação',
  'social_post.publish_failed': 'Falha na publicação',
  'approval.approved': 'Arte aprovada',
  'approval.changes_requested': 'Ajustes solicitados',
  'media_asset.created': 'Arquivo enviado',
  'media_asset.deleted': 'Arquivo excluído',
  'social_comment.created': 'Comentário criado',
  'integration.connected': 'Integração conectada',
  'integration.updated': 'Integração atualizada',
  'integration.disconnected': 'Integração desconectada',
}

const entityLabels: Record<string, string> = {
  social_post: 'Publicação',
  approval_request: 'Aprovação',
  media_asset: 'Arquivo',
  social_comment: 'Comentário',
  marketing_integration: 'Integração',
}

const { data: response, pending, refresh } = useMarketingFetch({
  key: () => `marketing-social-logs-${social.tenantId.value}-${page.value}-${action.value}-${entityType.value}-${search.value}`,
  handler: () => social.listLogs({
    page: page.value,
    page_size: 40,
    action: action.value === 'all' ? undefined : action.value,
    entity_type: entityType.value === 'all' ? undefined : entityType.value,
    search: search.value || undefined,
  }),
  default: () => ({ data: [] as any[], pagination: { page: 1, pageSize: 40, total: 0, totalPages: 1 } }),
  watch: [social.tenantId, page, action, entityType],
  enabled: () => Boolean(social.tenantId.value),
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    refresh()
  }, 300)
})

watch([action, entityType], () => {
  page.value = 1
})

function formatDate(value?: string | null) {
  if (!value)
    return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function actionLabel(value: string) {
  return actionLabels[value] || value
}

function entityLabel(value: string) {
  return entityLabels[value] || value
}

function prettyJson(value: unknown) {
  if (value == null)
    return '—'
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Logs
        </h1>
        <p class="mt-1 text-muted-foreground">
          Auditoria das ações do módulo Marketing nesta empresa.
        </p>
      </div>
      <Badge variant="outline">
        Superadministrador
      </Badge>
    </div>

    <Card>
      <CardContent class="p-4">
        <div class="flex flex-col gap-3 md:flex-row">
          <div class="relative flex-1">
            <Icon name="lucide:search" class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="search" class="pl-9" placeholder="Buscar por ação, entidade ou ID" />
          </div>
          <Select v-model="action">
            <SelectTrigger class="w-full md:w-56">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todas as ações
              </SelectItem>
              <SelectItem v-for="(label, value) in actionLabels" :key="value" :value="value">
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="entityType">
            <SelectTrigger class="w-full md:w-48">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todas as entidades
              </SelectItem>
              <SelectItem v-for="(label, value) in entityLabels" :key="value" :value="value">
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <MarketingPageSkeleton v-if="pending" variant="list" :rows="8" content-only />

    <Card v-else-if="response.data.length">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left text-muted-foreground">
              <th class="px-4 py-3 font-medium">
                Quando
              </th>
              <th class="px-4 py-3 font-medium">
                Ação
              </th>
              <th class="px-4 py-3 font-medium">
                Entidade
              </th>
              <th class="px-4 py-3 font-medium">
                Autor
              </th>
              <th class="px-4 py-3 font-medium">
                IP
              </th>
              <th class="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in response.data as any[]"
              :key="log.id"
              class="border-b last:border-b-0 hover:bg-muted/40"
            >
              <td class="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {{ formatDate(log.created_at) }}
              </td>
              <td class="px-4 py-3">
                <Badge variant="secondary">
                  {{ actionLabel(log.action) }}
                </Badge>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium">
                  {{ entityLabel(log.entity_type) }}
                </div>
                <div class="max-w-[220px] truncate text-xs text-muted-foreground">
                  {{ log.entity_id || '—' }}
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium">
                  {{ log.actor?.name || 'Sistema' }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ log.actor?.email || '—' }}
                </div>
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ log.ip || '—' }}
              </td>
              <td class="px-4 py-3 text-right">
                <Button size="sm" variant="outline" @click="selectedLog = log">
                  Detalhes
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
        <span>
          {{ response.pagination.total }} registro(s)
        </span>
        <div class="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="page <= 1"
            @click="page -= 1"
          >
            Anterior
          </Button>
          <span>
            Página {{ response.pagination.page }} de {{ response.pagination.totalPages }}
          </span>
          <Button
            size="sm"
            variant="outline"
            :disabled="page >= response.pagination.totalPages"
            @click="page += 1"
          >
            Próxima
          </Button>
        </div>
      </div>
    </Card>

    <Card v-else>
      <CardContent class="flex flex-col items-center py-14 text-center">
        <Icon name="lucide:scroll-text" class="mb-4 h-10 w-10 text-muted-foreground" />
        <h2 class="font-semibold">
          Nenhum log encontrado
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          As ações do Marketing desta empresa aparecerão aqui.
        </p>
      </CardContent>
    </Card>

    <Dialog :open="Boolean(selectedLog)" @update:open="(open) => { if (!open) selectedLog = null }">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{{ selectedLog ? actionLabel(selectedLog.action) : 'Detalhes' }}</DialogTitle>
          <DialogDescription>
            {{ selectedLog ? formatDate(selectedLog.created_at) : '' }}
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedLog" class="space-y-4 text-sm">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border p-3">
              <p class="text-xs text-muted-foreground">
                Entidade
              </p>
              <p class="mt-1 font-medium">
                {{ entityLabel(selectedLog.entity_type) }}
              </p>
              <p class="mt-1 break-all text-xs text-muted-foreground">
                {{ selectedLog.entity_id || '—' }}
              </p>
            </div>
            <div class="rounded-lg border p-3">
              <p class="text-xs text-muted-foreground">
                Autor
              </p>
              <p class="mt-1 font-medium">
                {{ selectedLog.actor?.name || 'Sistema' }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ selectedLog.actor?.email || '—' }}
              </p>
            </div>
            <div class="rounded-lg border p-3">
              <p class="text-xs text-muted-foreground">
                IP
              </p>
              <p class="mt-1 font-medium">
                {{ selectedLog.ip || '—' }}
              </p>
            </div>
            <div class="rounded-lg border p-3">
              <p class="text-xs text-muted-foreground">
                Request ID
              </p>
              <p class="mt-1 break-all font-medium">
                {{ selectedLog.request_id || '—' }}
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <h3 class="font-medium">
              Antes
            </h3>
            <pre class="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">{{ prettyJson(selectedLog.before_data) }}</pre>
          </div>
          <div class="space-y-2">
            <h3 class="font-medium">
              Depois
            </h3>
            <pre class="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">{{ prettyJson(selectedLog.after_data) }}</pre>
          </div>
          <div v-if="selectedLog.user_agent" class="space-y-2">
            <h3 class="font-medium">
              User agent
            </h3>
            <p class="break-all text-xs text-muted-foreground">
              {{ selectedLog.user_agent }}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
