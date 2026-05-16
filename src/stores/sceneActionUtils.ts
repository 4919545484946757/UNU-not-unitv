// @ts-nocheck
import type { Entity } from '../engine/core/Entity'
import type { Scene } from '../engine/core/Scene'
import { BackgroundComponent } from '../engine/components/BackgroundComponent'
import { CameraComponent } from '../engine/components/CameraComponent'
import { InteractableComponent } from '../engine/components/InteractableComponent'
import { ScriptComponent } from '../engine/components/ScriptComponent'
import { SpriteComponent } from '../engine/components/SpriteComponent'
import { TransformComponent } from '../engine/components/TransformComponent'
import { instantiatePrefab } from '../engine/prefabs/prefabSerializer'

export function createEntityId(prefix = 'entity') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

export function createSceneId(prefix = 'scene') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

export function getSelectedSceneEntities(scene: Scene | null, selection: { selectedEntityIds: string[]; selectedEntityId: string }) {
  if (!scene) return []
  const ids = selection.selectedEntityIds.length > 0 ? selection.selectedEntityIds : (selection.selectedEntityId ? [selection.selectedEntityId] : [])
  return ids
    .map((id) => scene.getEntityById(id))
    .filter((entity): entity is Entity => Boolean(entity))
}

export function fileNameOfPath(inputPath: string) {
  const normalized = inputPath.replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(index + 1) : normalized
}

export function flattenEntityTree(root: Entity) {
  const output: Entity[] = []
  const visit = (entity: Entity) => {
    output.push(entity)
    for (const child of entity.children) visit(child)
  }
  visit(root)
  return output
}

export function appendEntityTreeToScene(scene: Scene, root: Entity, insertIndex?: number) {
  const nodes = flattenEntityTree(root)
  if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= scene.entities.length) {
    scene.entities.splice(insertIndex, 0, ...nodes)
    scene.entities.forEach((entity, idx) => {
      const transform = entity.getTransform()
      if (transform) transform.zIndex = idx
    })
    return
  }
  for (const node of nodes) {
    scene.addEntity(node)
  }
}

export function applyPrefabReplacementToScene(scene: Scene, current: Entity, replacement: Entity) {
  const oldIndex = scene.entities.findIndex((entity) => entity.id === current.id)
  removeEntityTreeFromScene(scene, current)
  appendEntityTreeToScene(scene, replacement, oldIndex >= 0 ? oldIndex : undefined)
}

export function removeEntityTreeFromScene(scene: Scene, root: Entity) {
  const ids = new Set(flattenEntityTree(root).map((entity) => entity.id))
  scene.entities = scene.entities.filter((entity) => !ids.has(entity.id))
  scene.entities.forEach((entity, idx) => {
    const transform = entity.getTransform()
    if (transform) transform.zIndex = idx
  })
}

export function normalizeAssetPath(input: string) {
  return String(input || '').trim().replace(/\\/g, '/')
}

export function isSameAssetPath(left: string, right: string) {
  return normalizeAssetPath(left).toLowerCase() === normalizeAssetPath(right).toLowerCase()
}

export function getPrefabInstanceRoots(scene: Scene, prefabSourcePath: string) {
  const normalized = normalizeAssetPath(prefabSourcePath)
  return scene.entities.filter((entity) => {
    if (!isSameAssetPath(entity.prefabSourcePath, normalized)) return false
    return !entity.parent || !isSameAssetPath(entity.parent.prefabSourcePath, normalized)
  })
}

