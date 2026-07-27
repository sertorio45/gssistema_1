<script setup lang="ts">
import ApprovalMediaPreview from '@/components/marketing/social/ApprovalMediaPreview.vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'blank',
  title: 'Revisão Blimber',
})

const route = useRoute()
const token = computed(() => String(route.params.token || ''))

const actorEmail = ref('')
const comment = ref('')
const decisionMode = ref<'approved' | 'changes_requested' | 'rejected' | null>(null)
const changeCategory = ref('art')
const saving = ref(false)
const annotateMode = ref(false)
const pendingAnchor = ref<{
  anchorType: 'image' | 'carousel' | 'video'
  xPercent: number | null
  yPercent: number | null
  slideIndex: number | null
  mediaTimeMs: number | null
} | null>(null)

const { data, pending, error, refresh } = await useAsyncData(
  () => `public-review-${token.value}`,
  () => $fetch<{ data: any }>(`/api/public/review/${token.value}`),
  { watch: [token] },
)

const review = computed(() => data.value?.data || null)
const content = computed(() => review.value?.content || null)
const brand = computed(() => review.value?.brand || { product: 'Blimber' })
const canAct = computed(() =>
  Boolean(review.value?.review && !review.value.review.readOnly && (review.value.review.allowedActions || []).length),
)

const assets = computed(() =>
  (content.value?.assets || []).map((asset: any) => ({
    ...asset,
    preview_url: asset.preview_url,
    mime_type: asset.mime_type,
    purpose: asset.purpose || 'publication',
  })),
)

const pins = computed(() =>
  (review.value?.comments || [])
    .filter((item: any) => item.anchorType && item.anchorType !== 'none' && item.xPercent != null)
    .map((item: any) => ({
      id: item.id,
      xPercent: Number(item.xPercent),
      yPercent: Number(item.yPercent),
      slideIndex: item.slideIndex,
      mediaTimeMs: item.mediaTimeMs,
      body: item.body,
    })),
)

function onPin(payload: any) {
  pendingAnchor.value = payload
  annotateMode.value = false
  toast.message('Marcação adicionada — escreva o comentário')
}

async function submitDecision() {
  if (!decisionMode.value)
    return
  if ((decisionMode.value === 'changes_requested' || decisionMode.value === 'rejected') && !comment.value.trim()) {
    toast.error('Descreva o motivo')
    return
  }
  if (review.value?.review?.requireEmailConfirm && !actorEmail.value.trim()) {
    toast.error('Informe seu e-mail')
    return
  }

  saving.value = true
  try {
    await $fetch(`/api/public/review/${token.value}/decision`, {
      method: 'POST',
      body: {
        decision: decisionMode.value,
        comment: comment.value || null,
        changeCategory: decisionMode.value === 'changes_requested' ? changeCategory.value : null,
        actorEmail: actorEmail.value || undefined,
      },
    })
    toast.success(
      decisionMode.value === 'approved'
        ? 'Conteúdo aprovado'
        : decisionMode.value === 'rejected'
          ? 'Conteúdo rejeitado'
          : 'Alterações solicitadas',
    )
    decisionMode.value = null
    comment.value = ''
    await refresh()
  }
  catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Não foi possível registrar a decisão')
  }
  finally {
    saving.value = false
  }
}

