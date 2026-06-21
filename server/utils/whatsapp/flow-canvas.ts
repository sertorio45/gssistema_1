import type { DrawflowExport, DrawflowNode } from '~/types/drawflow'
import type { WhatsAppFlowNodeType } from '~/types/whatsapp'

export function getDrawflowNodes(canvas: DrawflowExport | null | undefined): DrawflowNode[] {
  const data = canvas?.drawflow?.Home?.data
  if (!data)
    return []
  return Object.values(data)
}

export function findDrawflowTriggerNode(canvas: DrawflowExport | null | undefined): DrawflowNode | null {
  return getDrawflowNodes(canvas).find(node =>
    node.data?.nodeType === 'trigger' || node.name === 'trigger',
  ) || null
}

export function validateFlowCanvasForActivation(canvas: DrawflowExport | null | undefined): string | null {
  if (!canvas?.drawflow?.Home?.data || !Object.keys(canvas.drawflow.Home.data).length)
    return 'Salve o flow com pelo menos um bloco no canvas'

  const triggerNode = findDrawflowTriggerNode(canvas)
  if (!triggerNode)
    return 'O flow precisa de um bloco de gatilho'

  if (!getDrawflowConnections(triggerNode).length)
    return 'Conecte a saída do gatilho ao bloco de mensagem antes de ativar'

  return null
}

export function getDrawflowConnections(
  node: DrawflowNode,
  outputKey = 'output_1',
): Array<{ targetNodeId: number, targetInput: string }> {
  const output = node.outputs?.[outputKey]
  if (!output?.connections?.length)
    return []

  return output.connections.map(conn => ({
    targetNodeId: Number(conn.node),
    targetInput: conn.input
      || (typeof conn.output === 'string' && conn.output.startsWith('input_') ? conn.output : 'input_1'),
  }))
}

export function syncDrawflowToDbPayload(
  canvas: DrawflowExport,
  flowId: string,
  tenantId: string,
) {
  const nodes = getDrawflowNodes(canvas).map((node) => {
    const nodeType = String(node.data?.nodeType || node.name) as WhatsAppFlowNodeType

    return {
      flow_id: flowId,
      tenant_id: tenantId,
      type: nodeType,
      label: String(node.data?.label || nodeType),
      position: { x: node.pos_x, y: node.pos_y },
      data: node.data || {},
      node_key: String(node.id),
    }
  })

  const nodeIdByKey = new Map(nodes.map(n => [n.node_key, n.node_key]))
  const edges: Array<{
    flow_id: string
    tenant_id: string
    source_node_key: string
    target_node_key: string
    source_handle: string
    target_handle: string
    condition: Record<string, unknown>
  }> = []

  for (const node of getDrawflowNodes(canvas)) {
    for (const [outputKey, output] of Object.entries(node.outputs || {})) {
      for (const conn of output.connections || []) {
        if (!nodeIdByKey.has(String(node.id)) || !nodeIdByKey.has(String(conn.node)))
          continue

        edges.push({
          flow_id: flowId,
          tenant_id: tenantId,
          source_node_key: String(node.id),
          target_node_key: String(conn.node),
          source_handle: outputKey,
          target_handle: conn.input || 'input_1',
          condition: {},
        })
      }
    }
  }

  return { nodes, edges }
}

export function extractViewportFromCanvas(canvas: DrawflowExport, zoom = 1) {
  return {
    zoom,
    drawflow: canvas.drawflow,
  }
}

export function getCanvasFromViewport(viewport: Record<string, unknown> | null | undefined): DrawflowExport | null {
  if (!viewport?.drawflow)
    return null

  return {
    drawflow: viewport.drawflow as DrawflowExport['drawflow'],
  }
}
