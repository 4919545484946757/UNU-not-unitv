import { ScriptComponent } from '../components/ScriptComponent'
import type { AudioGroup } from '../components/AudioComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TilemapComponent } from '../components/TilemapComponent'
import { TransformComponent } from '../components/TransformComponent'
import { Entity } from '../core/Entity'
import type { Scene } from '../core/Scene'

interface RuntimeInput {
  isKeyDown: (code: string) => boolean
  isMouseDown: (button?: number) => boolean
  wasMousePressed: (button?: number) => boolean
  isActionDown: (action: string) => boolean
  getAxis: (axis: 'horizontal' | 'vertical') => number
  getMoveVector: (normalized?: boolean) => { x: number; y: number }
  getMousePosition: () => { x: number; y: number }
}

interface RuntimeAudio {
  playOneShot: (clipPath: string, options?: { group?: AudioGroup; volume?: number; loop?: boolean }) => Promise<void>
  playEntity: (target?: Entity) => Promise<void>
  stopEntity: (target?: Entity) => void
  setMasterVolume: (volume: number) => void
  setGroupVolume: (group: AudioGroup, volume: number) => void
  getMasterVolume: () => number
  getGroupVolume: (group: AudioGroup) => number
}

export interface ScriptContext {
  entity: Entity
  scene: Scene
  api: {
    delta: number
    time: number
    getState: <T extends Record<string, unknown>>(entity: Entity) => T
    input: RuntimeInput
    findEntityByName: (name: string) => Entity | null
    removeEntity: (target: Entity) => void
    spawnEntity: (entity: Entity) => void
    isBlockedAt: (x: number, y: number) => boolean
    isBlockedRect: (centerX: number, centerY: number, halfWidth: number, halfHeight: number) => boolean
    audio: RuntimeAudio
  }
}

export interface ScriptHooks {
  onInit?: (ctx: ScriptContext) => void
  onStart?: (ctx: ScriptContext) => void
  onUpdate?: (ctx: ScriptContext) => void
  onDestroy?: (ctx: ScriptContext) => void
}

