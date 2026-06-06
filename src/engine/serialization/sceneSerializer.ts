import { AnimationComponent } from '../components/AnimationComponent'
import { AudioComponent } from '../components/AudioComponent'
import { BackgroundComponent } from '../components/BackgroundComponent'
import { CameraComponent } from '../components/CameraComponent'
import { COLLISION_LAYERS, ColliderComponent, DEFAULT_COLLISION_MASKS, type CollisionLayer } from '../components/ColliderComponent'
import { InteractableComponent } from '../components/InteractableComponent'
import { ScriptComponent } from '../components/ScriptComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TilemapComponent } from '../components/TilemapComponent'
import { TransformComponent } from '../components/TransformComponent'
import { UIComponent } from '../components/UIComponent'
import { CustomComponent } from '../components/CustomComponent'
import { Entity } from '../core/Entity'
import { Scene } from '../core/Scene'
import type { ComponentData, EntityData, SceneData, SerializedSceneData } from '../scene/sceneData'

interface SerializedComponent {
  type: string
  data: Record<string, unknown>
}

interface SerializedEntity {
  id: string
  name: string
  prefabSourcePath?: string
  prefabVariantBasePath?: string
  sceneFolderPath?: string
  debugFrameVisible?: boolean
  components: SerializedComponent[]
}

interface SerializedScene {
  format: 'unu-scene'
  version: 1
  scene: {
    id: string
    name: string
    sceneFolders?: string[]
    entities: SerializedEntity[]
  }
}

export function serializeEntity(entity: Entity): SerializedEntity {
  return {
    id: entity.id,
    name: entity.name,
    prefabSourcePath: entity.prefabSourcePath || undefined,
    prefabVariantBasePath: entity.prefabVariantBasePath || undefined,
    sceneFolderPath: entity.sceneFolderPath || undefined,
    debugFrameVisible: entity.debugFrameVisible === false ? false : undefined,
    components: entity.getAllComponents().map((component) => {
      if (component instanceof CustomComponent) {
        return {
          type: component.type,
          data: JSON.parse(JSON.stringify(component.data || {}))
        }
      }
      return {
        type: component.type,
        data: JSON.parse(JSON.stringify(component))
      }
    })
  }
}

