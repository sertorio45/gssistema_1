<script setup lang="ts">
import type { WhatsAppLlmProvider } from '~/types/whatsapp'

import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Configurações WhatsApp',
})

const { settings, pending, saveSettings, testOllama } = useWhatsAppSettings()

const generalForm = reactive({
  welcome_message: '',
  auto_resolve_hours: 0,
  default_priority: 0,
  business_hours_enabled: false,
  business_hours_start: '09:00',
  business_hours_end: '18:00',
  business_hours_timezone: 'America/Sao_Paulo',
  notify_new_conversation: true,
})

const llmForm = reactive({
  default_provider: 'ollama' as WhatsAppLlmProvider,
  default_model: 'qwen',
})

watch(settings, (value) => {
  if (!value)
    return
  Object.assign(generalForm, value.general)
  Object.assign(llmForm, value.llm)
}, { immediate: true })

const saving = ref(false)
const testingOllama = ref(false)

async function handleSaveGeneral() {
  saving.value = true
  try {
    await saveSettings({ general: { ...generalForm } })
    toast.success('Configurações gerais salvas')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao salvar')
  }
  finally {
    saving.value = false
  }
}

async function handleSaveLlm() {
  saving.value = true
  try {
    await saveSettings({ llm: { ...llmForm } })
    toast.success('Configurações de IA salvas')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao salvar')
  }
  finally {
    saving.value = false
  }
}

async function handleTestOllama() {
  testingOllama.value = true
  try {
    const response = await testOllama(llmForm.default_model)
    toast.success(`Ollama respondeu: ${response.data.reply}`)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Falha na conexão Ollama')
  }
  finally {
    testingOllama.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <WhatsAppPageHeader title="Configurações" description="Horários, notificações e integração com Ollama." />

    <Skeleton v-if="pending" class="h-48 w-full rounded-xl" />

    <div v-else class="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Geral
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>Mensagem de boas-vindas</Label>
            <Textarea v-model="generalForm.welcome_message" rows="3" placeholder="Opcional" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Auto-resolver após (horas)</Label>
              <Input v-model.number="generalForm.auto_resolve_hours" type="number" min="0" />
            </div>
            <div class="space-y-2">
              <Label>Prioridade padrão</Label>
              <Input v-model.number="generalForm.default_priority" type="number" min="0" max="5" />
            </div>
          </div>

          <div class="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p class="text-sm font-medium">
                Horário comercial
              </p>
              <p class="text-xs text-muted-foreground">
                Restringe respostas automáticas
              </p>
            </div>
            <Switch v-model:checked="generalForm.business_hours_enabled" />
          </div>

          <div v-if="generalForm.business_hours_enabled" class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Início</Label>
              <Input v-model="generalForm.business_hours_start" type="time" />
            </div>
            <div class="space-y-2">
              <Label>Fim</Label>
              <Input v-model="generalForm.business_hours_end" type="time" />
            </div>
          </div>

          <div class="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p class="text-sm font-medium">
                Notificar nova conversa
              </p>
            </div>
            <Switch v-model:checked="generalForm.notify_new_conversation" />
          </div>

          <Button :disabled="saving" @click="handleSaveGeneral">
            Salvar geral
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex items-center justify-between gap-2">
            <CardTitle class="text-base">
              Inteligência artificial (Ollama)
            </CardTitle>
            <Badge :variant="settings?.ollamaConfigured ? 'default' : 'destructive'">
              {{ settings?.ollamaConfigured ? 'Conectado' : 'Não configurado' }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <p class="text-sm text-muted-foreground">
            A conexão com o Ollama é configurada nas variáveis de ambiente do servidor.
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Provedor padrão</Label>
              <Select v-model="llmForm.default_provider">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ollama">
                    Ollama
                  </SelectItem>
                  <SelectItem value="openai">
                    OpenAI
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Modelo padrão</Label>
              <Input v-model="llmForm.default_model" placeholder="qwen" />
            </div>
          </div>

          <div class="flex gap-2">
            <Button variant="outline" :disabled="testingOllama" @click="handleTestOllama">
              {{ testingOllama ? 'Testando...' : 'Testar Ollama' }}
            </Button>
            <Button :disabled="saving" @click="handleSaveLlm">
              Salvar IA
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