const scriptRegistry: Record<string, ScriptHooks> = {
  'builtin://patrol': {
    onInit: ({ entity, api }) => {
      const state = api.getState<{ dir?: number; startX?: number }>(entity)
      state.dir = 1
      state.startX = entity.getTransform()?.x ?? 0
    },
    onUpdate: ({ entity, api }) => {
      const transform = entity.getTransform()
      if (!transform) return
      const state = api.getState<{ dir?: number; startX?: number }>(entity)
      const startX = Number(state.startX ?? transform.x)
      let dir = Number(state.dir ?? 1)
      transform.x += dir * 80 * api.delta
      if (transform.x > startX + 100) dir = -1
      if (transform.x < startX - 100) dir = 1
      state.dir = dir
    }
  },
  'builtin://spin': {
    onUpdate: ({ entity, api }) => {
      const transform = entity.getTransform()
      if (!transform) return
      transform.rotation += 1.5 * api.delta
    }
  },
  'builtin://player-input': {
    onUpdate: ({ entity, api }) => {
      const transform = entity.getTransform()
      if (!transform) return
      const collider = entity.getComponent<ColliderComponent>('Collider')
      const speed = api.input.isActionDown('fire') ? 220 : 140
      const move = api.input.getMoveVector(true)
      if (move.x !== 0 || move.y !== 0) {
        const nextX = transform.x + move.x * speed * api.delta
        const nextY = transform.y + move.y * speed * api.delta
        const halfWidth = Math.max(2, Number(collider?.width ?? 36) / 2)
        const halfHeight = Math.max(2, Number(collider?.height ?? 36) / 2)
        const offsetX = Number(collider?.offsetX ?? 0)
        const offsetY = Number(collider?.offsetY ?? 0)
        if (!api.isBlockedRect(nextX + offsetX, transform.y + offsetY, halfWidth, halfHeight)) transform.x = nextX
        if (!api.isBlockedRect(transform.x + offsetX, nextY + offsetY, halfWidth, halfHeight)) transform.y = nextY
      }

      if (!api.input.wasMousePressed(0)) return
      const mouse = api.input.getMousePosition()
      const dx = mouse.x - transform.x
      const dy = mouse.y - transform.y
      const length = Math.hypot(dx, dy)
      if (length < 0.001) return
      const angle = Math.atan2(dy, dx)
      api.spawnEntity(createBulletEntity(transform.x, transform.y, angle))
    }
  },
  'builtin://bullet-projectile': {
    onInit: ({ entity, api }) => {
      const state = api.getState<{ vx?: number; vy?: number; life?: number }>(entity)
      const transform = entity.getTransform()
      const speed = 420
      const angle = transform?.rotation ?? 0
      state.vx = Math.cos(angle) * speed
      state.vy = Math.sin(angle) * speed
      state.life = 2
    },
    onUpdate: ({ entity, scene, api }) => {
      const transform = entity.getTransform()
      const collider = entity.getComponent<ColliderComponent>('Collider')
      if (!transform || !collider) return
      const state = api.getState<{ vx?: number; vy?: number; life?: number }>(entity)
      transform.x += Number(state.vx ?? 0) * api.delta
      transform.y += Number(state.vy ?? 0) * api.delta
      state.life = Number(state.life ?? 0) - api.delta
      if (Number(state.life ?? 0) <= 0) {
        api.removeEntity(entity)
        return
      }

      for (const target of scene.entities) {
        if (target.id === entity.id || target.name !== 'Enemy') continue
        const targetTransform = target.getTransform()
        const targetCollider = target.getComponent<ColliderComponent>('Collider')
        const targetSprite = target.getComponent<SpriteComponent>('Sprite')
        if (!targetTransform || !targetCollider) continue
        if (!isRectColliderOverlap(transform, collider, targetTransform, targetCollider)) continue
        api.removeEntity(entity)
        api.removeEntity(target)
        const player = api.findEntityByName('Player')
        const playerTransform = player?.getTransform()
        const spawnPoint = randomSpawnAwayFrom(playerTransform?.x ?? 0, playerTransform?.y ?? 0, 160)
        api.spawnEntity(createEnemyEntityAt(spawnPoint.x, spawnPoint.y, targetCollider, targetSprite))
        break
      }
    }
  },
  'builtin://orbit-around-chest': {
    onInit: ({ entity, api }) => {
      const state = api.getState<{ angle?: number; radius?: number; angularSpeed?: number }>(entity)
      const chest = api.findEntityByName('Chest')
      const transform = entity.getTransform()
      const chestTransform = chest?.getTransform()
      if (!transform || !chestTransform) return
      const dx = transform.x - chestTransform.x
      const dy = transform.y - chestTransform.y
      state.radius = Math.max(80, Math.hypot(dx, dy))
      state.angle = Math.atan2(dy, dx)
      state.angularSpeed = 1.1
    },
    onUpdate: ({ entity, api }) => {
      const transform = entity.getTransform()
      const chest = api.findEntityByName('Chest')
      const chestTransform = chest?.getTransform()
      if (!transform || !chestTransform) return
      const state = api.getState<{ angle?: number; radius?: number; angularSpeed?: number }>(entity)
      const radius = Number(state.radius ?? 180)
      const angularSpeed = Number(state.angularSpeed ?? 1.1)
      const angle = Number(state.angle ?? 0) + angularSpeed * api.delta
      state.angle = angle
      transform.x = chestTransform.x + Math.cos(angle) * radius
      transform.y = chestTransform.y + Math.sin(angle) * radius
    }
  },
  'builtin://enemy-chase-respawn': {
    onInit: ({ entity, api }) => {
      const state = api.getState<{ seed?: number }>(entity)
      state.seed = Math.floor(Math.random() * 1000000)
    },
    onUpdate: ({ entity, api }) => {
      const selfTransform = entity.getTransform()
      const selfCollider = entity.getComponent<ColliderComponent>('Collider')
      const selfSprite = entity.getComponent<SpriteComponent>('Sprite')
      if (!selfTransform || !selfCollider || !selfSprite) return

      const player = api.findEntityByName('Player')
      const playerTransform = player?.getTransform()
      const playerCollider = player?.getComponent<ColliderComponent>('Collider')
      if (!player || !playerTransform || !playerCollider) return

      const dx = playerTransform.x - selfTransform.x
      const dy = playerTransform.y - selfTransform.y
      const distance = Math.hypot(dx, dy)
      const speed = 120
      if (distance > 1) {
        const stepX = (dx / distance) * speed * api.delta
        const stepY = (dy / distance) * speed * api.delta
        const halfWidth = Math.max(2, Number(selfCollider.width) / 2)
        const halfHeight = Math.max(2, Number(selfCollider.height) / 2)
        const offsetX = Number(selfCollider.offsetX || 0)
        const offsetY = Number(selfCollider.offsetY || 0)
        const nextX = selfTransform.x + stepX
        const nextY = selfTransform.y + stepY
        if (!api.isBlockedRect(nextX + offsetX, selfTransform.y + offsetY, halfWidth, halfHeight)) {
          selfTransform.x = nextX
        }
        if (!api.isBlockedRect(selfTransform.x + offsetX, nextY + offsetY, halfWidth, halfHeight)) {
          selfTransform.y = nextY
        }
      }

      const touching =
        Math.abs(selfTransform.x - playerTransform.x) <= (selfCollider.width + playerCollider.width) / 2 &&
        Math.abs(selfTransform.y - playerTransform.y) <= (selfCollider.height + playerCollider.height) / 2
      if (!touching) return

      api.removeEntity(entity)

      const spawnPoint = randomSpawnAwayFrom(playerTransform.x, playerTransform.y, 160)
      const enemy = new Entity(`enemy_${Math.random().toString(36).slice(2, 8)}`, 'Enemy')
      enemy.addComponent(
        new TransformComponent(
          spawnPoint.x,
          spawnPoint.y,
          1,
          1,
          0,
          0.5,
          0.5
        )
      )
      enemy.addComponent(
        new SpriteComponent(
          selfSprite.texturePath,
          selfSprite.width,
          selfSprite.height,
          selfSprite.visible,
          selfSprite.alpha,
          selfSprite.tint,
          selfSprite.preserveAspect
        )
      )
      enemy.addComponent(
        new ColliderComponent(
          selfCollider.shape,
          selfCollider.width,
          selfCollider.height,
          selfCollider.offsetX,
          selfCollider.offsetY,
          selfCollider.isTrigger
        )
      )
      enemy.addComponent(
        new ScriptComponent(
          'builtin://enemy-chase-respawn',
          `export default {
  onUpdate(ctx) {
    // Enemy 持续追踪 Player
    // 与 Player 接触后删除自身，并在随机位置生成新的 Enemy
  }
}`,
          true
        )
      )
      api.spawnEntity(enemy)
    }
  }
}

