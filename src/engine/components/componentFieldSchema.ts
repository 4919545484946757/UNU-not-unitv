import type { AudioComponent } from './AudioComponent'
import type { BackgroundComponent } from './BackgroundComponent'
import type { CameraComponent } from './CameraComponent'
import type { ColliderComponent } from './ColliderComponent'
import type { InteractableComponent } from './InteractableComponent'
import type { SpriteComponent } from './SpriteComponent'
import type { TilemapComponent } from './TilemapComponent'
import type { TransformComponent } from './TransformComponent'
import type { UIComponent } from './UIComponent'
import type { AnimationComponent } from './AnimationComponent'

export type InspectorComponentGroup =
  | 'transform'
  | 'sprite'
  | 'background'
  | 'collider'
  | 'animation'
  | 'camera'
  | 'audio'
  | 'ui'
  | 'tilemap'
  | 'interactable'

export type InspectorComponentMap = {
  transform: TransformComponent | null
  sprite: SpriteComponent | null
  background: BackgroundComponent | null
  collider: ColliderComponent | null
  animation: AnimationComponent | null
  camera: CameraComponent | null
  audio: AudioComponent | null
  ui: UIComponent | null
  tilemap: TilemapComponent | null
  interactable: InteractableComponent | null
}

type FieldKind = 'number' | 'integer' | 'nonNegativeNumber' | 'text' | 'boolean' | 'color'

type ComponentFieldSchema = Partial<Record<InspectorComponentGroup, Partial<Record<FieldKind, readonly string[]>>>>

export const inspectorComponentFieldSchema: ComponentFieldSchema = {
  transform: {
    number: ['x', 'y', 'z', 'scaleX', 'scaleY', 'scaleZ', 'anchorX', 'anchorY', 'zIndex', 'viewportOffsetX', 'viewportOffsetY']
  },
  sprite: {
    number: ['width', 'height', 'alpha', 'offsetX', 'offsetY'],
    text: ['texturePath'],
    boolean: ['visible', 'preserveAspect', 'showDebugFrame'],
    color: ['tint']
  },
  background: {
    boolean: ['enabled', 'followCamera', 'coverViewport', 'preserveAspect']
  },
  collider: {
    number: ['width', 'height', 'depth', 'radius', 'capsuleHeight', 'offsetX', 'offsetY', 'offsetZ'],
    boolean: ['enabled', 'isTrigger', 'showDebugFrame']
  },
  animation: {
    number: ['fps', 'currentFrame', 'elapsed'],
    boolean: ['enabled', 'playing', 'loop']
  },
  camera: {
    number: ['zoom', 'viewportWidth', 'viewportHeight', 'followLerp', 'followSmoothing', 'offsetX', 'offsetY', 'minX', 'maxX', 'minY', 'maxY', 'fov', 'near', 'far', 'targetX', 'targetY', 'targetZ'],
    text: ['followEntityId'],
    boolean: ['enabled', 'boundsEnabled', 'orbitEnabled', 'panEnabled', 'zoomEnabled']
  },
  audio: {
    number: ['volume', 'playbackRate', 'fadeIn', 'fadeOut'],
    text: ['clipPath'],
    boolean: ['enabled', 'loop', 'playOnStart', 'spatial', 'playing', 'muted']
  },
  ui: {
    number: ['fontSize', 'width', 'height', 'alpha', 'anchorX', 'anchorY', 'paddingX', 'paddingY', 'cornerRadius', 'sliderValue', 'sliderMin', 'sliderMax', 'backgroundAlpha'],
    text: ['text', 'parentId', 'onClickScriptPath', 'htmlSourcePath', 'backgroundTexturePath'],
    boolean: ['enabled', 'visible', 'markdownEnabled', 'htmlEnabled', 'autoSize', 'autoWidth', 'autoHeight', 'htmlUseIframe', 'htmlAllowScripts', 'htmlBridgeEnabled', 'htmlDebugOverlay', 'htmlDebugConsole', 'htmlAutoCreateAsset', 'backgroundVisible'],
    color: ['textColor', 'backgroundColor']
  },
  tilemap: {
    integer: ['columns', 'rows', 'tileWidth', 'tileHeight'],
    boolean: ['enabled', 'showGrid', 'showCollision']
  },
  interactable: {
    nonNegativeNumber: ['interactDistance'],
    text: ['targetScene', 'targetSpawnId', 'promptText'],
    boolean: ['enabled']
  }
}

export function setInspectorNumberField(components: InspectorComponentMap, group: InspectorComponentGroup, key: string, value: number) {
  const component = components[group]
  if (!component) return false
  const schema = inspectorComponentFieldSchema[group]
  if (schema?.integer?.includes(key)) return assignField(component, key, Math.round(value))
  if (schema?.nonNegativeNumber?.includes(key)) return assignField(component, key, Math.max(0, value))
  if (group === 'ui' && key === 'backgroundAlpha') return assignField(component, key, Math.max(0, Math.min(1, value)))
  if (schema?.number?.includes(key)) return assignField(component, key, value)
  return false
}

export function setInspectorTextField(components: InspectorComponentMap, group: InspectorComponentGroup, key: string, value: string) {
  const component = components[group]
  if (!component || !inspectorComponentFieldSchema[group]?.text?.includes(key)) return false
  return assignField(component, key, value)
}

export function setInspectorBooleanField(components: InspectorComponentMap, group: InspectorComponentGroup, key: string, value: boolean) {
  const component = components[group]
  if (!component || !inspectorComponentFieldSchema[group]?.boolean?.includes(key)) return false
  return assignField(component, key, value)
}

export function setInspectorColorField(components: InspectorComponentMap, group: InspectorComponentGroup, key: string, value: number) {
  const component = components[group]
  if (!component || !inspectorComponentFieldSchema[group]?.color?.includes(key)) return false
  return assignField(component, key, Math.max(0, Math.min(0xffffff, Math.round(value))))
}

function assignField<T extends object>(target: T, key: string, value: unknown) {
  if (!(key in target)) return false
  Reflect.set(target, key, value)
  return true
}
