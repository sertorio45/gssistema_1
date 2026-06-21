<script setup lang="ts">
import type { DrawflowExport } from '~/types/drawflow'
import type { WhatsAppFlowNodeType } from '~/types/whatsapp'

import {
  WHATSAPP_FLOW_NODE_DEFINITIONS,
  WHATSAPP_FLOW_NODE_MAP,
  buildDrawflowNodeHtml,
  createDefaultDrawflowCanvas,
} from '~/constants/whatsapp-flow-nodes'

const props = defineProps<{
  canvas?: DrawflowExport | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  'node-selected': [nodeId: number | null, data: Record<string, unknown> | null]
}>()

const containerRef = ref<HTMLElement | null>(null)
const editorReady = ref(false)
let editor: import('drawflow').default | null = null

function loadCanvas(canvas: DrawflowExport | null | undefined) {
  if (!editor)
    return

  if (canvas?.drawflow?.Home?.data)
    editor.import(canvas)
  else
    editor.import(createDefaultDrawflowCanvas())
}

async function initEditor() {
  if (!containerRef.value || editor)
    return

  const Drawflow = (await import('drawflow')).default

  editor = new Drawflow(containerRef.value)
  editor.reroute = true
  editor.curvature = 0.5
  editor.editor_mode = props.readonly ? 'view' : 'edit'
  editor.start()

  loadCanvas(props.canvas)

  editor.on('nodeSelected', (id: unknown) => {
    const nodeId = Number(id)
    const node = editor?.getNodeFromId(nodeId)
    emit('node-selected', nodeId, (node?.data as Record<string, unknown>) || null)
  })

  editor.on('nodeUnselected', () => {
    emit('node-selected', null, null)
  })

  editorReady.value = true
}

watch(
  () => props.canvas,
  (canvas) => {
    if (editorReady.value)
      loadCanvas(canvas)
  },
)

onMounted(() => {
  nextTick(() => initEditor())
})

onBeforeUnmount(() => {
  editor?.clear()
  editor = null
})

function exportCanvas(): DrawflowExport {
  return (editor?.export() || createDefaultDrawflowCanvas()) as DrawflowExport
}

function addNode(type: WhatsAppFlowNodeType) {
  if (!editor || props.readonly)
    return

  const def = WHATSAPP_FLOW_NODE_MAP[type]
  if (!def)
    return

  if (type === 'trigger') {
    const nodes = Object.values(editor.export().drawflow?.Home?.data || {})
    if (nodes.some(node => node.data?.nodeType === 'trigger'))
      return
  }

  const data = { ...def.defaultData }
  const rect = containerRef.value?.getBoundingClientRect()
  const baseX = rect ? Math.max(80, (rect.width / 2) - 90 - (editor.canvas_x || 0)) : 120
  const baseY = rect ? Math.max(80, (rect.height / 2) - 40 - (editor.canvas_y || 0)) : 120
  const posX = baseX + Math.random() * 80
  const posY = baseY + Math.random() * 80

  editor.addNode(
    type,
    def.inputs,
    def.outputs,
    posX,
    posY,
    def.className,
    data,
    buildDrawflowNodeHtml(def, data),
  )
}

function updateNodeData(nodeId: number, data: Record<string, unknown>) {
  if (!editor)
    return

  const node = editor.getNodeFromId(nodeId)
  if (!node)
    return

  const nodeType = String(data.nodeType || node.data?.nodeType) as WhatsAppFlowNodeType
  const def = WHATSAPP_FLOW_NODE_MAP[nodeType]
  if (!def)
    return

  editor.updateNodeDataFromId(nodeId, data)

  const contentEl = containerRef.value?.querySelector(`#node-${nodeId} .drawflow_content_node`) as HTMLElement | null
  if (contentEl)
    contentEl.innerHTML = buildDrawflowNodeHtml(def, data)
}

function removeSelectedNode(nodeId: number) {
  if (!editor || props.readonly)
    return
  editor.removeNodeId(String(nodeId))
  emit('node-selected', null, null)
}

function zoomIn() {
  editor?.zoom_in()
}

function zoomOut() {
  editor?.zoom_out()
}

function resetZoom() {
  editor?.zoom_reset()
}

defineExpose({
  exportCanvas,
  addNode,
  updateNodeData,
  removeSelectedNode,
  zoomIn,
  zoomOut,
  resetZoom,
  nodeDefinitions: WHATSAPP_FLOW_NODE_DEFINITIONS,
})
</script>

<template>
  <div class="drawflow-shell">
    <div
      ref="containerRef"
      class="drawflow-host"
      :class="{ 'drawflow-host--loading': !editorReady }"
    />
  </div>
</template>

<style scoped>
.drawflow-shell {
  height: 70vh;
  min-height: 560px;
  border-radius: 0.75rem;
  border: 1px solid hsl(var(--border));
  overflow: hidden;
  background:
    radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.2) 1px, transparent 0);
  background-size: 24px 24px;
}

.drawflow-host {
  width: 100%;
  height: 100%;
}

.drawflow-host--loading {
  opacity: 0.6;
}

:deep(.drawflow-node) {
  min-width: 180px;
  border-radius: 0.75rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  box-shadow: 0 8px 24px rgb(15 23 42 / 0.08);
}

:deep(.wf-node-trigger) {
  border-color: rgb(34 197 94 / 0.45);
}

:deep(.wf-node-message) {
  border-color: rgb(59 130 246 / 0.45);
}

:deep(.wf-node-condition) {
  border-color: rgb(245 158 11 / 0.45);
}

:deep(.wf-node-delay),
:deep(.wf-node-webhook) {
  border-color: rgb(168 85 247 / 0.35);
}

:deep(.wf-node-tag) {
  border-color: rgb(236 72 153 / 0.4);
}

:deep(.wf-node-crm) {
  border-color: rgb(20 184 166 / 0.4);
}

:deep(.wf-node-handoff) {
  border-color: rgb(249 115 22 / 0.45);
}

:deep(.wf-node__title) {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

:deep(.wf-node__body) {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.35;
  word-break: break-word;
}
</style>
