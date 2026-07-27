<script setup lang="ts">
import {
  SOCIAL_PRODUCTION_TASK_ROLE_LABELS,
  SOCIAL_PRODUCTION_TASK_STATUS_LABELS,
  SOCIAL_PRODUCTION_TASK_TYPE_LABELS,
} from '~/types/marketing-social'
import { useToast } from '@/components/ui/toast'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth'],
  title: 'Filas de produção',
})

const { toast } = useToast()
const { can, tenant } = useWorkspace()
const social = useMarketingSocial()

const queue = ref<'mine' | 'designer' | 'copywriter' | 'social_media' | 'reviewer' | 'overdue'>('mine')
const canManageTasks = computed(() => can('marketing.social.tasks.manage') || can('marketing.social.manage'))

const { data, pending, refresh } = await useAsyncData(
  () => `production-tasks-${social.tenantId.value}-${queue.value}`,
  () => $fetch<{ data: any[] }>('/api/marketing/social/production/tasks', {
    query: {
      tenant_id: social.tenantId.value || undefined,
      queue: queue.value,
    },
  }),
  { watch: [social.tenantId, queue], default: () => ({ data: [] }) },
)

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
      <Button variant="outline" @click="navigateTo('/marketing/production')">
        <Icon name="lucide:kanban" class="mr-2 h-4 w-4" />
        Voltar ao Kanban
      </Button>
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

    <div v-if="pending" class="space-y-2">
      <Skeleton v-for="index in 5" :key="index" class="h-16 w-full" />
    </div>

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
              @click="navigateTo(`/marketing/production/${task.postId}`)"
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
  </div>
</template>
