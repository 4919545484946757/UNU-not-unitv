export type RenderNodeCacheEntry<TNode> = {
  signature: string
  node: TNode
}

export class RenderNodeCache<TNode> {
  private readonly entries = new Map<string, RenderNodeCacheEntry<TNode>>()

  get(key: string, signature?: string): TNode | null {
    const cached = this.entries.get(key)
    if (!cached) return null
    if (signature !== undefined && cached.signature !== signature) return null
    return cached.node
  }

  set(key: string, signature: string, node: TNode) {
    this.entries.set(key, { signature, node })
    return node
  }

  delete(key: string) {
    return this.entries.delete(key)
  }

  clear() {
    this.entries.clear()
  }

  prune(activeKeys: Set<string>, destroy?: (node: TNode) => void) {
    for (const [key, entry] of Array.from(this.entries.entries())) {
      if (activeKeys.has(key)) continue
      destroy?.(entry.node)
      this.entries.delete(key)
    }
  }

  get size() {
    return this.entries.size
  }
}
