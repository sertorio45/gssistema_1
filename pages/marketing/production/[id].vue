<script setup lang="ts">
import type { SocialPostInput, SocialPostStatus } from '~/types/marketing-social'

import { toast } from 'vue-sonner'
import SocialDateTimePicker from '~/components/marketing/social/SocialDateTimePicker.vue'
import SocialPostForm from '~/components/marketing/social/SocialPostForm.vue'
import { ROLE_LABELS } from '~/constants/roles'
import { SOCIAL_STATUS_LABELS } from '~/types/marketing-social'

definePageMeta({
  middleware: ['auth'],
  title: 'Publicação',
})

const route = useRoute()
const social = useMarketingSocial()
const postId = computed(() => String(route.params.id))
const saving = ref(false)
const approvalDialogOpen = ref(false)
const scheduleDialogOpen = ref(false)
const pastScheduleDialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const selectedApprovers = ref<string[]>([])
const scheduleAt = ref('')
const newComment = ref('')
const pastPromptDismissed = ref(false)

const { data: members } = await useAsyncData(
  () => `marketing-social-approvers-${social.tenantId.value}`,
  async () => {
    const response = await $fetch<{ data: Array<{ userId: string, name: string, email: string, role: keyof typeof ROLE_LABELS, isPlatformAdmin: boolean }> }>(
      '/api/marketing/social/approvers',
      { query: { tenant_id: social.tenantId.value || undefined } },
    )
    return response.data
  },
  { watch: [social.tenantId], default: () => [] },
)

const { data: post, pending, refresh } = await useAsyncData(
  () => `marketing-social-post-${social.tenantId.value}-${postId.value}`,
  () => social.getPost(postId.value),
  { watch: [social.tenantId] },
)

const formValue = computed<SocialPostInput | undefined>(() => {
  const value = post.value as any
  if (!value)
    return undefined
  return {
    title: value.title,
    content: value.content,
    assignedTo: value.assigned_to,
    scheduledAt: value.scheduled_at,
    timezone: value.timezone,
    approvalPolicy: value.approval_policy,
    minimumApprovals: value.minimum_approvals,
    variants: (value.social_post_variants || []).map((variant: any) => ({
      id: variant.id,
      accountId: variant.account_id,
      platform: variant.platform,
      format: variant.format || 'static',
      caption: variant.caption,
      linkUrl: variant.link_url || undefined,
      hashtags: variant.hashtags || [],
      platformConfig: variant.platform_config || {},
      assetIds: (variant.social_post_assets || []).map((relation: any) => relation.media_assets?.id).filter(Boolean),
    })),
    referenceAssetIds: (value.all_assets || [])
      .filter((relation: any) => !relation.variant_id)
      .map((relation: any) => relation.media_assets?.id)
      .filter(Boolean),
  }
})

const postStatus = computed(() => String((post.value as any)?.status || ''))
const scheduledAtValue = computed(() => {
  const value = (post.value as any)?.scheduled_at
  return value ? String(value) : null
})
const hasApprovedVersion = computed(() => Boolean((post.value as any)?.approved_version_id))
const isSchedulePast = computed(() => {
  if (!scheduledAtValue.value)
    return false
  return new Date(scheduledAtValue.value).getTime() <= Date.now()
})
const needsScheduleChoice = computed(() =>
  postStatus.value === 'approved'
  && hasApprovedVersion.value
  && (!scheduledAtValue.value || isSchedulePast.value),
)

const canSubmit = computed(() => ['draft', 'changes_requested', 'failed'].includes(postStatus.value))
const canPublishNow = computed(() =>
  hasApprovedVersion.value
  && ['approved', 'scheduled', 'failed'].includes(postStatus.value),
)
const canReschedule = computed(() =>
  hasApprovedVersion.value
  && ['approved', 'scheduled', 'failed'].includes(postStatus.value),
)
const canShareStories = computed(() => {
  if (!['published', 'approved', 'scheduled'].includes(postStatus.value))
    return false
  const variants = (post.value as any)?.social_post_variants || []
  const isStory = variants.some((variant: any) => variant.format === 'story')
  if (isStory)
    return false
  return variants.some((variant: any) => variant.platform === 'facebook' || variant.platform === 'instagram')
})
const hasRemotePosts = computed(() =>
  ((post.value as any)?.social_post_variants || []).some((variant: any) => Boolean(variant.external_post_id)),
)

