<script setup lang="ts">
import type { SocialContentBoardItem } from '@/utils/marketing-social-preview'
import type { SocialPostStatus } from '~/types/marketing-social'
import DeletePostDialog from '@/components/marketing/social/DeletePostDialog.vue'
import SocialContentBoard from '@/components/marketing/social/SocialContentBoard.vue'
import SocialViewToggle from '@/components/marketing/social/SocialViewToggle.vue'
import { uniquePostPreviewAssets } from '@/utils/marketing-social-preview'
import { useWorkspace } from '~/composables/useWorkspace'
import { SOCIAL_STATUS_LABELS } from '~/types/marketing-social'

definePageMeta({
  middleware: ['auth'],
  title: 'Produção de conteúdo',
})

const route = useRoute()
const social = useMarketingSocial()
const { can } = useWorkspace()
const search = ref(String(route.query.search || ''))
const status = ref(String(route.query.status || 'all'))
const viewMode = ref<'thumb' | 'list'>('thumb')
const deleteDialogOpen = ref(false)
const postToDelete = ref<any>(null)

const canDelete = computed(() =>
  can('marketing.social.delete.local') || can('marketing.social.delete.remote'),
)

const { data: response, pending, refresh } = await useAsyncData(
  () => `marketing-social-posts-${social.tenantId.value}-${status.value}-${search.value}`,
  () => social.listPosts({ status: status.value, search: search.value || undefined }),
  { watch: [social.tenantId, status], default: () => ({ data: [], pagination: {} }) },
)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => refresh(), 300)
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
    href: `/marketing/production/${post.id}`,
    raw: post,
  })),
)

function openDelete(post: any) {
  postToDelete.value = post
  deleteDialogOpen.value = true
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
          Acompanhe cada conteúdo do rascunho à publicação.
        </p>
      </div>
      <Button @click="navigateTo('/marketing/production/new')">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Nova publicação
      </Button>
    </div>

    <Card>
      <CardContent class="p-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <div class="relative flex-1">
            <Icon name="lucide:search" class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="search" class="pl-9" placeholder="Buscar por título" />
          </div>
          <Select v-model="status">
            <SelectTrigger class="w-full md:w-56">
              <SelectValue placeholder="Todos os status" />
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
          <SocialViewToggle v-model="viewMode" />
        </div>
      </CardContent>
    </Card>

    <div v-if="pending" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <Skeleton v-for="index in 8" :key="index" class="aspect-square" />
    </div>

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

    <div v-if="!pending && !boardItems.length" class="flex justify-center">
      <Button @click="navigateTo('/marketing/production/new')">
        Criar publicação
      </Button>
    </div>

    <DeletePostDialog
      v-model:open="deleteDialogOpen"
      :post="postToDelete"
      @deleted="refresh()"
    />
  </div>
</template>