export class ScriptRuntime {
  private readonly entityState = new Map<string, Record<string, unknown>>()
  private readonly pendingRemovals = new Set<string>()
  private readonly pendingSpawns: Entity[] = []
  private elapsed = 0
  private activeScene: Scene | null = null
  private input: RuntimeInput = {
    isKeyDown: () => false,
    isMouseDown: () => false,
    wasMousePressed: () => false,
    isActionDown: () => false,
    getAxis: () => 0,
    getMoveVector: () => ({ x: 0, y: 0 }),
    getMousePosition: () => ({ x: 0, y: 0 })
  }
  private audioAdapter = {
    playOneShot: async (_clipPath: string, _options?: { group?: AudioGroup; volume?: number; loop?: boolean }) => undefined,
    playEntity: async (_target: Entity) => undefined,
    stopEntity: (_target: Entity) => undefined,
    setMasterVolume: (_volume: number) => undefined,
    setGroupVolume: (_group: AudioGroup, _volume: number) => undefined,
    getMasterVolume: () => 1,
    getGroupVolume: (_group: AudioGroup) => 1
  }

  setAudioAdapter(adapter: {
    playOneShot: (clipPath: string, options?: { group?: AudioGroup; volume?: number; loop?: boolean }) => Promise<void>
    playEntity: (target: Entity) => Promise<void>
    stopEntity: (target: Entity) => void
    setMasterVolume: (volume: number) => void
    setGroupVolume: (group: AudioGroup, volume: number) => void
    getMasterVolume: () => number
    getGroupVolume: (group: AudioGroup) => number
  }) {
    this.audioAdapter = adapter
  }

