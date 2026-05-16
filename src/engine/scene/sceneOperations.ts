import {
  cloneEntityData,
  cloneSceneData,
  getComponentData,
  normalizeSceneFolderList,
  normalizeSceneFolderPath,
  syncSceneDataZIndices,
  type ComponentData,
  type EntityData,
  type SceneData
} from './sceneData'

export function addEntity(scene: SceneData, entity: EntityData, index?: number): SceneData {
  const next = cloneSceneData(scene)
  const copy = cloneEntityData(entity)
  if (typeof index === 'number' && index >= 0 && index <= next.entities.length) {
    next.entities.splice(index, 0, copy)
  } else {
    next.entities.push(copy)
  }
  if (copy.sceneFolderPath) next.sceneFolders = addSceneFolder(next.sceneFolders, copy.sceneFolderPath)
  syncSceneDataZIndices(next)
  return next
}

export function removeEntity(scene: SceneData, entityId: string): SceneData {
  const next = cloneSceneData(scene)
  const ids = new Set<string>()
  const collect = (entity: EntityData) => {
    ids.add(entity.id)
    for (const child of entity.children || []) collect(child)
  }
  const root = next.entities.find((entity) => entity.id === entityId)
  if (root) collect(root)
  next.entities = next.entities.filter((entity) => !ids.has(entity.id))
  syncSceneDataZIndices(next)
  return next
}

export function duplicateEntity(scene: SceneData, entityId: string, nextId: string): { scene: SceneData; entity: EntityData | null } {
  const source = scene.entities.find((entity) => entity.id === entityId)
  if (!source) return { scene: cloneSceneData(scene), entity: null }
  const copy = cloneEntityData(source)
  copy.id = nextId
  copy.name = `${copy.name}_Copy`
  const transform = getComponentData(copy, 'Transform')
  if (transform) {
    transform.data.x = Number(transform.data.x || 0) + 32
    transform.data.y = Number(transform.data.y || 0) + 32
  }
  const index = scene.entities.findIndex((entity) => entity.id === entityId)
  return { scene: addEntity(scene, copy, index + 1), entity: copy }
}

export function moveEntityLayer(scene: SceneData, entityIds: string[], delta: number): SceneData {
  const next = cloneSceneData(scene)
  const selected = new Set(entityIds)
  const selectedEntities = next.entities.filter((entity) => selected.has(entity.id))
  if (!selectedEntities.length || delta === 0) return next
  const others = next.entities.filter((entity) => !selected.has(entity.id))
  const firstIndex = next.entities.findIndex((entity) => selected.has(entity.id))
  const insertIndex = Math.max(0, Math.min(others.length, firstIndex + delta))
  next.entities = [
    ...others.slice(0, insertIndex),
    ...selectedEntities,
    ...others.slice(insertIndex)
  ]
  syncSceneDataZIndices(next)
  return next
}

export function moveEntitiesToLayerIndex(scene: SceneData, entityIds: string[], targetIndex: number): SceneData {
  const next = cloneSceneData(scene)
  const selected = new Set(entityIds)
  const selectedEntities = next.entities.filter((entity) => selected.has(entity.id))
  if (!selectedEntities.length) return next
  const others = next.entities.filter((entity) => !selected.has(entity.id))
  const insertIndex = Math.max(0, Math.min(others.length, Math.round(targetIndex)))
  next.entities = [
    ...others.slice(0, insertIndex),
    ...selectedEntities,
    ...others.slice(insertIndex)
  ]
  syncSceneDataZIndices(next)
  return next
}

export function updateComponentField(scene: SceneData, entityId: string, componentType: string, key: string, value: unknown): SceneData {
  const next = cloneSceneData(scene)
  const entity = next.entities.find((item) => item.id === entityId)
  const component = entity ? getComponentData(entity, componentType) : null
  if (!component) return next
  ;(component as ComponentData).data[key] = value
  return next
}

export function createSceneFolder(scene: SceneData, folderPath: string): SceneData {
  const next = cloneSceneData(scene)
  next.sceneFolders = addSceneFolder(next.sceneFolders, folderPath)
  return next
}

export function renameSceneFolder(scene: SceneData, sourcePath: string, targetPath: string): SceneData {
  const source = normalizeSceneFolderPath(sourcePath)
  const target = normalizeSceneFolderPath(targetPath)
  const next = cloneSceneData(scene)
  if (!source || !target || source === target) return next
  next.sceneFolders = normalizeSceneFolderList(next.sceneFolders.map((folder) => rewriteFolderPath(folder, source, target)))
  for (const entity of next.entities) {
    entity.sceneFolderPath = rewriteFolderPath(entity.sceneFolderPath || '', source, target)
  }
  next.sceneFolders = collectSceneFolders(next)
  return next
}

export function deleteSceneFolder(scene: SceneData, folderPath: string, moveEntitiesToParent = true): SceneData {
  const source = normalizeSceneFolderPath(folderPath)
  const next = cloneSceneData(scene)
  if (!source) return next
  const parent = source.split('/').slice(0, -1).join('/')
  next.sceneFolders = normalizeSceneFolderList(next.sceneFolders.filter((folder) => !isFolderInside(folder, source)))
  for (const entity of next.entities) {
    const current = normalizeSceneFolderPath(entity.sceneFolderPath)
    if (!isFolderInside(current, source)) continue
    entity.sceneFolderPath = moveEntitiesToParent ? parent : ''
  }
  next.sceneFolders = collectSceneFolders(next)
  return next
}

export function moveEntityToFolder(scene: SceneData, entityId: string, folderPath: string): SceneData {
  const next = cloneSceneData(scene)
  const entity = next.entities.find((item) => item.id === entityId)
  if (!entity) return next
  entity.sceneFolderPath = normalizeSceneFolderPath(folderPath)
  if (entity.sceneFolderPath) next.sceneFolders = addSceneFolder(next.sceneFolders, entity.sceneFolderPath)
  return next
}

function addSceneFolder(folders: string[], folderPath: string) {
  const paths = new Set(normalizeSceneFolderList(folders))
  const parts = normalizeSceneFolderPath(folderPath).split('/').filter(Boolean)
  let current = ''
  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    paths.add(current)
  }
  return [...paths].sort((a, b) => a.localeCompare(b))
}

function collectSceneFolders(scene: SceneData) {
  let folders = normalizeSceneFolderList(scene.sceneFolders)
  for (const entity of scene.entities) {
    if (entity.sceneFolderPath) folders = addSceneFolder(folders, entity.sceneFolderPath)
  }
  return folders
}

function rewriteFolderPath(path: string, sourcePath: string, targetPath: string) {
  const current = normalizeSceneFolderPath(path)
  if (!isFolderInside(current, sourcePath)) return current
  const suffix = current === sourcePath ? '' : current.slice(sourcePath.length + 1)
  return suffix ? `${targetPath}/${suffix}` : targetPath
}

function isFolderInside(path: string, folderPath: string) {
  const current = normalizeSceneFolderPath(path)
  const folder = normalizeSceneFolderPath(folderPath)
  return Boolean(current && folder && (current === folder || current.startsWith(`${folder}/`)))
}
