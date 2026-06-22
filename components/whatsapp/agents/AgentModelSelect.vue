<script setup lang="ts">
import type { WhatsAppLlmProvider } from '~/types/whatsapp'

import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'

const props = defineProps<{
  provider: WhatsAppLlmProvider
  disabled?: boolean
}>()

const model = defineModel<string>({ required: true })

const { tenantId } = useTenant()

const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
] as const

const { data: ollamaModels, pending: loadingOllama, error: ollamaError, refresh } = await useAsyncData(
  'whatsapp-ollama-models',
  async () => {
    if (!tenantId.value)
      return []

    const response = await $fetch<{ data: Array<{ name: string }> }>('/api/whatsapp/ollama/models', {
      query: { tenant_id: tenantId.value },
    })
    return response.data || []
  },
  { watch: [tenantId], default: () => [], server: false },
)

const ollamaOptions = computed(() => {
  const names = ollamaModels.value?.map(item => item.name) || []
  const current = model.value?.trim()

  if (current && !names.includes(current))
    return [current, ...names]

  return names
})

watch(() => props.provider, (provider) => {
  if (provider === 'openai') {
    if (!OPENAI_MODELS.includes(model.value as typeof OPENAI_MODELS[number]))
      model.value = 'gpt-4o-mini'
    return
  }

  const first = ollamaOptions.value[0]
  if (first && !ollamaOptions.value.includes(model.value))
    model.value = first
})

watch(ollamaOptions, (options) => {
  if (props.provider !== 'ollama' || !options.length)
    return

  if (!options.includes(model.value))
    model.value = options[0]
})
</script>

<template>
  <div class="space-y-1">
    <template v-if="provider === 'ollama'">
      <Skeleton v-if="loadingOllama" class="h-10 w-full" />

      <Select
        v-else-if="ollamaOptions.length"
        v-model="model"
        :disabled="disabled"
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um modelo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="name in ollamaOptions" :key="name" :value="name">
            {{ name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <div v-else class="space-y-2">
        <p class="text-sm text-muted-foreground">
          {{ ollamaError?.message || 'Nenhum modelo encontrado no servidor Ollama.' }}
        </p>
        <Button type="button" variant="outline" size="sm" @click="refresh()">
          Tentar novamente
        </Button>
      </div>
    </template>

    <Select
      v-else
      v-model="model"
      :disabled="disabled"
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione um modelo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="name in OPENAI_MODELS" :key="name" :value="name">
          {{ name }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
