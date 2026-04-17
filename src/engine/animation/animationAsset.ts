import { AnimationComponent } from '../components/AnimationComponent'

export interface AnimationAssetFrame {
  texturePath: string
  duration: number
}

export interface AnimationAssetEvent {
  frame: number
  name: string
  payload?: string
}

export interface AnimationAssetData {
  format: 'unu-animation'
  version: 1
  animation: {
    name: string
    fps: number
    loop: boolean
    frames: AnimationAssetFrame[]
    events?: AnimationAssetEvent[]
    sourceAtlasPath?: string
    transformTracks?: {
      positionX: Array<{ frame: number; value: number }>
      positionY: Array<{ frame: number; value: number }>
      rotation: Array<{ frame: number; value: number }>
    }
    grid?: {
      columns: number
      rows: number
      cellWidth: number
      cellHeight: number
      frameCount: number
    }
  }
}

export function buildAnimationAssetFromComponent(name: string, animation: AnimationComponent): AnimationAssetData {
  const frames = animation.framePaths.map((texturePath, index) => ({
    texturePath,
    duration: Math.max(1, Number(animation.frameDurations[index] ?? 1))
  }))

  return {
    format: 'unu-animation',
    version: 1,
    animation: {
      name,
      fps: Math.max(1, Number(animation.fps || 8)),
      loop: Boolean(animation.loop),
      frames,
      events: animation.frameEvents.map((event) => ({
        frame: Math.max(0, Number(event.frame || 0)),
        name: String(event.name || ''),
        payload: event.payload ? String(event.payload) : undefined
      })).filter((event) => event.name),
      sourceAtlasPath: animation.sourceAtlasPath || undefined,
      transformTracks: {
        positionX: animation.transformTracks.positionX.map((point) => ({ frame: Math.max(0, Number(point.frame)), value: Number(point.value) })),
        positionY: animation.transformTracks.positionY.map((point) => ({ frame: Math.max(0, Number(point.frame)), value: Number(point.value) })),
        rotation: animation.transformTracks.rotation.map((point) => ({ frame: Math.max(0, Number(point.frame)), value: Number(point.value) }))
      },
      grid: animation.atlasGrid || undefined
    }
  }
}

export function serializeAnimationAsset(name: string, animation: AnimationComponent) {
  return JSON.stringify(buildAnimationAssetFromComponent(name, animation), null, 2)
}

export function deserializeAnimationAsset(raw: string) {
  const parsed = JSON.parse(raw) as AnimationAssetData
  if (parsed.format !== 'unu-animation') {
    throw new Error('不是有效的 UNU 动画资源文件。')
  }
  return parsed
}

export function applyAnimationAssetToComponent(animation: AnimationComponent, asset: AnimationAssetData, assetPath = '') {
  animation.animationAssetPath = assetPath
  animation.fps = Math.max(1, Number(asset.animation.fps || 8))
  animation.loop = Boolean(asset.animation.loop)
  animation.currentFrame = 0
  animation.elapsed = 0
  animation.playing = true
  animation.framePaths = asset.animation.frames.map((frame) => String(frame.texturePath || ''))
  animation.frameDurations = asset.animation.frames.map((frame) => Math.max(1, Number(frame.duration || 1)))
  animation.frameEvents = (asset.animation.events || []).map((event) => ({
    frame: Math.max(0, Number(event.frame || 0)),
    name: String(event.name || ''),
    payload: event.payload ? String(event.payload) : ''
  }))
  animation.sourceAtlasPath = String(asset.animation.sourceAtlasPath || '')
  animation.transformTracks = {
    positionX: (asset.animation.transformTracks?.positionX || []).map((point) => ({ frame: Math.max(0, Number(point.frame || 0)), value: Number(point.value || 0) })),
    positionY: (asset.animation.transformTracks?.positionY || []).map((point) => ({ frame: Math.max(0, Number(point.frame || 0)), value: Number(point.value || 0) })),
    rotation: (asset.animation.transformTracks?.rotation || []).map((point) => ({ frame: Math.max(0, Number(point.frame || 0)), value: Number(point.value || 0) }))
  }
  animation.atlasGrid = asset.animation.grid
    ? {
        columns: Math.max(1, Number(asset.animation.grid.columns || 1)),
        rows: Math.max(1, Number(asset.animation.grid.rows || 1)),
        cellWidth: Math.max(1, Number(asset.animation.grid.cellWidth || 1)),
        cellHeight: Math.max(1, Number(asset.animation.grid.cellHeight || 1)),
        frameCount: Math.max(1, Number(asset.animation.grid.frameCount || 1))
      }
    : null
}

export function createAnimationComponentFromAsset(asset: AnimationAssetData, assetPath = '') {
  const component = new AnimationComponent()
  applyAnimationAssetToComponent(component, asset, assetPath)
  return component
}
