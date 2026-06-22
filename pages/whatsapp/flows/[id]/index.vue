<script setup lang="ts">
import type { WhatsAppFlow, WhatsAppFlowExecutionDetail } from '~/types/whatsapp'

import FlowEditor from '~/components/whatsapp/flows/FlowEditor.vue'
import FlowEditorToolbar from '~/components/whatsapp/flows/FlowEditorToolbar.vue'
import FlowExecutionPanel from '~/components/whatsapp/flows/FlowExecutionPanel.vue'
import FlowNodeInspector from '~/components/whatsapp/flows/FlowNodeInspector.vue'
import FlowNodePalette from '~/components/whatsapp/flows/FlowNodePalette.vue'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Skeleton } from '~/components/ui/skeleton'
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

const editorRef = ref<InstanceType<typeof FlowEditor> | null>(null)
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

function handleOrganizeFlow() {
  const organized = editorRef.value?.autoLayout()
  if (organized)
    toast.success('Blocos organizados')
  else
    toast.info('Adicione blocos ao canvas para organizar')
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
  selectedNodeId.value = null
  selectedNodeData.value = null
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
  <div class="space-y-4">
    <Skeleton v-if="pending" class="h-[78vh] w-full rounded-xl" />

    <template v-else-if="flow">
      <FlowEditorToolbar
        :flow="flow"
        :saving="saving"
        :action-loading="actionLoading"
        @back="navigateTo('/whatsapp/flows')"
        @save="handleSaveCanvas"
        @organize="handleOrganizeFlow"
        @test="handleTest"
        @toggle="handleToggle"
      />

      <Alert v-if="flow.status !== 'active'" class="border-amber-500/30 bg-amber-500/5">
        <span class="i-lucide-info h-4 w-4 text-amber-600" />
        <AlertTitle>Flow inativo</AlertTitle>
        <AlertDescription>
          Conecte o gatilho ao próximo bloco, clique em <strong>Salvar</strong> e depois em <strong>Ativar</strong>.
          O flow só responde a mensagens recebidas de outras pessoas.
        </AlertDescription>
      </Alert>

      <div class="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <FlowNodePalette
          @add-node="handleAddNode"
          @organize="handleOrganizeFlow"
          @zoom-in="editorRef?.zoomIn()"
          @zoom-out="editorRef?.zoomOut()"
          @reset-zoom="editorRef?.resetZoom?.()"
        />

        <div class="min-h-[72vh] overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm ring-1 ring-border/40">
          <ClientOnly>
            <FlowEditor
              ref="editorRef"
              :canvas="canvas"
              @node-selected="handleNodeSelected"
            />
            <template #fallback>
              <div class="flex h-[72vh] min-h-[560px] items-center justify-center text-sm text-muted-foreground">
                Carregando editor...
              </div>
            </template>
          </ClientOnly>
        </div>

        <div class="space-y-4">
          <FlowNodeInspector
            :node-id="selectedNodeId"
            :node-data="selectedNodeData"
            @update="handleNodeUpdate"
            @remove="handleNodeRemove"
          />

          <FlowExecutionPanel
            :executions="recentExecutions"
            :selected-execution-id="selectedExecutionId"
            :execution-detail="executionDetail"
            :loading-detail="executionDetailLoading"
            @select-execution="handleSelectExecution"
          />
        </div>
      </div>
    </template>
  </div>
</template>
