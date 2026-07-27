<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth'],
  title: 'Automações',
})

const social = useMarketingSocial()
const { can } = useWorkspace()
const canRead = computed(() => can('marketing.social.automations.read'))
const canManage = computed(() => can('marketing.social.automations.manage'))
const toggling = ref<string | null>(null)

const { data: rulesResponse, pending, refresh } = await useAsyncData(
  () => `automations-rules-${social.tenantId.value}`,
  () => $fetch<{ data: any[] }>('/api/marketing/social/automations', {
    query: { tenant_id: social.tenantId.value || undefined },
  }),
  { watch: [social.tenantId], default: () => ({ data: [] }) },
)

const { data: runsResponse, refresh: refreshRuns } = await useAsyncData(
  () => `automations-runs-${social.tenantId.value}`,
  () => $fetch<{ data: any[] }>('/api/marketing/social/automations/runs', {
    query: { tenant_id: social.tenantId.value || undefined, limit: 30 },
  }),
  { watch: [social.tenantId], default: () => ({ data: [] }) },
)

async function toggleRule(rule: any, enabled: boolean) {
  if (!canManage.value)
    return
  toggling.value = rule.triggerKey
  try {
    await $fetch('/api/marketing/social/automations', {
      method: 'PUT',
      body: { triggerKey: rule.triggerKey, enabled },
    })
    toast.success(enabled ? 'Automação ativada' : 'Automação desativada')
    await Promise.all([refresh(), refreshRuns()])
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Falha ao atualizar')
  }
  finally {
    toggling.value = null
  }
}

const statusLabels: Record<string, string> = {
  succeeded: 'Sucesso',
  skipped: 'Ignorada',
  failed: 'Falhou',
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Automações
      </h1>
      <p class="mt-1 text-muted-foreground">
        Eventos de domínio que movem o Kanban, criam tarefas e enviam alertas — sem lógica nas páginas.
      </p>
    </div>

    <Card v-if="!canRead">
      <CardContent class="p-6 text-sm text-muted-foreground">
        Você não tem permissão para visualizar automações.
      </CardContent>
    </Card>

    <template v-else>
      <MarketingPageSkeleton v-if="pending" variant="list" />

      <div v-else class="space-y-3">
        <Card v-for="rule in rulesResponse?.data || []" :key="rule.triggerKey">
          <CardContent class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="font-medium">
                {{ rule.title }}
              </p>
              <p class="text-sm text-muted-foreground">
                {{ rule.description }}
              </p>
              <p class="mt-1 font-mono text-[11px] text-muted-foreground">
                {{ rule.triggerKey }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <Badge :variant="rule.enabled ? 'default' : 'secondary'">
                {{ rule.enabled ? 'Ativa' : 'Desligada' }}
              </Badge>
              <Switch
                v-if="canManage"
                :checked="rule.enabled"
                :disabled="toggling === rule.triggerKey"
                @update:checked="toggleRule(rule, $event)"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Execuções recentes</CardTitle>
          <CardDescription>Últimos disparos neste cliente</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div
            v-for="run in runsResponse?.data || []"
            :key="run.id"
            class="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="font-medium">
                {{ run.trigger_key }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ run.message || '—' }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="outline">
                {{ statusLabels[run.status] || run.status }}
              </Badge>
              <span class="text-xs text-muted-foreground">
                {{ new Date(run.created_at).toLocaleString('pt-BR') }}
              </span>
            </div>
          </div>
          <p v-if="!(runsResponse?.data || []).length" class="text-sm text-muted-foreground">
            Nenhuma execução ainda.
          </p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
