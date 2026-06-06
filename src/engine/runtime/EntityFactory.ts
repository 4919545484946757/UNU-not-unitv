import { AnimationComponent } from '../components/AnimationComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { ScriptComponent } from '../components/ScriptComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TransformComponent } from '../components/TransformComponent'
import { Entity } from '../core/Entity'

export function createBulletEntity(
  x: number,
  y: number,
  angle: number,
  config?: { speed?: number; life?: number; maxDistance?: number; width?: number; height?: number; tint?: number; damage?: number }
) {
  const width = clampNumber(Number(config?.width ?? 20), 1, 2048)
  const height = clampNumber(Number(config?.height ?? 8), 1, 2048)
  const tint = Math.max(0, Math.round(Number(config?.tint ?? 0xf2f5ff)))
  const scriptConfig = {
    speed: clampNumber(Number(config?.speed ?? 420), 1, 10000),
    life: clampNumber(Number(config?.life ?? 2), 0.05, 120),
    maxDistance: clampNumber(Number(config?.maxDistance ?? 560), 1, 200000),
    damage: clampNumber(Number(config?.damage ?? 18), 0, 100000)
  }
  const bullet = new Entity(`bullet_${Math.random().toString(36).slice(2, 8)}`, 'Bullet')
  bullet.addComponent(new TransformComponent(x, y, 1, 1, angle, 0.5, 0.5))
  bullet.addComponent(new SpriteComponent('', width, height, true, 1, tint))
  bullet.addComponent(new ColliderComponent('rect', width, height, 0, 0, true, 'Attack', ['Enemy', 'Default']))
  bullet.addComponent(new ScriptComponent('assets/scripts/bullet-projectile.js', JSON.stringify(scriptConfig, null, 2)))
  return bullet
}

export function createEnemyEntityAt(
  x: number,
  y: number,
  colliderTemplate: ColliderComponent,
  spriteTemplate?: SpriteComponent,
  animationTemplate?: AnimationComponent,
  scriptTemplate?: ScriptComponent
) {
  const enemy = new Entity(`enemy_${Math.random().toString(36).slice(2, 8)}`, 'Enemy')
  enemy.addComponent(new TransformComponent(x, y, 1, 1, 0, 0.5, 0.5))
  enemy.addComponent(
    new SpriteComponent(
      spriteTemplate?.texturePath || 'assets/images/pixel/enemy/tube_01.png',
      spriteTemplate?.width || 80,
      spriteTemplate?.height || 80,
      spriteTemplate?.visible ?? true,
      spriteTemplate?.alpha ?? 1,
      spriteTemplate?.tint ?? 0xffffff,
      spriteTemplate?.preserveAspect ?? true,
      spriteTemplate?.offsetX ?? 0,
      spriteTemplate?.offsetY ?? 0,
      spriteTemplate?.showDebugFrame ?? true
    )
  )
  enemy.addComponent(
    new ColliderComponent(
      colliderTemplate.shape,
      colliderTemplate.width,
      colliderTemplate.height,
      colliderTemplate.offsetX,
      colliderTemplate.offsetY,
      colliderTemplate.isTrigger,
      colliderTemplate.layer,
      [...(colliderTemplate.collidesWith || [])],
      colliderTemplate.showDebugFrame ?? true,
      colliderTemplate.depth,
      colliderTemplate.radius,
      colliderTemplate.capsuleHeight,
      colliderTemplate.offsetZ
    )
  )
  if (animationTemplate) {
    enemy.addComponent(
      new AnimationComponent(
        animationTemplate.enabled,
        true,
        animationTemplate.fps,
        animationTemplate.loop,
        0,
        0,
        [...animationTemplate.framePaths],
        [...animationTemplate.frameDurations],
        animationTemplate.animationAssetPath,
        animationTemplate.sourceAtlasPath,
        animationTemplate.atlasGrid ? { ...animationTemplate.atlasGrid } : null,
        animationTemplate.frameEvents.map((event) => ({ ...event })),
        {
          positionX: animationTemplate.transformTracks.positionX.map((point) => ({ ...point })),
          positionY: animationTemplate.transformTracks.positionY.map((point) => ({ ...point })),
          rotation: animationTemplate.transformTracks.rotation.map((point) => ({ ...point }))
        },
        {
          enabled: animationTemplate.stateMachine.enabled,
          initialState: animationTemplate.stateMachine.initialState,
          currentState: animationTemplate.stateMachine.initialState,
          clips: animationTemplate.stateMachine.clips.map((clip) => ({
            name: clip.name,
            framePaths: [...clip.framePaths],
            frameDurations: [...clip.frameDurations],
            loop: clip.loop
          })),
          transitions: animationTemplate.stateMachine.transitions.map((transition) => ({ ...transition }))
        }
      )
    )
  }
  enemy.addComponent(
    new ScriptComponent(
      scriptTemplate?.scriptPath || 'assets/scripts/enemy-chase-respawn.js',
      scriptTemplate?.sourceCode || `{
  "chaseSpeed": 120,
  "respawnMinDistance": 160
}`
    )
  )
  return enemy
}

export function randomSpawnAwayFrom(x: number, y: number, minDistance: number) {
  for (let i = 0; i < 12; i += 1) {
    const px = randomInRange(-420, 420)
    const py = randomInRange(-240, 240)
    if (Math.hypot(px - x, py - y) >= minDistance) {
      return { x: px, y: py }
    }
  }
  return { x: randomInRange(-420, 420), y: randomInRange(-240, 240) }
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}
