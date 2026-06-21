<script setup lang="ts">
import type { WhatsAppLlmProvider } from '~/types/whatsapp'

import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Novo agente IA',
})

const { createAgent } = useWhatsAppAgents()
const loading = ref(false)

const form = reactive({
  name: '',
  description: '',
  llm_provider: 'ollama' as WhatsAppLlmProvider,
  model: 'qwen',
  system_prompt: 'Você é um assistente de atendimento prestativo e objetivo. Responda sempre em português.',
})

watch(() => form.llm_provider, (provider) => {
  form.model = provider === 'ollama' ? 'qwen' : 'gpt-4o-mini'
})

async function handleSubmit() {
  if (!form.name.trim()) {
    toast.error('Informe o nome do agente')
    return
  }

  loading.value = true
  try {
    const agent = await createAgent({ ...form })
    toast.success('Agente criado')
    navigateTo(`/whatsapp/agents/${agent.id}`)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao criar agente')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <WhatsAppPageHeader
      title="Novo agente IA"
      description="Agentes usam Ollama (padrão) ou OpenAI nos flows e no atendimento."
    />

    <form class="space-y-4 rounded-xl border p-6" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <Label for="name">Nome</Label>
        <Input id="name" v-model="form.name" placeholder="Atendimento inicial" />
      </div>

      <div class="space-y-2">
        <Label for="description">Descrição</Label>
        <Input id="description" v-model="form.description" placeholder="Opcional" />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label>Provedor LLM</Label>
          <Select v-model="form.llm_provider">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ollama">
                Ollama (servidor)
              </SelectItem>
              <SelectItem value="openai">
                OpenAI
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="model">Modelo</Label>
          <Input id="model" v-model="form.model" placeholder="qwen" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="prompt">Prompt do sistema</Label>
        <Textarea id="prompt" v-model="form.system_prompt" rows="6" />
      </div>

      <div class="flex gap-2">
        <NuxtLink to="/whatsapp/agents">
          <Button type="button" variant="outline">
            Voltar
          </Button>
        </NuxtLink>
        <Button type="submit" :disabled="loading">
          {{ loading ? 'Salvando...' : 'Criar agente' }}
        </Button>
      </div>
    </form>
  </div>
</template>
