<script setup lang="ts">
import type { SocialContentBoardItem } from '@/utils/marketing-social-preview'
import SocialContentBoard from '@/components/marketing/social/SocialContentBoard.vue'
import SocialViewToggle from '@/components/marketing/social/SocialViewToggle.vue'
import { uniqueApprovalPreviewAssets } from '@/utils/marketing-social-preview'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Aprovações',
})

const social = useMarketingSocial()
const status = ref('pending')
const viewMode = ref<'thumb' | 'list'>('thumb')
const decisionDialogOpen = ref(false)
const reviewDialogOpen = ref(false)
const activeRequest = ref<any>(null)
const decision = ref<'approved' | 'changes_requested'>('approved')
const comment = ref('')
const saving = ref(false)

const { data: approvals, pending, refresh } = await useAsyncData(
  () => `marketing-social-approvals-${social.tenantId.value}-${status.value}`,
  () => social.listApprovals(status.value),
  { watch: [social.tenantId, status], default: () => [] },
)

function openDecision(request: any, value: 'approved' | 'changes_requested') {
  activeRequest.value = request
  decision.value = value
  comment.value = ''
  decisionDialogOpen.value = true
}

async function submitDecision() {
  if (!activeRequest.value)
    return
  saving.value = true
  try {
    await social.decide(activeRequest.value.id, decision.value, comment.value)
    decisionDialogOpen.value = false
    toast.success(decision.value === 'approved' ? 'Arte aprovada' : 'Ajustes solicitados')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível registrar a decisão')
  }
  finally {
    saving.value = false
  }
}

function requestPost(request: any) {
  return Array.isArray(request.social_posts) ? request.social_posts[0] : request.social_posts
}

function requestVersion(request: any) {
  return Array.isArray(request.content_versions) ? request.content_versions[0] : request.content_versions
}

function requestAssets(request: any, purpose: 'publication' | 'reference' = 'publication') {
  return uniqueApprovalPreviewAssets(request, purpose)
}

function openReview(request: any) {
  activeRequest.value = request
  reviewDialogOpen.value = true
}

function decideFromReview(value: 'approved' | 'changes_requested') {
  const request = activeRequest.value
  reviewDialogOpen.value = false
  openDecision(request, value)
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  changes_requested: 'Ajustes solicitados',
}

const boardItems = computed<SocialContentBoardItem[]>(() =>
  ((approvals.value || []) as any[]).map((request) => {
    const post = requestPost(request)
    const version = requestVersion(request)
    const platforms = (version?.snapshot?.variants || [])
      .map((variant: any) => variant.platform)
      .filter(Boolean)

    return {
      id: request.id,
      title: post?.title || 'Sem título',
      caption: post?.content || 'Sem texto-base',
      status: request.status,
      statusLabel: statusLabels[request.status] || request.status,
      platforms: platforms.length
        ? [...new Set(platforms)] as string[]
        : [],
      previewAssets: uniqueApprovalPreviewAssets(request, 'publication'),
      meta: version?.version ? `Versão ${version.version}` : null,
      raw: request,
    }
  }),
)

function isPendingItem(item: SocialContentBoardItem) {
  return (item.raw as any)?.status === 'pending'
}

