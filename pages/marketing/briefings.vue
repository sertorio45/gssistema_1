<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth'],
  title: 'Briefings',
})

const social = useMarketingSocial()
const { can } = useWorkspace()
const creating = ref(false)
const lastUrl = ref('')

const canCreate = computed(() => can('marketing.social.briefing.create'))

const { data, pending, refresh } = await useAsyncData(
  () => `briefings-${social.tenantId.value}`,
  () => $fetch<{ data: any[] }>('/api/marketing/social/briefings', {
    query: { tenant_id: social.tenantId.value || undefined },
  }),
  { watch: [social.tenantId], default: () => ({ data: [] }) },
)

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  awaiting_client: 'Aguardando cliente',
  submitted: 'Enviado',
  needs_info: 'Precisa de info',
  accepted: 'Aceito',
  cancelled: 'Cancelado',
}

async function createLink() {
  creating.value = true
  try {
    const response = await $fetch<{ data: { url: string } }>('/api/marketing/social/briefings/link', {
      method: 'POST',
      body: {
        title: 'Briefing do cliente',
        requireEmailConfirm: true,
        maxUses: 1,
      },
    })
    lastUrl.value = response.data.url
    await navigator.clipboard.writeText(response.data.url)
    toast.success('Link copiado')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Falha ao gerar link')
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Briefings
        </h1>
        <p class="mt-1 text-muted-foreground">
          Envie um link Blimber para o cliente preencher o briefing.
        </p>
      </div>
      <Button v-if="canCreate" :disabled="creating" @click="createLink">
        <Icon name="lucide:link" class="mr-2 h-4 w-4" />
        Gerar link mágico
      </Button>
    </div>

    <Card v-if="lastUrl">
      <CardContent class="p-4 text-sm">
        <p class="mb-1 font-medium">
          Último link
        </p>
        <code class="break-all text-xs text-muted-foreground">{{ lastUrl }}</code>
      </CardContent>
    </Card>

    <MarketingPageSkeleton v-if="pending" variant="list" />

    <div v-else class="space-y-2">
      <Card v-for="item in data?.data || []" :key="item.id">
        <CardContent class="flex items-center justify-between gap-3 p-4">
          <div>
            <p class="font-medium">
              {{ item.title || 'Briefing' }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ statusLabels[item.status] || item.status }}
              <span v-if="item.client_email"> · {{ item.client_email }}</span>
            </p>
          </div>
          <Button
            v-if="item.post_id"
            size="sm"
            variant="outline"
            @click="navigateTo(`/marketing/posts/${item.post_id}`)"
          >
            Abrir conteúdo
          </Button>
        </CardContent>
      </Card>
      <p v-if="!(data?.data || []).length" class="text-sm text-muted-foreground">
        Nenhum briefing ainda.
      </p>
    </div>
  </div>
</template>