  initScene(scene: Scene) {
    this.activeScene = scene
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      if (!script || !script.enabled) continue
      const hooks = scriptRegistry[script.scriptPath]
      script.instance = hooks ?? null
      if (!hooks || script.initialized) continue
      hooks.onInit?.(this.createContext(entity, 0))
      script.initialized = true
    }
  }

  startScene(scene: Scene) {
    this.activeScene = scene
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled || script.started) continue
      hooks.onStart?.(this.createContext(entity, 0))
      script.started = true
    }
  }

  updateScene(scene: Scene, delta: number, input?: RuntimeInput) {
    this.activeScene = scene
    this.elapsed += delta
    if (input) this.input = input
    for (const entity of scene.entities) {
      if (this.pendingRemovals.has(entity.id)) continue
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled) continue
      hooks.onUpdate?.(this.createContext(entity, delta))
    }
    this.flushPendingMutations(scene)
  }

  destroyScene(scene: Scene) {
    this.activeScene = scene
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks) continue
      hooks.onDestroy?.(this.createContext(entity, 0))
      script.instance = null
      script.initialized = false
      script.started = false
    }
    this.entityState.clear()
    this.pendingRemovals.clear()
    this.pendingSpawns.length = 0
    this.activeScene = null
    this.elapsed = 0
  }

  private createContext(entity: Entity, delta: number): ScriptContext {
    if (!this.activeScene) {
      throw new Error('ScriptRuntime context requested without active scene')
    }
    return {
      entity,
      scene: this.activeScene,
      api: {
        delta,
        time: this.elapsed,
        getState: <T extends Record<string, unknown>>(target: Entity) => {
          if (!this.entityState.has(target.id)) this.entityState.set(target.id, {})
          return this.entityState.get(target.id) as T
        },
        input: this.input,
        findEntityByName: (name: string) => this.activeScene?.entities.find((candidate) => candidate.name === name) ?? null,
        removeEntity: (target: Entity) => {
          this.pendingRemovals.add(target.id)
        },
        spawnEntity: (newEntity: Entity) => {
          this.pendingSpawns.push(newEntity)
        },
        isBlockedAt: (x: number, y: number) => isWorldBlocked(this.activeScene, x, y),
        isBlockedRect: (centerX: number, centerY: number, halfWidth: number, halfHeight: number) =>
          isWorldRectBlocked(this.activeScene, centerX, centerY, halfWidth, halfHeight),
        audio: {
          playOneShot: async (clipPath: string, options?: { group?: AudioGroup; volume?: number; loop?: boolean }) => {
            await this.audioAdapter.playOneShot(clipPath, options)
          },
          playEntity: async (target?: Entity) => {
            await this.audioAdapter.playEntity(target ?? entity)
          },
          stopEntity: (target?: Entity) => {
            this.audioAdapter.stopEntity(target ?? entity)
          },
          setMasterVolume: (volume: number) => {
            this.audioAdapter.setMasterVolume(volume)
          },
          setGroupVolume: (group: AudioGroup, volume: number) => {
            this.audioAdapter.setGroupVolume(group, volume)
          },
          getMasterVolume: () => this.audioAdapter.getMasterVolume(),
          getGroupVolume: (group: AudioGroup) => this.audioAdapter.getGroupVolume(group)
        }
      }
    }
  }

  private flushPendingMutations(scene: Scene) {
    if (this.pendingRemovals.size > 0) {
      const removals = Array.from(this.pendingRemovals)
      for (const id of removals) {
        scene.removeEntityById(id)
        this.entityState.delete(id)
      }
      this.pendingRemovals.clear()
    }

    if (this.pendingSpawns.length > 0) {
      for (const spawned of this.pendingSpawns) {
        const transform = spawned.getTransform()
        if (transform) transform.zIndex = scene.entities.length
        scene.addEntity(spawned)
        const script = spawned.getComponent<ScriptComponent>('Script')
        if (script && script.enabled) {
          const hooks = scriptRegistry[script.scriptPath]
          script.instance = hooks ?? null
          if (hooks && !script.initialized) {
            hooks.onInit?.(this.createContext(spawned, 0))
            script.initialized = true
          }
          if (hooks && !script.started) {
            hooks.onStart?.(this.createContext(spawned, 0))
            script.started = true
          }
        }
      }
      this.pendingSpawns.length = 0
    }
  }
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function isRectColliderOverlap(
  aTransform: TransformComponent,
  aCollider: ColliderComponent,
  bTransform: TransformComponent,
  bCollider: ColliderComponent
) {
  return (
    Math.abs((aTransform.x + aCollider.offsetX) - (bTransform.x + bCollider.offsetX)) <= (aCollider.width + bCollider.width) / 2 &&
    Math.abs((aTransform.y + aCollider.offsetY) - (bTransform.y + bCollider.offsetY)) <= (aCollider.height + bCollider.height) / 2
  )
}

function isWorldBlocked(scene: Scene | null, x: number, y: number) {
  if (!scene) return false
  for (const entity of scene.entities) {
    const transform = entity.getComponent<TransformComponent>('Transform')
    const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
    if (!transform || !tilemap || !tilemap.enabled) continue
    const localX = x - transform.x
    const localY = y - transform.y
    const col = Math.floor(localX / tilemap.tileWidth)
    const row = Math.floor(localY / tilemap.tileHeight)
    if (col < 0 || row < 0 || col >= tilemap.columns || row >= tilemap.rows) continue
    const idx = row * tilemap.columns + col
    if (Number(tilemap.collision[idx] ?? 0) > 0) return true
  }
  return false
}

