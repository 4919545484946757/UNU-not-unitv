import { AnimationComponent, type TransformTrackPoint } from '../components/AnimationComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TransformComponent } from '../components/TransformComponent'
import type { Scene } from '../core/Scene'

const stateRuntime = new WeakMap<AnimationComponent, { consumed: Set<string>; lastState: string }>()

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

export interface AnimationRuntimeInput {
  getMoveVector: (normalized?: boolean) => { x: number; y: number }
  isActionDown: (action: string) => boolean
  wasActionPressed?: (action: string) => boolean
  wasActionReleased?: (action: string) => boolean
}

export function applySceneAnimation(
  scene: Scene,
  delta: number,
  onEvent?: (payload: { entityId: string; frame: number; name: string; payload?: string }) => void,
  input?: AnimationRuntimeInput
) {
  for (const entity of scene.entities) {
    const animation = entity.getComponent<AnimationComponent>('Animation')
    const sprite = entity.getComponent<SpriteComponent>('Sprite')
    const transform = entity.getComponent<TransformComponent>('Transform')
    if (!animation || !sprite || !animation.enabled || !animation.playing) continue

    const machineResolved = resolveAnimationStateMachine(animation, input)
    const activeFramePaths = machineResolved?.framePaths ?? animation.framePaths
    const activeFrameDurations = machineResolved?.frameDurations ?? animation.frameDurations
    const activeLoop = machineResolved?.loop ?? animation.loop
    if (activeFramePaths.length > 0) {
      animation.currentFrame = Math.max(0, Math.min(animation.currentFrame, activeFramePaths.length - 1))
    } else {
      animation.currentFrame = 0
      animation.elapsed = 0
    }
    const hasFrameAnim = activeFramePaths.length > 0 && animation.fps > 0
    const hasTransformAnim =
      animation.transformTracks.positionX.length > 0 ||
      animation.transformTracks.positionY.length > 0 ||
      animation.transformTracks.rotation.length > 0
    if (!hasFrameAnim && !hasTransformAnim) continue

    if (hasFrameAnim) {
      animation.elapsed += delta

      while (true) {
        const frameIndex = Math.max(0, Math.min(animation.currentFrame, activeFramePaths.length - 1))
        const durationMultiplier = Math.max(1, Number(activeFrameDurations[frameIndex] ?? 1))
        const frameDuration = durationMultiplier / Math.max(1, animation.fps)
        if (animation.elapsed < frameDuration) break

        animation.elapsed -= frameDuration
        animation.currentFrame += 1
        if (animation.currentFrame >= activeFramePaths.length) {
          if (activeLoop) {
            animation.currentFrame = 0
          } else {
            animation.currentFrame = activeFramePaths.length - 1
            if (!machineResolved) {
              animation.playing = false
            }
            break
          }
        }

        for (const event of animation.frameEvents) {
          if (event.frame === animation.currentFrame && event.name) {
            onEvent?.({ entityId: entity.id, frame: event.frame, name: event.name, payload: event.payload })
          }
        }
      }

      const nextPath = activeFramePaths[Math.max(0, Math.min(animation.currentFrame, activeFramePaths.length - 1))]
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

function resolveAnimationStateMachine(animation: AnimationComponent, input?: AnimationRuntimeInput) {
  const machine = animation.stateMachine
  if (!machine?.enabled || !machine.clips.length) return null

  const runtime = stateRuntime.get(animation) || { consumed: new Set<string>(), lastState: '' }
  stateRuntime.set(animation, runtime)

  if (!machine.currentState) {
    machine.currentState = machine.initialState || machine.clips[0]?.name || ''
    animation.currentFrame = 0
    animation.elapsed = 0
    runtime.consumed.clear()
    runtime.lastState = machine.currentState
  }

  if (runtime.lastState !== machine.currentState) {
    runtime.consumed.clear()
    runtime.lastState = machine.currentState
  }

  const currentClip = machine.clips.find((clip) => clip.name === machine.currentState) || machine.clips[0]
  const currentLoop = currentClip?.loop ?? true
  const currentClipFinished = !!currentClip && !currentLoop && animation.currentFrame >= Math.max(0, currentClip.framePaths.length - 1)
  const currentClipProgress = currentClip ? getClipProgress(animation, currentClip.frameDurations, currentClip.framePaths.length) : 0

  const candidates: Array<{
    transition: (typeof machine.transitions)[number]
    index: number
    transitionKey: string
    priority: number
    fromSpecificity: number
    conditionRank: number
    stateChangeRank: number
  }> = []

  const transitions = machine.transitions || []
  for (let index = 0; index < transitions.length; index += 1) {
    const transition = transitions[index]
    if (!transition.to || !transition.from) continue
    if (transition.from !== machine.currentState && transition.from !== '*') continue
    if ((transition.canInterrupt ?? true) === false && !currentClipFinished) continue
    if (transition.exitTime && !currentClipFinished) continue
    const minNormalizedTime = Math.max(0, Math.min(1, Number(transition.minNormalizedTime ?? 0)))
    if (currentClipProgress + 1e-6 < minNormalizedTime) continue
    const transitionKey = `${index}|${transition.from}|${transition.to}|${transition.condition}|${transition.action || ''}|${minNormalizedTime}`
    if (transition.once && runtime.consumed.has(transitionKey)) continue
    if (!checkTransitionCondition(transition.condition, input, transition.action)) continue
    const priority = Number.isFinite(Number(transition.priority)) ? Number(transition.priority) : 0
    const fromSpecificity = transition.from === machine.currentState ? 1 : 0
    const conditionRank = getTransitionConditionRank(transition.condition)
    const stateChangeRank = transition.to !== machine.currentState ? 1 : 0
    candidates.push({ transition, index, transitionKey, priority, fromSpecificity, conditionRank, stateChangeRank })
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) =>
      b.priority - a.priority ||
      b.fromSpecificity - a.fromSpecificity ||
      b.stateChangeRank - a.stateChangeRank ||
      b.conditionRank - a.conditionRank ||
      a.index - b.index
    )
    const chosen = candidates[0]
    if (chosen.transition.to !== machine.currentState) {
      machine.currentState = chosen.transition.to
      animation.currentFrame = 0
      animation.elapsed = 0
      runtime.consumed.clear()
      runtime.lastState = machine.currentState
    }
    if (chosen.transition.once) {
      runtime.consumed.add(chosen.transitionKey)
    }
  }

  const activeClip = machine.clips.find((clip) => clip.name === machine.currentState) || machine.clips[0]
  if (!activeClip) return null
  return {
    framePaths: activeClip.framePaths,
    frameDurations: activeClip.frameDurations,
    loop: activeClip.loop
  }
}

function getTransitionConditionRank(condition: 'always' | 'ifMoving' | 'ifNotMoving' | 'ifActionDown' | 'ifActionUp') {
  if (condition === 'ifActionDown' || condition === 'ifActionUp') return 3
  if (condition === 'ifMoving' || condition === 'ifNotMoving') return 2
  return 1
}

function getClipProgress(animation: AnimationComponent, frameDurations: number[], frameCount: number) {
  if (frameCount <= 0) return 1
  const safeCount = Math.max(1, frameCount)
  const durations = Array.from({ length: safeCount }, (_, index) => Math.max(1, Number(frameDurations[index] ?? 1)))
  const total = durations.reduce((sum, value) => sum + value / Math.max(1, animation.fps), 0)
  if (total <= 0) return 0
  let elapsedBefore = 0
  const clampedFrame = Math.max(0, Math.min(animation.currentFrame, safeCount - 1))
  for (let i = 0; i < clampedFrame; i += 1) {
    elapsedBefore += durations[i] / Math.max(1, animation.fps)
  }
  return Math.max(0, Math.min(1, (elapsedBefore + animation.elapsed) / total))
}

function checkTransitionCondition(
  condition: 'always' | 'ifMoving' | 'ifNotMoving' | 'ifActionDown' | 'ifActionUp',
  input?: AnimationRuntimeInput,
  action?: string
) {
  if (condition === 'always') return true
  if (!input) return false
  if (condition === 'ifMoving' || condition === 'ifNotMoving') {
    const move = input.getMoveVector(true)
    const moving = Math.abs(move.x) > 1e-3 || Math.abs(move.y) > 1e-3
    return condition === 'ifMoving' ? moving : !moving
  }
  const actionName = action || 'fire'
  if (condition === 'ifActionDown') {
    return input.wasActionPressed ? input.wasActionPressed(actionName) : input.isActionDown(actionName)
  }
  const releasedThisFrame = input.wasActionReleased ? input.wasActionReleased(actionName) : false
  const notPressedNow = !input.isActionDown(actionName)
  return releasedThisFrame || notPressedNow
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
