// @ts-nocheck
import { deserializeEntity, serializeEntity } from '../engine/serialization/sceneSerializer'
import { useProjectStore } from './project'
import { useSelectionStore } from './selection'
import {
  addSceneFolderPath,
  createEntityId,
  createUniqueSceneFolderPath,
  getEntitiesInSceneFolder,
  getRelativeSceneFolderPath,
  getSceneFolderBaseName,
  getSceneFolderParentPath,
  getSceneFolderPathsInPrefix,
  getSelectedSceneEntities,
  isSceneFolderDescendantPath,
  isSceneFolderPathInside,
  normalizeSceneFolderName,
  normalizeSceneFolderPath,
  updateSceneFolderPrefix
} from './sceneActionUtils'

export const sceneFolderActions = {
    updateEntityFolderPath(entityId: string, folderPath: string) {
      const project = useProjectStore()
      const normalizedId = String(entityId || '').trim()
      const entity = this.currentScene?.getEntityById(normalizedId)
      if (!entity) {
        project.setStatus('Scene operation updated')
        return false
      }
      entity.sceneFolderPath = normalizeSceneFolderPath(folderPath)
      if (entity.sceneFolderPath && this.currentScene) addSceneFolderPath(this.currentScene, entity.sceneFolderPath)
      this.markDirty()
      project.setStatus('Scene operation updated')
      return true
    },
    updateSelectedEntityFolderPath(folderPath: string) {
      const selection = useSelectionStore()
      const targets = getSelectedSceneEntities(this.currentScene, selection)
      if (!targets.length) return false
      let updated = 0
      for (const entity of targets) {
        if (this.updateEntityFolderPath(entity.id, folderPath)) updated += 1
      }
      return updated > 0
    },
    createSceneFolder(parentPath = '', folderName = 'NewClass') {
      const project = useProjectStore()
      if (!this.currentScene) return false
      const parent = normalizeSceneFolderPath(parentPath)
      const name = normalizeSceneFolderName(folderName)
      if (!name) {
        project.setStatus('Scene operation updated')
        return false
      }
      const path = parent ? `${parent}/${name}` : name
      const unique = createUniqueSceneFolderPath(this.currentScene, path)
      addSceneFolderPath(this.currentScene, unique)
      this.markDirty()
      project.setStatus('Scene operation updated')
      return unique
    },
    renameSceneFolder(folderPath: string, nextNameOrPath: string) {
      const project = useProjectStore()
      if (!this.currentScene) return false
      const source = normalizeSceneFolderPath(folderPath)
      if (!source) {
        project.setStatus('Scene operation updated')
        return false
      }
      const parent = getSceneFolderParentPath(source)
      const normalizedInput = normalizeSceneFolderPath(nextNameOrPath)
      const target = normalizedInput.includes('/') ? normalizedInput : (parent ? `${parent}/${normalizedInput}` : normalizedInput)
      const normalizedTarget = normalizeSceneFolderPath(target)
      if (!normalizedTarget) {
        project.setStatus('Scene operation updated')
        return false
      }
      if (normalizedTarget === source) return true
      if (isSceneFolderDescendantPath(normalizedTarget, source)) {
        project.setStatus('Scene operation updated')
        return false
      }
      const finalPath = createUniqueSceneFolderPath(this.currentScene, normalizedTarget, source)
      updateSceneFolderPrefix(this.currentScene, source, finalPath)
      this.markDirty()
      project.setStatus('Scene operation updated')
      return finalPath
    },
    deleteSceneFolder(folderPath: string, force = false) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene) return false
      const source = normalizeSceneFolderPath(folderPath)
      if (!source) return false
      const entities = getEntitiesInSceneFolder(this.currentScene, source, true)
      if (!force && !window.confirm('Continue scene operation?')) {
        project.setStatus('Scene operation updated')
        return false
      }
      this.currentScene.entities = this.currentScene.entities.filter((entity) => !isSceneFolderPathInside(entity.sceneFolderPath, source))
      this.currentScene.sceneFolders = this.currentScene.sceneFolders.filter((path) => !isSceneFolderPathInside(path, source))
      if (selection.selectedEntityId && !this.currentScene.getEntityById(selection.selectedEntityId)) selection.clearSelection()
      this.currentScene.entities.forEach((entity, index) => {
        const transform = entity.getTransform()
        if (transform) transform.zIndex = index
      })
      this.markDirty()
      project.setStatus('Scene operation updated')
      return true
    },
    copySceneFolder(folderPath: string) {
      const project = useProjectStore()
      if (!this.currentScene) return false
      const source = normalizeSceneFolderPath(folderPath)
      if (!source) return false
      const entities = getEntitiesInSceneFolder(this.currentScene, source, true).map((entity) => serializeEntity(entity))
      const folders = getSceneFolderPathsInPrefix(this.currentScene, source)
      this.folderClipboard = { sourcePath: source, entities, folders }
      project.setStatus('Scene operation updated')
      return true
    },
    pasteSceneFolder(targetParentPath = '') {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene || !this.folderClipboard) {
        project.setStatus('Scene operation updated')
        return false
      }
      const parent = normalizeSceneFolderPath(targetParentPath)
      const sourceBaseName = getSceneFolderBaseName(this.folderClipboard.sourcePath)
      const desiredRoot = parent ? `${parent}/${sourceBaseName}_Copy` : `${sourceBaseName}_Copy`
      const targetRoot = createUniqueSceneFolderPath(this.currentScene, desiredRoot)
      addSceneFolderPath(this.currentScene, targetRoot)
      for (const folder of this.folderClipboard.folders) {
        const relative = getRelativeSceneFolderPath(folder, this.folderClipboard.sourcePath)
        addSceneFolderPath(this.currentScene, relative ? `${targetRoot}/${relative}` : targetRoot)
      }
      let firstId = ''
      for (const raw of this.folderClipboard.entities) {
        const copy = deserializeEntity(JSON.parse(JSON.stringify(raw)))
        const oldFolder = normalizeSceneFolderPath(copy.sceneFolderPath)
        const relativeFolder = getRelativeSceneFolderPath(oldFolder, this.folderClipboard.sourcePath)
        copy.sceneFolderPath = relativeFolder ? `${targetRoot}/${relativeFolder}` : targetRoot
        copy.id = createEntityId('copy')
        copy.name = `${copy.name}_Copy`
        const transform = copy.getTransform()
        if (transform) {
          transform.x += 32
          transform.y += 32
          transform.zIndex = this.currentScene.entities.length
        }
        this.currentScene.addEntity(copy)
        if (!firstId) firstId = copy.id
      }
      this.markDirty()
      if (firstId) selection.selectEntity(firstId)
      project.setStatus('Scene operation updated')
      return targetRoot
    },
    moveSceneFolder(folderPath: string, targetParentPath = '') {
      const project = useProjectStore()
      if (!this.currentScene) return false
      const source = normalizeSceneFolderPath(folderPath)
      const parent = normalizeSceneFolderPath(targetParentPath)
      if (!source) return false
      if (parent === source || isSceneFolderDescendantPath(parent, source)) {
        project.setStatus('Scene operation updated')
        return false
      }
      const target = parent ? `${parent}/${getSceneFolderBaseName(source)}` : getSceneFolderBaseName(source)
      const finalPath = createUniqueSceneFolderPath(this.currentScene, target, source)
      updateSceneFolderPrefix(this.currentScene, source, finalPath)
      this.markDirty()
      project.setStatus('Scene operation updated')
      return finalPath
    },
    moveEntityToSceneFolder(entityId: string, targetFolderPath = '') {
      const project = useProjectStore()
      if (!this.currentScene) return false
      const entity = this.currentScene.getEntityById(String(entityId || '').trim())
      if (!entity) {
        project.setStatus('Scene operation updated')
        return false
      }
      const target = normalizeSceneFolderPath(targetFolderPath)
      if (target) addSceneFolderPath(this.currentScene, target)
      entity.sceneFolderPath = target
      this.markDirty()
      project.setStatus('Scene operation updated')
      return true
    },
    moveSelectedEntitiesToSceneFolder(targetFolderPath = '') {
      const selection = useSelectionStore()
      const targets = getSelectedSceneEntities(this.currentScene, selection)
      if (!targets.length) return false
      let moved = 0
      for (const entity of targets) {
        if (this.moveEntityToSceneFolder(entity.id, targetFolderPath)) moved += 1
      }
      return moved > 0
    },
}