function isWorldRectBlocked(
  scene: Scene | null,
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number
) {
  if (!scene) return false
  const safeHalfW = Math.max(0, Number(halfWidth) || 0)
  const safeHalfH = Math.max(0, Number(halfHeight) || 0)
  const worldLeft = centerX - safeHalfW
  const worldRight = centerX + safeHalfW
  const worldTop = centerY - safeHalfH
  const worldBottom = centerY + safeHalfH

  for (const entity of scene.entities) {
    const transform = entity.getComponent<TransformComponent>('Transform')
    const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
    if (!transform || !tilemap || !tilemap.enabled) continue

    const minCol = Math.floor((worldLeft - transform.x) / tilemap.tileWidth)
    const maxCol = Math.floor((worldRight - transform.x) / tilemap.tileWidth)
    const minRow = Math.floor((worldTop - transform.y) / tilemap.tileHeight)
    const maxRow = Math.floor((worldBottom - transform.y) / tilemap.tileHeight)

    if (maxCol < 0 || maxRow < 0 || minCol >= tilemap.columns || minRow >= tilemap.rows) continue

    const fromCol = Math.max(0, minCol)
    const toCol = Math.min(tilemap.columns - 1, maxCol)
    const fromRow = Math.max(0, minRow)
    const toRow = Math.min(tilemap.rows - 1, maxRow)

    for (let row = fromRow; row <= toRow; row += 1) {
      for (let col = fromCol; col <= toCol; col += 1) {
        const idx = row * tilemap.columns + col
        if (Number(tilemap.collision[idx] ?? 0) > 0) return true
      }
    }
  }

  return false
}

function createBulletEntity(x: number, y: number, angle: number) {
  const bullet = new Entity(`bullet_${Math.random().toString(36).slice(2, 8)}`, 'Bullet')
  bullet.addComponent(new TransformComponent(x, y, 1, 1, angle, 0.5, 0.5))
  bullet.addComponent(new SpriteComponent('', 20, 8, true, 1, 0xf2f5ff))
  bullet.addComponent(new ColliderComponent('rect', 20, 8))
  bullet.addComponent(
    new ScriptComponent(
      'builtin://bullet-projectile',
      `export default {
  onInit(ctx) {
    // 子弹从 player 位置发射，朝鼠标点击方向飞行
  },
  onUpdate(ctx) {}
}`
    )
  )
  return bullet
}

function createEnemyEntityAt(
  x: number,
  y: number,
  colliderTemplate: ColliderComponent,
  spriteTemplate?: SpriteComponent
) {
  const enemy = new Entity(`enemy_${Math.random().toString(36).slice(2, 8)}`, 'Enemy')
  enemy.addComponent(new TransformComponent(x, y, 1, 1, 0, 0.5, 0.5))
  enemy.addComponent(
    new SpriteComponent(
      spriteTemplate?.texturePath || 'assets/images/enemy.png',
      spriteTemplate?.width || 80,
      spriteTemplate?.height || 80,
      spriteTemplate?.visible ?? true,
      spriteTemplate?.alpha ?? 1,
      spriteTemplate?.tint ?? 0xffffff,
      spriteTemplate?.preserveAspect ?? true
    )
  )
  enemy.addComponent(
    new ColliderComponent(
      colliderTemplate.shape,
      colliderTemplate.width,
      colliderTemplate.height,
      colliderTemplate.offsetX,
      colliderTemplate.offsetY,
      colliderTemplate.isTrigger
    )
  )
  enemy.addComponent(
    new ScriptComponent(
      'builtin://enemy-chase-respawn',
      `export default {
  onUpdate(ctx) {
    // 敌人追踪玩家，被子弹命中后重生
  }
}`
    )
  )
  return enemy
}

function randomSpawnAwayFrom(x: number, y: number, minDistance: number) {
  for (let i = 0; i < 12; i += 1) {
    const px = randomInRange(-420, 420)
    const py = randomInRange(-240, 240)
    if (Math.hypot(px - x, py - y) >= minDistance) {
      return { x: px, y: py }
    }
  }
  return { x: randomInRange(-420, 420), y: randomInRange(-240, 240) }
}
