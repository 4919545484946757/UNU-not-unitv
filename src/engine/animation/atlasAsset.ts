import type { AnimationAtlasGrid } from '../components/AnimationComponent'

export interface AtlasGridPayload extends AnimationAtlasGrid {
  imagePath: string
}

export interface AtlasAssetData {
  format: 'unu-atlas'
  version: 1
  atlas: AtlasGridPayload
  clips?: AtlasClipPayload[]
}

export interface AtlasClipPayload {
  name: string
  frames: number[]
  durations: number[]
  loop: boolean
}

export function normalizeAtlasClips(clips: AtlasClipPayload[] | undefined, frameCount: number) {
  const maxIndex = Math.max(0, Math.floor(Number(frameCount) || 1) - 1)
  return (clips || [])
    .map((clip) => {
      const frames = Array.isArray(clip.frames)
        ? clip.frames.map((frame) => Math.max(0, Math.min(maxIndex, Math.floor(Number(frame) || 0))))
        : []
      return {
        name: String(clip.name || '').trim() || 'Atlas',
        frames,
        durations: frames.map((_, index) => Math.max(1, Math.floor(Number(clip.durations?.[index]) || 1))),
        loop: clip.loop ?? true
      }
    })
    .filter((clip, index, list) => clip.name && list.findIndex((item) => item.name === clip.name) === index)
}

export function serializeAtlasAsset(payload: AtlasGridPayload, clips?: AtlasClipPayload[]) {
  const data: AtlasAssetData = {
    format: 'unu-atlas',
    version: 1,
    atlas: payload,
    clips: normalizeAtlasClips(clips, payload.frameCount)
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

export function buildAtlasFrameRefPath(atlasPath: string, frameIndex: number) {
  const normalized = String(atlasPath || '').trim()
  return normalized ? `atlasframe://${normalized}#${Math.max(0, Math.floor(Number(frameIndex) || 0))}` : ''
}

export function parseAtlasFrameRefPath(texturePath: string) {
  const value = String(texturePath || '')
  const match = value.match(/^atlasframe:\/\/(.+)#(\d+)$/) || value.match(/^(.+\.atlas\.json)#(\d+)$/)
  if (!match) return null
  return {
    atlasPath: match[1],
    frameIndex: Math.max(0, Number(match[2]) || 0)
  }
}

export function createAtlasFramePaths(payload: AtlasGridPayload, atlasPath = '') {
  const count = Math.max(1, payload.frameCount)
  const normalizedAtlasPath = String(atlasPath || '').trim()
  return Array.from({ length: count }, (_, index) => (
    normalizedAtlasPath ? buildAtlasFrameRefPath(normalizedAtlasPath, index) : buildAtlasFramePath(payload, index)
  ))
}