function onSelectItem(item: SocialContentBoardItem) {
  openReview(item.raw)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Aprovações
        </h1>
        <p class="mt-1 text-muted-foreground">
          Revise exatamente a versão que será usada na publicação.
        </p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select v-model="status">
          <SelectTrigger class="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">
              Pendentes
            </SelectItem>
            <SelectItem value="approved">
              Aprovadas
            </SelectItem>
            <SelectItem value="changes_requested">
              Ajustes solicitados
            </SelectItem>
            <SelectItem value="all">
              Todas
            </SelectItem>
          </SelectContent>
        </Select>
        <SocialViewToggle v-model="viewMode" />
      </div>
    </div>

    <div v-if="pending" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <Skeleton v-for="index in 8" :key="index" class="aspect-square" />
    </div>

    <SocialContentBoard
      v-else
      :items="boardItems"
      :view-mode="viewMode"
      as-button
      empty-title="Nenhuma aprovação encontrada"
      empty-description="As artes enviadas para você aparecerão aqui."
      @select="onSelectItem"
    >
      <template #actions="{ item }">
        <template v-if="isPendingItem(item)">
          <Button size="sm" @click="openDecision(item.raw, 'approved')">
            <Icon name="lucide:check" class="mr-2 h-4 w-4" />
            Aprovar
          </Button>
          <Button size="sm" variant="outline" @click="openDecision(item.raw, 'changes_requested')">
            <Icon name="lucide:message-square-warning" class="mr-2 h-4 w-4" />
            Ajustes
          </Button>
        </template>
      </template>
    </SocialContentBoard>

    <Dialog v-model:open="reviewDialogOpen">
      <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{{ requestPost(activeRequest)?.title || 'Revisar publicação' }}</DialogTitle>
          <DialogDescription>
            Confira todas as peças desta versão antes de registrar sua decisão.
          </DialogDescription>
        </DialogHeader>

        <div v-if="activeRequest" class="space-y-6">
          <div
            class="grid gap-3"
            :class="requestAssets(activeRequest).length === 1 ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'"
          >
            <div
              v-for="asset in requestAssets(activeRequest)"
              :key="asset.id"
              class="overflow-hidden border rounded-xl bg-muted"
            >
              <img
                v-if="asset.mime_type?.startsWith('image/')"
                :src="asset.preview_url || undefined"
                :alt="asset.name"
                class="max-h-[65vh] w-full object-contain"
              >
              <video
                v-else-if="asset.mime_type?.startsWith('video/')"
                :src="asset.preview_url || undefined"
                class="max-h-[65vh] w-full"
                controls
              />
              <div v-else class="h-48 flex items-center justify-center">
                <Icon name="lucide:file" class="h-10 w-10 text-muted-foreground" />
              </div>
              <p class="truncate border-t bg-background px-3 py-2 text-xs">
                {{ asset.name }}
              </p>
            </div>
          </div>

          <div v-if="requestAssets(activeRequest, 'reference').length" class="space-y-3">
            <div>
              <h3 class="text-sm font-semibold">
                Referências
              </h3>
              <p class="text-xs text-muted-foreground">
                Materiais de apoio — não serão publicados.
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div
                v-for="asset in requestAssets(activeRequest, 'reference')"
                :key="asset.id"
                class="overflow-hidden border rounded-lg bg-muted"
              >
                <img
                  v-if="asset.mime_type?.startsWith('image/')"
                  :src="asset.preview_url || undefined"
                  :alt="asset.name"
                  class="aspect-square w-full object-cover"
                >
                <div v-else class="aspect-square flex items-center justify-center">
                  <Icon name="lucide:paperclip" class="h-7 w-7 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          <div class="border rounded-xl bg-muted/30 p-4">
            <p class="whitespace-pre-wrap text-sm">
              {{ requestPost(activeRequest)?.content || 'Sem texto-base' }}
            </p>
          </div>
        </div>

        <DialogFooter v-if="activeRequest?.status === 'pending'" class="gap-2">
          <Button
            variant="outline"
            @click="decideFromReview('changes_requested')"
          >
            Solicitar ajustes
          </Button>
          <Button @click="decideFromReview('approved')">
            Aprovar publicação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="decisionDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ decision === 'approved' ? 'Aprovar arte' : 'Solicitar ajustes' }}
          </DialogTitle>
          <DialogDescription>
            Sua decisão ficará registrada no histórico desta versão.
          </DialogDescription>
        </DialogHeader>
        <div class="py-2 space-y-2">
          <Label for="decision-comment">
            {{ decision === 'approved' ? 'Comentário opcional' : 'Descreva os ajustes necessários' }}
          </Label>
          <Textarea
            id="decision-comment"
            v-model="comment"
            class="min-h-28"
            :required="decision === 'changes_requested'"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="decisionDialogOpen = false">
            Cancelar
          </Button>
          <Button
            :variant="decision === 'approved' ? 'default' : 'destructive'"
            :disabled="saving || (decision === 'changes_requested' && !comment.trim())"
            @click="submitDecision"
          >
            Confirmar decisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
