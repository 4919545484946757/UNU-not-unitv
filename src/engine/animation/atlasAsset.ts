import type { AnimationAtlasGrid } from '../components/AnimationComponent'

export interface AtlasGridPayload extends AnimationAtlasGrid {
  imagePath: string
}

export interface AtlasAssetData {
  format: 'unu-atlas'
  version: 1
  atlas: AtlasGridPayload
}

export function serializeAtlasAsset(payload: AtlasGridPayload) {
  const data: AtlasAssetData = {
    format: 'unu-atlas',
    version: 1,
    atlas: payload
  }
  return JSON.stringify(data, null, 2)
}

export function deserializeAtlasAsset(raw: string) {
  const parsed = JSON.parse(raw) as AtlasAssetData
  if (parsed.format !== 'unu-atlas') {
    throw new Error('不是有效的 UNU 图集切片资源文件。')
  }
  return parsed
}

export function buildAtlasFramePath(payload: AtlasGridPayload, frameIndex: number) {
  const columns = Math.max(1, payload.columns)
  const col = frameIndex % columns
  const row = Math.floor(frameIndex / columns)
  const x = col * payload.cellWidth
  const y = row * payload.cellHeight
  return `atlas://${payload.imagePath}#${x},${y},${payload.cellWidth},${payload.cellHeight}`
}

export function createAtlasFramePaths(payload: AtlasGridPayload) {
  return Array.from({ length: Math.max(1, payload.frameCount) }, (_, index) => buildAtlasFramePath(payload, index))
}
