// @ts-nocheck
import type { Entity } from '../engine/core/Entity'
import type { Scene } from '../engine/core/Scene'
import { ScriptComponent } from '../engine/components/ScriptComponent'
import { instantiatePrefab, serializePrefab, serializePrefabVariant } from '../engine/prefabs/prefabSerializer'
import { deserializeScene, serializeScene } from '../engine/serialization/sceneSerializer'
import { useAssetStore } from './assets'
import { useProjectStore } from './project'
import { useSelectionStore } from './selection'
import { sceneCatalogActions } from './sceneCatalogActions'
import { sceneHistoryActions } from './sceneHistoryActions'
import { sceneFolderActions } from './sceneFolderActions'
import { sceneEntityActions } from './sceneEntityActions'
import {
  appendEntityTreeToScene,
  applyPrefabReplacementToScene,
  createEntityId,
  createPrefabInstanceReplacement,
  getPrefabInstanceRoots,
  normalizeAssetPath,
  isScriptPathEquivalent,
  normalizeScriptPath,
  repairSceneEntityComponents
} from './sceneActionUtils'


export const sceneActions = {
    ...sceneCatalogActions,
    ...sceneHistoryActions,
    ...sceneFolderActions,
    ...sceneEntityActions,
    markDirty() {
      this.isDirty = true
      this.revision++
      this.syncSceneDataState()
      this.scheduleHistoryCapture()
      this.scheduleAutoSave()
    },
    syncScriptSourceByPath(scriptPath: string, sourceCode: string) {
      const normalizedTarget = normalizeScriptPath(scriptPath)
      if (!normalizedTarget) return 0
      let updated = 0
      for (const scene of this.scenes) {
        for (const entity of scene.entities) {
          const script = entity.getComponent<ScriptComponent>('Script')
          if (!script) continue
          if (!isScriptPathEquivalent(script.scriptPath, normalizedTarget)) continue
          if (script.sourceCode === sourceCode) continue
          script.sourceCode = sourceCode
          updated += 1
        }
      }
      if (updated > 0) this.markDirty()
      return updated
    },
    addEntity(entity: Entity) {
      if (!this.currentScene) return
      this.currentScene.addEntity(entity)
      const transform = entity.getTransform()
      if (transform) transform.zIndex = this.currentScene.entities.length - 1
      this.markDirty()
    },
    async saveSceneAs() {
      if (!this.currentScene) return
      const project = useProjectStore()
      const assets = useAssetStore()
      const content = serializeScene(this.currentScene)
      if (!window.unu?.saveScene) {
        project.setStatus('Scene operation updated')
        return
      }
      const saved = await window.unu.saveScene({
        content,
        suggestedName: `${this.currentScene.name}.scene.json`,
        projectRoot: project.rootPath
      })
      if (!saved) return
      this.setSceneFileBinding(this.currentScene.id, saved.filePath)
      project.setSceneFile(saved.filePath)
      project.markSaved()
      this.isDirty = false
      this.clearAutoSaveTimer()
      await assets.refreshProject()
    },
    async saveScene() {
      if (!this.currentScene) return
      const project = useProjectStore()
      if (!project.currentScenePath) {
        await this.saveSceneAs()
        return
      }
      if (!window.unu?.saveScene) {
        project.setStatus('Scene operation updated')
        return
      }
      const saved = await window.unu.saveScene({
        filePath: project.currentScenePath,
        content: serializeScene(this.currentScene),
        suggestedName: `${this.currentScene.name}.scene.json`,
        projectRoot: project.rootPath
      })
      if (!saved) return
      this.setSceneFileBinding(this.currentScene.id, saved.filePath)
      project.markSaved()
      this.isDirty = false
      this.clearAutoSaveTimer()
    },
    async openSceneFromDisk() {
      const project = useProjectStore()
      if (!this.confirmDiscardUnsaved('Open another scene?')) {
        project.setStatus('Scene operation updated')
        return
      }
      if (!window.unu?.openScene) {
        project.setStatus('Scene operation updated')
        return
      }
      const result = await window.unu.openScene({ projectRoot: project.rootPath })
      if (!result) {
        project.setStatus('Scene operation updated')
        return
      }
      const scene = deserializeScene(result.content)
      repairSceneEntityComponents(scene)
      this.upsertScene(scene)
      this.currentScene = scene
      this.syncSceneDataState()
      this.setSceneFileBinding(scene.id, result.filePath)
      this.runtimeScene = null
      this.runtimeRevision = 0
      this.isDirty = false
      this.revision++
      useSelectionStore().clearSelection()
      project.setSceneFile(result.filePath)
      project.setStatus('Scene operation updated')
      this.resetHistory()
      this.clearAutoSaveTimer()
      this.captureHistorySnapshot()
    },
    async saveSelectedAsPrefab() {
      const project = useProjectStore()
      const assets = useAssetStore()
      const selection = useSelectionStore()
      const entity = this.currentScene?.getEntityById(selection.selectedEntityId)
      if (!entity) {
        project.setStatus('Scene operation updated')
        return
      }
      if (!window.unu?.savePrefab) {
        project.setStatus('Scene operation updated')
        return
      }
      const saved = await window.unu.savePrefab({
        content: serializePrefab(entity),
        suggestedName: `${entity.name}.prefab.json`,
        projectRoot: project.rootPath
      })
      if (!saved) return
      entity.prefabSourcePath = String(saved.relativePath || '')
      entity.prefabVariantBasePath = ''
      project.setStatus('Scene operation updated')
      await assets.refreshProject()
      this.markDirty()
    },
    async saveSelectedAsPrefabVariant() {
      const project = useProjectStore()
      const assets = useAssetStore()
      const selection = useSelectionStore()
      const entity = this.currentScene?.getEntityById(selection.selectedEntityId)
      if (!entity) {
        project.setStatus('Scene operation updated')
        return
      }
      if (!entity.prefabSourcePath) {
        project.setStatus('Scene operation updated')
        return
      }
      if (!window.unu?.savePrefab) {
        project.setStatus('Scene operation updated')
        return
      }
      const saved = await window.unu.savePrefab({
        content: serializePrefabVariant(entity, entity.prefabSourcePath),
        suggestedName: `${entity.name}.variant.prefab.json`,
        projectRoot: project.rootPath
      })
      if (!saved) return
      entity.prefabSourcePath = String(saved.relativePath || '')
      entity.prefabVariantBasePath = String(entity.prefabVariantBasePath || entity.prefabSourcePath)
      project.setStatus('Scene operation updated')
      await assets.refreshProject()
      this.markDirty()
    },
    async instantiatePrefabFromDisk() {
      const project = useProjectStore()
      if (!window.unu?.openPrefab) {
        project.setStatus('Scene operation updated')
        return
      }
      const result = await window.unu.openPrefab({ projectRoot: project.rootPath })
      if (!result) {
        project.setStatus('Scene operation updated')
        return
      }
      if (!this.currentScene) {
        this.createNewScene()
      }
      if (!this.currentScene) return
      const prefabPath = String(result.relativePath || '')
      const entity = await instantiatePrefab(result.content, createEntityId('prefab'), prefabPath)
      entity.name = `${entity.name}_Instance`
      const transform = entity.getTransform()
      if (transform) {
        transform.x += 80
        transform.y += 80
      }
      appendEntityTreeToScene(this.currentScene, entity)
      this.markDirty()
      useSelectionStore().selectEntity(entity.id)
      project.setStatus('Scene operation updated')
    },
    async applySelectedPrefabSource() {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const selectedId = selection.selectedEntityId
      if (!this.currentScene || !selectedId) {
        project.setStatus('Scene operation updated')
        return
      }
      const current = this.currentScene.getEntityById(selectedId)
      if (!current) return
      if (!current.prefabSourcePath) {
        project.setStatus('Scene operation updated')
        return
      }
      if (!window.unu?.readTextAsset || !project.rootPath || project.isMemoryProject) {
        project.setStatus('Scene operation updated')
        return
      }
      try {
        const raw = await window.unu.readTextAsset({
          projectRoot: project.rootPath,
          relativePath: current.prefabSourcePath
        })
        if (!raw?.content) {
          project.setStatus('Scene operation updated')
          return
        }
        applyPrefabReplacementToScene(this.currentScene, current, await createPrefabInstanceReplacement(raw.content, current))
        this.markDirty()
        selection.selectEntity(current.id)
        project.setStatus('Scene operation updated')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus('Scene operation updated')
      }
    },
    async syncSelectedPrefabSourceInstances() {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const selectedId = selection.selectedEntityId
      if (!this.currentScene || !selectedId) {
        project.setStatus('Scene operation updated')
        return
      }
      const selected = this.currentScene.getEntityById(selectedId)
      if (!selected?.prefabSourcePath) {
        project.setStatus('Scene operation updated')
        return
      }
      await this.syncPrefabSourceInstances(selected.prefabSourcePath)
    },
    async syncPrefabSourceInstances(prefabSourcePath: string) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const normalizedPath = normalizeAssetPath(prefabSourcePath)
      if (!this.currentScene || !normalizedPath) {
        project.setStatus('Scene operation updated')
        return 0
      }
      if (!window.unu?.readTextAsset || !project.rootPath || project.isMemoryProject) {
        project.setStatus('Scene operation updated')
        return 0
      }
      try {
        const raw = await window.unu.readTextAsset({
          projectRoot: project.rootPath,
          relativePath: normalizedPath
        })
        if (!raw?.content) {
          project.setStatus('Scene operation updated')
          return 0
        }

        const roots = getPrefabInstanceRoots(this.currentScene, normalizedPath)
        if (!roots.length) {
          project.setStatus('Scene operation updated')
          return 0
        }

        let synced = 0
        const selectedBefore = selection.selectedEntityId
        for (const root of roots) {
          const current = this.currentScene.getEntityById(root.id)
          if (!current) continue
          const replacement = await createPrefabInstanceReplacement(raw.content, current)
          applyPrefabReplacementToScene(this.currentScene, current, replacement)
          synced += 1
        }
        this.markDirty()
        if (selectedBefore && this.currentScene.getEntityById(selectedBefore)) {
          selection.selectEntity(selectedBefore)
        } else {
          selection.clearSelection()
        }
        project.setStatus('Scene operation updated')
        return synced
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus('Scene operation updated')
        return 0
      }
    },
    setRuntimeScene(scene: Scene | null) {
      if (scene) repairSceneEntityComponents(scene)
      this.runtimeScene = scene
      this.runtimeRevision += 1
    },
    clearRuntimeScene() {
      this.runtimeScene = null
      this.runtimeRevision += 1
    },
    repairCurrentSceneComponents() {
      if (!this.currentScene) return
      repairSceneEntityComponents(this.currentScene)
      this.revision += 1
    }
}
