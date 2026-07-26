<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useWorkspace } from '~/composables/useWorkspace'

const props = defineProps<{
  open: boolean
  post: any | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  deleted: [result: any]
}>()

const social = useMarketingSocial()
const { can } = useWorkspace()

const saving = ref(false)
const reason = ref('')
const mode = ref<'system_and_remote' | 'system_only' | 'cancel_draft' | 'retry_remote'>('system_and_remote')
const confirmPhrase = ref('')
const lastResult = ref<any>(null)

const openProxy = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const variants = computed(() => props.post?.social_post_variants || [])
const hasRemote = computed(() =>
  variants.value.some((v: any) => v.external_post_id || v.external_media_id),
)
const isDraftLike = computed(() => {
  if (hasRemote.value)
    return false
  const pub = props.post?.publication_status
  const status = props.post?.status
  return ['not_scheduled', 'scheduled', null, undefined].includes(pub)
    || ['draft', 'pending_approval', 'changes_requested', 'approved', 'scheduled'].includes(status)
})

const canLocal = computed(() => can('marketing.social.delete.local'))
const canRemote = computed(() => can('marketing.social.delete.remote'))
const canForce = computed(() => can('marketing.social.delete.force'))
const canRetry = computed(() => can('marketing.social.delete.retry'))

const platforms = computed(() =>
  [...new Set(variants.value.map((v: any) => v.platform).filter(Boolean))],
)

watch(() => props.open, (isOpen) => {
  if (!isOpen)
    return
  lastResult.value = null
  reason.value = ''
  confirmPhrase.value = ''
  mode.value = isDraftLike.value
    ? 'cancel_draft'
    : hasRemote.value
      ? 'system_and_remote'
      : 'cancel_draft'
})

const remoteConfirmOk = computed(() =>
  mode.value !== 'system_and_remote' || confirmPhrase.value.trim().toUpperCase() === 'EXCLUIR',
)

async function submit(extra?: { forceCompleteLocal?: boolean, retry?: boolean }) {
  if (!props.post?.id)
    return

  const selectedMode = extra?.retry ? 'retry_remote' : mode.value

  if (selectedMode === 'system_only' && !reason.value.trim()) {
    toast.error('Informe o motivo da exclusão somente no sistema')
    return
  }
  if (selectedMode === 'system_and_remote' && !remoteConfirmOk.value) {
    toast.error('Digite EXCLUIR para confirmar a remoção nas redes')
    return
  }

  saving.value = true
  try {
    const response = await social.deletePost(props.post.id, {
      mode: selectedMode,
      reason: reason.value || null,
      confirmRemoteDeletion: selectedMode === 'system_and_remote',
      confirmLocalOnly: selectedMode === 'system_only',
      forceCompleteLocal: Boolean(extra?.forceCompleteLocal),
    })
    lastResult.value = (response as any)?.data || response
    const data = lastResult.value

    if (data?.localDeleted && data?.overallStatus !== 'partial' && data?.status !== 'partial') {
      toast.success(
        selectedMode === 'system_only'
          ? 'Excluído do sistema (conteúdo permanece nas redes)'
          : 'Exclusão concluída',
      )
      emit('deleted', data)
      openProxy.value = false
      return
    }

    if (data?.localDeleted) {
      toast.success('Exclusão local concluída com ressalvas remotas')
      emit('deleted', data)
      return
    }

    toast.message('Exclusão remota parcial — revise o resultado por rede')
  }
  catch (error: any) {
    const nested = error?.data?.data || error?.data
    if (nested?.platforms || nested?.status || nested?.overallStatus) {
      lastResult.value = nested
      toast.message(error?.data?.statusMessage || error?.statusMessage || 'Exclusão incompleta — revise o resultado por rede')
      return
    }
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível excluir')
  }
  finally {
    saving.value = false
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    deleted: 'Excluído',
    already_absent: 'Já estava ausente',
    failed: 'Falhou',
    manual_action_required: 'Requer ação manual',
    unsupported: 'Não suportado',
    skipped: 'Ignorado',
    pending: 'Pendente',
    processing: 'Processando',
  }
  return map[status] || status
}
</script>

