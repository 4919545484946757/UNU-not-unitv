import type { AssetNode, AssetType } from './types'

export class AssetDatabase {
  private readonly roots: AssetNode[]

  constructor(roots: AssetNode[]) {
    this.roots = roots
  }

  getRoots() {
    return this.roots
  }

  flatten(): AssetNode[] {
    const result: AssetNode[] = []
    const walk = (nodes: AssetNode[], parentId?: string) => {
      for (const node of nodes) {
        result.push({ ...node, parentId })
        if (node.children?.length) walk(node.children, node.id)
      }
    }
    walk(this.roots)
    return result
  }

  getChildren(path: string) {
    const found = this.flatten().find((node) => node.path === path)
    return found?.children ?? []
  }

  findByPath(path: string) {
    return this.flatten().find((node) => node.path === path) ?? null
  }

  findFirstByType(type: AssetType) {
    return this.flatten().find((node) => node.type === type) ?? null
  }
}
