<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'blank',
  title: 'Briefing Blimber',
})

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const email = ref('')
const values = ref<Record<string, string>>({})
const saving = ref(false)
const submitted = ref(false)

const { data, pending, error } = await useAsyncData(
  () => `public-briefing-${token.value}`,
  () => $fetch<{ data: any }>(`/api/public/briefing/${token.value}`),
  { watch: [token] },
)

const briefing = computed(() => data.value?.data?.briefing || null)
const brand = computed(() => data.value?.data?.brand || { product: 'Blimber' })
const fields = computed(() => briefing.value?.fields || [])

watch(briefing, (value) => {
  if (!value)
    return
  const next: Record<string, string> = {}
  for (const field of value.fields || [])
    next[field.key] = String(value.values?.[field.key] || '')
  values.value = next
  if (value.readOnly)
    submitted.value = true
}, { immediate: true })

async function submit() {
  if (briefing.value?.requireEmailConfirm && !email.value.trim()) {
    toast.error('Informe seu e-mail')
    return
  }
  for (const field of fields.value) {
    if (field.required && !String(values.value[field.key] || '').trim()) {
      toast.error(`Preencha: ${field.label}`)
      return
    }
  }

  saving.value = true
  try {
    await $fetch(`/api/public/briefing/${token.value}/submit`, {
      method: 'POST',
      body: {
        email: email.value || null,
        payload: values.value,
      },
    })
    submitted.value = true
    toast.success('Briefing enviado')
  }
  catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Não foi possível enviar')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="mx-auto max-w-xl px-4 py-8 space-y-6">
      <div class="space-y-1">
        <p class="text-xs font-semibold tracking-wide text-primary uppercase">
          {{ brand.product || 'Blimber' }}
        </p>
        <h1 class="text-2xl font-bold tracking-tight">
          {{ briefing?.title || 'Briefing' }}
        </h1>
        <p v-if="brand.organizationName || brand.clientName" class="text-sm text-muted-foreground">
          <span v-if="brand.organizationName">{{ brand.organizationName }}</span>
          <span v-if="brand.organizationName && brand.clientName"> · </span>
          <span v-if="brand.clientName">{{ brand.clientName }}</span>
        </p>
      </div>

      <div v-if="pending" class="space-y-2">
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-24 w-full" />
      </div>

      <Card v-else-if="error">
        <CardContent class="p-6 text-sm text-destructive">
          Link inválido, expirado ou revogado.
        </CardContent>
      </Card>

      <Card v-else-if="submitted">
        <CardContent class="space-y-2 p-6">
          <h2 class="font-semibold">
            Obrigado!
          </h2>
          <p class="text-sm text-muted-foreground">
            Seu briefing foi enviado. A equipe Blimber / agência dará continuidade na produção.
          </p>
        </CardContent>
      </Card>

      <Card v-else>
        <CardContent class="space-y-4 p-4">
          <p
            v-if="briefing?.needsInfoMessage"
            class="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
          >
            {{ briefing.needsInfoMessage }}
          </p>

          <div v-if="briefing?.requireEmailConfirm" class="space-y-2">
            <Label>Seu e-mail</Label>
            <Input v-model="email" type="email" placeholder="voce@empresa.com" />
          </div>

          <div
            v-for="field in fields"
            :key="field.key"
            class="space-y-2"
          >
            <Label>
              {{ field.label }}
              <span v-if="field.required" class="text-destructive">*</span>
            </Label>
            <Textarea
              v-if="field.type === 'textarea'"
              v-model="values[field.key]"
              rows="3"
            />
            <Input
              v-else
              v-model="values[field.key]"
              :type="field.type === 'date' ? 'date' : 'text'"
            />
          </div>

          <Button class="w-full" :disabled="saving" @click="submit">
            Enviar briefing
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
