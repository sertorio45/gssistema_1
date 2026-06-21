<script setup lang="ts">
import type { WhatsAppFlow, WhatsAppFlowExecutionDetail } from '~/types/whatsapp'

import DrawflowEditor from '~/components/whatsapp/flows/DrawflowEditor.vue'
import FlowNodeInspector from '~/components/whatsapp/flows/FlowNodeInspector.vue'
import FlowStatusBadge from '~/components/whatsapp/flows/FlowStatusBadge.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import {
  WHATSAPP_FLOW_NODE_DEFINITIONS,
} from '~/constants/whatsapp-flow-nodes'
import type { WhatsAppFlowNodeType } from '~/types/whatsapp'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Editor de flow',
})

const route = useRoute()
const flowId = computed(() => route.params.id as string)
const { tenantId } = useTenant()

const {
  fetchFlow,
  saveCanvas,
  toggleFlow,
  testFlow,
  fetchExecutionDetail,
} = useWhatsAppFlows()

const editorRef = ref<InstanceType<typeof DrawflowEditor> | null>(null)
const selectedNodeId = ref<number | null>(null)
const selectedNodeData = ref<Record<string, unknown> | null>(null)
const selectedExecutionId = ref<string | null>(null)
const executionDetail = ref<WhatsAppFlowExecutionDetail | null>(null)
const executionDetailLoading = ref(false)
const saving = ref(false)
const actionLoading = ref(false)

const { data, pending, refresh } = await useAsyncData(
  () => `whatsapp-flow-editor-${flowId.value}-${tenantId.value}`,
  async () => {
    if (!tenantId.value || !flowId.value)
      return null
    return fetchFlow(flowId.value)
  },
  { watch: [tenantId, flowId] },
)

const flow = computed(() => data.value?.data as WhatsAppFlow | undefined)
const canvas = computed(() => data.value?.canvas || null)
const recentExecutions = computed(() => data.value?.recentExecutions || [])

async function persistCanvas(showToast = true) {
  if (!editorRef.value)
    return false

  saving.value = true
  try {
    await saveCanvas(flowId.value, {
      canvas: editorRef.value.exportCanvas(),
    })
    if (showToast)
      toast.success('Flow salvo')
    await refresh()
    return true
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao salvar')
    return false
  }
  finally {
    saving.value = false
  }
}

async function handleSaveCanvas() {
  await persistCanvas(true)
}

async function handleToggle() {
  actionLoading.value = true
  try {
    if (flow.value?.status !== 'active') {
      const saved = await persistCanvas(false)
      if (!saved)
        return
    }

    const updated = await toggleFlow(flowId.value)
    toast.success(updated.status === 'active' ? 'Flow ativado' : 'Flow pausado')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro')
  }
  finally {
    actionLoading.value = false
  }
}

async function handleTest() {
  actionLoading.value = true
  try {
    const saved = await persistCanvas(false)
    if (!saved)
      return

    const response = await testFlow(flowId.value) as {
      ok?: boolean
      result?: { skipped?: boolean, reason?: string, isTest?: boolean }
    }

    if (response?.result?.skipped) {
      toast.warning(response.result.reason || 'Gatilho não correspondeu ao teste')
      return
    }

    toast.success('Teste executado. Mensagens foram enviadas para o número de teste (5511999999999).')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Teste falhou')
  }
  finally {
    actionLoading.value = false
  }
}

function handleAddNode(type: WhatsAppFlowNodeType) {
  editorRef.value?.addNode(type)
}

function handleNodeSelected(nodeId: number | null, nodeData: Record<string, unknown> | null) {
  selectedNodeId.value = nodeId
  selectedNodeData.value = nodeData
}

function handleNodeUpdate(nodeId: number, nodeData: Record<string, unknown>) {
  editorRef.value?.updateNodeData(nodeId, nodeData)
  selectedNodeData.value = { ...nodeData }
}

function handleNodeRemove(nodeId: number) {
  editorRef.value?.removeSelectedNode(nodeId)
}

