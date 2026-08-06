<script setup lang="ts">
import type { SocialProductionStatus } from '~/types/marketing-social'
import ProductionKanbanBoard from '~/components/marketing/social/ProductionKanbanBoard.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth'],
  title: 'Produção',
})

const route = useRoute()
const social = useMarketingSocial()
const { toast } = useToast()
const workspace = useWorkspace()
const organization = computed(() => workspace.organization.value)
const managedTenants = computed(() => workspace.managedTenants.value)
const isAgencyWorkspace = computed(() => workspace.isAgencyWorkspace.value)

const search = ref(String(route.query.search || ''))
const mineOnly = ref(false)
const overdueOnly = ref(false)
const clientFilter = ref('all')
const blockDialogOpen = ref(false)
const blockReason = ref('')
const pendingMove = ref<{ postId: string, tenantId: string, toStatus: SocialProductionStatus } | null>(null)
const moving = ref(false)

const canCreate = computed(() => workspace.can('marketing.social.create'))
const canMove = computed(() =>
  workspace.can('marketing.social.production.move') || workspace.can('marketing.social.manage'),
)

const boardQueryKey = computed(() => [
  'marketing-production-board',
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
  watch: [social.tenantId, organization, search, mineOnly, overdueOnly, clientFilter],
  enabled: () => Boolean(social.tenantId.value),
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    refreshKanban()
  }, 300)
})

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
          Produção
        </h1>
        <p class="mt-1 text-muted-foreground">
          Kanban operacional — responsáveis, prioridade e prazo da equipe.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="navigateTo('/marketing/production/tasks')">
          <Icon name="lucide:list-todo" class="mr-2 h-4 w-4" />
          Filas de tarefas
        </Button>
        <Button variant="outline" @click="navigateTo('/marketing/content')">
          <Icon name="lucide:panels-top-left" class="mr-2 h-4 w-4" />
          Conteúdos
        </Button>
        <Button
          v-if="canCreate"
          @click="navigateTo('/marketing/content/new')"
        >
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Novo conteúdo
        </Button>
      </div>
    </div>

    <Card>
      <CardContent class="space-y-3 p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="relative flex-1">
            <Icon name="lucide:search" class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="search" class="pl-9" placeholder="Buscar por título" />
          </div>

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

          <label class="flex items-center gap-2 text-sm">
            <Checkbox v-model:checked="mineOnly" />
            Minhas tarefas
          </label>
          <label class="flex items-center gap-2 text-sm">
            <Checkbox v-model:checked="overdueOnly" />
            Somente atrasados
          </label>
        </div>
      </CardContent>
    </Card>

    <MarketingPageSkeleton v-if="kanbanShowSkeleton || moving" variant="kanban" />
    <ProductionKanbanBoard
      v-else
      :columns="kanbanResponse?.columns || []"
      :cards="kanbanResponse?.data || []"
      :can-move="canMove"
      @move="onMove"
    />

    <ClientOnly>
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
