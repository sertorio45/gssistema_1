<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth'],
  title: 'Guia de comunicação',
})

const social = useMarketingSocial()
const { can } = useWorkspace()
const saving = ref(false)
const canManage = computed(() => can('marketing.social.brand_guide.manage'))

const form = ref({
  toneOfVoice: '',
  audience: '',
  allowedWords: '',
  forbiddenWords: '',
  ctas: '',
  hashtags: '',
  restrictions: '',
  legalNotes: '',
})

const { pending, refresh } = await useAsyncData(
  () => `brand-guide-${social.tenantId.value}`,
  async () => {
    const response = await $fetch<{ data: any }>('/api/marketing/social/brand-guide', {
      query: { tenant_id: social.tenantId.value || undefined },
    })
    const row = response.data
    if (row) {
      form.value = {
        toneOfVoice: row.tone_of_voice || '',
        audience: row.audience || '',
        allowedWords: (row.allowed_words || []).join(', '),
        forbiddenWords: (row.forbidden_words || []).join(', '),
        ctas: (row.ctas || []).join('\n'),
        hashtags: (row.hashtags || []).join(', '),
        restrictions: row.restrictions || '',
        legalNotes: row.legal_notes || '',
      }
    }
    return row
  },
  { watch: [social.tenantId] },
)

function splitList(value: string, separator: RegExp | string = /,|\n/) {
  return value
    .split(separator)
    .map(item => item.trim())
    .filter(Boolean)
}

async function save() {
  if (!canManage.value)
    return
  saving.value = true
  try {
    await $fetch('/api/marketing/social/brand-guide', {
      method: 'POST',
      body: {
        toneOfVoice: form.value.toneOfVoice,
        audience: form.value.audience,
        allowedWords: splitList(form.value.allowedWords),
        forbiddenWords: splitList(form.value.forbiddenWords),
        ctas: splitList(form.value.ctas, /\n/),
        hashtags: splitList(form.value.hashtags),
        restrictions: form.value.restrictions,
        legalNotes: form.value.legalNotes,
      },
    })
    toast.success('Guia salvo')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Falha ao salvar')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Guia de comunicação
        </h1>
        <p class="mt-1 text-muted-foreground">
          Tom de voz, público, palavras e restrições deste cliente.
        </p>
      </div>
      <Button v-if="canManage && !pending" :disabled="saving" @click="save">
        Salvar
      </Button>
    </div>

    <MarketingPageSkeleton v-if="pending" variant="detail" />

    <Card v-else>
      <CardContent class="space-y-4 p-4">
        <div class="space-y-2">
          <Label>Tom de voz</Label>
          <Textarea v-model="form.toneOfVoice" rows="3" :disabled="!canManage" />
        </div>
        <div class="space-y-2">
          <Label>Público</Label>
          <Textarea v-model="form.audience" rows="3" :disabled="!canManage" />
        </div>
        <div class="space-y-2">
          <Label>Palavras permitidas (separadas por vírgula)</Label>
          <Input v-model="form.allowedWords" :disabled="!canManage" />
        </div>
        <div class="space-y-2">
          <Label>Palavras proibidas</Label>
          <Input v-model="form.forbiddenWords" :disabled="!canManage" />
        </div>
        <div class="space-y-2">
          <Label>CTAs (um por linha)</Label>
          <Textarea v-model="form.ctas" rows="3" :disabled="!canManage" />
        </div>
        <div class="space-y-2">
          <Label>Hashtags</Label>
          <Input v-model="form.hashtags" :disabled="!canManage" />
        </div>
        <div class="space-y-2">
          <Label>Restrições</Label>
          <Textarea v-model="form.restrictions" rows="3" :disabled="!canManage" />
        </div>
        <div class="space-y-2">
          <Label>Observações legais</Label>
          <Textarea v-model="form.legalNotes" rows="3" :disabled="!canManage" />
        </div>
      </CardContent>
    </Card>
  </div>
</template>
