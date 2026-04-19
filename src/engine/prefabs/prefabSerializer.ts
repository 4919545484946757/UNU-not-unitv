import { Entity } from '../core/Entity'
import { deserializeEntity, serializeEntity } from '../serialization/sceneSerializer'

interface SerializedPrefabNode {
  entity: ReturnType<typeof serializeEntity>
  children: SerializedPrefabNode[]
}

interface SerializedPrefab {
  format: 'unu-prefab'
  version: 2
  prefab: SerializedPrefabNode
  variantOf?: string
}

function serializePrefabNode(entity: Entity): SerializedPrefabNode {
  return {
    entity: serializeEntity(entity),
    children: entity.children.map(serializePrefabNode)
  }
}

function deserializePrefabNode(node: SerializedPrefabNode) {
  const entity = deserializeEntity(node.entity)
  entity.children = []
  entity.parent = null
  for (const childNode of node.children || []) {
    const child = deserializePrefabNode(childNode)
    entity.addChild(child)
  }
  return entity
}

function cloneTreeWithIds(source: Entity, newRootId: string, prefabSourcePath = '') {
  let sequence = 0
  const cloneDeep = (entity: Entity, forcedId?: string) => {
    const cloned = deserializeEntity(serializeEntity(entity))
    cloned.id = forcedId || `${newRootId}_n${sequence++}`
    cloned.prefabSourcePath = prefabSourcePath
    cloned.children = []
    cloned.parent = null
    for (const child of entity.children) {
      const childClone = cloneDeep(child)
      cloned.addChild(childClone)
    }
    return cloned
  }
  return cloneDeep(source, newRootId)
}

function parsePrefab(raw: string) {
  const parsed = JSON.parse(raw) as SerializedPrefab
  if (parsed.format !== 'unu-prefab') {
    throw new Error('不是有效的 UNU Prefab 文件。')
  }
  if (!parsed.prefab?.entity) {
    throw new Error('Prefab 内容为空。')
  }
  return parsed
}

export function serializePrefab(entity: Entity) {
  const payload: SerializedPrefab = {
    format: 'unu-prefab',
    version: 2,
    prefab: serializePrefabNode(entity)
  }
  return JSON.stringify(payload, null, 2)
}

export function serializePrefabVariant(entity: Entity, variantOf: string) {
  const payload: SerializedPrefab = {
    format: 'unu-prefab',
    version: 2,
    prefab: serializePrefabNode(entity),
    variantOf
  }
  return JSON.stringify(payload, null, 2)
}

export function deserializePrefab(raw: string) {
  const parsed = parsePrefab(raw)
  const root = deserializePrefabNode(parsed.prefab)
  root.prefabVariantBasePath = String(parsed.variantOf || '')
  return root
}

export async function instantiatePrefab(raw: string, newId: string, prefabSourcePath = '') {
  const parsed = parsePrefab(raw)
  const root = deserializePrefabNode(parsed.prefab)
  const cloned = cloneTreeWithIds(root, newId, prefabSourcePath)
  cloned.prefabVariantBasePath = String(parsed.variantOf || '')
  return cloned
}
