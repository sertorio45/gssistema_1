<script setup lang="ts">
import type { WhatsAppLlmProvider } from '~/types/whatsapp'

import AgentModelSelect from '~/components/whatsapp/agents/AgentModelSelect.vue'
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
  title: 'Agente IA',
})

const route = useRoute()
const agentId = computed(() => route.params.id as string)
const { tenantId } = useTenant()
const { updateAgent, testAgent, addAgentTool, removeAgentTool } = useWhatsAppAgents()

const { data, pending, refresh } = await useAsyncData(
  () => `whatsapp-agent-${agentId.value}-${tenantId.value}`,
  async () => {
    if (!tenantId.value || !agentId.value)
      return null
    return $fetch<{ data: import('~/types/whatsapp').WhatsAppAgent }>(`/api/whatsapp/agents/${agentId.value}`, {
      query: { tenant_id: tenantId.value },
    })
  },
  { watch: [tenantId, agentId] },
)

const agent = computed(() => data.value?.data)

const form = reactive({
  name: '',
  description: '',
  llm_provider: 'ollama' as WhatsAppLlmProvider,
  model: 'qwen',
  system_prompt: '',
  is_active: true,
})

watch(agent, (value) => {
  if (!value)
    return
  form.name = value.name
  form.description = value.description || ''
  form.llm_provider = value.llmProvider
  form.model = value.model
  form.system_prompt = value.systemPrompt
  form.is_active = value.isActive
}, { immediate: true })

const saving = ref(false)
const testing = ref(false)
const testMessage = ref('Olá, preciso de ajuda.')
const testReply = ref('')
const toolForm = reactive({
  name: '',
  description: '',
  type: 'api' as 'api' | 'mcp',
  mcp_server: '',
})

async function handleSave() {
  saving.value = true
  try {
    await updateAgent(agentId.value, { ...form })
    await refresh()
    toast.success('Agente atualizado')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao salvar')
  }
  finally {
    saving.value = false
  }
}

async function handleTest() {
  testing.value = true
  testReply.value = ''
  try {
    const response = await testAgent(agentId.value, testMessage.value)
    testReply.value = response.data.reply
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro no teste')
  }
  finally {
    testing.value = false
  }
}

async function handleAddTool() {
  if (!toolForm.name.trim()) {
    toast.error('Informe o nome da ferramenta')
    return
  }

  try {
    await addAgentTool(agentId.value, {
      name: toolForm.name.trim(),
      type: toolForm.type,
      description: toolForm.description.trim() || undefined,
      mcp_server: toolForm.mcp_server.trim() || undefined,
    })
    toolForm.name = ''
    toolForm.description = ''
    toolForm.mcp_server = ''
    await refresh()
    toast.success('Ferramenta adicionada')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao adicionar ferramenta')
  }
}

async function handleRemoveTool(toolId: string) {
  try {
    await removeAgentTool(agentId.value, toolId)
    await refresh()
    toast.success('Ferramenta removida')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao remover')
  }
}

const internalTools = [
  { name: 'lookup_contact', description: 'Busca dados do contato' },
  { name: 'sync_crm', description: 'Sincroniza com CRM' },
  { name: 'add_tag', description: 'Adiciona etiqueta' },
  { name: 'resolve_conversation', description: 'Resolve conversa' },
]
</script>

<template>
  <div class="space-y-6">
    <WhatsAppPageHeader :title="agent?.name || 'Agente IA'">
      <template #actions>
        <NuxtLink to="/whatsapp/agents">
          <Button variant="outline">
            Voltar
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <Skeleton v-if="pending" class="h-48 w-full rounded-xl" />

    <div v-else-if="agent" class="grid gap-6 xl:grid-cols-3">
      <div class="space-y-6 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Configuração
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="name">Nome</Label>
              <Input id="name" v-model="form.name" />
            </div>

            <div class="space-y-2">
              <Label for="description">Descrição</Label>
              <Input id="description" v-model="form.description" />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label>Provedor</Label>
                <Select v-model="form.llm_provider">
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
                <Label for="model">Modelo</Label>
                <AgentModelSelect
                  id="model"
                  v-model="form.model"
                  :provider="form.llm_provider"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="prompt">Prompt do sistema</Label>
              <Textarea id="prompt" v-model="form.system_prompt" rows="8" />
            </div>

            <div class="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p class="text-sm font-medium">
                  Agente ativo
                </p>
                <p class="text-xs text-muted-foreground">
                  Disponível nos flows
                </p>
              </div>
              <Switch v-model:checked="form.is_active" />
            </div>

            <Button :disabled="saving" @click="handleSave">
              {{ saving ? 'Salvando...' : 'Salvar alterações' }}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Ferramentas internas
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div
              v-for="tool in internalTools"
              :key="tool.name"
              class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <p class="font-medium">
                  {{ tool.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ tool.description }}
                </p>
              </div>
              <Badge variant="secondary">
                Sempre ativa
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Ferramentas customizadas (MCP / API)
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div v-if="agent.tools?.length" class="space-y-2">
              <div
                v-for="tool in agent.tools"
                :key="tool.id"
                class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p class="font-medium">
                    {{ tool.name }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ tool.type }}
                  </p>
                </div>
                <Button variant="ghost" size="sm" @click="handleRemoveTool(tool.id)">
                  Remover
                </Button>
              </div>
            </div>
            <p v-else class="text-sm text-muted-foreground">
              Nenhuma ferramenta customizada.
            </p>

            <div class="grid gap-3 rounded-lg border border-dashed p-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label>Nome</Label>
                  <Input v-model="toolForm.name" placeholder="buscar_pedido" />
                </div>
                <div class="space-y-2">
                  <Label>Tipo</Label>
                  <Select v-model="toolForm.type">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api">
                        API
                      </SelectItem>
                      <SelectItem value="mcp">
                        MCP
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div class="space-y-2">
                <Label>Descrição</Label>
                <Input v-model="toolForm.description" placeholder="O que a ferramenta faz" />
              </div>
              <div v-if="toolForm.type === 'mcp'" class="space-y-2">
                <Label>Servidor MCP</Label>
                <Input v-model="toolForm.mcp_server" placeholder="https://..." />
              </div>
              <Button variant="outline" @click="handleAddTool">
                Adicionar ferramenta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card class="h-fit">
        <CardHeader>
          <CardTitle class="text-base">
            Testar agente
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="space-y-2">
            <Label>Mensagem de teste</Label>
            <Textarea v-model="testMessage" rows="3" />
          </div>
          <Button class="w-full" :disabled="testing" @click="handleTest">
            {{ testing ? 'Gerando...' : 'Enviar teste' }}
          </Button>
          <div v-if="testReply" class="rounded-lg border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
            {{ testReply }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