export async function createPrefabInstanceReplacement(rawPrefab: string, current: Entity) {
  const replacement = await instantiatePrefab(rawPrefab, current.id, current.prefabSourcePath)
  replacement.name = current.name
  replacement.sceneFolderPath = current.sceneFolderPath
  replacement.prefabSourcePath = current.prefabSourcePath
  replacement.prefabVariantBasePath = current.prefabVariantBasePath
  const currentTransform = current.getTransform()
  const replacementTransform = replacement.getTransform()
  if (currentTransform && replacementTransform) {
    replacementTransform.x = currentTransform.x
    replacementTransform.y = currentTransform.y
    replacementTransform.scaleX = currentTransform.scaleX
    replacementTransform.scaleY = currentTransform.scaleY
    replacementTransform.rotation = currentTransform.rotation
    replacementTransform.zIndex = currentTransform.zIndex
    replacementTransform.positionMode = currentTransform.positionMode
    replacementTransform.viewportHorizontal = currentTransform.viewportHorizontal
    replacementTransform.viewportVertical = currentTransform.viewportVertical
  }
  return replacement
}

export function normalizeSceneFolderPath(input: unknown) {
  return String(input || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')
}

export function normalizeSceneFolderName(input: unknown) {
  return String(input || '').replace(/\\/g, '/').split('/').map((part) => part.trim()).filter(Boolean).join('_')
}

export function normalizeSceneFolderList(input: unknown) {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => normalizeSceneFolderPath(item))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
}

export function getSceneFolderParentPath(path: string) {
  const parts = normalizeSceneFolderPath(path).split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}

export function getSceneFolderBaseName(path: string) {
  const parts = normalizeSceneFolderPath(path).split('/').filter(Boolean)
  return parts[parts.length - 1] || 'Class'
}

export function isSceneFolderPathInside(path: unknown, folderPath: string) {
  const current = normalizeSceneFolderPath(path)
  const folder = normalizeSceneFolderPath(folderPath)
  if (!folder) return !current
  return current === folder || current.startsWith(`${folder}/`)
}

export function isSceneFolderDescendantPath(path: string, ancestorPath: string) {
  const current = normalizeSceneFolderPath(path)
  const ancestor = normalizeSceneFolderPath(ancestorPath)
  return Boolean(current && ancestor && current.startsWith(`${ancestor}/`))
}

export function getSceneFolderPaths(scene: Scene) {
  const paths = new Set<string>()
  for (const folder of normalizeSceneFolderList(scene.sceneFolders)) {
    addSceneFolderAncestorsToSet(paths, folder)
  }
  for (const entity of scene.entities) {
    const path = normalizeSceneFolderPath(entity.sceneFolderPath)
    if (path) addSceneFolderAncestorsToSet(paths, path)
  }
  return [...paths].sort((a, b) => a.localeCompare(b))
}

export function getSceneFolderPathsInPrefix(scene: Scene, folderPath: string) {
  const source = normalizeSceneFolderPath(folderPath)
  return getSceneFolderPaths(scene).filter((path) => isSceneFolderPathInside(path, source))
}

export function addSceneFolderAncestorsToSet(paths: Set<string>, folderPath: string) {
  const parts = normalizeSceneFolderPath(folderPath).split('/').filter(Boolean)
  let current = ''
  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    paths.add(current)
  }
}

export function addSceneFolderPath(scene: Scene, folderPath: string) {
  const paths = new Set(normalizeSceneFolderList(scene.sceneFolders))
  addSceneFolderAncestorsToSet(paths, folderPath)
  scene.sceneFolders = [...paths].sort((a, b) => a.localeCompare(b))
}

export function createUniqueSceneFolderPath(scene: Scene, desiredPath: string, ignoredPrefix = '') {
  const normalized = normalizeSceneFolderPath(desiredPath)
  if (!normalized) return ''
  const existing = getSceneFolderPaths(scene).filter((path) => !ignoredPrefix || !isSceneFolderPathInside(path, ignoredPrefix))
  if (!existing.includes(normalized)) return normalized
  const parent = getSceneFolderParentPath(normalized)
  const base = getSceneFolderBaseName(normalized)
  let index = 2
  while (true) {
    const next = parent ? `${parent}/${base}_${index}` : `${base}_${index}`
    if (!existing.includes(next)) return next
    index += 1
  }
}