async function handleSelectExecution(executionId: string) {
  if (selectedExecutionId.value === executionId) {
    selectedExecutionId.value = null
    executionDetail.value = null
    return
  }

  selectedExecutionId.value = executionId
  executionDetailLoading.value = true
  try {
    const response = await fetchExecutionDetail(executionId)
    executionDetail.value = response.data
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao carregar execução')
    selectedExecutionId.value = null
    executionDetail.value = null
  }
  finally {
    executionDetailLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <WhatsAppPageHeader
      :title="flow?.name || 'Editor'"
      description="Arraste blocos, conecte etapas e publique automações no chat."
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <NuxtLink to="/whatsapp/flows">
            <Button variant="outline">
              Voltar
            </Button>
          </NuxtLink>
          <Button variant="outline" :disabled="actionLoading" @click="handleTest">
            Testar
          </Button>
          <Button variant="outline" :disabled="saving" @click="handleSaveCanvas">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </Button>
          <Button :disabled="actionLoading || !flow" @click="handleToggle">
            {{ flow?.status === 'active' ? 'Pausar' : 'Ativar' }}
          </Button>
        </div>
      </template>
    </WhatsAppPageHeader>

    <Skeleton v-if="pending" class="h-[70vh] w-full rounded-xl" />

    <template v-else-if="flow">
      <div class="flex flex-wrap items-center gap-3">
        <FlowStatusBadge :status="flow.status" />
        <span class="text-sm text-muted-foreground">v{{ flow.version }}</span>
      </div>

      <Alert v-if="flow.status !== 'active'">
        <span class="i-lucide-info h-4 w-4" />
        <AlertTitle>Flow inativo</AlertTitle>
        <AlertDescription>
          Conecte o gatilho ao bloco de mensagem, clique em <strong>Salvar</strong> e depois em <strong>Ativar</strong>.
          O flow só responde a mensagens <strong>recebidas</strong> de outras pessoas (não às que você envia pelo WhatsApp conectado).
        </AlertDescription>
      </Alert>

      <div class="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <Card class="h-fit xl:sticky xl:top-4">
          <CardHeader class="pb-3">
            <CardTitle class="text-sm">
              Blocos
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <Button
              v-for="def in WHATSAPP_FLOW_NODE_DEFINITIONS"
              :key="def.type"
              variant="outline"
              class="h-auto w-full justify-start whitespace-normal py-2 text-left"
              @click="handleAddNode(def.type)"
            >
              <span :class="[def.icon, 'mr-2 h-4 w-4 shrink-0']" />
              <span>
                <span class="block text-sm font-medium">{{ def.label }}</span>
                <span class="block text-xs text-muted-foreground">{{ def.description }}</span>
              </span>
            </Button>
            <div class="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" @click="editorRef?.zoomOut()">
                −
              </Button>
              <Button variant="ghost" size="sm" @click="editorRef?.zoomIn()">
                +
              </Button>
              <Button variant="ghost" size="sm" @click="editorRef?.resetZoom?.()">
                Reset
              </Button>
            </div>
            <p class="pt-2 text-xs text-muted-foreground">
              Conecte arrastando do ponto <strong>azul</strong> (saída) até o ponto de entrada do próximo bloco. Arraste o fundo para mover o canvas.
            </p>
          </CardContent>
        </Card>

        <div class="min-h-[70vh] overflow-hidden rounded-xl border">
          <ClientOnly>
            <DrawflowEditor
              ref="editorRef"
              :canvas="canvas"
              @node-selected="handleNodeSelected"
            />
            <template #fallback>
              <div class="flex h-[70vh] min-h-[560px] items-center justify-center text-sm text-muted-foreground">
                Carregando editor...
              </div>
            </template>
          </ClientOnly>
        </div>

        <div class="space-y-4 xl:sticky xl:top-4">
          <FlowNodeInspector
            :node-id="selectedNodeId"
            :node-data="selectedNodeData"
            @update="handleNodeUpdate"
            @remove="handleNodeRemove"
          />

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm">
                Execuções recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div v-if="!recentExecutions.length" class="py-4 text-sm text-muted-foreground">
                Nenhuma execução ainda.
              </div>
              <div v-else class="space-y-2 text-sm">
                <button
                  v-for="execution in recentExecutions"
                  :key="execution.id"
                  type="button"
                  class="w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  :class="{ 'border-primary bg-primary/5': selectedExecutionId === execution.id }"
                  @click="handleSelectExecution(execution.id)"
                >
                  <p class="font-medium capitalize">
                    {{ execution.status }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ new Date(execution.startedAt).toLocaleString('pt-BR') }}
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card v-if="selectedExecutionId">
            <CardHeader class="pb-2">
              <CardTitle class="text-sm">
                Detalhes da execução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton v-if="executionDetailLoading" class="h-24 w-full" />
              <div v-else-if="executionDetail?.logs?.length" class="space-y-2">
                <div
                  v-for="log in executionDetail.logs"
                  :key="log.id"
                  class="rounded-md border px-3 py-2 text-xs"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium capitalize">{{ log.action }}</span>
                    <span class="text-muted-foreground">
                      {{ new Date(log.executedAt).toLocaleTimeString('pt-BR') }}
                    </span>
                  </div>
                  <p v-if="log.error" class="mt-1 text-destructive">
                    {{ log.error }}
                  </p>
                  <p v-else-if="Object.keys(log.output || {}).length" class="mt-1 text-muted-foreground">
                    {{ JSON.stringify(log.output) }}
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-muted-foreground">
                Nenhum log registrado.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>