export function deserializeEntity(entityData: SerializedEntity) {
  const entity = new Entity(entityData.id, entityData.name)
  entity.prefabSourcePath = String(entityData.prefabSourcePath || '')
  entity.prefabVariantBasePath = String(entityData.prefabVariantBasePath || '')
  entity.sceneFolderPath = normalizeSceneFolderPath(entityData.sceneFolderPath)
  entity.debugFrameVisible = entityData.debugFrameVisible !== false
  for (const componentData of entityData.components) {
    const data = componentData.data
    switch (componentData.type) {
      case 'Transform':
        entity.addComponent(
          new TransformComponent(
            Number(data.x ?? 0),
            Number(data.y ?? 0),
            Number(data.scaleX ?? 1),
            Number(data.scaleY ?? 1),
            Number(data.rotation ?? 0),
            Number(data.anchorX ?? 0.5),
            Number(data.anchorY ?? 0.5),
            Number(data.zIndex ?? 0),
            data.positionMode === 'viewport' ? 'viewport' : 'world',
            data.viewportHorizontal === 'left' || data.viewportHorizontal === 'right' || data.viewportHorizontal === 'center'
              ? data.viewportHorizontal
              : 'center',
            data.viewportVertical === 'top' || data.viewportVertical === 'bottom' || data.viewportVertical === 'middle'
              ? data.viewportVertical
              : 'middle',
            Number(data.z ?? 0),
            Number(data.scaleZ ?? 1),
            Number(data.rotationX ?? 0),
            Number(data.rotationY ?? 0),
            Number(data.rotationZ ?? data.rotation ?? 0)
          )
        )
        break
      case 'Sprite':
        entity.addComponent(
          new SpriteComponent(
            String(data.texturePath ?? ''),
            Number(data.width ?? 80),
            Number(data.height ?? 80),
            Boolean(data.visible ?? true),
            Number(data.alpha ?? 1),
            Number(data.tint ?? 0xffffff),
            Boolean(data.preserveAspect ?? true),
            Number(data.offsetX ?? 0),
            Number(data.offsetY ?? 0),
            Boolean(data.showDebugFrame ?? true)
          )
        )
        break
      case 'Background':
        entity.addComponent(
          new BackgroundComponent(
            Boolean(data.enabled ?? true),
            Boolean(data.followCamera ?? true),
            data.fitMode === 'contain' ? 'contain' : 'cover'
          )
        )
        break
      case 'Collider':
        entity.addComponent(
          new ColliderComponent(
            normalizeColliderShape(data.shape),
            Number(data.width ?? 80),
            Number(data.height ?? 80),
            Number(data.offsetX ?? 0),
            Number(data.offsetY ?? 0),
            Boolean(data.isTrigger ?? false),
            normalizeCollisionLayer(data.layer),
            normalizeCollisionMask(data.collidesWith, normalizeCollisionLayer(data.layer)),
            Boolean(data.showDebugFrame ?? true),
            Number(data.depth ?? data.width ?? 80),
            Number(data.radius ?? Math.max(1, Math.min(Number(data.width ?? 80), Number(data.height ?? 80), Number(data.depth ?? data.width ?? 80)) / 2)),
            Number(data.capsuleHeight ?? data.height ?? 120),
            Number(data.offsetZ ?? 0)
          )
        )
        break
      case 'Animation':
        entity.addComponent(
          new AnimationComponent(
            Boolean(data.enabled ?? true),
            Boolean(data.playing ?? true),
            Number(data.fps ?? 8),
            Boolean(data.loop ?? true),
            Number(data.currentFrame ?? 0),
            Number(data.elapsed ?? 0),
            Array.isArray(data.framePaths) ? data.framePaths.map(String) : [],
            Array.isArray(data.frameDurations) ? data.frameDurations.map((value) => Number(value ?? 1)) : [],
            String(data.animationAssetPath ?? ''),
            String(data.sourceAtlasPath ?? ''),
            data.atlasGrid && typeof data.atlasGrid === 'object'
              ? {
                  columns: Number((data.atlasGrid as Record<string, unknown>).columns ?? 1),
                  rows: Number((data.atlasGrid as Record<string, unknown>).rows ?? 1),
                  cellWidth: Number((data.atlasGrid as Record<string, unknown>).cellWidth ?? 1),
                  cellHeight: Number((data.atlasGrid as Record<string, unknown>).cellHeight ?? 1),
                  frameCount: Number((data.atlasGrid as Record<string, unknown>).frameCount ?? 1)
                }
              : null,
            Array.isArray(data.frameEvents)
              ? data.frameEvents.map((event) => ({
                  frame: Number((event as Record<string, unknown>).frame ?? 0),
                  name: String((event as Record<string, unknown>).name ?? ''),
                  payload: String((event as Record<string, unknown>).payload ?? '')
                }))
              : [],
            data.transformTracks && typeof data.transformTracks === 'object'
              ? {
                  positionX: Array.isArray((data.transformTracks as Record<string, unknown>).positionX)
                    ? ((data.transformTracks as Record<string, unknown>).positionX as Array<Record<string, unknown>>).map((point) => ({
                        frame: Math.max(0, Number(point.frame ?? 0)),
                        value: Number(point.value ?? 0)
                      }))
                    : [],
                  positionY: Array.isArray((data.transformTracks as Record<string, unknown>).positionY)
                    ? ((data.transformTracks as Record<string, unknown>).positionY as Array<Record<string, unknown>>).map((point) => ({
                        frame: Math.max(0, Number(point.frame ?? 0)),
                        value: Number(point.value ?? 0)
                      }))
                    : [],
                  rotation: Array.isArray((data.transformTracks as Record<string, unknown>).rotation)
                    ? ((data.transformTracks as Record<string, unknown>).rotation as Array<Record<string, unknown>>).map((point) => ({
                        frame: Math.max(0, Number(point.frame ?? 0)),
                        value: Number(point.value ?? 0)
                      }))
                    : []
                }
              : { positionX: [], positionY: [], rotation: [] }
            ,
            data.stateMachine && typeof data.stateMachine === 'object'
              ? {
                  enabled: Boolean((data.stateMachine as Record<string, unknown>).enabled ?? false),
                  initialState: String((data.stateMachine as Record<string, unknown>).initialState ?? 'Idle'),
                  currentState: String((data.stateMachine as Record<string, unknown>).currentState ?? ''),
                  clips: Array.isArray((data.stateMachine as Record<string, unknown>).clips)
                    ? ((data.stateMachine as Record<string, unknown>).clips as Array<Record<string, unknown>>).map((clip) => ({
                        name: String(clip.name ?? ''),
                        framePaths: Array.isArray(clip.framePaths) ? clip.framePaths.map(String) : [],
                        frameDurations: Array.isArray(clip.frameDurations) ? clip.frameDurations.map((value) => Math.max(1, Number(value ?? 1))) : [],
                        loop: Boolean(clip.loop ?? true)
                      }))
                    : [],
                  transitions: Array.isArray((data.stateMachine as Record<string, unknown>).transitions)
                    ? ((data.stateMachine as Record<string, unknown>).transitions as Array<Record<string, unknown>>).map((t) => ({
                        from: String(t.from ?? ''),
                        to: String(t.to ?? ''),
                        condition: (
                          t.condition === 'always' ||
                          t.condition === 'ifMoving' ||
                          t.condition === 'ifNotMoving' ||
                          t.condition === 'ifActionDown' ||
                          t.condition === 'ifActionUp'
                        ) ? t.condition : 'always',
                        action: t.action ? String(t.action) : undefined,
                        priority: Number.isFinite(Number(t.priority)) ? Number(t.priority) : 0,
                        canInterrupt: t.canInterrupt === undefined ? true : Boolean(t.canInterrupt),
                        once: Boolean(t.once),
                        minNormalizedTime: Math.max(0, Math.min(1, Number(t.minNormalizedTime ?? 0))),
                        exitTime: Boolean(t.exitTime)
                      }))
                    : []
                }
              : { enabled: false, initialState: 'Idle', currentState: '', clips: [], transitions: [] }
          )
        )
        break
      case 'Script':
        entity.addComponent(
          new ScriptComponent(
            String(data.scriptPath ?? ''),
            String(data.sourceCode ?? ''),
            Boolean(data.enabled ?? true),
            null,
            false,
            false
          )
        )
        break
      case 'Camera':
        entity.addComponent(
          new CameraComponent(
            Boolean(data.enabled ?? true),
            Number(data.zoom ?? 1),
            String(data.followEntityId ?? ''),
            Number(data.followSmoothing ?? 0.18),
            Number(data.offsetX ?? 0),
            Number(data.offsetY ?? 0),
            Boolean(data.boundsEnabled ?? false),
            Number(data.minX ?? -2000),
            Number(data.maxX ?? 2000),
            Number(data.minY ?? -2000),
            Number(data.maxY ?? 2000),
            data.projection === 'perspective' ? 'perspective' : 'orthographic',
            Number(data.fov ?? 50),
            Number(data.near ?? 0.1),
            Number(data.far ?? 5000),
            Boolean(data.orbitEnabled ?? true),
            Boolean(data.panEnabled ?? true),
            Boolean(data.zoomEnabled ?? true),
            Number(data.targetX ?? 0),
            Number(data.targetY ?? 0),
            Number(data.targetZ ?? 0)
          )
        )
        break
      case 'Audio':
        entity.addComponent(
          new AudioComponent(
            Boolean(data.enabled ?? true),
            String(data.clipPath ?? ''),
            data.group === 'bgm' || data.group === 'ui' ? data.group : 'sfx',
            Number(data.volume ?? 1),
            Boolean(data.loop ?? false),
            Boolean(data.playOnStart ?? false),
            Boolean(data.playing ?? false),
            Boolean(data.muted ?? false),
            Number(data.playbackRate ?? 1),
            Number(data.fadeIn ?? 0),
            Number(data.fadeOut ?? 0)
          )
        )
        break
      case 'UI':
        entity.addComponent(
          new UIComponent(
            Boolean(data.enabled ?? true),
            data.mode === 'button' || data.mode === 'slider' ? data.mode : 'text',
            String(data.text ?? 'UI Text'),
            Number(data.fontSize ?? 20),
            Number(data.textColor ?? 0xffffff),
            normalizeUiSizeValue(data.width, 180),
            normalizeUiSizeValue(data.height, 48),
            Number(data.backgroundColor ?? 0x2b3242),
            Number(data.anchorX ?? 0.5),
            Number(data.anchorY ?? 0.5),
            Boolean(data.interactable ?? true),
            Boolean(data.markdownEnabled ?? false),
            data.renderMode === 'html' ? 'html' : 'pixi',
            String(data.onClickScriptPath ?? ''),
            Number(data.sliderValue ?? 1),
            Number(data.sliderMin ?? 0),
            Number(data.sliderMax ?? 1),
            String(data.parentId ?? ''),
            data.layout === 'vertical' || data.layout === 'horizontal' ? data.layout : 'none',
            Number(data.layoutGap ?? 8),
            Number(data.paddingX ?? 14),
            Number(data.paddingY ?? 8),
            Boolean(data.autoWidth ?? false),
            Boolean(data.autoHeight ?? false),
            normalizeUiSizeValue(data.minWidth, 1),
            normalizeUiSizeValue(data.minHeight, 1),
            String(data.htmlSourcePath ?? ''),
            Boolean(data.htmlUseIframe ?? true),
            Boolean(data.htmlAllowScripts ?? true),
            Boolean(data.htmlBridgeEnabled ?? true),
            Boolean(data.htmlDebugOverlay ?? false),
            Boolean(data.htmlDebugConsole ?? false),
            Boolean(data.htmlAutoCreateAsset ?? true),
            String(data.htmlPreviewContent ?? ''),
            String(data.backgroundTexturePath ?? ''),
            Boolean(data.backgroundVisible ?? true),
            normalizeUnitValue(data.backgroundAlpha, data.mode === 'button' ? 0.95 : 0.78)
          )
        )
        break
      case 'Tilemap':
        {
          const rawMap = data.tileTextureMap && typeof data.tileTextureMap === 'object'
            ? (data.tileTextureMap as Record<string, unknown>)
            : {}
          const tileTextureMap: Record<number, string> = {}
          for (const [key, value] of Object.entries(rawMap)) {
            const n = Number(key)
            if (!Number.isFinite(n) || n <= 0) continue
            const path = String(value ?? '').trim()
            if (!path) continue
            tileTextureMap[Math.round(n)] = path
          }
        entity.addComponent(
          new TilemapComponent(
            Boolean(data.enabled ?? true),
            Math.max(1, Number(data.columns ?? 12)),
            Math.max(1, Number(data.rows ?? 8)),
            Math.max(1, Number(data.tileWidth ?? 48)),
            Math.max(1, Number(data.tileHeight ?? 48)),
            Array.isArray(data.tiles) ? data.tiles.map((value) => Number(value ?? 0)) : [],
            Array.isArray(data.collision) ? data.collision.map((value) => Number(value ?? 0)) : [],
            Boolean(data.showCollision ?? true),
            tileTextureMap
          )
        )
        }
        break
      case 'Interactable':
        entity.addComponent(
          new InteractableComponent(
            Boolean(data.enabled ?? true),
            Math.max(0, Number(data.interactDistance ?? 160)),
            data.actionType === 'switchScene' || data.actionType === 'cycleTexture' || data.actionType === 'cycleTint' || data.actionType === 'scripted'
              ? data.actionType
              : 'none',
            String(data.targetScene ?? ''),
            Array.isArray(data.textureCycle) ? data.textureCycle.map((item) => String(item || '').trim()).filter(Boolean) : [],
            Array.isArray(data.tintCycle) ? data.tintCycle.map((item) => Number(item)).filter((value) => Number.isFinite(value)).map((value) => Math.round(value)) : [],
            String(data.targetSpawnId ?? ''),
            data.sceneStateMode === 'reset' ? 'reset' : 'preserve'
          )
        )
        break
      default:
        entity.addComponent(new CustomComponent(String(componentData.type || 'Custom'), { ...data }))
        break
    }
  }
  return entity
}