<template>
  <Dialog v-model:open="openProxy">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Excluir publicação</DialogTitle>
        <DialogDescription>
          Escolha o modo com cuidado — a API valida permissões mesmo se o botão aparecer.
        </DialogDescription>
      </DialogHeader>

      <div v-if="post" class="space-y-4 text-sm">
        <div class="rounded-lg border p-3">
          <p class="text-xs text-muted-foreground">
            Título
          </p>
          <p class="font-medium">
            {{ post.title }}
          </p>
          <p class="mt-2 text-xs text-muted-foreground">
            Plataformas: {{ platforms.join(', ') || '—' }}
          </p>
          <ul class="mt-2 space-y-1">
            <li
              v-for="variant in variants"
              :key="variant.id"
              class="flex justify-between gap-2 text-xs"
            >
              <span>{{ variant.platform }} · {{ variant.format || '—' }}</span>
              <span class="text-muted-foreground">
                {{ variant.external_post_id ? 'Publicado' : 'Sem ID remoto' }}
              </span>
            </li>
          </ul>
        </div>

        <div v-if="!lastResult" class="space-y-3">
          <div v-if="isDraftLike && canLocal" class="space-y-2">
            <Button
              class="w-full justify-start"
              :variant="mode === 'cancel_draft' ? 'default' : 'outline'"
              @click="mode = 'cancel_draft'"
            >
              Cancelar e excluir rascunho
            </Button>
            <p class="text-xs text-muted-foreground">
              Cancela agendamento/jobs. Não chama Instagram/Facebook.
            </p>
          </div>

          <div v-if="hasRemote && canRemote" class="space-y-2">
            <Button
              class="w-full justify-start"
              :variant="mode === 'system_and_remote' ? 'default' : 'outline'"
              @click="mode = 'system_and_remote'"
            >
              Excluir do sistema e das redes
            </Button>
            <p class="text-xs text-muted-foreground">
              Modo padrão para posts publicados. Tenta apagar em cada rede e só então conclui o tombstone local.
            </p>
          </div>

          <div v-if="canLocal" class="space-y-2">
            <Button
              class="w-full justify-start"
              :variant="mode === 'system_only' ? 'secondary' : 'outline'"
              @click="mode = 'system_only'"
            >
              Excluir somente do sistema
            </Button>
            <p class="text-xs text-amber-700 dark:text-amber-400">
              O conteúdo permanecerá visível no Instagram/Facebook.
            </p>
          </div>

          <div v-if="mode === 'system_only' || mode === 'system_and_remote'" class="space-y-2">
            <Label>Motivo {{ mode === 'system_only' ? '(obrigatório)' : '(opcional)' }}</Label>
            <Textarea v-model="reason" class="min-h-20" placeholder="Por que esta exclusão?" />
          </div>

          <div v-if="mode === 'system_and_remote'" class="space-y-2">
            <Label>Digite EXCLUIR para confirmar a remoção nas redes</Label>
            <Input v-model="confirmPhrase" placeholder="EXCLUIR" autocomplete="off" />
          </div>
        </div>

        <div v-else class="space-y-3">
          <p class="font-medium">
            Resultado por rede
          </p>
          <div
            v-for="item in (lastResult.platforms || [])"
            :key="item.variantId || item.platform"
            class="rounded-lg border p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium capitalize">{{ item.platform }}</span>
              <Badge :variant="item.deleted ? 'secondary' : 'destructive'">
                {{ statusLabel(item.status) }}
              </Badge>
            </div>
            <p v-if="item.message" class="mt-1 text-xs text-muted-foreground">
              {{ item.message }}
            </p>
            <p v-if="item.permalink" class="mt-1 break-all text-xs text-primary">
              {{ item.permalink }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              v-if="lastResult.canRetry && canRetry"
              variant="outline"
              :disabled="saving"
              @click="submit({ retry: true })"
            >
              Tentar novamente
            </Button>
            <Button
              v-if="lastResult.canForceLocal && canForce && !lastResult.localDeleted"
              variant="secondary"
              :disabled="saving"
              @click="submit({ forceCompleteLocal: true })"
            >
              Forçar exclusão local
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="openProxy = false">
          {{ lastResult ? 'Fechar' : 'Cancelar' }}
        </Button>
        <Button
          v-if="!lastResult"
          variant="destructive"
          :disabled="saving || (mode === 'system_and_remote' && !remoteConfirmOk)"
          @click="submit()"
        >
          <Icon v-if="saving" name="lucide:loader-circle" class="mr-2 h-4 w-4 animate-spin" />
          Confirmar exclusão
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
