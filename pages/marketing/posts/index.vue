<script setup lang="ts">
import type { SocialContentBoardItem } from '@/utils/marketing-social-preview'
import type { SocialPostStatus, SocialProductionStatus } from '~/types/marketing-social'
import DeletePostDialog from '~/components/marketing/social/DeletePostDialog.vue'
import ProductionKanbanBoard from '~/components/marketing/social/ProductionKanbanBoard.vue'
import SocialContentBoard from '~/components/marketing/social/SocialContentBoard.vue'
import SocialViewToggle from '~/components/marketing/social/SocialViewToggle.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { uniquePostPreviewAssets } from '@/utils/marketing-social-preview'
import { useWorkspace } from '~/composables/useWorkspace'
import { SOCIAL_STATUS_LABELS } from '~/types/marketing-social'

definePageMeta({
  middleware: ['auth'],
  title: 'Publicações',
})

// Avoid $setup[Component] resolution issues under async SSR: keep a raw module binding.
const DeletePostDialogPanel = markRaw(DeletePostDialog)

const route = useRoute()
const social = useMarketingSocial()
const { toast } = useToast()
const { isClientExperience } = useMarketingAudience()
const workspace = useWorkspace()
const organization = computed(() => workspace.organization.value)
const managedTenants = computed(() => workspace.managedTenants.value)
const isAgencyWorkspace = computed(() => workspace.isAgencyWorkspace.value)

const pageTitle = computed(() => (isClientExperience.value ? 'Publicações' : 'Produção'))
const pageDescription = computed(() =>
  isClientExperience.value
    ? 'Crie, agende e publique conteúdo nas suas redes.'
    : 'Kanban operacional separado da aprovação e da publicação.',
)

const search = ref(String(route.query.search || ''))
const status = ref(String(route.query.status || 'all'))
const layout = ref<'kanban' | 'board'>(
  isClientExperience.value || String(route.query.view || '') === 'board'
    ? 'board'
    : String(route.query.view || 'kanban') === 'board' ? 'board' : 'kanban',
)
const viewMode = ref<'thumb' | 'list'>('thumb')
const mineOnly = ref(false)
const overdueOnly = ref(false)
const clientFilter = ref('all')
const deleteDialogOpen = ref(false)
const postToDelete = ref<any>(null)
const blockDialogOpen = ref(false)
const blockReason = ref('')
const pendingMove = ref<{ postId: string, tenantId: string, toStatus: SocialProductionStatus } | null>(null)
const moving = ref(false)

const canCreate = computed(() => workspace.can('marketing.social.create'))
const canDelete = computed(() =>
  workspace.can('marketing.social.delete.local') || workspace.can('marketing.social.delete.remote'),
)
const canMove = computed(() =>
  workspace.can('marketing.social.production.move') || workspace.can('marketing.social.manage'),
)
const boardQueryKey = computed(() => [
  'production-board',
  social.tenantId.value,
  organization.value?.id,
  search.value,
  mineOnly.value,
  overdueOnly.value,
  clientFilter.value,
].join(':'))

const { data: kanbanResponse, showSkeleton: kanbanShowSkeleton, refresh: refreshKanban } = useMarketingFetch({
  key: boardQueryKey,
  handler: () => $fetch<{ data: any[], columns: SocialProductionStatus[] }>(
    '/api/marketing/social/production/board',
    {
      query: {
        tenant_id: social.tenantId.value || undefined,
        ...(isAgencyWorkspace.value && organization.value?.id
          ? {
              organizationId: organization.value.id,
              ...(clientFilter.value !== 'all' ? { tenantIdFilter: clientFilter.value } : {}),
            }
          : {}),
        search: search.value || undefined,
        mine: mineOnly.value || undefined,
        overdue: overdueOnly.value || undefined,
      },
    },
  ),
  default: () => ({ data: [] as any[], columns: [] as SocialProductionStatus[] }),
  watch: [layout],
  enabled: () => layout.value === 'kanban' && Boolean(social.tenantId.value),
})

const postsQueryKey = computed(() =>
  `marketing-social-posts-${social.tenantId.value}-${status.value}-${search.value}`,
)

const { data: response, showSkeleton, refresh } = useMarketingFetch({
  key: postsQueryKey,
  handler: () => social.listPosts({ status: status.value, search: search.value || undefined }),
  default: () => ({ data: [] as any[], pagination: {} as Record<string, unknown> }),
  watch: [layout],
  enabled: () => layout.value === 'board' && Boolean(social.tenantId.value),
})
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    refresh()
    refreshKanban()
  }, 300)
})

