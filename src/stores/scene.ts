import { defineStore } from 'pinia'
import type { Entity } from '../engine/core/Entity'
import type { Scene } from '../engine/core/Scene'
import { BackgroundComponent } from '../engine/components/BackgroundComponent'
import { CameraComponent } from '../engine/components/CameraComponent'
import { ColliderComponent } from '../engine/components/ColliderComponent'
import { InteractableComponent } from '../engine/components/InteractableComponent'
import { ScriptComponent } from '../engine/components/ScriptComponent'
import { SpriteComponent } from '../engine/components/SpriteComponent'
import { TilemapComponent } from '../engine/components/TilemapComponent'
import { TransformComponent } from '../engine/components/TransformComponent'
import { Entity as EntityClass } from '../engine/core/Entity'
import { Scene as SceneClass } from '../engine/core/Scene'
import { createSampleSceneByName } from '../engine/sampleScene'
import { instantiatePrefab, serializePrefab, serializePrefabVariant } from '../engine/prefabs/prefabSerializer'
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
    scenes: [] as Scene[],
    sceneFilePathById: {} as Record<string, string>,
    currentScene: null as Scene | null,
    revision: 0,
    isDirty: false,
    historyEntries: [] as string[],
    historyIndex: -1,
    historyTimer: 0 as number,
    isRestoringHistory: false,
    runtimeScene: null as Scene | null,
    runtimeRevision: 0,
    autoSaveEnabled: true,
    autoSaveIntervalSec: 20,
    autoSaveTimer: 0 as number,
    isAutoSaving: false
  }),
  getters: {
    entities(state): Entity[] {
      return state.currentScene?.entities ?? []
    },
    sceneList(state): Array<{ id: string; name: string; entityCount: number; isCurrent: boolean }> {
      const currentId = state.currentScene?.id || ''
      return state.scenes.map((scene) => ({
        id: scene.id,
        name: scene.name,
        entityCount: scene.entities.length,
        isCurrent: scene.id === currentId
      }))
    },
    canUndo(state) {
      return state.historyIndex > 0
    },
    canRedo(state) {
      return state.historyIndex >= 0 && state.historyIndex < state.historyEntries.length - 1
    }
  },
  actions: {
    resetProjectSceneState() {
      this.scenes = []
      this.sceneFilePathById = {}
      this.currentScene = null
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
    upsertScene(scene: Scene) {
      repairSceneEntityComponents(scene)
      const index = this.scenes.findIndex((item) => item.id === scene.id)
      if (index >= 0) this.scenes.splice(index, 1, scene)
      else this.scenes.push(scene)
    },
    ensureSampleSceneCatalog() {
      const project = useProjectStore()
      if (project.rootPath !== 'sample-project') return
      const main = createSampleSceneByName('MainScene')
      const second = createSampleSceneByName('SecondScene')
      if (main) this.upsertScene(main)
      if (second) this.upsertScene(second)
      if (!this.currentScene) {
        this.currentScene = this.scenes[0] || null
      }
    },
    switchEditingScene(sceneId: string) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const target = this.scenes.find((item) => item.id === sceneId)
      if (!target) {
        project.setStatus('切换场景失败：未找到对应场景。')
        return false
      }
      repairSceneEntityComponents(target)
      this.currentScene = target
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
      project.setStatus(`已切换编辑场景：${target.name}`)
      return true
    },
    renameScene(sceneId: string, nextName: string) {
      const project = useProjectStore()
      const normalized = String(nextName || '').trim()
      if (!normalized) {
        project.setStatus('场景重命名失败：名称不能为空。')
        return false
      }
      const target = this.scenes.find((item) => item.id === sceneId)
      if (!target) {
        project.setStatus('场景重命名失败：未找到对应场景。')
        return false
      }
      target.name = normalized
      this.markDirty()
      project.setStatus(`已重命名场景：${normalized}`)
      return true
    },
    duplicateScene(sceneId: string) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const source = this.scenes.find((item) => item.id === sceneId)
      if (!source) {
        project.setStatus('复制场景失败：未找到对应场景。')
        return false
      }
      const copy = new SceneClass(createSceneId('scene'), `${source.name}_Copy`)
      for (const entity of source.entities) {
        copy.addEntity(deserializeEntity(serializeEntity(entity)))
      }
      this.scenes.push(copy)
      this.currentScene = copy
      this.clearSceneFileBinding(copy.id)
      this.runtimeScene = null
      this.runtimeRevision += 1
      this.isDirty = true
      this.revision++
      selection.clearSelection()
      this.resetHistory()
      this.clearAutoSaveTimer()
      this.captureHistorySnapshot()
      project.setStatus(`已复制场景：${copy.name}`)
      return true
    },
    removeScene(sceneId: string, force = false) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (this.scenes.length <= 1) {
        project.setStatus('至少保留一个场景，无法删除。')
        return false
      }
      const index = this.scenes.findIndex((item) => item.id === sceneId)
      if (index < 0) {
        project.setStatus('删除场景失败：未找到对应场景。')
        return false
      }
      const target = this.scenes[index]
      this.clearSceneFileBinding(target.id)
      if (!force && !window.confirm(`确认删除场景“${target.name}”吗？`)) {
        project.setStatus('已取消删除场景。')
        return false
      }
      this.scenes.splice(index, 1)
      if (this.currentScene?.id === sceneId) {
        this.currentScene = this.scenes[Math.max(0, index - 1)] || this.scenes[0] || null
        selection.clearSelection()
      }
      this.runtimeScene = null
      this.runtimeRevision += 1
      this.markDirty()
      this.resetHistory()
      this.clearAutoSaveTimer()
      this.captureHistorySnapshot()
      project.setStatus(`已删除场景：${target.name}`)
      return true
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
      repairSceneEntityComponents(scene)
      this.scenes = [scene]
      this.sceneFilePathById = {}
      this.currentScene = scene
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
    },
    createNewScene(name = 'MainScene', force = false) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!force && !this.confirmDiscardUnsaved('新建场景')) {
        project.setStatus('已取消新建场景。')
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
    createEntityByType(type: 'empty' | 'sprite' | 'player' | 'enemy' | 'tilemap' | 'camera' | 'ui-text' | 'ui-button' | 'interactable' | 'door' | 'background') {
      const project = useProjectStore()
      if (!this.currentScene) this.createNewScene()
      if (!this.currentScene) return

      if (type === 'empty') {
        this.createEmptyEntity()
        return
      }
      if (type === 'tilemap') {
        this.createTilemapEntity()
        return
      }

      const selection = useSelectionStore()
      const index = this.currentScene.entities.length
      const entity = new EntityClass(createEntityId(type), `${type}_${index + 1}`)
      entity.addComponent(new TransformComponent(80 + index * 8, 60 + index * 8, 1, 1, 0, 0.5, 0.5, index))

      if (type === 'camera') {
        entity.name = 'Camera'
        entity.addComponent(new CameraComponent(true, 1, '', 0.18, 0, 0, false))
      } else if (type === 'background') {
        entity.name = 'Background'
        entity.addComponent(new SpriteComponent('assets/images/pixel/background/background-img.png', 1539, 1022, true, 1, 0xffffff, false))
        entity.addComponent(new BackgroundComponent(true, true, 'cover'))
        entity.addComponent(new CameraComponent(false, 1, '', 0.18, 0, 0, false))
      } else if (type === 'ui-text') {
        entity.name = 'UIText'
        entity.addComponent(new UIComponent(true, 'text', 'UI Text', 20, 0xffffff, 180, 48, 0x2b3242, 0.5, 0.5, false))
      } else if (type === 'ui-button') {
        entity.name = 'UIButton'
        entity.addComponent(new UIComponent(true, 'button', 'Button', 18, 0xffffff, 180, 48, 0x34528a, 0.5, 0.5, true))
      } else if (type === 'door' || type === 'interactable') {
        entity.name = type === 'door' ? 'Door' : 'Interactable'
        entity.addComponent(new SpriteComponent('', 120, 180, true, 0.95, 0xa67c52, true))
        entity.addComponent(new ColliderComponent('rect', 120, 180))
        if (type === 'door') {
          entity.addComponent(new InteractableComponent(true, 180, 'switchScene', 'SecondScene'))
        } else {
          entity.addComponent(new InteractableComponent(true, 180, 'scripted'))
          entity.addComponent(
            new ScriptComponent(
              'custom://interaction',
              `{
  "onInteract": [
    { "type": "cycleTint", "target": "self", "values": [16777215, 16762880, 9293460, 7979007] }
  ]
}`
            )
          )
        }
      } else if (type === 'player') {
        entity.name = 'Player'
        entity.addComponent(new SpriteComponent('assets/images/player.png', 90, 90, true, 1, 0xffffff, true))
        entity.addComponent(new ColliderComponent('rect', 100, 50, 0, 20))
        entity.addComponent(new ScriptComponent('builtin://player-input', '', true))
      } else if (type === 'enemy') {
        entity.name = 'Enemy'
        entity.addComponent(new SpriteComponent('assets/images/enemy.png', 80, 80, true, 1, 0xffffff, true))
        entity.addComponent(new ColliderComponent('rect', 80, 80))
        entity.addComponent(new ScriptComponent('builtin://enemy-chase-respawn', '', true))
      } else {
        entity.name = 'Sprite'
        entity.addComponent(new SpriteComponent('', 96, 96, true, 0.9, 0x8ecae6, true))
        entity.addComponent(new ColliderComponent('rect', 96, 96))
      }

      this.currentScene.addEntity(entity)
      this.markDirty()
      selection.selectEntity(entity.id)
      project.setStatus(`已新建${type}类型实体：${entity.name}`)
    },
    createEntityFromDialog(payload: {
      type: 'empty' | 'sprite' | 'player' | 'enemy' | 'tilemap' | 'camera' | 'ui-text' | 'ui-button' | 'interactable' | 'door' | 'background'
      name?: string
      x?: number
      y?: number
      scaleX?: number
      scaleY?: number
      rotation?: number
    }) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      this.createEntityByType(payload.type)
      if (!this.currentScene || !selection.selectedEntityId) return

      const entity = this.currentScene.getEntityById(selection.selectedEntityId)
      if (!entity) return

      let changed = false
      const name = String(payload.name || '').trim()
      if (name) {
        entity.name = name
        changed = true
      }

      const transform = entity.getTransform()
      if (transform) {
        if (Number.isFinite(payload.x)) {
          transform.x = Number(payload.x)
          changed = true
        }
        if (Number.isFinite(payload.y)) {
          transform.y = Number(payload.y)
          changed = true
        }
        if (Number.isFinite(payload.scaleX)) {
          transform.scaleX = Number(payload.scaleX)
          changed = true
        }
        if (Number.isFinite(payload.scaleY)) {
          transform.scaleY = Number(payload.scaleY)
          changed = true
        }
        if (Number.isFinite(payload.rotation)) {
          transform.rotation = Number(payload.rotation)
          changed = true
        }
      }

      if (changed) {
        this.markDirty()
        project.setStatus(`已新建${payload.type}类型实体：${entity.name}`)
      }
    },
    createTilemapEntity() {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene) {
        this.createNewScene()
      }
      if (!this.currentScene) return
      const columns = 12
      const rows = 8
      const size = columns * rows
      const tiles = new Array(size).fill(0).map((_v, idx) => {
        const row = Math.floor(idx / columns)
        return row >= rows - 2 ? 1 : 0
      })
      const collision = new Array(size).fill(0).map((_v, idx) => {
        const row = Math.floor(idx / columns)
        return row >= rows - 2 ? 1 : 0
      })
      const entity = new EntityClass(createEntityId('tilemap'), `Tilemap_${this.currentScene.entities.length + 1}`)
      entity.addComponent(new TransformComponent(-260, -120, 1, 1, 0, 0, 0, this.currentScene.entities.length))
      entity.addComponent(new TilemapComponent(true, columns, rows, 48, 48, tiles, collision, true))
      this.currentScene.addEntity(entity)
      this.markDirty()
      selection.selectEntity(entity.id)
      project.setStatus(`已新建 Tilemap：${entity.name}`)
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
    applyEntityJson(entityId: string, raw: string) {
      const project = useProjectStore()
      if (!this.currentScene) return false
      const index = this.currentScene.entities.findIndex((item) => item.id === entityId)
      if (index < 0) return false
      try {
        const parsed = JSON.parse(raw)
        const normalized = parsed && typeof parsed === 'object' && 'components' in parsed
          ? parsed
          : {
              id: entityId,
              name: this.currentScene.entities[index].name,
              components: []
            }
        const nextEntity = deserializeEntity(normalized)
        nextEntity.id = entityId
        if (!nextEntity.getComponent('Transform')) {
          nextEntity.addComponent(new TransformComponent(0, 0, 1, 1, 0, 0.5, 0.5, index))
        }
        this.currentScene.entities[index] = nextEntity
        this.currentScene.entities.forEach((item, idx) => {
          const transform = item.getTransform()
          if (transform) transform.zIndex = idx
        })
        this.markDirty()
        project.setStatus(`已更新实体属性：${nextEntity.name}`)
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`实体 JSON 应用失败：${message}`)
        return false
      }
    },
    switchSampleScene(sceneName: string) {
      const project = useProjectStore()
      if (project.rootPath !== 'sample-project') {
        project.setStatus('示例场景切换仅在 sample-project 模式可用。')
        return false
      }
      const scene = createSampleSceneByName(sceneName)
      if (!scene) {
        project.setStatus(`找不到场景：${sceneName}`)
        return false
      }
      repairSceneEntityComponents(scene)
      this.upsertScene(scene)
      this.currentScene = scene
      this.sceneFilePathById = {}
      this.runtimeScene = null
      this.runtimeRevision = 0
      this.isDirty = false
      this.revision++
      useSelectionStore().clearSelection()
      this.resetHistory()
      this.clearAutoSaveTimer()
      this.captureHistorySnapshot()
      project.resetSceneFile()
      project.setStatus(`已切换场景：${scene.name}`)
      return true
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
      this.setSceneFileBinding(this.currentScene.id, saved.filePath)
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
      repairSceneEntityComponents(scene)
      this.upsertScene(scene)
      this.currentScene = scene
      this.setSceneFileBinding(scene.id, result.filePath)
      this.runtimeScene = null
      this.runtimeRevision = 0
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
      entity.prefabSourcePath = String(saved.relativePath || '')
      entity.prefabVariantBasePath = ''
      project.setStatus(`Prefab 已保存：${saved.name}`)
      await assets.refreshProject()
      this.markDirty()
    },
    async saveSelectedAsPrefabVariant() {
      const project = useProjectStore()
      const assets = useAssetStore()
      const selection = useSelectionStore()
      const entity = this.currentScene?.getEntityById(selection.selectedEntityId)
      if (!entity) {
        project.setStatus('请先选择一个实体再保存为 Prefab 变体。')
        return
      }
      if (!entity.prefabSourcePath) {
        project.setStatus('请先将实体保存为普通 Prefab，再创建变体。')
        return
      }
      if (!window.unu?.savePrefab) {
        project.setStatus('当前为浏览器模式，未接入本地 Prefab 保存。')
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
      project.setStatus(`Prefab 变体已保存：${saved.name}`)
      await assets.refreshProject()
      this.markDirty()
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
      project.setStatus(`已实例化 Prefab：${result.name}`)
    },
    async applySelectedPrefabSource() {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const selectedId = selection.selectedEntityId
      if (!this.currentScene || !selectedId) {
        project.setStatus('请先选择一个 Prefab 实例实体。')
        return
      }
      const current = this.currentScene.getEntityById(selectedId)
      if (!current) return
      if (!current.prefabSourcePath) {
        project.setStatus('当前实体没有 Prefab 来源路径。')
        return
      }
      if (!window.unu?.readTextAsset || !project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('当前环境无法从磁盘读取 Prefab 源文件。')
        return
      }
      try {
        const raw = await window.unu.readTextAsset({
          projectRoot: project.rootPath,
          relativePath: current.prefabSourcePath
        })
        if (!raw?.content) {
          project.setStatus('读取 Prefab 源文件失败。')
          return
        }

        const replacement = await instantiatePrefab(raw.content, current.id, current.prefabSourcePath)
        const currentTransform = current.getTransform()
        const replacementTransform = replacement.getTransform()
        if (currentTransform && replacementTransform) {
          replacementTransform.x = currentTransform.x
          replacementTransform.y = currentTransform.y
        }
        replacement.name = current.name

        const oldIndex = this.currentScene.entities.findIndex((entity) => entity.id === current.id)
        removeEntityTreeFromScene(this.currentScene, current)
        appendEntityTreeToScene(this.currentScene, replacement, oldIndex >= 0 ? oldIndex : undefined)
        this.markDirty()
        selection.selectEntity(replacement.id)
        project.setStatus(`已应用 Prefab 源更新：${fileNameOfPath(current.prefabSourcePath)}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`应用 Prefab 源失败：${message}`)
      }
    }
    ,
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
})

function fileNameOfPath(inputPath: string) {
  const normalized = inputPath.replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(index + 1) : normalized
}

function flattenEntityTree(root: Entity) {
  const output: Entity[] = []
  const visit = (entity: Entity) => {
    output.push(entity)
    for (const child of entity.children) visit(child)
  }
  visit(root)
  return output
}

function appendEntityTreeToScene(scene: Scene, root: Entity, insertIndex?: number) {
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

function removeEntityTreeFromScene(scene: Scene, root: Entity) {
  const ids = new Set(flattenEntityTree(root).map((entity) => entity.id))
  scene.entities = scene.entities.filter((entity) => !ids.has(entity.id))
  scene.entities.forEach((entity, idx) => {
    const transform = entity.getTransform()
    if (transform) transform.zIndex = idx
  })
}

function normalizeScriptPath(input: string) {
  return String(input || '').trim().replace(/\\/g, '/')
}

function isScriptPathEquivalent(left: string, right: string) {
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

function repairSceneEntityComponents(scene: Scene) {
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
