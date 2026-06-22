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
