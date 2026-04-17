import { defineStore } from 'pinia'
import type { Entity } from '../engine/core/Entity'
import type { Scene } from '../engine/core/Scene'
import { ColliderComponent } from '../engine/components/ColliderComponent'
import { SpriteComponent } from '../engine/components/SpriteComponent'
import { TransformComponent } from '../engine/components/TransformComponent'
import { Entity as EntityClass } from '../engine/core/Entity'
import { Scene as SceneClass } from '../engine/core/Scene'
import { instantiatePrefab, serializePrefab } from '../engine/prefabs/prefabSerializer'
import { deserializeEntity, deserializeScene, serializeEntity, serializeScene } from '../engine/serialization/sceneSerializer'
import { useAssetStore } from './assets'
import { useProjectStore } from './project'
import { useSelectionStore } from './selection'

function createEntityId(prefix = 'entity') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

function createSceneId(prefix = 'scene') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

export const useSceneStore = defineStore('scene', {
  state: () => ({
    currentScene: null as Scene | null,
    revision: 0,
    isDirty: false,
    historyEntries: [] as string[],
    historyIndex: -1,
    historyTimer: 0 as number,
    isRestoringHistory: false,
    autoSaveEnabled: true,
    autoSaveIntervalSec: 20,
    autoSaveTimer: 0 as number,
    isAutoSaving: false
  }),
  getters: {
    entities(state): Entity[] {
      return state.currentScene?.entities ?? []
    },
    canUndo(state) {
      return state.historyIndex > 0
    },
    canRedo(state) {
      return state.historyIndex >= 0 && state.historyIndex < state.historyEntries.length - 1
    }
  },
  actions: {
    clearAutoSaveTimer() {
      if (!this.autoSaveTimer) return
      window.clearTimeout(this.autoSaveTimer)
      this.autoSaveTimer = 0
    },
    configureAutoSave(enabled: boolean, intervalSec?: number) {
      this.autoSaveEnabled = enabled
      if (typeof intervalSec === 'number' && Number.isFinite(intervalSec)) {
        this.autoSaveIntervalSec = Math.max(5, Math.round(intervalSec))
      }
      if (!enabled) this.clearAutoSaveTimer()
    },
    scheduleAutoSave() {
      const project = useProjectStore()
      if (!this.autoSaveEnabled || !this.isDirty || this.isRestoringHistory || this.isAutoSaving) return
      if (!this.currentScene || !window.unu?.saveScene || !project.currentScenePath) return
      this.clearAutoSaveTimer()
      this.autoSaveTimer = window.setTimeout(async () => {
        this.autoSaveTimer = 0
        await this.autoSaveCurrentScene()
      }, this.autoSaveIntervalSec * 1000)
    },
    async autoSaveCurrentScene() {
      const project = useProjectStore()
      if (!this.currentScene || !this.isDirty || !window.unu?.saveScene || !project.currentScenePath) return
      this.isAutoSaving = true
      try {
        const saved = await window.unu.saveScene({
          filePath: project.currentScenePath,
          content: serializeScene(this.currentScene),
          suggestedName: `${this.currentScene.name}.scene.json`,
          projectRoot: project.rootPath
        })
        if (!saved) return
        project.markSaved()
        this.isDirty = false
        project.setStatus(`已自动保存：${saved.name}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`自动保存失败：${message}`)
      } finally {
        this.isAutoSaving = false
      }
    },
    confirmDiscardUnsaved(actionLabel: string) {
      if (!this.isDirty) return true
      return window.confirm(`当前场景有未保存修改，确认继续${actionLabel}吗？`)
    },
    resetHistory() {
      if (this.historyTimer) {
        window.clearTimeout(this.historyTimer)
        this.historyTimer = 0
      }
      this.historyEntries = []
      this.historyIndex = -1
    },
    pushHistorySnapshot(raw: string) {
      if (this.isRestoringHistory) return
      const last = this.historyEntries[this.historyIndex]
      if (last === raw) return
      if (this.historyIndex < this.historyEntries.length - 1) {
        this.historyEntries = this.historyEntries.slice(0, this.historyIndex + 1)
      }
      this.historyEntries.push(raw)
      if (this.historyEntries.length > 80) {
        this.historyEntries.shift()
      }
      this.historyIndex = this.historyEntries.length - 1
    },
    captureHistorySnapshot() {
      if (!this.currentScene || this.isRestoringHistory) return
      this.pushHistorySnapshot(serializeScene(this.currentScene))
    },
    scheduleHistoryCapture(delayMs = 350) {
      if (this.isRestoringHistory) return
      if (this.historyTimer) window.clearTimeout(this.historyTimer)
      this.historyTimer = window.setTimeout(() => {
        this.historyTimer = 0
        this.captureHistorySnapshot()
      }, delayMs)
    },
    restoreSceneFromSerialized(raw: string) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const previousSelectedId = selection.selectedEntityId
      this.isRestoringHistory = true
      try {
        this.currentScene = deserializeScene(raw)
        this.isDirty = true
        this.revision++
        const hasPreviousEntity = !!this.currentScene.getEntityById(previousSelectedId)
        if (hasPreviousEntity) selection.selectEntity(previousSelectedId)
        else selection.clearSelection()
      } finally {
        this.isRestoringHistory = false
      }
      project.setStatus('已从历史记录恢复场景')
    },
    undo() {
      const project = useProjectStore()
      if (!this.canUndo) {
        project.setStatus('已经是最早的历史记录')
        return
      }
      this.historyIndex -= 1
      const snapshot = this.historyEntries[this.historyIndex]
      if (!snapshot) return
      this.restoreSceneFromSerialized(snapshot)
    },
    redo() {
      const project = useProjectStore()
      if (!this.canRedo) {
        project.setStatus('已经是最新的历史记录')
        return
      }
      this.historyIndex += 1
      const snapshot = this.historyEntries[this.historyIndex]
      if (!snapshot) return
      this.restoreSceneFromSerialized(snapshot)
    },
    bootstrap(scene: Scene) {
      this.currentScene = scene
      this.isDirty = false
      this.revision++
      this.resetHistory()
      this.clearAutoSaveTimer()
      this.captureHistorySnapshot()
    },
    createNewScene(name = 'MainScene', force = false) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!force && !this.confirmDiscardUnsaved('新建场景')) {
        project.setStatus('已取消新建场景。')
        return
      }
      this.currentScene = new SceneClass(createSceneId('scene'), name)
      this.isDirty = true
      this.revision++
      selection.clearSelection()
      project.resetSceneFile()
      project.setStatus(`已新建场景：${name}`)
      this.resetHistory()
      this.captureHistorySnapshot()
    },
    markDirty() {
      this.isDirty = true
      this.revision++
      this.scheduleHistoryCapture()
      this.scheduleAutoSave()
    },
    addEntity(entity: Entity) {
      if (!this.currentScene) return
      this.currentScene.addEntity(entity)
      const transform = entity.getTransform()
      if (transform) transform.zIndex = this.currentScene.entities.length - 1
      this.markDirty()
    },
    createEmptyEntity() {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene) {
        this.createNewScene()
      }
      if (!this.currentScene) return
      const entity = new EntityClass(createEntityId('entity'), `Entity_${this.currentScene.entities.length + 1}`)
      entity.addComponent(new TransformComponent(0, 0, 1, 1, 0, 0.5, 0.5, this.currentScene.entities.length))
      entity.addComponent(new SpriteComponent('', 96, 96, true, 0.85, 0x56ccf2, true))
      entity.addComponent(new ColliderComponent('rect', 96, 96))
      this.currentScene.addEntity(entity)
      this.markDirty()
      selection.selectEntity(entity.id)
      project.setStatus(`已新建实体：${entity.name}`)
    },
    async createSpriteEntityFromAsset(assetPath: string, position?: { x: number; y: number }) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const assets = useAssetStore()
      if (!this.currentScene) {
        this.createNewScene()
      }
      if (!this.currentScene) {
        project.setStatus('当前没有可编辑的场景。')
        return
      }

      await assets.ensurePreview(assetPath)
      const imageSize = await assets.ensureImageSize(assetPath)
      const naturalWidth = imageSize?.width ?? 96
      const naturalHeight = imageSize?.height ?? 96
      const fitScale = Math.min(1, 192 / Math.max(naturalWidth, naturalHeight))
      const spriteWidth = Math.max(24, Math.round(naturalWidth * fitScale))
      const spriteHeight = Math.max(24, Math.round(naturalHeight * fitScale))

      const entity = new EntityClass(createEntityId('sprite'), `Sprite_${this.currentScene.entities.length + 1}`)
      entity.addComponent(
        new TransformComponent(
          position?.x ?? 320,
          position?.y ?? 220,
          1,
          1,
          0,
          0.5,
          0.5,
          this.currentScene.entities.length
        )
      )
      entity.addComponent(new SpriteComponent(assetPath, spriteWidth, spriteHeight, true, 1, 0xffffff, true))
      this.currentScene.addEntity(entity)
      this.markDirty()
      selection.selectEntity(entity.id)
      project.setStatus(`已从资源创建实体：${entity.name}`)
    },

    duplicateSelectedEntity() {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const entity = this.currentScene?.getEntityById(selection.selectedEntityId)
      if (!entity || !this.currentScene) {
        project.setStatus('请先选择一个实体再复制。')
        return
      }
      const copy = deserializeEntity(serializeEntity(entity))
      copy.id = createEntityId('copy')
      copy.name = `${entity.name}_Copy`
      const transform = copy.getTransform()
      if (transform) {
        transform.x += 32
        transform.y += 32
        transform.zIndex = this.currentScene.entities.length
      }
      this.currentScene.addEntity(copy)
      this.markDirty()
      selection.selectEntity(copy.id)
      project.setStatus(`已复制实体：${entity.name}`)
    },

    removeSelectedEntity(force = false) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene || !selection.selectedEntityId) {
        project.setStatus('当前没有选中的实体可删除。')
        return
      }
      const entity = this.currentScene.getEntityById(selection.selectedEntityId)
      if (!entity) {
        selection.clearSelection()
        return
      }
      if (!force && !window.confirm(`确认删除实体“${entity.name}”吗？`)) {
        project.setStatus('已取消删除实体。')
        return
      }
      this.currentScene.removeEntityById(entity.id)
      this.currentScene.entities.forEach((item, idx) => {
        const transform = item.getTransform()
        if (transform) transform.zIndex = idx
      })
      selection.clearSelection()
      this.markDirty()
      project.setStatus(`已删除实体：${entity.name}`)
    },

    moveSelectedEntityLayer(delta: number) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene || !selection.selectedEntityId) {
        project.setStatus('请先选择一个实体再调整层级。')
        return
      }
      const entity = this.currentScene.getEntityById(selection.selectedEntityId)
      if (!entity) return
      const moved = this.currentScene.moveEntityLayer(entity.id, delta)
      if (!moved) {
        project.setStatus(delta < 0 ? '该实体已经在最底层。' : '该实体已经在最顶层。')
        return
      }
      this.markDirty()
      project.setStatus(`已调整层级：${entity.name}`)
    },
    async saveSceneAs() {
      if (!this.currentScene) return
      const project = useProjectStore()
      const assets = useAssetStore()
      const content = serializeScene(this.currentScene)
      if (!window.unu?.saveScene) {
        project.setStatus('当前为浏览器模式，未接入本地保存。')
        return
      }
      const saved = await window.unu.saveScene({
        content,
        suggestedName: `${this.currentScene.name}.scene.json`,
        projectRoot: project.rootPath
      })
      if (!saved) return
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
        project.setStatus('当前为浏览器模式，未接入本地保存。')
        return
      }
      const saved = await window.unu.saveScene({
        filePath: project.currentScenePath,
        content: serializeScene(this.currentScene),
        suggestedName: `${this.currentScene.name}.scene.json`,
        projectRoot: project.rootPath
      })
      if (!saved) return
      project.markSaved()
      this.isDirty = false
      this.clearAutoSaveTimer()
    },
    async openSceneFromDisk() {
      const project = useProjectStore()
      if (!this.confirmDiscardUnsaved('打开其他场景')) {
        project.setStatus('已取消打开场景。')
        return
      }
      if (!window.unu?.openScene) {
        project.setStatus('当前为浏览器模式，未接入本地打开。')
        return
      }
      const result = await window.unu.openScene({ projectRoot: project.rootPath })
      if (!result) {
        project.setStatus('已取消打开场景。')
        return
      }
      const scene = deserializeScene(result.content)
      this.currentScene = scene
      this.isDirty = false
      this.revision++
      useSelectionStore().clearSelection()
      project.setSceneFile(result.filePath)
      project.setStatus(`已打开场景：${result.name}`)
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
        project.setStatus('请先选择一个实体再保存为 Prefab。')
        return
      }
      if (!window.unu?.savePrefab) {
        project.setStatus('当前为浏览器模式，未接入本地 Prefab 保存。')
        return
      }
      const saved = await window.unu.savePrefab({
        content: serializePrefab(entity),
        suggestedName: `${entity.name}.prefab.json`,
        projectRoot: project.rootPath
      })
      if (!saved) return
      project.setStatus(`Prefab 已保存：${saved.name}`)
      await assets.refreshProject()
    },
    async instantiatePrefabFromDisk() {
      const project = useProjectStore()
      if (!window.unu?.openPrefab) {
        project.setStatus('当前为浏览器模式，未接入本地 Prefab 打开。')
        return
      }
      const result = await window.unu.openPrefab({ projectRoot: project.rootPath })
      if (!result) {
        project.setStatus('已取消打开 Prefab。')
        return
      }
      if (!this.currentScene) {
        this.createNewScene()
      }
      if (!this.currentScene) return
      const entity = instantiatePrefab(result.content, createEntityId('prefab'))
      entity.name = `${entity.name}_Instance`
      const transform = entity.getTransform()
      if (transform) {
        transform.x += 80
        transform.y += 80
        transform.zIndex = this.currentScene.entities.length
      }
      this.currentScene.addEntity(entity)
      this.markDirty()
      useSelectionStore().selectEntity(entity.id)
      project.setStatus(`已实例化 Prefab：${result.name}`)
    }
  }
})