export function updateSceneFolderPrefix(scene: Scene, sourcePath: string, targetPath: string) {
  const source = normalizeSceneFolderPath(sourcePath)
  const target = normalizeSceneFolderPath(targetPath)
  if (!source || !target) return
  const nextFolders = new Set<string>()
  for (const folder of getSceneFolderPaths(scene)) {
    if (isSceneFolderPathInside(folder, source)) {
      const relative = getRelativeSceneFolderPath(folder, source)
      addSceneFolderAncestorsToSet(nextFolders, relative ? `${target}/${relative}` : target)
    } else {
      addSceneFolderAncestorsToSet(nextFolders, folder)
    }
  }
  scene.sceneFolders = [...nextFolders].sort((a, b) => a.localeCompare(b))
  for (const entity of scene.entities) {
    const current = normalizeSceneFolderPath(entity.sceneFolderPath)
    if (!isSceneFolderPathInside(current, source)) continue
    const relative = getRelativeSceneFolderPath(current, source)
    entity.sceneFolderPath = relative ? `${target}/${relative}` : target
  }
}

export function getRelativeSceneFolderPath(path: string, rootPath: string) {
  const normalized = normalizeSceneFolderPath(path)
  const root = normalizeSceneFolderPath(rootPath)
  if (!root || normalized === root) return ''
  return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized
}

export function getEntitiesInSceneFolder(scene: Scene, folderPath: string, includeDescendants = true) {
  const source = normalizeSceneFolderPath(folderPath)
  return scene.entities.filter((entity) => {
    const current = normalizeSceneFolderPath(entity.sceneFolderPath)
    if (!source) return !current
    return includeDescendants ? isSceneFolderPathInside(current, source) : current === source
  })
}

export function normalizeScriptPath(input: string) {
  return String(input || '').trim().replace(/\\/g, '/')
}

export function isScriptPathEquivalent(left: string, right: string) {
  const a = normalizeScriptPath(left)
  const b = normalizeScriptPath(right)
  if (!a || !b) return false
  if (a === b) return true
  const aliases: Record<string, string> = {
    'builtin://player-input': 'assets/scripts/player-input.js',
    'builtin://bullet-projectile': 'assets/scripts/bullet-projectile.js',
    'builtin://enemy-chase-respawn': 'assets/scripts/enemy-chase-respawn.js',
    'builtin://patrol': 'assets/scripts/patrol.js',
    'builtin://orbit-around-chest': 'assets/scripts/orbit-around-chest.js',
    'builtin://spin': 'assets/scripts/spin.js'
  }
  return aliases[a] === b || aliases[b] === a
}

export function repairSceneEntityComponents(scene: Scene) {
  for (let idx = 0; idx < scene.entities.length; idx += 1) {
    const entity = scene.entities[idx]
    let transform = entity.getTransform()
    if (!transform) {
      transform = entity.addComponent(new TransformComponent(0, 0, 1, 1, 0, 0.5, 0.5, idx))
    } else {
      transform.zIndex = idx
    }

    const sprite = entity.getComponent<SpriteComponent>('Sprite')
    const background = entity.getComponent<BackgroundComponent>('Background')
    const camera = entity.getComponent<CameraComponent>('Camera')
    const interactable = entity.getComponent<InteractableComponent>('Interactable')
    const script = entity.getComponent<ScriptComponent>('Script')

    const isBackgroundEntity = entity.name === 'Background' || !!background
    if (isBackgroundEntity) {
      if (!background) entity.addComponent(new BackgroundComponent(true, true, 'cover'))
      if (!sprite) {
        entity.addComponent(new SpriteComponent('assets/images/pixel/background/background-img.png', 1539, 1022, true, 1, 0xffffff, false))
      }
      if (!camera) {
        // Background owns an optional camera component for inspector-level consistency.
        entity.addComponent(new CameraComponent(false, 1, '', 0.18, 0, 0, false))
      }
    }

    if (interactable?.actionType === 'scripted' && !script) {
      entity.addComponent(
        new ScriptComponent(
          'custom://interaction',
          `{
  "onInteract": [
    { "type": "cycleTint", "target": "self", "values": [16777215, 16762880, 9293460, 7979007] }
  ]
}`,
          true
        )
      )
    }
  }
}

