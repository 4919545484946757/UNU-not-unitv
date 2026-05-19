export type ItemId = `${string}:${string}`

export type ItemDefinition = {
  format: 'unu-item'
  version: 1
  id: ItemId
  namespace: string
  name: string
  displayName: string
  type: string
  equipSlot?: string
  maxStack?: number
  icon?: string
  description?: string
  script?: string
  tags?: string[]
  attributes?: Record<string, unknown>
}

export type ItemRegistryEntry = {
  id: ItemId
  file: string
}

export type ItemRegistry = {
  format: 'unu-item-registry'
  version: 1
  project: string
  namespace: string
  itemRoot: string
  items: ItemRegistryEntry[]
}

export function normalizeItemId(projectNamespace: string, itemNameOrId: string): ItemId | '' {
  const raw = String(itemNameOrId || '').trim()
  if (!raw) return ''
  return (raw.includes(':') ? raw : `${projectNamespace}:${raw}`) as ItemId
}
