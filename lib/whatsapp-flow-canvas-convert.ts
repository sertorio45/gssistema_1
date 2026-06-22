import type { Edge, Node } from '@vue-flow/core'

import type { DrawflowExport, DrawflowNode } from '~/types/drawflow'
import type { WhatsAppFlowNodeType } from '~/types/whatsapp'

import {
  WHATSAPP_FLOW_NODE_MAP,
  buildDrawflowNodeHtml,
  createDefaultDrawflowCanvas,
} from '~/constants/whatsapp-flow-nodes'

function buildDrawflowPorts(count: number, prefix: 'input' | 'output') {
  const ports: Record<string, { connections: [] }> = {}
  for (let i = 1; i <= count; i++)
    ports[`${prefix}_${i}`] = { connections: [] }
  return ports
}

function resolveNodeType(node: DrawflowNode): WhatsAppFlowNodeType {
  return String(node.data?.nodeType || node.name) as WhatsAppFlowNodeType
}

export function drawflowToVueFlow(canvas: DrawflowExport | null | undefined): {
  nodes: Node[]
  edges: Edge[]
} {
  const data = canvas?.drawflow?.Home?.data
  if (!data || !Object.keys(data).length)
    return drawflowToVueFlow(createDefaultDrawflowCanvas())

  const nodes: Node[] = []
  const edges: Edge[] = []

  for (const [id, node] of Object.entries(data)) {
    const nodeType = resolveNodeType(node)
    const def = WHATSAPP_FLOW_NODE_MAP[nodeType]

    nodes.push({
      id: String(id),
      type: 'whatsapp',
      position: { x: node.pos_x, y: node.pos_y },
      data: {
        ...(node.data || {}),
        nodeType,
        className: def?.className || node.class || '',
      },
    })

    for (const [outputKey, output] of Object.entries(node.outputs || {})) {
      for (const conn of output.connections || []) {
        edges.push({
          id: `${id}-${outputKey}-${conn.node}-${conn.input || 'input_1'}`,
          source: String(id),
          target: String(conn.node),
          sourceHandle: outputKey,
          targetHandle: conn.input || 'input_1',
          type: 'smoothstep',
        })
      }
    }
  }

  return { nodes, edges }
}

export function vueFlowToDrawflow(nodes: Node[], edges: Edge[]): DrawflowExport {
  const data: Record<string, DrawflowNode> = {}

  for (const node of nodes) {
    const nodeType = String(node.data?.nodeType || '') as WhatsAppFlowNodeType
    const def = WHATSAPP_FLOW_NODE_MAP[nodeType]
    const nodeData = { ...(node.data || {}) }
    delete nodeData.className

    data[node.id] = {
      id: Number(node.id),
      name: nodeType,
      data: nodeData,
      class: String(node.data?.className || def?.className || ''),
      html: def ? buildDrawflowNodeHtml(def, nodeData) : '',
      typenode: false,
      inputs: buildDrawflowPorts(def?.inputs || 0, 'input'),
      outputs: buildDrawflowPorts(def?.outputs || 0, 'output'),
      pos_x: node.position.x,
      pos_y: node.position.y,
    }
  }

  for (const edge of edges) {
    const sourceNode = data[edge.source]
    if (!sourceNode)
      continue

    const outputKey = edge.sourceHandle || 'output_1'
    if (!sourceNode.outputs[outputKey])
      sourceNode.outputs[outputKey] = { connections: [] }

    sourceNode.outputs[outputKey].connections.push({
      node: edge.target,
      input: edge.targetHandle || 'input_1',
    })
  }

  return {
    drawflow: {
      Home: { data },
    },
  }
}

export function getNextFlowNodeId(nodes: Node[]): number {
  let max = 0
  for (const node of nodes) {
    const numericId = Number(node.id)
    if (!Number.isNaN(numericId) && numericId > max)
      max = numericId
  }
  return max + 1
}
