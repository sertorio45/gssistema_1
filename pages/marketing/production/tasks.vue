<script setup lang="ts">
import {
  SOCIAL_PRODUCTION_TASK_ROLE_LABELS,
  SOCIAL_PRODUCTION_TASK_ROLES,
  SOCIAL_PRODUCTION_TASK_STATUS_LABELS,
  SOCIAL_PRODUCTION_TASK_TYPE_LABELS,
  SOCIAL_PRODUCTION_TASK_TYPES,
  type SocialProductionTaskRole,
  type SocialProductionTaskType,
} from '~/types/marketing-social'
import { useToast } from '@/components/ui/toast'
import { useWorkspace } from '~/composables/useWorkspace'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

definePageMeta({
  middleware: ['auth'],
  title: 'Filas de produção',
})

const { toast } = useToast()
const { can, tenant } = useWorkspace()
const social = useMarketingSocial()
const { isClientExperience } = useMarketingAudience()

if (import.meta.client) {
  watch(isClientExperience, (client) => {
    if (client)
      navigateTo('/marketing/content', { replace: true })
  }, { immediate: true })
}

const queue = ref<'mine' | 'designer' | 'copywriter' | 'social_media' | 'reviewer' | 'overdue'>('mine')
const canManageTasks = computed(() => can('marketing.social.tasks.manage') || can('marketing.social.manage'))
const createOpen = ref(false)
const creating = ref(false)
const newTask = ref({
  postId: '',
  title: '',
  taskType: 'write_copy' as SocialProductionTaskType,
  roleScope: 'copywriter' as SocialProductionTaskRole,
})

const { data, showSkeleton, refresh } = useMarketingFetch({
  key: () => `production-tasks-${social.tenantId.value}-${queue.value}`,
  handler: () => $fetch<{ data: any[] }>('/api/marketing/social/production/tasks', {
    query: {
      tenant_id: social.tenantId.value || undefined,
      queue: queue.value,
    },
  }),
  default: () => ({ data: [] as any[] }),
  watch: [social.tenantId, queue],
  enabled: () => Boolean(social.tenantId.value),
})

const { data: postsResponse } = useMarketingFetch({
  key: () => `production-task-posts-${social.tenantId.value}`,
  handler: () => social.listPosts({ page_size: 50 }),
  default: () => ({ data: [] as any[], pagination: {} }),
  watch: [social.tenantId],
  enabled: () => canManageTasks.value && Boolean(social.tenantId.value),
})

async function markDone(taskId: string) {
  if (!canManageTasks.value)
    return
  try {
    await $fetch(`/api/marketing/social/production/tasks/${taskId}`, {
      method: 'PUT',
      body: { status: 'done' },
    })
    toast({ title: 'Tarefa concluída' })
    await refresh()
  }
  catch (error: any) {
    toast({
      title: 'Erro',
      description: error?.data?.statusMessage || 'Não foi possível atualizar a tarefa.',
      variant: 'destructive',
    })
  }
}

async function createTask() {
  if (!newTask.value.postId || !newTask.value.title.trim())
    return
  creating.value = true
  try {
    await $fetch('/api/marketing/social/production/tasks', {
      method: 'POST',
      body: {
        postId: newTask.value.postId,
        title: newTask.value.title.trim(),
        taskType: newTask.value.taskType,
        roleScope: newTask.value.roleScope,
        tenant_id: social.tenantId.value || undefined,
      },
    })
    toast({ title: 'Tarefa criada' })
    createOpen.value = false
    newTask.value.title = ''
    await refresh()
  }
  catch (error: any) {
    toast({
      title: 'Erro',
      description: error?.data?.statusMessage || 'Não foi possível criar a tarefa.',
      variant: 'destructive',
    })
  }
  finally {
    creating.value = false
  }
}

