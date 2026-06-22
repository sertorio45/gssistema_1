<script setup lang="ts">
import type { DrawflowExport } from '~/types/drawflow'
import type { WhatsAppFlowNodeType } from '~/types/whatsapp'

import { Background } from '@vue-flow/background'
import { VueFlow, applyEdgeChanges, applyNodeChanges, useVueFlow } from '@vue-flow/core'
import type { Connection, Edge, EdgeChange, Node, NodeChange, ViewportTransform } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import WhatsAppFlowNode from '~/components/whatsapp/flows/WhatsAppFlowNode.vue'
import FlowSmoothStepEdge from '~/components/whatsapp/flows/FlowSmoothStepEdge.vue'
import {
  WHATSAPP_FLOW_NODE_DEFINITIONS,
  WHATSAPP_FLOW_NODE_MAP,
} from '~/constants/whatsapp-flow-nodes'
import {
  drawflowToVueFlow,
  getNextFlowNodeId,
  vueFlowToDrawflow,
} from '~/lib/whatsapp-flow-canvas-convert'
import { layoutFlowNodes } from '~/lib/whatsapp-flow-layout'

const props = defineProps<{
  canvas?: DrawflowExport | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  'node-selected': [nodeId: number | null, data: Record<string, unknown> | null]
}>()

const nodeTypes = { whatsapp: WhatsAppFlowNode }
const edgeTypes = { smoothstep: FlowSmoothStepEdge }

function deleteFlowEdge(edgeId: string) {
  if (props.readonly)
    return

  edges.value = edges.value.filter(edge => edge.id !== edgeId)
}

provide('deleteFlowEdge', deleteFlowEdge)

const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])
const editorReady = ref(false)
const zoomPercent = ref(100)
const loadedCanvasSignature = ref('')

function buildCanvasSignature(canvas: DrawflowExport | null | undefined) {
  return JSON.stringify(canvas?.drawflow?.Home?.data ?? {})
}

function buildEdgeId(connection: Connection) {
  return `e-${connection.source}-${connection.sourceHandle || 'output_1'}-${connection.target}-${connection.targetHandle || 'input_1'}`
}

const { zoomIn, zoomOut, setViewport, fitView, onInit } = useVueFlow()

onInit(() => {
  editorReady.value = true
  nextTick(() => fitView({ padding: 0.2, duration: 200 }))
})

function onViewportChange(viewport: ViewportTransform) {
  zoomPercent.value = Math.round(viewport.zoom * 100)
}

function loadCanvas(canvas: DrawflowExport | null | undefined) {
  const signature = buildCanvasSignature(canvas)
  if (signature === loadedCanvasSignature.value && nodes.value.length)
    return

  loadedCanvasSignature.value = signature
  const converted = drawflowToVueFlow(canvas)
  nodes.value = converted.nodes
  edges.value = converted.edges

  if (editorReady.value) {
    nextTick(() => fitView({ padding: 0.2, duration: 200 }))
  }
}

watch(
  () => props.canvas,
  (canvas) => {
    loadCanvas(canvas)
  },
  { immediate: true },
)

function exportCanvas(): DrawflowExport {
  const canvas = vueFlowToDrawflow(nodes.value, edges.value)
  loadedCanvasSignature.value = buildCanvasSignature(canvas)
  return canvas
}

function addNode(type: WhatsAppFlowNodeType) {
  if (props.readonly)
    return

  const def = WHATSAPP_FLOW_NODE_MAP[type]
  if (!def)
    return

  if (type === 'trigger' && nodes.value.some(node => node.data?.nodeType === 'trigger'))
    return

  const id = String(getNextFlowNodeId(nodes.value))
  nodes.value = [
    ...nodes.value,
    {
      id,
      type: 'whatsapp',
      position: {
        x: 120 + Math.random() * 80,
        y: 120 + Math.random() * 80,
      },
      data: {
        ...def.defaultData,
        className: def.className,
      },
    },
  ]
}

function updateNodeData(nodeId: number, data: Record<string, unknown>) {
  const id = String(nodeId)
  nodes.value = nodes.value.map((node) => {
    if (node.id !== id)
      return node

    const def = WHATSAPP_FLOW_NODE_MAP[String(data.nodeType || node.data?.nodeType) as WhatsAppFlowNodeType]
    return {
      ...node,
      data: {
        ...data,
        className: def?.className || node.data?.className,
      },
    }
  })
}

function removeSelectedNode(nodeId: number) {
  if (props.readonly)
    return

  const id = String(nodeId)
  nodes.value = nodes.value.filter(node => node.id !== id)
  edges.value = edges.value.filter(edge => edge.source !== id && edge.target !== id)
  emit('node-selected', null, null)
}

function resetZoom() {
  setViewport({ x: 0, y: 0, zoom: 1 })
}

function autoLayout() {
  if (props.readonly || !nodes.value.length)
    return false

  nodes.value = layoutFlowNodes(nodes.value, edges.value)
  nextTick(() => fitView({ padding: 0.2, duration: 300 }))
  return true
}

function onNodeClick(event: { node: Node }) {
  edges.value = edges.value.map(edge => ({ ...edge, selected: false }))
  emit('node-selected', Number(event.node.id), event.node.data as Record<string, unknown>)
}

function onEdgeClick() {
  emit('node-selected', null, null)
}