function normalizeSceneFolderPath(value: unknown) {
  return String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')
}

function normalizeUiSizeValue(value: unknown, fallback: number) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d+(\.\d+)?%$/.test(trimmed)) return trimmed
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeUnitValue(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(1, parsed))
}

export function entityToData(entity: Entity): EntityData {
  return serializeEntity(entity)
}

export function sceneToData(scene: Scene): SceneData {
  return {
    id: scene.id,
    name: scene.name,
    sceneFolders: normalizeSceneFolderList(scene.sceneFolders),
    entities: scene.entities.map(entityToData)
  }
}

export function serializeSceneData(scene: SceneData) {
  const payload: SerializedSceneData = {
    format: 'unu-scene',
    version: 1,
    scene: {
      id: scene.id,
      name: scene.name,
      sceneFolders: normalizeSceneFolderList(scene.sceneFolders),
      entities: scene.entities
    }
  }

  return JSON.stringify(payload, null, 2)
}

export function serializeScene(scene: Scene | SceneData) {
  return serializeSceneData(scene instanceof Scene ? sceneToData(scene) : scene)
}

export function deserializeSceneData(raw: string): SceneData {
  const normalizedRaw = String(raw || '').replace(/^\uFEFF/, '')
  const parsed = JSON.parse(normalizedRaw) as SerializedScene
  if (parsed.format !== 'unu-scene') {
    throw new Error('????? UNU ?????')
  }
  return {
    id: String(parsed.scene.id || ''),
    name: String(parsed.scene.name || ''),
    sceneFolders: normalizeSceneFolderList(parsed.scene.sceneFolders),
    entities: Array.isArray(parsed.scene.entities)
      ? parsed.scene.entities.map((entity) => ({
          id: String(entity.id || ''),
          name: String(entity.name || ''),
          prefabSourcePath: entity.prefabSourcePath ? String(entity.prefabSourcePath) : undefined,
          prefabVariantBasePath: entity.prefabVariantBasePath ? String(entity.prefabVariantBasePath) : undefined,
          sceneFolderPath: normalizeSceneFolderPath(entity.sceneFolderPath),
          debugFrameVisible: entity.debugFrameVisible === false ? false : undefined,
          components: Array.isArray(entity.components)
            ? entity.components.map((component) => ({
                type: String((component as ComponentData).type || ''),
                data: { ...((component as ComponentData).data || {}) }
              })).filter((component) => component.type)
            : []
        }))
      : []
  }
}

