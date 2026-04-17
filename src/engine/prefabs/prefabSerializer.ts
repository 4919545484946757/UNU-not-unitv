import { Entity } from '../core/Entity'
import { deserializeEntity, serializeEntity } from '../serialization/sceneSerializer'

interface SerializedPrefab {
  format: 'unu-prefab'
  version: 1
  prefab: ReturnType<typeof serializeEntity>
}

function cloneEntity(entity: Entity, newId: string) {
  const base = deserializeEntity(serializeEntity(entity))
  base.id = newId
  return base
}

export function serializePrefab(entity: Entity) {
  const payload: SerializedPrefab = {
    format: 'unu-prefab',
    version: 1,
    prefab: serializeEntity(entity)
  }
  return JSON.stringify(payload, null, 2)
}

export function deserializePrefab(raw: string) {
  const parsed = JSON.parse(raw) as SerializedPrefab
  if (parsed.format !== 'unu-prefab') {
    throw new Error('不是有效的 UNU Prefab 文件。')
  }
  return deserializeEntity(parsed.prefab)
}

export function instantiatePrefab(raw: string, newId: string) {
  return cloneEntity(deserializePrefab(raw), newId)
}
