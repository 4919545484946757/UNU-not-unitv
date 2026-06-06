// @ts-nocheck
import { BackgroundComponent } from '../engine/components/BackgroundComponent'
import { CameraComponent } from '../engine/components/CameraComponent'
import { ColliderComponent } from '../engine/components/ColliderComponent'
import { InteractableComponent } from '../engine/components/InteractableComponent'
import { ScriptComponent } from '../engine/components/ScriptComponent'
import { SpriteComponent } from '../engine/components/SpriteComponent'
import { TilemapComponent } from '../engine/components/TilemapComponent'
import { TransformComponent } from '../engine/components/TransformComponent'
import { UIComponent } from '../engine/components/UIComponent'
import { CustomComponent } from '../engine/components/CustomComponent'
import { Entity as EntityClass } from '../engine/core/Entity'
import { createSampleSceneByName } from '../engine/sampleScene'
import { deserializeEntity, serializeEntity } from '../engine/serialization/sceneSerializer'
import { useAssetStore } from './assets'
import { useProjectStore } from './project'
import { useSelectionStore } from './selection'
import { createEntityId, getSelectedSceneEntities, repairSceneEntityComponents } from './sceneActionUtils'

export const sceneEntityActions = {
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
      project.setStatus('Scene operation updated')
    },
    createEntityByType(type: 'empty' | 'sprite' | 'player' | 'enemy' | 'tilemap' | 'camera' | 'ui-text' | 'ui-button' | 'interactable' | 'door' | 'background' | 'three-box' | 'three-plane' | 'three-model' | 'three-directional-light' | 'three-point-light' | 'three-spot-light' | 'three-ambient-light' | 'three-environment-light' | 'three-world-environment') {
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

      if (type === 'three-box' || type === 'three-plane' || type === 'three-model') {
        const kind = type === 'three-plane' ? 'plane' : type === 'three-model' ? 'model' : 'box'
        entity.name = type === 'three-model' ? 'Model' : type === 'three-plane' ? 'Plane' : 'Box'
        entity.addComponent(new SpriteComponent('', type === 'three-plane' ? 220 : 96, type === 'three-plane' ? 140 : 96, true, 1, type === 'three-plane' ? 0x3050a0 : 0x42a5f5, true))
        entity.addComponent(new ColliderComponent('rect', type === 'three-plane' ? 220 : 96, type === 'three-plane' ? 140 : 96))
        entity.addComponent(new CustomComponent('ThreeObject', { kind, width: type === 'three-plane' ? 220 : 96, height: type === 'three-plane' ? 140 : 96, depth: type === 'three-plane' ? 8 : 96, metalness: 0.02, roughness: 0.65, opacity: 1, color: type === 'three-plane' ? 0x3050a0 : 0x42a5f5, texturePath: '', normalMapPath: '', modelPath: '' }))
      } else if (type === 'three-directional-light' || type === 'three-point-light' || type === 'three-spot-light' || type === 'three-ambient-light' || type === 'three-environment-light' || type === 'three-world-environment') {
        const kind = type === 'three-directional-light'
          ? 'directionalLight'
          : type === 'three-point-light'
            ? 'pointLight'
            : type === 'three-spot-light'
              ? 'spotLight'
              : type === 'three-environment-light'
                ? 'environmentLight'
                : type === 'three-world-environment'
                  ? 'worldEnvironment'
                  : 'ambientLight'
        entity.name = type === 'three-directional-light'
          ? 'DirectionalLight'
          : type === 'three-point-light'
            ? 'PointLight'
            : type === 'three-spot-light'
              ? 'SpotLight'
              : type === 'three-environment-light'
                ? 'EnvironmentLight'
                : type === 'three-world-environment'
                  ? 'WorldEnvironment'
                  : 'AmbientLight'
        entity.addComponent(new SpriteComponent('', 32, 32, true, 1, 0xfff2b0, true))
        entity.addComponent(new CustomComponent('ThreeObject', {
          kind,
          intensity: kind === 'ambientLight' ? 0.55 : 1.3,
          distance: kind === 'pointLight' ? 1200 : kind === 'spotLight' ? 1400 : undefined,
          decay: kind === 'pointLight' || kind === 'spotLight' ? 2 : undefined,
          angle: kind === 'spotLight' ? Math.PI / 6 : undefined,
          penumbra: kind === 'spotLight' ? 0.28 : undefined,
          targetX: kind === 'directionalLight' || kind === 'spotLight' ? 0 : undefined,
          targetY: kind === 'spotLight' ? 320 : 0,
          targetZ: 0,
          environmentMapPath: kind === 'environmentLight' || kind === 'worldEnvironment' ? '' : undefined,
          worldTexturePath: kind === 'worldEnvironment' ? '' : undefined,
          environmentIntensity: kind === 'environmentLight' || kind === 'worldEnvironment' ? 1 : undefined,
          skyRadius: kind === 'worldEnvironment' ? 4000 : undefined
        }))
        const lightTransform = entity.getTransform()
        if (lightTransform && kind !== 'ambientLight' && kind !== 'environmentLight' && kind !== 'worldEnvironment') lightTransform.z = 420
      } else if (type === 'camera') {
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
        entity.addComponent(new ColliderComponent('rect', 120, 180, 0, 0, true, type === 'door' ? 'Door' : 'Sensor', ['Player']))
        if (type === 'door') {
          entity.addComponent(new InteractableComponent(true, 180, 'switchScene', 'SecondScene', [], [], '', 'preserve'))
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
        entity.addComponent(new ColliderComponent('rect', 100, 50, 0, 20, false, 'Player', ['Default', 'Enemy', 'World', 'Door', 'Pickup', 'Trap', 'Sensor']))
        entity.addComponent(new ScriptComponent('builtin://player-input', '', true))
      } else if (type === 'enemy') {
        entity.name = 'Enemy'
        entity.addComponent(new SpriteComponent('assets/images/enemy.png', 80, 80, true, 1, 0xffffff, true))
        entity.addComponent(new ColliderComponent('rect', 80, 80, 0, 0, false, 'Enemy', ['Default', 'Player', 'World', 'Attack', 'Trap', 'Sensor']))
        entity.addComponent(new ScriptComponent('builtin://enemy-chase-respawn', '', true))
      } else {
        entity.name = 'Sprite'
        entity.addComponent(new SpriteComponent('', 96, 96, true, 0.9, 0x8ecae6, true))
        entity.addComponent(new ColliderComponent('rect', 96, 96))
      }

      this.currentScene.addEntity(entity)
      this.markDirty()
      selection.selectEntity(entity.id)
      project.setStatus('Scene operation updated')
    },
    createEntityFromDialog(payload: {
      type: 'empty' | 'sprite' | 'player' | 'enemy' | 'tilemap' | 'camera' | 'ui-text' | 'ui-button' | 'interactable' | 'door' | 'background' | 'three-box' | 'three-plane' | 'three-model' | 'three-directional-light' | 'three-point-light' | 'three-spot-light' | 'three-ambient-light' | 'three-environment-light' | 'three-world-environment'
      name?: string
      x?: number
      y?: number
      z?: number
      scaleX?: number
      scaleY?: number
      scaleZ?: number
      rotation?: number
      rotationX?: number
      rotationY?: number
      rotationZ?: number
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
        if (Number.isFinite(payload.z)) {
          transform.z = Number(payload.z)
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
        if (Number.isFinite(payload.scaleZ)) {
          transform.scaleZ = Number(payload.scaleZ)
          changed = true
        }
        if (Number.isFinite(payload.rotation)) {
          transform.rotation = Number(payload.rotation)
          transform.rotationZ = transform.rotation
          changed = true
        }
        if (Number.isFinite(payload.rotationX)) {
          transform.rotationX = Number(payload.rotationX)
          changed = true
        }
        if (Number.isFinite(payload.rotationY)) {
          transform.rotationY = Number(payload.rotationY)
          changed = true
        }
        if (Number.isFinite(payload.rotationZ)) {
          transform.rotationZ = Number(payload.rotationZ)
          transform.rotation = transform.rotationZ
          changed = true
        }
      }

      if (changed) {
        this.markDirty()
        project.setStatus('Scene operation updated')
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
      project.setStatus('Scene operation updated')
    },
    async createSpriteEntityFromAsset(assetPath: string, position?: { x: number; y: number }) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const assets = useAssetStore()
      if (!this.currentScene) {
        this.createNewScene()
      }
      if (!this.currentScene) {
        project.setStatus('Scene operation updated')
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
      project.setStatus('Scene operation updated')
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
        project.setStatus('Scene operation updated')
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus('Scene operation updated')
        return false
      }
    },
    switchSampleScene(sceneName: string) {
      const project = useProjectStore()
      if (!project.isMemoryProject) {
        project.setStatus('Scene operation updated')
        return false
      }
      const scene = createSampleSceneByName(sceneName)
      if (!scene) {
        project.setStatus('Scene operation updated')
        return false
      }
      repairSceneEntityComponents(scene)
      this.upsertScene(scene)
      this.currentScene = scene
      this.syncSceneDataState()
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
      project.setStatus('Scene operation updated')
      return true
    },

    duplicateSelectedEntity() {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const entities = getSelectedSceneEntities(this.currentScene, selection)
      if (!entities.length || !this.currentScene) {
        project.setStatus('Scene operation updated')
        return
      }
      this.entityClipboard = entities.length === 1 ? serializeEntity(entities[0]) : entities.map((entity) => serializeEntity(entity))
      project.setStatus('Scene operation updated')
    },

    pasteCopiedEntity() {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene) {
        project.setStatus('Scene operation updated')
        return
      }
      if (!this.entityClipboard) {
        project.setStatus('Scene operation updated')
        return
      }
      const rawCopies = Array.isArray(this.entityClipboard) ? this.entityClipboard : [this.entityClipboard]
      const pastedIds: string[] = []
      for (const raw of rawCopies) {
        const copy = deserializeEntity(JSON.parse(JSON.stringify(raw)))
        copy.id = createEntityId('copy')
        copy.name = `${copy.name}_Copy`
        const transform = copy.getTransform()
        if (transform) {
          transform.x += 32
          transform.y += 32
          transform.zIndex = this.currentScene.entities.length
        }
        this.currentScene.addEntity(copy)
        pastedIds.push(copy.id)
      }
      this.markDirty()
      selection.selectEntities(pastedIds, pastedIds[pastedIds.length - 1])
      project.setStatus('Scene operation updated')
    },

    removeSelectedEntity(force = false) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const entities = getSelectedSceneEntities(this.currentScene, selection)
      if (!this.currentScene || !entities.length) {
        project.setStatus('Scene operation updated')
        return
      }
      if (!force && !window.confirm('Continue scene operation?')) {
        project.setStatus('Scene operation updated')
        return
      }
      const ids = new Set(entities.map((entity) => entity.id))
      this.currentScene.entities = this.currentScene.entities.filter((entity) => !ids.has(entity.id))
      this.currentScene.entities.forEach((item, idx) => {
        const transform = item.getTransform()
        if (transform) transform.zIndex = idx
      })
      selection.clearSelection()
      this.markDirty()
      project.setStatus('Scene operation updated')
    },

    removeEntityById(entityId: string, force = false) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene || !entityId) {
        project.setStatus('Scene operation updated')
        return false
      }
      const entity = this.currentScene.getEntityById(entityId)
      if (!entity) {
        if (selection.selectedEntityId === entityId) selection.clearSelection()
        project.setStatus('Scene operation updated')
        return false
      }
      if (!force && !window.confirm('Continue scene operation?')) {
        project.setStatus('Scene operation updated')
        return false
      }
      const removed = this.currentScene.removeEntityById(entity.id)
      if (!removed) {
        project.setStatus('Scene operation updated')
        return false
      }
      if (selection.selectedEntityIds.includes(entity.id)) selection.removeEntity(entity.id)
      this.markDirty()
      project.setStatus('Scene operation updated')
      return true
    },

    moveSelectedEntityLayer(delta: number) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const entities = getSelectedSceneEntities(this.currentScene, selection)
      if (!this.currentScene || !entities.length) {
        project.setStatus('Scene operation updated')
        return
      }
      const ids = new Set(entities.map((entity) => entity.id))
      const selected = this.currentScene.entities.filter((entity) => ids.has(entity.id))
      const others = this.currentScene.entities.filter((entity) => !ids.has(entity.id))
      const firstIndex = Math.min(...selected.map((entity) => this.currentScene!.entities.indexOf(entity)))
      const targetIndex = Math.max(0, Math.min(others.length, firstIndex + delta))
      this.currentScene.entities = [...others.slice(0, targetIndex), ...selected, ...others.slice(targetIndex)]
      this.currentScene.entities.forEach((item, idx) => {
        const transform = item.getTransform()
        if (transform) transform.zIndex = idx
      })
      this.markDirty()
      project.setStatus('Scene operation updated')
    },
    moveSelectedEntitiesToLayerIndex(targetIndex: number) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      const entities = getSelectedSceneEntities(this.currentScene, selection)
      if (!this.currentScene || !entities.length) return false
      const ids = new Set(entities.map((entity) => entity.id))
      const selected = this.currentScene.entities.filter((entity) => ids.has(entity.id))
      const others = this.currentScene.entities.filter((entity) => !ids.has(entity.id))
      const clamped = Math.max(0, Math.min(others.length, Number(targetIndex) || 0))
      this.currentScene.entities = [...others.slice(0, clamped), ...selected, ...others.slice(clamped)]
      this.currentScene.entities.forEach((entity, index) => {
        const transform = entity.getTransform()
        if (transform) transform.zIndex = index
      })
      this.markDirty()
      project.setStatus('Scene operation updated')
      return true
    },
    renameSelectedEntity(nextName: string) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene || !selection.selectedEntityId) {
        project.setStatus('Scene operation updated')
        return false
      }
      const entity = this.currentScene.getEntityById(selection.selectedEntityId)
      if (!entity) {
        selection.clearSelection()
        project.setStatus('Scene operation updated')
        return false
      }
      const normalized = String(nextName || '').trim()
      if (!normalized) {
        project.setStatus('Scene operation updated')
        return false
      }
      if (entity.name === normalized) return true
      entity.name = normalized
      this.markDirty()
      project.setStatus('Scene operation updated')
      return true
    },
    updateSelectedEntityId(nextId: string) {
      const project = useProjectStore()
      const selection = useSelectionStore()
      if (!this.currentScene || !selection.selectedEntityId) {
        project.setStatus('Scene operation updated')
        return false
      }
      const entity = this.currentScene.getEntityById(selection.selectedEntityId)
      if (!entity) {
        selection.clearSelection()
        project.setStatus('Scene operation updated')
        return false
      }
      const normalized = String(nextId || '').trim()
      if (!normalized) {
        project.setStatus('Scene operation updated')
        return false
      }
      if (/\s/.test(normalized)) {
        project.setStatus('Scene operation updated')
        return false
      }
      if (entity.id === normalized) return true
      const existed = this.currentScene.entities.some((item) => item.id === normalized)
      if (existed) {
        project.setStatus('Scene operation updated')
        return false
      }
      const previousId = entity.id
      entity.id = normalized
      for (const item of this.currentScene.entities) {
        const camera = item.getComponent<CameraComponent>('Camera')
        if (!camera) continue
        if (camera.followEntityId === previousId) {
          camera.followEntityId = normalized
        }
      }
      if (selection.selectedEntityId === previousId) {
        selection.selectEntity(normalized)
      }
      this.markDirty()
      project.setStatus('Scene operation updated')
      return true
    },
}