export function hydrateScene(sceneData: SceneData) {
  const scene = new Scene(sceneData.id, sceneData.name)
  scene.sceneFolders = normalizeSceneFolderList(sceneData.sceneFolders)

  for (const entityData of sceneData.entities) {
    scene.addEntity(deserializeEntity(entityData))
  }

  return scene
}

export function deserializeScene(raw: string) {
  return hydrateScene(deserializeSceneData(raw))
}

function normalizeSceneFolderList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeSceneFolderPath(item))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
}

function normalizeCollisionLayer(value: unknown): CollisionLayer {
  const text = String(value || 'Default').trim()
  return (COLLISION_LAYERS as string[]).includes(text) ? (text as CollisionLayer) : 'Default'
}

function normalizeColliderShape(value: unknown) {
  const text = String(value || 'rect').trim()
  return text === 'circle' || text === 'box' || text === 'sphere' || text === 'capsule' ? text : 'rect'
}

function normalizeCollisionMask(value: unknown, layer: CollisionLayer): CollisionLayer[] {
  const fallback = DEFAULT_COLLISION_MASKS[layer] || DEFAULT_COLLISION_MASKS.Default
  if (!Array.isArray(value)) return [...fallback]
  const normalized = value
    .map((item) => normalizeCollisionLayer(item))
    .filter((item, index, list) => list.indexOf(item) === index)
  return normalized
}
