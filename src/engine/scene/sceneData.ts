export interface ComponentData<T extends Record<string, unknown> = Record<string, unknown>> {
  type: string
  data: T
}

export interface EntityData {
  id: string
  name: string
  prefabSourcePath?: string
  prefabVariantBasePath?: string
  sceneFolderPath?: string
  debugFrameVisible?: boolean
  components: ComponentData[]
  children?: EntityData[]
}

export interface SceneData {
  id: string
  name: string
  sceneFolders: string[]
  entities: EntityData[]
}

export interface SerializedSceneData {
  format: 'unu-scene'
  version: 1
  scene: SceneData
}

export function cloneSceneData(scene: SceneData): SceneData {
  return JSON.parse(JSON.stringify(scene)) as SceneData
}

export function cloneEntityData(entity: EntityData): EntityData {
  return JSON.parse(JSON.stringify(entity)) as EntityData
}

export function normalizeSceneFolderPath(value: unknown) {
  return String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')
}

export function normalizeSceneFolderList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeSceneFolderPath(item))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
}

export function getComponentData<T extends Record<string, unknown> = Record<string, unknown>>(entity: EntityData, type: string) {
  return entity.components.find((component) => component.type === type) as ComponentData<T> | undefined
}

export function syncSceneDataZIndices(scene: SceneData) {
  scene.entities.forEach((entity, index) => {
    const transform = getComponentData(entity, 'Transform')
    if (transform) transform.data.zIndex = index
  })
}