watch(
  () => [postStatus.value, scheduledAtValue.value, pastPromptDismissed.value] as const,
  ([status]) => {
    if (status === 'approved' && needsScheduleChoice.value && !pastPromptDismissed.value)
      pastScheduleDialogOpen.value = true
  },
  { immediate: true },
)

function formatDate(value?: string | null) {
  if (!value)
    return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function toggleApprover(userId: string) {
  const selected = new Set(selectedApprovers.value)
  if (selected.has(userId))
    selected.delete(userId)
  else
    selected.add(userId)
  selectedApprovers.value = [...selected]
}

function openScheduleDialog(prefill = true) {
  if (prefill && scheduledAtValue.value && !isSchedulePast.value)
    scheduleAt.value = scheduledAtValue.value.slice(0, 16)
  else
    scheduleAt.value = ''
  pastScheduleDialogOpen.value = false
  pastPromptDismissed.value = true
  scheduleDialogOpen.value = true
}

async function save(input: SocialPostInput) {
  saving.value = true
  try {
    await social.updatePost(postId.value, input)
    toast.success('Rascunho atualizado')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível atualizar')
  }
  finally {
    saving.value = false
  }
}

async function submitApproval() {
  if (!selectedApprovers.value.length)
    return
  saving.value = true
  try {
    await social.submitForApproval(postId.value, selectedApprovers.value)
    approvalDialogOpen.value = false
    selectedApprovers.value = []
    toast.success('Conteúdo enviado para aprovação')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível enviar')
  }
  finally {
    saving.value = false
  }
}

async function schedule() {
  saving.value = true
  try {
    await social.schedulePost(
      postId.value,
      scheduleAt.value ? new Date(scheduleAt.value).toISOString() : null,
    )
    scheduleDialogOpen.value = false
    pastPromptDismissed.value = true
    toast.success(scheduleAt.value ? 'Publicação agendada' : 'Publicação enfileirada')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível agendar')
  }
  finally {
    saving.value = false
  }
}

async function publishNow() {
  saving.value = true
  try {
    await social.schedulePost(postId.value, null, { publishNow: true })
    pastScheduleDialogOpen.value = false
    scheduleDialogOpen.value = false
    pastPromptDismissed.value = true
    toast.success('Publicação enfileirada para agora')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível publicar agora')
  }
  finally {
    saving.value = false
  }
}

async function shareStories() {
  saving.value = true
  try {
    const response = await social.shareToStories(postId.value, { publishNow: true })
    toast.success('Stories enfileirado a partir desta publicação')
    await navigateTo(`/marketing/production/${response.data.storyPostId}`)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível criar os Stories')
  }
  finally {
    saving.value = false
  }
}

async function addComment() {
  if (!newComment.value.trim())
    return
  saving.value = true
  try {
    await $fetch(`/api/marketing/social/posts/${postId.value}/comments`, {
      method: 'POST',
      body: {
        tenant_id: social.tenantId.value,
        body: newComment.value,
      },
    })
    newComment.value = ''
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível comentar')
  }
  finally {
    saving.value = false
  }
}

async function deletePost() {
  saving.value = true
  try {
    await social.deletePost(postId.value, { deleteRemote: true })
    toast.success(hasRemotePosts.value
      ? 'Publicação excluída no sistema e nas redes'
      : 'Publicação excluída')
    await navigateTo('/marketing/production')
  }
  catch (error: any) {
    const message = error?.data?.statusMessage || error?.message || 'Não foi possível excluir'
    if (error?.statusCode === 502 || error?.data?.statusCode === 502) {
      toast.error(`${message} Você pode forçar a exclusão só no sistema.`)
      return
    }
    toast.error(message)
  }
  finally {
    saving.value = false
  }
}

async function forceDeleteLocal() {
  saving.value = true
  try {
    await social.deletePost(postId.value, { deleteRemote: true, force: true })
    toast.success('Publicação excluída no sistema (redes com falha foram ignoradas)')
    await navigateTo('/marketing/production')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível excluir')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Button variant="ghost" class="mb-2 -ml-3" @click="navigateTo('/marketing/production')">
          <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
          Voltar para produção
        </Button>
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight">
            {{ (post as any)?.title || 'Publicação' }}
          </h1>
          <Badge v-if="post" variant="secondary">
            {{ SOCIAL_STATUS_LABELS[(post as any).status as SocialPostStatus] || (post as any).status }}
          </Badge>
        </div>
        <p v-if="scheduledAtValue" class="mt-2 text-sm text-muted-foreground">
          Agendada para {{ formatDate(scheduledAtValue) }}
          <span v-if="isSchedulePast && postStatus === 'approved'"> · horário já passou</span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="post"
          variant="ghost"
          class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          @click="deleteDialogOpen = true"
        >
          <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
          Excluir
        </Button>
        <Button v-if="canSubmit" variant="outline" @click="approvalDialogOpen = true">
          <Icon name="lucide:send" class="mr-2 h-4 w-4" />
          Enviar para aprovação
        </Button>
        <Button v-if="canReschedule" variant="outline" @click="openScheduleDialog()">
          <Icon name="lucide:calendar-clock" class="mr-2 h-4 w-4" />
          {{ postStatus === 'scheduled' ? 'Reagendar' : 'Agendar' }}
        </Button>
        <Button v-if="canShareStories" variant="outline" :disabled="saving" @click="shareStories">
          <Icon name="lucide:circle-fading-plus" class="mr-2 h-4 w-4" />
          Também nos Stories
        </Button>
        <Button v-if="canPublishNow" @click="publishNow">
          <Icon name="lucide:zap" class="mr-2 h-4 w-4" />
          Publicar agora
        </Button>
      </div>
    </div>

    <Alert v-if="canShareStories && postStatus === 'published'">
      <Icon name="lucide:sparkles" class="h-4 w-4" />
      <AlertTitle>Sugerido: compartilhar nos Stories</AlertTitle>
      <AlertDescription class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Este post já está no feed. Podemos criar Stories no Facebook/Instagram com a peça principal (upload novo no Facebook, exigência da Meta).
        </span>
        <Button size="sm" :disabled="saving" @click="shareStories">
          Publicar nos Stories
        </Button>
      </AlertDescription>
    </Alert>

    <Alert v-if="needsScheduleChoice">
      <Icon name="lucide:clock-alert" class="h-4 w-4" />
      <AlertTitle>
        {{ isSchedulePast ? 'Horário agendado já passou' : 'Defina quando publicar' }}
      </AlertTitle>
      <AlertDescription class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {{ isSchedulePast
            ? `O horário ${formatDate(scheduledAtValue)} já passou. Publique agora ou escolha outro horário.`
            : 'A arte foi aprovada, mas ainda não há data de publicação.' }}
        </span>
        <div class="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" @click="openScheduleDialog(false)">
            Escolher horário
          </Button>
          <Button size="sm" @click="publishNow">
            Publicar agora
          </Button>
        </div>
      </AlertDescription>
    </Alert>

    <Alert v-else-if="postStatus === 'scheduled'">
      <Icon name="lucide:calendar-check" class="h-4 w-4" />
      <AlertTitle>Publicação agendada</AlertTitle>
      <AlertDescription>
        Será enviada automaticamente em {{ formatDate(scheduledAtValue) }}. Você ainda pode publicar agora ou reagendar.
      </AlertDescription>
    </Alert>

    <Skeleton v-if="pending" class="h-96" />
    <SocialPostForm
      v-else-if="formValue"
      :initial-value="formValue"
      :saving="saving"
      @save="save"
    />

    <Card v-if="post">
      <CardHeader>
        <CardTitle>Comentários</CardTitle>
        <CardDescription>Centralize orientações e histórico de ajustes.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div v-if="(post as any).social_comments?.length" class="space-y-3">
          <div
            v-for="item in (post as any).social_comments"
            :key="item.id"
            class="border rounded-lg p-3"
          >
            <p class="whitespace-pre-wrap text-sm">
              {{ item.body }}
            </p>
            <p class="mt-2 text-xs text-muted-foreground">
              {{ new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.created_at)) }}
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <Textarea v-model="newComment" class="min-h-20" placeholder="Adicionar comentário" />
          <Button class="self-end" :disabled="saving || !newComment.trim()" @click="addComment">
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="approvalDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escolher aprovadores</DialogTitle>
          <DialogDescription>
            A versão atual será congelada e enviada aos usuários selecionados.
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-80 overflow-y-auto py-2 space-y-2">
          <button
            v-for="member in members"
            :key="member.userId"
            type="button"
            class="w-full flex items-center gap-3 border rounded-md p-3 text-left"
            :class="{ 'border-primary bg-primary/5': selectedApprovers.includes(member.userId) }"
            @click="toggleApprover(member.userId)"
          >
            <Checkbox :model-value="selectedApprovers.includes(member.userId)" />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">
                {{ member.name }}
              </p>
              <p class="truncate text-xs text-muted-foreground">
                {{ member.email }}
              </p>
              <Badge class="mt-1" variant="secondary">
                {{ ROLE_LABELS[member.role] || member.role }}
              </Badge>
            </div>
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="approvalDialogOpen = false">
            Cancelar
          </Button>
          <Button :disabled="saving || !selectedApprovers.length" @click="submitApproval">
            Enviar para aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="pastScheduleDialogOpen"
      @update:open="(open) => {
        pastScheduleDialogOpen = open
        if (!open)
          pastPromptDismissed = true
      }"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ isSchedulePast ? 'Horário já passou' : 'Quando publicar?' }}
          </DialogTitle>
          <DialogDescription>
            {{ isSchedulePast
              ? `A arte foi aprovada, mas ${formatDate(scheduledAtValue)} já passou.`
              : 'A arte foi aprovada. Publique agora ou escolha um horário.' }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:justify-between">
          <Button variant="outline" @click="openScheduleDialog(false)">
            Escolher outro horário
          </Button>
          <Button :disabled="saving" @click="publishNow">
            <Icon name="lucide:zap" class="mr-2 h-4 w-4" />
            Publicar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="scheduleDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar publicação</DialogTitle>
          <DialogDescription>
            Escolha data e hora, ou deixe vazio para enfileirar no próximo ciclo do worker.
          </DialogDescription>
        </DialogHeader>
        <div class="py-2 space-y-4">
          <SocialDateTimePicker
            v-model="scheduleAt"
            label="Data e hora da publicação"
            description="O horário será interpretado no fuso da empresa."
            placeholder="Publicar no próximo processamento"
            disable-past
          />
          <Button variant="secondary" class="w-full" :disabled="saving" @click="publishNow">
            <Icon name="lucide:zap" class="mr-2 h-4 w-4" />
            Publicar agora
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="scheduleDialogOpen = false">
            Cancelar
          </Button>
          <Button :disabled="saving" @click="schedule">
            Confirmar agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="deleteDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir esta publicação?</DialogTitle>
          <DialogDescription>
            {{ hasRemotePosts
              ? 'Vamos tentar apagar também no Instagram/Facebook quando houver ID externo. O histórico local será removido.'
              : 'O histórico de aprovações, comentários e agendamentos também será removido. As imagens permanecerão na biblioteca.' }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:justify-between">
          <Button variant="outline" :disabled="saving" @click="deleteDialogOpen = false">
            Cancelar
          </Button>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="hasRemotePosts"
              variant="secondary"
              :disabled="saving"
              @click="forceDeleteLocal"
            >
              Só no sistema
            </Button>
            <Button variant="destructive" :disabled="saving" @click="deletePost">
              <Icon v-if="saving" name="lucide:loader-circle" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Excluindo...' : (hasRemotePosts ? 'Excluir nas redes e no sistema' : 'Excluir publicação') }}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
