declare module 'drawflow' {
  export default class Drawflow {
    constructor(element: HTMLElement, render?: unknown, parent?: unknown)
    reroute: boolean
    zoom: number
    start(): void
    clear(): void
    export(): DrawflowExport
    import(data: DrawflowExport): void
    addNode(
      name: string,
      inputs: number,
      outputs: number,
      pos_x: number,
      pos_y: number,
      className: string,
      data: Record<string, unknown>,
      html: string,
      typenode?: boolean | string,
    ): number
    removeNodeId(id: string): void
    getNodeFromId(id: number): DrawflowNode | undefined
    updateNodeDataFromId(id: number, data: Record<string, unknown>): void
    on(event: string, callback: (...args: unknown[]) => void): void
    zoom_in(): void
    zoom_out(): void
  zoom_reset(): void
  canvas_x: number
  canvas_y: number
  precanvas: HTMLElement | null
  editor_mode: string
  }
}

interface DrawflowExport {
  drawflow: {
    Home?: {
      data: Record<string, DrawflowNode>
    }
  }
}

interface DrawflowNode {
  id: number
  name: string
  data: Record<string, unknown>
  class: string
  html: string
  inputs: Record<string, { connections: DrawflowConnection[] }>
  outputs: Record<string, { connections: DrawflowConnection[] }>
  pos_x: number
  pos_y: number
  typenode: boolean | string
}

interface DrawflowConnection {
  node: string
  input?: string
  output?: string
}

export type { DrawflowExport, DrawflowNode, DrawflowConnection }
