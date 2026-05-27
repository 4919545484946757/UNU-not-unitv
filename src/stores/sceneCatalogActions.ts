// @ts-nocheck
import type { Scene } from '../engine/core/Scene'
import type { SceneData } from '../engine/scene/sceneData'
import { Scene as SceneClass } from '../engine/core/Scene'
import { createSampleSceneByName } from '../engine/sampleScene'
import { deserializeEntity, hydrateScene, sceneToData, serializeEntity } from '../engine/serialization/sceneSerializer'
import { useProjectStore } from './project'
import { useSelectionStore } from './selection'
import { createSceneId, repairSceneEntityComponents } from './sceneActionUtils'

export const sceneCatalogActions = {
  resetProjectSceneState() {
    this.scenes = []
    this.sceneDataList = []
    this.sceneFilePathById = {}
    this.currentScene = null
    this.currentSceneData = null
    this.runtimeScene = null
    this.runtimeRevision += 1
    this.revision += 1
    this.isDirty = false
    this.resetHistory()
    this.clearAutoSaveTimer()
    const project = useProjectStore()
    project.resetSceneFile()
  },
  setSceneFileBinding(sceneId: string, filePath: string) {
    const id = String(sceneId || '').trim()
    const path = String(filePath || '').trim()
    if (!id || !path) return
    this.sceneFilePathById = { ...this.sceneFilePathById, [id]: path }
  },
  clearSceneFileBinding(sceneId: string) {
    const id = String(sceneId || '').trim()
    if (!id) return
    if (!this.sceneFilePathById[id]) return
    const next = { ...this.sceneFilePathById }
    delete next[id]
    this.sceneFilePathById = next
  },
  getSceneFileBinding(sceneId: string) {
    return String(this.sceneFilePathById[String(sceneId || '').trim()] || '')
  },
  upsertScene(scene: Scene) {
    repairSceneEntityComponents(scene)
    const index = this.scenes.findIndex((item) => item.id === scene.id)
    if (index >= 0) this.scenes.splice(index, 1, scene)
    else this.scenes.push(scene)
    this.syncSceneDataState()
  },
  syncSceneDataState() {
    this.sceneDataList = this.scenes.map((scene) => sceneToData(scene))
    const currentId = this.currentScene?.id || ''
    this.currentSceneData = this.sceneDataList.find((scene) => scene.id === currentId) || null
  },
  replaceScenesFromData(sceneDataList: SceneData[], currentSceneId = '') {
    const scenes = sceneDataList.map((sceneData) => hydrateScene(sceneData))
    scenes.forEach((scene) => repairSceneEntityComponents(scene))
    this.scenes = scenes
    this.currentScene =
      this.scenes.find((scene) => scene.id === currentSceneId) ||
      this.scenes[0] ||
      null
    this.runtimeScene = null
    this.runtimeRevision += 1
    this.revision += 1
    this.syncSceneDataState()
  },
  ensureSampleSceneCatalog() {
    const project = useProjectStore()
    if (!project.isMemoryProject) return
    const main = createSampleSceneByName('MainScene')
    const second = createSampleSceneByName('SecondScene')
    if (main) this.upsertScene(main)
    if (second) this.upsertScene(second)
    if (!this.currentScene) {
      this.currentScene = this.scenes[0] || null
    }
    this.syncSceneDataState()
  },
  switchEditingScene(sceneId: string) {
    const project = useProjectStore()
    const selection = useSelectionStore()
    const target = this.scenes.find((item) => item.id === sceneId)
    if (!target) {
      project.setStatus('Scene operation updated')
      return false
    }
    repairSceneEntityComponents(target)
    this.currentScene = target
    this.syncSceneDataState()
    this.runtimeScene = null
    this.runtimeRevision += 1
    this.revision++
    selection.clearSelection()
    this.resetHistory()
    this.clearAutoSaveTimer()
    this.captureHistorySnapshot()
    const targetPath = this.getSceneFileBinding(target.id)
    if (targetPath) project.setSceneFile(targetPath)
    else project.resetSceneFile()
    project.setStatus('Scene operation updated')
    return true
  },
  renameScene(sceneId: string, nextName: string) {
    const project = useProjectStore()
    const normalized = String(nextName || '').trim()
    if (!normalized) {
      project.setStatus('Scene operation updated')
      return false
    }
    const target = this.scenes.find((item) => item.id === sceneId)
    if (!target) {
      project.setStatus('Scene operation updated')
      return false
    }
    target.name = normalized
    this.markDirty()
    project.setStatus('Scene operation updated')
    return true
  },
  duplicateScene(sceneId: string) {
    const project = useProjectStore()
    const selection = useSelectionStore()
    const source = this.scenes.find((item) => item.id === sceneId)
    if (!source) {
      project.setStatus('Scene operation updated')
      return false
    }
    const copy = new SceneClass(createSceneId('scene'), `${source.name}_Copy`)
    copy.sceneFolders = [...source.sceneFolders]
    for (const entity of source.entities) {
      copy.addEntity(deserializeEntity(serializeEntity(entity)))
    }
    this.scenes.push(copy)
    this.currentScene = copy
    this.syncSceneDataState()
    this.clearSceneFileBinding(copy.id)
    this.runtimeScene = null
    this.runtimeRevision += 1
    this.isDirty = true
    this.revision++
    selection.clearSelection()
    this.resetHistory()
    this.clearAutoSaveTimer()
    this.captureHistorySnapshot()
    project.setStatus('Scene operation updated')
    return true
  },
  removeScene(sceneId: string, force = false) {
    const project = useProjectStore()
    const selection = useSelectionStore()
    if (this.scenes.length <= 1) {
      project.setStatus('Scene operation updated')
      return false
    }
    const index = this.scenes.findIndex((item) => item.id === sceneId)
    if (index < 0) {
      project.setStatus('Scene operation updated')
      return false
    }
    const target = this.scenes[index]
    this.clearSceneFileBinding(target.id)
    if (!force && !window.confirm('Continue scene operation?')) {
      project.setStatus('Scene operation updated')
      return false
    }
    this.scenes.splice(index, 1)
    if (this.currentScene?.id === sceneId) {
      this.currentScene = this.scenes[Math.max(0, index - 1)] || this.scenes[0] || null
      selection.clearSelection()
    }
    this.syncSceneDataState()
    this.runtimeScene = null
    this.runtimeRevision += 1
    this.markDirty()
    this.resetHistory()
    this.clearAutoSaveTimer()
    this.captureHistorySnapshot()
    project.setStatus('Scene operation updated')
    return true
  },
  bootstrap(scene: Scene) {
    repairSceneEntityComponents(scene)
    this.scenes = [scene]
    this.sceneFilePathById = {}
    this.currentScene = scene
    this.syncSceneDataState()
    this.runtimeScene = null
    this.runtimeRevision = 0
    this.ensureSampleSceneCatalog()
    this.isDirty = false
    this.revision++
    this.resetHistory()
    this.clearAutoSaveTimer()
    this.captureHistorySnapshot()
  },
  bootstrapSceneCollection(
    entries: Array<{ scene: Scene; filePath?: string }>,
    currentSceneId?: string
  ) {
    const project = useProjectStore()
    const selection = useSelectionStore()
    const normalizedEntries = entries
      .filter((item) => !!item?.scene)
      .map((item) => ({ scene: item.scene, filePath: String(item.filePath || '').trim() }))
    if (!normalizedEntries.length) {
      this.createNewScene('MainScene', true)
      return
    }

    normalizedEntries.forEach((item) => repairSceneEntityComponents(item.scene))
    this.scenes = normalizedEntries.map((item) => item.scene)
    const fileMap: Record<string, string> = {}
    for (const item of normalizedEntries) {
      if (item.filePath) fileMap[item.scene.id] = item.filePath
    }
    this.sceneFilePathById = fileMap

    const preferredId = String(currentSceneId || '').trim()
    this.currentScene =
      this.scenes.find((item) => item.id === preferredId) ||
      this.scenes[0] ||
      null
    this.syncSceneDataState()
    this.runtimeScene = null
    this.runtimeRevision = 0
    this.isDirty = false
    this.revision += 1
    selection.clearSelection()
    this.resetHistory()
    this.clearAutoSaveTimer()
    this.captureHistorySnapshot()

    const currentPath = this.currentScene ? this.getSceneFileBinding(this.currentScene.id) : ''
    if (currentPath) project.setSceneFile(currentPath)
    else project.resetSceneFile()
  },  createNewScene(name = 'MainScene', force = false) {
    const project = useProjectStore()
    const selection = useSelectionStore()
    if (!force && !this.confirmDiscardUnsaved('新建场景')) {
      project.setStatus('Scene operation updated')
      return
    }
    this.currentScene = new SceneClass(createSceneId('scene'), name)
    this.clearSceneFileBinding(this.currentScene.id)
    repairSceneEntityComponents(this.currentScene)
    this.runtimeScene = null
    this.runtimeRevision = 0
    this.upsertScene(this.currentScene)
    this.isDirty = true
    this.revision++
    selection.clearSelection()
    project.resetSceneFile()
    project.setStatus('Scene operation updated')
    this.resetHistory()
    this.captureHistorySnapshot()
  }
}
