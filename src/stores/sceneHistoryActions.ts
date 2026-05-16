// @ts-nocheck
import { Scene as SceneClass } from '../engine/core/Scene'
import { deserializeScene, serializeScene } from '../engine/serialization/sceneSerializer'
import { useProjectStore } from './project'
import { useSelectionStore } from './selection'
import { repairSceneEntityComponents } from './sceneActionUtils'

export const sceneHistoryActions = {
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
    const currentSceneId = this.currentScene?.id || ''
    this.isRestoringHistory = true
    try {
      const restored = deserializeScene(raw)
      const nextScene = currentSceneId
        ? new SceneClass(currentSceneId, restored.name)
        : restored
      if (currentSceneId) {
        nextScene.entities = restored.entities
        nextScene.entities.forEach((entity, idx) => {
          const transform = entity.getTransform()
          if (transform) transform.zIndex = idx
        })
      }
        this.currentScene = nextScene
        this.runtimeScene = null
        this.runtimeRevision += 1
        this.upsertScene(nextScene)
        this.syncSceneDataState()
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
  }
}
