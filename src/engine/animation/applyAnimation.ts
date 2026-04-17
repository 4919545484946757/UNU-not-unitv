import { AnimationComponent, type TransformTrackPoint } from '../components/AnimationComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TransformComponent } from '../components/TransformComponent'
import type { Scene } from '../core/Scene'

export function getAnimationFrameDuration(animation: AnimationComponent, frameIndex: number) {
  const safeIndex = Math.max(0, Math.min(frameIndex, animation.framePaths.length - 1))
  const durationMultiplier = Math.max(1, Number(animation.frameDurations[safeIndex] ?? 1))
  return durationMultiplier / Math.max(1, animation.fps)
}

export function getAnimationTotalDuration(animation: AnimationComponent) {
  if (!animation.framePaths.length) return 0
  return animation.framePaths.reduce((sum, _frame, index) => sum + getAnimationFrameDuration(animation, index), 0)
}

export function getAnimationProgress(animation: AnimationComponent) {
  const total = getAnimationTotalDuration(animation)
  if (total <= 0 || !animation.framePaths.length) return 0

  let elapsedBeforeCurrentFrame = 0
  for (let i = 0; i < animation.currentFrame; i += 1) {
    elapsedBeforeCurrentFrame += getAnimationFrameDuration(animation, i)
  }
  return Math.max(0, Math.min(1, (elapsedBeforeCurrentFrame + animation.elapsed) / total))
}

export function applySceneAnimation(scene: Scene, delta: number, onEvent?: (payload: { entityId: string; frame: number; name: string; payload?: string }) => void) {
  for (const entity of scene.entities) {
    const animation = entity.getComponent<AnimationComponent>('Animation')
    const sprite = entity.getComponent<SpriteComponent>('Sprite')
    const transform = entity.getComponent<TransformComponent>('Transform')
    if (!animation || !sprite || !animation.enabled || !animation.playing) continue

    const hasFrameAnim = animation.framePaths.length > 0 && animation.fps > 0
    const hasTransformAnim =
      animation.transformTracks.positionX.length > 0 ||
      animation.transformTracks.positionY.length > 0 ||
      animation.transformTracks.rotation.length > 0
    if (!hasFrameAnim && !hasTransformAnim) continue

    if (hasFrameAnim) {
      animation.elapsed += delta

      while (true) {
        const frameIndex = Math.max(0, Math.min(animation.currentFrame, animation.framePaths.length - 1))
        const frameDuration = getAnimationFrameDuration(animation, frameIndex)
        if (animation.elapsed < frameDuration) break

        animation.elapsed -= frameDuration
        animation.currentFrame += 1
        if (animation.currentFrame >= animation.framePaths.length) {
          if (animation.loop) {
            animation.currentFrame = 0
          } else {
            animation.currentFrame = animation.framePaths.length - 1
            animation.playing = false
            break
          }
        }

        for (const event of animation.frameEvents) {
          if (event.frame === animation.currentFrame && event.name) {
            onEvent?.({ entityId: entity.id, frame: event.frame, name: event.name, payload: event.payload })
          }
        }
      }

      const nextPath = animation.framePaths[Math.max(0, Math.min(animation.currentFrame, animation.framePaths.length - 1))]
      if (nextPath) sprite.texturePath = nextPath
    }

    if (!hasFrameAnim && hasTransformAnim) {
      const maxFrame = getTrackMaxFrame(animation)
      const speedFps = Math.max(1, animation.fps)
      animation.elapsed += delta
      let cursor = animation.elapsed * speedFps
      if (animation.loop) {
        cursor = cursor % (maxFrame + 1)
      } else {
        cursor = Math.min(maxFrame, cursor)
        if (cursor >= maxFrame) animation.playing = false
      }
      animation.currentFrame = Math.floor(cursor)
      animation.elapsed = cursor / speedFps
    }

    if (hasTransformAnim && transform) {
      const maxFrame = getTrackMaxFrame(animation)
      const frameCursor = getAnimationFrameCursor(animation, maxFrame)
      applyTransformTrack(transform, animation.transformTracks.positionX, frameCursor, 'x')
      applyTransformTrack(transform, animation.transformTracks.positionY, frameCursor, 'y')
      applyTransformTrack(transform, animation.transformTracks.rotation, frameCursor, 'rotation')
    }
  }
}

function getTrackMaxFrame(animation: AnimationComponent) {
  const fromFrames = Math.max(0, animation.framePaths.length - 1)
  const fromTracks = Math.max(
    0,
    ...animation.transformTracks.positionX.map((point) => point.frame),
    ...animation.transformTracks.positionY.map((point) => point.frame),
    ...animation.transformTracks.rotation.map((point) => point.frame)
  )
  return Math.max(1, fromFrames, fromTracks)
}

function getAnimationFrameCursor(animation: AnimationComponent, maxFrame: number) {
  if (animation.framePaths.length === 0) {
    return Math.max(0, Math.min(maxFrame, animation.elapsed * Math.max(1, animation.fps)))
  }
  const progress = getAnimationProgress(animation)
  return progress * maxFrame
}

function applyTransformTrack(
  transform: TransformComponent,
  track: TransformTrackPoint[],
  frameCursor: number,
  key: 'x' | 'y' | 'rotation'
) {
  if (!track.length) return
  ;(transform as Record<string, number>)[key] = evaluateTrack(track, frameCursor)
}

function evaluateTrack(track: TransformTrackPoint[], frameCursor: number) {
  const sorted = [...track].sort((a, b) => a.frame - b.frame)
  if (frameCursor <= sorted[0].frame) return sorted[0].value
  if (frameCursor >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1].value
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const left = sorted[i]
    const right = sorted[i + 1]
    if (frameCursor < left.frame || frameCursor > right.frame) continue
    const span = Math.max(1e-6, right.frame - left.frame)
    const t = Math.max(0, Math.min(1, (frameCursor - left.frame) / span))
    return left.value + (right.value - left.value) * t
  }
  return sorted[sorted.length - 1].value
}