function formatDate(value?: string | null) {
  if (!value)
    return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const boardItems = computed<SocialContentBoardItem[]>(() =>
  ((response.value?.data || []) as any[]).map(post => ({
    id: post.id,
    title: post.title,
    caption: post.content || 'Sem texto-base',
    status: post.status,
    statusLabel: SOCIAL_STATUS_LABELS[post.status as SocialPostStatus] || post.status,
    platforms: (post.social_post_variants || []).map((variant: any) => variant.platform),
    previewAssets: uniquePostPreviewAssets(post),
    meta: formatDate(post.scheduled_at || post.updated_at),
    href: `/marketing/posts/${post.id}`,
    raw: post,
  })),
)

function openDelete(post: any) {
  postToDelete.value = post
  deleteDialogOpen.value = true
}

async function onMove(payload: { postId: string, tenantId: string, toStatus: SocialProductionStatus }) {
  if (payload.toStatus === 'blocked') {
    pendingMove.value = payload
    blockReason.value = ''
    blockDialogOpen.value = true
    return
  }
  await commitMove(payload)
}

async function commitMove(payload: {
  postId: string
  tenantId: string
  toStatus: SocialProductionStatus
  blockedReason?: string
}) {
  moving.value = true
  try {
    await $fetch('/api/marketing/social/production/move', {
      method: 'POST',
      body: {
        postId: payload.postId,
        tenantId: payload.tenantId,
        toStatus: payload.toStatus,
        blockedReason: payload.blockedReason || null,
      },
    })
    await refreshKanban()
    toast({ title: 'Card movido', description: 'Status operacional atualizado.' })
  }
  catch (error: any) {
    toast({
      title: 'Não foi possível mover',
      description: error?.data?.statusMessage || error?.message || 'Tente novamente.',
      variant: 'destructive',
    })
    await refreshKanban()
  }
  finally {
    moving.value = false
    blockDialogOpen.value = false
    pendingMove.value = null
  }
}

async function confirmBlock() {
  if (!pendingMove.value)
    return
  await commitMove({
    ...pendingMove.value,
    blockedReason: blockReason.value.trim(),
  })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          {{ pageTitle }}
        </h1>
        <p class="mt-1 text-muted-foreground">
          {{ pageDescription }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="!isClientExperience"
          variant="outline"
          @click="navigateTo('/marketing/posts/tasks')"
        >
          <Icon name="lucide:list-todo" class="mr-2 h-4 w-4" />
          Filas de tarefas
        </Button>
        <Button
          v-if="canCreate"
          @click="navigateTo('/marketing/posts/new')"
        >
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Nova publicação
        </Button>
      </div>
    </div>

    <Card>
      <CardContent class="p-4 space-y-3">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="relative flex-1">
            <Icon name="lucide:search" class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="search" class="pl-9" placeholder="Buscar por título" />
          </div>

          <div v-if="!isClientExperience" class="flex rounded-md border p-0.5">
            <Button
              size="sm"
              :variant="layout === 'kanban' ? 'secondary' : 'ghost'"
              @click="layout = 'kanban'"
            >
              Kanban
            </Button>
            <Button
              size="sm"
              :variant="layout === 'board' ? 'secondary' : 'ghost'"
              @click="layout = 'board'"
            >
              Grade
            </Button>
          </div>

          <SocialViewToggle v-if="layout === 'board'" v-model="viewMode" />
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <Select v-if="layout === 'board'" v-model="status">
            <SelectTrigger class="w-full md:w-56">
              <SelectValue placeholder="Status legado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos os status
              </SelectItem>
              <SelectItem v-for="(label, value) in SOCIAL_STATUS_LABELS" :key="value" :value="value">
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            v-if="isAgencyWorkspace && managedTenants.length"
            v-model="clientFilter"
          >
            <SelectTrigger class="w-full md:w-56">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos os clientes
              </SelectItem>
              <SelectItem
                v-for="tenant in managedTenants"
                :key="tenant.id"
                :value="tenant.id"
              >
                {{ tenant.name }}
              </SelectItem>
            </SelectContent>
          </Select>

          <label v-if="!isClientExperience" class="flex items-center gap-2 text-sm">
            <Checkbox v-model:checked="mineOnly" />
            Minhas tarefas
          </label>
          <label v-if="!isClientExperience" class="flex items-center gap-2 text-sm">
            <Checkbox v-model:checked="overdueOnly" />
            Somente atrasados
          </label>
        </div>
      </CardContent>
    </Card>

    <template v-if="layout === 'kanban'">
      <MarketingPageSkeleton v-if="kanbanShowSkeleton || moving" variant="kanban" />
      <ProductionKanbanBoard
        v-else
        :columns="kanbanResponse?.columns || []"
        :cards="kanbanResponse?.data || []"
        :can-move="canMove"
        @move="onMove"
      />
    </template>

    <template v-else>
      <MarketingPageSkeleton v-if="showSkeleton" variant="grid" />

      <SocialContentBoard
        v-else
        :items="boardItems"
        :view-mode="viewMode"
        empty-title="Nenhuma publicação encontrada"
        empty-description="Crie o primeiro rascunho para iniciar o fluxo editorial."
      >
        <template #actions="{ item }">
          <Button
            v-if="canDelete"
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Excluir publicação"
            @click="openDelete(item.raw)"
          >
            <Icon name="lucide:trash-2" class="h-4 w-4" />
          </Button>
        </template>
      </SocialContentBoard>
    </template>

    <ClientOnly>
      <component
        :is="DeletePostDialogPanel"
        v-model:open="deleteDialogOpen"
        :post="postToDelete"
        @deleted="() => { refresh(); refreshKanban() }"
      />

      <Dialog v-model:open="blockDialogOpen">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo do bloqueio</DialogTitle>
            <DialogDescription>
              Explique por que este conteúdo ficou bloqueado no Kanban.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            v-model="blockReason"
            rows="4"
            placeholder="Ex.: aguardando material do cliente"
          />
          <DialogFooter>
            <Button variant="outline" @click="blockDialogOpen = false">
              Cancelar
            </Button>
            <Button :disabled="blockReason.trim().length < 3 || moving" @click="confirmBlock">
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientOnly>
  </div>
</template>