function onPaneClick() {
  edges.value = edges.value.map(edge => ({ ...edge, selected: false }))
  emit('node-selected', null, null)
}

function onNodesChange(changes: NodeChange[]) {
  nodes.value = applyNodeChanges(changes, nodes.value)
}

function onEdgesChange(changes: EdgeChange[]) {
  edges.value = applyEdgeChanges(changes, edges.value)
}

function onConnect(connection: Connection) {
  const duplicate = edges.value.some(edge =>
    edge.source === connection.source
    && edge.target === connection.target
    && (edge.sourceHandle || 'output_1') === (connection.sourceHandle || 'output_1')
    && (edge.targetHandle || 'input_1') === (connection.targetHandle || 'input_1'),
  )
  if (duplicate)
    return

  edges.value = [
    ...edges.value,
    {
      id: buildEdgeId(connection),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? 'output_1',
      targetHandle: connection.targetHandle ?? 'input_1',
      type: 'smoothstep',
    },
  ]
}

function isValidConnection(connection: Connection) {
  if (connection.source === connection.target)
    return false

  const targetNode = nodes.value.find(node => node.id === connection.target)
  if (!targetNode)
    return false

  return String(targetNode.data?.nodeType || '') !== 'trigger'
}

defineExpose({
  exportCanvas,
  addNode,
  updateNodeData,
  removeSelectedNode,
  autoLayout,
  zoomIn,
  zoomOut,
  resetZoom,
  nodeDefinitions: WHATSAPP_FLOW_NODE_DEFINITIONS,
})
</script>

<template>
  <div class="flow-editor">
    <div class="flow-editor__chrome">
      <span class="flow-editor__hint">
        <span class="i-lucide-move mr-1.5 inline-block h-3.5 w-3.5" />
        Arraste o fundo para mover · conecte pelos pontos laterais
      </span>
      <span class="flow-editor__zoom">{{ zoomPercent }}%</span>
    </div>

    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :nodes-draggable="!readonly"
      :nodes-connectable="!readonly"
      :elements-selectable="!readonly"
      :edges-focusable="!readonly"
      :delete-key-code="readonly ? null : 'Delete'"
      :default-edge-options="{ type: 'smoothstep', interactionWidth: 24 }"
      :connection-radius="36"
      :connect-on-click="true"
      :elevate-edges-on-select="true"
      :is-valid-connection="isValidConnection"
      :min-zoom="0.35"
      :max-zoom="1.75"
      fit-view-on-init
      class="flow-editor__canvas"
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      @connect="onConnect"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
      @pane-click="onPaneClick"
      @viewport-change="onViewportChange"
    >
      <Background :gap="22" :size="1" pattern-color="hsl(var(--border) / 0.65)" />
    </VueFlow>

    <div v-if="!readonly" class="flow-editor__controls">
      <button
        type="button"
        class="flow-editor__control flow-editor__control--label"
        title="Organizar blocos automaticamente"
        @click="autoLayout()"
      >
        <Icon name="i-lucide-magnet" class="h-4 w-4" />
        <span>Organizar blocos</span>
      </button>
      <span class="flow-editor__controls-divider" aria-hidden="true" />
      <button type="button" class="flow-editor__control" title="Diminuir zoom" @click="zoomOut()">
        <Icon name="i-lucide-minus" class="h-4 w-4" />
      </button>
      <button type="button" class="flow-editor__control" title="Resetar zoom" @click="resetZoom">
        <span class="text-[11px] font-medium">{{ zoomPercent }}%</span>
      </button>
      <button type="button" class="flow-editor__control" title="Aumentar zoom" @click="zoomIn()">
        <Icon name="i-lucide-plus" class="h-4 w-4" />
      </button>
    </div>

    <div v-if="!editorReady" class="flow-editor__loader">
      <span class="i-lucide-loader-circle h-5 w-5 animate-spin text-primary" />
      <span>Carregando canvas...</span>
    </div>
  </div>
</template>

<style scoped>
.flow-editor {
  position: relative;
  height: 72vh;
  min-height: 560px;
  overflow: hidden;
  background: hsl(var(--background));
}

.flow-editor__chrome {
  pointer-events: none;
  position: absolute;
  inset: 0 0 auto;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid hsl(var(--border) / 0.55);
  background: linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.72));
  padding: 10px 14px;
  backdrop-filter: blur(8px);
}

.flow-editor__hint {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.flow-editor__zoom {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
}

.flow-editor__canvas {
  width: 100%;
  height: 100%;
  padding-top: 40px;
}

.flow-editor__controls {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 1px solid hsl(var(--border) / 0.8);
  border-radius: 12px;
  background: hsl(var(--background) / 0.92);
  padding: 4px;
  box-shadow: 0 8px 24px hsl(var(--foreground) / 0.08);
  backdrop-filter: blur(10px);
}

.flow-editor__controls-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background: hsl(var(--border) / 0.75);
}

.flow-editor__control {
  display: inline-flex;
  height: 32px;
  min-width: 32px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  color: hsl(var(--foreground));
  transition: background-color 0.15s ease;
}

.flow-editor__control--label {
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
}

.flow-editor__control:hover {
  background: hsl(var(--muted) / 0.65);
}

.flow-editor__loader {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background) / 0.55);
}
</style>