function formatDue(value?: string | null) {
  if (!value)
    return 'Sem prazo'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

const queues = [
  { value: 'mine', label: 'Minhas tarefas' },
  { value: 'copywriter', label: 'Fila copy' },
  { value: 'designer', label: 'Fila design' },
  { value: 'social_media', label: 'Fila social media' },
  { value: 'reviewer', label: 'Fila revisão' },
  { value: 'overdue', label: 'Atrasadas' },
] as const
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Filas de tarefas
        </h1>
        <p class="mt-1 text-muted-foreground">
          Trabalho interno por função{{ tenant?.name ? ` · ${tenant.name}` : '' }}.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="canManageTasks"
          @click="createOpen = true"
        >
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Nova tarefa
        </Button>
        <Button variant="outline" @click="navigateTo('/marketing/production')">
          <Icon name="lucide:kanban" class="mr-2 h-4 w-4" />
          Voltar ao Kanban
        </Button>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        v-for="item in queues"
        :key="item.value"
        size="sm"
        :variant="queue === item.value ? 'secondary' : 'outline'"
        @click="queue = item.value"
      >
        {{ item.label }}
      </Button>
    </div>

    <MarketingPageSkeleton v-if="showSkeleton" variant="list" />

    <div v-else-if="!(data?.data || []).length" class="rounded-xl border p-8 text-center text-sm text-muted-foreground">
      Nenhuma tarefa nesta fila.
    </div>

    <div v-else class="space-y-2">
      <Card
        v-for="task in data?.data || []"
        :key="task.id"
      >
        <CardContent class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium">
                {{ task.title }}
              </p>
              <Badge variant="outline">
                {{ SOCIAL_PRODUCTION_TASK_TYPE_LABELS[task.taskType as keyof typeof SOCIAL_PRODUCTION_TASK_TYPE_LABELS] || task.taskType }}
              </Badge>
              <Badge variant="secondary">
                {{ SOCIAL_PRODUCTION_TASK_ROLE_LABELS[task.roleScope as keyof typeof SOCIAL_PRODUCTION_TASK_ROLE_LABELS] || task.roleScope }}
              </Badge>
              <Badge>
                {{ SOCIAL_PRODUCTION_TASK_STATUS_LABELS[task.status as keyof typeof SOCIAL_PRODUCTION_TASK_STATUS_LABELS] || task.status }}
              </Badge>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ task.postTitle || 'Conteúdo' }} · prazo {{ formatDue(task.dueAt) }}
            </p>
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="navigateTo(`/marketing/content/${task.postId}`)"
            >
              Abrir
            </Button>
            <Button
              v-if="canManageTasks && task.status !== 'done'"
              size="sm"
              @click="markDone(task.id)"
            >
              Concluir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <ClientOnly>
      <Dialog v-model:open="createOpen">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa de produção</DialogTitle>
            <DialogDescription>
              Crie uma tarefa interna vinculada a um conteúdo.
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-3">
            <div class="space-y-1.5">
              <Label>Conteúdo</Label>
              <Select v-model="newTask.postId">
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar conteúdo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="post in postsResponse?.data || []"
                    :key="post.id"
                    :value="post.id"
                  >
                    {{ post.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label>Título</Label>
              <Input v-model="newTask.title" placeholder="Ex.: Escrever legenda do carrossel" />
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <Label>Tipo</Label>
                <Select v-model="newTask.taskType">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="type in SOCIAL_PRODUCTION_TASK_TYPES"
                      :key="type"
                      :value="type"
                    >
                      {{ SOCIAL_PRODUCTION_TASK_TYPE_LABELS[type] }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label>Fila</Label>
                <Select v-model="newTask.roleScope">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="role in SOCIAL_PRODUCTION_TASK_ROLES"
                      :key="role"
                      :value="role"
                    >
                      {{ SOCIAL_PRODUCTION_TASK_ROLE_LABELS[role] }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="createOpen = false">
              Cancelar
            </Button>
            <Button
              :disabled="creating || !newTask.postId || !newTask.title.trim()"
              @click="createTask"
            >
              Criar tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientOnly>
  </div>
</template>
