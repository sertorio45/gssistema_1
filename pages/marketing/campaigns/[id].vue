<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useWorkspace } from '~/composables/useWorkspace'
import MarketingMvpStatusBadge from '~/components/marketing/MarketingMvpStatusBadge.vue'
import { resolveMarketingMvpStatus } from '~/utils/marketing-mvp-status'

definePageMeta({
  middleware: ['auth'],
  title: 'Campanha',
})

const route = useRoute()
const social = useMarketingSocial()
const { can } = useWorkspace()
const campaignId = computed(() => String(route.params.id))
const canBriefing = computed(() => can('marketing.social.briefing.create'))
const canCreate = computed(() => can('marketing.social.create'))
const linkUrl = ref('')
const creatingLink = ref(false)

const { data, showSkeleton, refresh } = useMarketingFetch({
  key: () => `campaign-${campaignId.value}-${social.tenantId.value}`,
  handler: () => $fetch<{ data: any }>(`/api/marketing/social/campaigns/${campaignId.value}`, {
    query: { tenant_id: social.tenantId.value || undefined },
  }),
  default: () => ({ data: null as any }),
  watch: [campaignId, social.tenantId],
  enabled: () => Boolean(social.tenantId.value) && Boolean(campaignId.value),
})

const campaign = computed(() => data.value?.data || null)

async function createBriefingLink() {
  creatingLink.value = true
  try {
    const response = await $fetch<{ data: { url: string } }>('/api/marketing/social/briefings/link', {
      method: 'POST',
      body: {
        title: `Briefing · ${campaign.value?.name || 'Campanha'}`,
        campaignId: campaignId.value,
        requireEmailConfirm: true,
      },
    })
    linkUrl.value = response.data.url
    await navigator.clipboard.writeText(response.data.url)
    toast.success('Link de briefing copiado')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Falha ao gerar link')
  }
  finally {
    creatingLink.value = false
    await refresh()
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <Button variant="ghost" class="-ml-3" @click="navigateTo('/marketing/campaigns')">
      <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
      Campanhas
    </Button>

    <div v-if="showSkeleton">
      <MarketingPageSkeleton variant="detail" />
    </div>

    <template v-else-if="campaign">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ campaign.name }}
          </h1>
          <p class="mt-2 text-muted-foreground">
            {{ campaign.objective || 'Sem objetivo' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="canCreate"
            variant="outline"
            @click="navigateTo(`/marketing/content/new?campaignId=${campaignId}`)"
          >
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            Novo conteúdo
          </Button>
          <Button v-if="canBriefing" :disabled="creatingLink" @click="createBriefingLink">
            <Icon name="lucide:link" class="mr-2 h-4 w-4" />
            Link de briefing
          </Button>
        </div>
      </div>

      <Card v-if="linkUrl">
        <CardContent class="p-4 text-sm">
          <p class="mb-1 font-medium">
            Link gerado (Blimber)
          </p>
          <code class="break-all text-xs text-muted-foreground">{{ linkUrl }}</code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdos da campanha</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <div
            v-for="post in campaign.posts || []"
            :key="post.id"
            class="flex items-center justify-between rounded-lg border p-3"
          >
            <div class="min-w-0 space-y-1">
              <p class="font-medium">
                {{ post.title }}
              </p>
              <MarketingMvpStatusBadge :status="resolveMarketingMvpStatus(post)" />
            </div>
            <Button size="sm" variant="outline" @click="navigateTo(`/marketing/content/${post.id}`)">
              Abrir
            </Button>
          </div>
          <p v-if="!(campaign.posts || []).length" class="text-sm text-muted-foreground">
            Nenhum conteúdo vinculado ainda.
          </p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