async function sendComment() {
  if (!comment.value.trim())
    return
  saving.value = true
  try {
    await $fetch(`/api/public/review/${token.value}/comment`, {
      method: 'POST',
      body: {
        body: comment.value,
        actorEmail: actorEmail.value || undefined,
        anchorType: pendingAnchor.value?.anchorType || 'none',
        xPercent: pendingAnchor.value?.xPercent ?? null,
        yPercent: pendingAnchor.value?.yPercent ?? null,
        slideIndex: pendingAnchor.value?.slideIndex ?? null,
        mediaTimeMs: pendingAnchor.value?.mediaTimeMs ?? null,
      },
    })
    toast.success('Comentário enviado')
    comment.value = ''
    pendingAnchor.value = null
    await refresh()
  }
  catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Não foi possível comentar')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-background text-foreground">
    <header class="border-b">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <div>
          <p class="text-lg font-semibold tracking-tight">
            Blimber
          </p>
          <p v-if="brand.organizationName" class="text-xs text-muted-foreground">
            Conteúdo de {{ brand.organizationName }}
          </p>
        </div>
        <Badge v-if="review?.review?.status" variant="secondary">
          {{ review.review.status === 'pending' ? 'Aguardando' : review.review.status }}
        </Badge>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-6">
      <div v-if="pending" class="space-y-4">
        <Skeleton class="h-10 w-48" />
        <Skeleton class="h-80 w-full rounded-xl" />
      </div>

      <Alert v-else-if="error" variant="destructive">
        <AlertTitle>Link indisponível</AlertTitle>
        <AlertDescription>
          {{ (error as any)?.data?.statusMessage || 'Este link é inválido, expirou ou foi revogado.' }}
        </AlertDescription>
      </Alert>

      <div v-else-if="review" class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section class="space-y-4">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">
              {{ content?.title }}
            </h1>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ content?.versionLabel || 'Versão atual' }}
              <span v-if="content?.scheduledAt">
                · {{ new Date(content.scheduledAt).toLocaleString('pt-BR') }}
              </span>
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Badge
              v-for="platform in content?.platforms || []"
              :key="platform"
              variant="outline"
            >
              {{ platform }}
            </Badge>
            <Badge
              v-for="format in content?.formats || []"
              :key="format"
              variant="secondary"
            >
              {{ format }}
            </Badge>
          </div>

          <ApprovalMediaPreview
            :assets="assets"
            :format="content?.formats?.[0]"
            :annotate="annotateMode && canAct"
            :pins="pins"
            @pin="onPin"
          />

          <div class="rounded-xl border p-4">
            <h2 class="text-sm font-semibold">
              Legenda
            </h2>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {{ content?.caption || 'Sem legenda' }}
            </p>
            <p v-if="content?.hashtags?.length" class="mt-2 text-xs text-muted-foreground">
              {{ content.hashtags.join(' ') }}
            </p>
            <p v-if="content?.cta" class="mt-2 text-xs">
              CTA: {{ content.cta }}
            </p>
          </div>
        </section>

        <aside class="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div class="rounded-xl border p-4">
            <h2 class="font-semibold">
              Sua revisão
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Use os controles abaixo. Comentários internos da agência não aparecem aqui.
            </p>

            <div v-if="review.review.requireEmailConfirm || canAct" class="mt-4 space-y-2">
              <Label>Seu e-mail</Label>
              <Input v-model="actorEmail" type="email" placeholder="voce@empresa.com" />
            </div>

            <div v-if="canAct" class="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                @click="annotateMode = !annotateMode"
              >
                {{ annotateMode ? 'Cancelar marcação' : 'Marcar na arte' }}
              </Button>
            </div>

            <div v-if="canAct" class="mt-4 space-y-2">
              <Textarea
                v-model="comment"
                class="min-h-24"
                placeholder="Comentário ou justificativa…"
              />
              <div class="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  :disabled="saving || !comment.trim()"
                  @click="sendComment"
                >
                  Comentar
                </Button>
                <Button
                  size="sm"
                  :disabled="saving"
                  @click="decisionMode = 'approved'; void submitDecision()"
                >
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="saving"
                  @click="decisionMode = 'changes_requested'"
                >
                  Solicitar alterações
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  :disabled="saving"
                  @click="decisionMode = 'rejected'"
                >
                  Rejeitar
                </Button>
              </div>
            </div>

            <div
              v-if="decisionMode === 'changes_requested' || decisionMode === 'rejected'"
              class="mt-4 space-y-3 rounded-lg border p-3"
            >
              <Select v-if="decisionMode === 'changes_requested'" v-model="changeCategory">
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="art">
                    Arte
                  </SelectItem>
                  <SelectItem value="copy">
                    Texto
                  </SelectItem>
                  <SelectItem value="date">
                    Data
                  </SelectItem>
                  <SelectItem value="platform">
                    Rede
                  </SelectItem>
                  <SelectItem value="incorrect_info">
                    Informação incorreta
                  </SelectItem>
                  <SelectItem value="other">
                    Outro
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button class="w-full" :disabled="saving" @click="submitDecision">
                Confirmar {{ decisionMode === 'rejected' ? 'rejeição' : 'pedido de alterações' }}
              </Button>
            </div>

            <Alert v-if="!canAct" class="mt-4">
              <AlertTitle>Somente leitura</AlertTitle>
              <AlertDescription>
                Este link não aceita novas decisões. Peça um novo link à agência se precisar revisar outra versão.
              </AlertDescription>
            </Alert>
          </div>

          <div class="rounded-xl border p-4">
            <h2 class="text-sm font-semibold">
              Comentários
            </h2>
            <div class="mt-3 space-y-3">
              <div
                v-for="item in review.comments || []"
                :key="item.id"
                class="rounded-lg border p-3 text-sm"
              >
                <p class="text-xs text-muted-foreground">
                  {{ new Date(item.createdAt).toLocaleString('pt-BR') }}
                  <span v-if="item.anchorType === 'video'">
                    · {{ Math.floor((item.mediaTimeMs || 0) / 1000) }}s
                  </span>
                </p>
                <p class="mt-1 whitespace-pre-wrap">
                  {{ item.body }}
                </p>
              </div>
              <p v-if="!(review.comments || []).length" class="text-sm text-muted-foreground">
                Nenhum comentário compartilhado ainda.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <footer class="border-t py-6 text-center text-xs text-muted-foreground">
      Powered by Blimber
    </footer>
  </div>
</template>
