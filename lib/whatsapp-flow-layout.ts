import type { Edge, Node } from '@vue-flow/core'

export interface FlowLayoutOptions {
  nodeWidth: number
  nodeHeight: number
  horizontalGap: number
  verticalGap: number
  paddingX: number
  paddingY: number
}

const DEFAULT_LAYOUT_OPTIONS: FlowLayoutOptions = {
  nodeWidth: 280,
  nodeHeight: 112,
  horizontalGap: 160,
  verticalGap: 56,
  paddingX: 72,
  paddingY: 72,
}

function compareSourceHandles(a: Edge, b: Edge) {
  return String(a.sourceHandle || 'output_1').localeCompare(String(b.sourceHandle || 'output_1'))
}

function buildOutgoingMap(nodes: Node[], edges: Edge[]) {
  const outgoing = new Map<string, Edge[]>()
  for (const node of nodes)
    outgoing.set(node.id, [])

  for (const edge of edges) {
    if (!outgoing.has(edge.source))
      continue
    outgoing.get(edge.source)!.push(edge)
  }

  for (const [, list] of outgoing)
    list.sort(compareSourceHandles)

  return outgoing
}

function computeLayers(nodes: Node[], edges: Edge[]) {
  const layers = new Map<string, number>()
  for (const node of nodes)
    layers.set(node.id, 0)

  for (let pass = 0; pass < nodes.length; pass++) {
    for (const edge of edges) {
      const nextLayer = (layers.get(edge.source) ?? 0) + 1
      layers.set(edge.target, Math.max(layers.get(edge.target) ?? 0, nextLayer))
    }
  }

  return layers
}

function computeRowHints(nodes: Node[], edges: Edge[], outgoing: Map<string, Edge[]>) {
  const incomingCount = new Map<string, number>()
  for (const node of nodes)
    incomingCount.set(node.id, 0)
  for (const edge of edges)
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1)

  const triggers = nodes.filter(node => node.data?.nodeType === 'trigger')
  const roots = triggers.length
    ? triggers
    : nodes.filter(node => (incomingCount.get(node.id) ?? 0) === 0)

  if (!roots.length && nodes.length)
    roots.push(nodes[0])

  const rowHints = new Map<string, number>()
  const queue: Array<{ id: string, hint: number }> = roots.map((node, index) => ({
    id: node.id,
    hint: index * 10,
  }))

  while (queue.length) {
    const current = queue.shift()!
    const previous = rowHints.get(current.id)
    rowHints.set(
      current.id,
      previous === undefined ? current.hint : (previous + current.hint) / 2,
    )

    for (const edge of outgoing.get(current.id) ?? []) {
      let branchDelta = 0
      if (edge.sourceHandle === 'output_1')
        branchDelta = -6
      else if (edge.sourceHandle === 'output_2')
        branchDelta = 6

      queue.push({
        id: edge.target,
        hint: current.hint + branchDelta,
      })
    }
  }

  for (const [index, node] of nodes.entries()) {
    if (!rowHints.has(node.id))
      rowHints.set(node.id, index * 10)
  }

  return rowHints
}

/**
 * Layered left-to-right layout inspired by n8n:
 * trigger on the left, connected nodes in columns, branches stacked vertically.
 */
export function layoutFlowNodes(
  nodes: Node[],
  edges: Edge[],
  options: Partial<FlowLayoutOptions> = {},
): Node[] {
  if (!nodes.length)
    return nodes

  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options }
  const outgoing = buildOutgoingMap(nodes, edges)
  const layers = computeLayers(nodes, edges)
  const rowHints = computeRowHints(nodes, edges, outgoing)

  const nodesByLayer = new Map<number, Node[]>()
  for (const node of nodes) {
    const layer = layers.get(node.id) ?? 0
    if (!nodesByLayer.has(layer))
      nodesByLayer.set(layer, [])
    nodesByLayer.get(layer)!.push(node)
  }

  for (const [, layerNodes] of nodesByLayer) {
    layerNodes.sort((a, b) => (rowHints.get(a.id) ?? 0) - (rowHints.get(b.id) ?? 0))
  }

  let maxColumnHeight = 0
  for (const [, layerNodes] of nodesByLayer) {
    const columnHeight = layerNodes.length * opts.nodeHeight
      + Math.max(0, layerNodes.length - 1) * opts.verticalGap
    maxColumnHeight = Math.max(maxColumnHeight, columnHeight)
  }

  const positions = new Map<string, { x: number, y: number }>()

  for (const [layer, layerNodes] of nodesByLayer) {
    const x = opts.paddingX + layer * (opts.nodeWidth + opts.horizontalGap)
    const columnHeight = layerNodes.length * opts.nodeHeight
      + Math.max(0, layerNodes.length - 1) * opts.verticalGap
    const startY = opts.paddingY + Math.max(0, (maxColumnHeight - columnHeight) / 2)

    layerNodes.forEach((node, index) => {
      positions.set(node.id, {
        x,
        y: startY + index * (opts.nodeHeight + opts.verticalGap),
      })
    })
  }

  return nodes.map(node => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }))
}
