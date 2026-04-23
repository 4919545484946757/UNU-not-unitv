import { AnimationComponent } from '../components/AnimationComponent'
import { AudioComponent } from '../components/AudioComponent'
import { BackgroundComponent } from '../components/BackgroundComponent'
import { CameraComponent } from '../components/CameraComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { InteractableComponent } from '../components/InteractableComponent'
import { ScriptComponent } from '../components/ScriptComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TilemapComponent } from '../components/TilemapComponent'
import { TransformComponent } from '../components/TransformComponent'
import { UIComponent } from '../components/UIComponent'
import { Entity } from '../core/Entity'
import { Scene } from '../core/Scene'

interface SerializedComponent {
  type: string
  data: Record<string, unknown>
}

interface SerializedEntity {
  id: string
  name: string
  prefabSourcePath?: string
  prefabVariantBasePath?: string
  components: SerializedComponent[]
}

interface SerializedScene {
  format: 'unu-scene'
  version: 1
  scene: {
    id: string
    name: string
    entities: SerializedEntity[]
  }
}

export function serializeEntity(entity: Entity): SerializedEntity {
  return {
    id: entity.id,
    name: entity.name,
    prefabSourcePath: entity.prefabSourcePath || undefined,
    prefabVariantBasePath: entity.prefabVariantBasePath || undefined,
    components: entity.getAllComponents().map((component) => ({
      type: component.type,
      data: JSON.parse(JSON.stringify(component))
    }))
  }
}

export function deserializeEntity(entityData: SerializedEntity) {
  const entity = new Entity(entityData.id, entityData.name)
  entity.prefabSourcePath = String(entityData.prefabSourcePath || '')
  entity.prefabVariantBasePath = String(entityData.prefabVariantBasePath || '')
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
            Number(data.zIndex ?? 0)
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
            Boolean(data.preserveAspect ?? true)
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
            data.shape === 'circle' ? 'circle' : 'rect',
            Number(data.width ?? 80),
            Number(data.height ?? 80),
            Number(data.offsetX ?? 0),
            Number(data.offsetY ?? 0),
            Boolean(data.isTrigger ?? false)
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
            Number(data.maxY ?? 2000)
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
            Boolean(data.playing ?? false)
          )
        )
        break
      case 'UI':
        entity.addComponent(
          new UIComponent(
            Boolean(data.enabled ?? true),
            data.mode === 'button' ? 'button' : 'text',
            String(data.text ?? 'UI Text'),
            Number(data.fontSize ?? 20),
            Number(data.textColor ?? 0xffffff),
            Number(data.width ?? 180),
            Number(data.height ?? 48),
            Number(data.backgroundColor ?? 0x2b3242),
            Number(data.anchorX ?? 0.5),
            Number(data.anchorY ?? 0.5),
            Boolean(data.interactable ?? true)
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
            Array.isArray(data.tintCycle) ? data.tintCycle.map((item) => Number(item)).filter((value) => Number.isFinite(value)).map((value) => Math.round(value)) : []
          )
        )
        break
      default:
        break
    }
  }
  return entity
}

export function serializeScene(scene: Scene) {
  const payload: SerializedScene = {
    format: 'unu-scene',
    version: 1,
    scene: {
      id: scene.id,
      name: scene.name,
      entities: scene.entities.map(serializeEntity)
    }
  }

  return JSON.stringify(payload, null, 2)
}

export function deserializeScene(raw: string) {
  const parsed = JSON.parse(raw) as SerializedScene
  if (parsed.format !== 'unu-scene') {
    throw new Error('不是有效的 UNU 场景文件。')
  }

  const scene = new Scene(parsed.scene.id, parsed.scene.name)

  for (const entityData of parsed.scene.entities) {
    scene.addEntity(deserializeEntity(entityData))
  }

  return scene
}
