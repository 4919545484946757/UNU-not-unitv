export function normalizeRelativeAssetPath(relativePath: string) {
  return String(relativePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')
}

export function rewriteMovedAssetReference(raw: string, fromPath: string, toPath: string, isDirectory: boolean) {
  const normalized = normalizeRelativeAssetPath(raw)
  const from = normalizeRelativeAssetPath(fromPath)
  const to = normalizeRelativeAssetPath(toPath)
  if (!normalized || !from || !to) return raw
  const normalizedLower = normalized.toLowerCase()
  const fromLower = from.toLowerCase()
  if (isDirectory) {
    if (normalizedLower === fromLower) return to
    if (!normalizedLower.startsWith(`${fromLower}/`)) return raw
    return `${to}${normalized.slice(from.length)}`
  }
  return normalizedLower === fromLower ? to : raw
}

export function rewriteMovedAssetReferences(value: unknown, fromPath: string, toPath: string, isDirectory: boolean): boolean {
  let changed = false
  const visit = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const next = rewriteMovedAssetReference(node, fromPath, toPath, isDirectory)
      if (next !== node) changed = true
      return next
    }
    if (Array.isArray(node)) {
      for (let index = 0; index < node.length; index += 1) {
        node[index] = visit(node[index])
      }
      return node
    }
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>
      for (const key of Object.keys(record)) {
        record[key] = visit(record[key])
      }
    }
    return node
  }
  visit(value)
  return changed
}
