import { ScriptComponent } from '../components/ScriptComponent'
import { AnimationComponent } from '../components/AnimationComponent'
import type { AudioGroup } from '../components/AudioComponent'
import { BackgroundComponent } from '../components/BackgroundComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { InteractableComponent } from '../components/InteractableComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TilemapComponent } from '../components/TilemapComponent'
import { TransformComponent } from '../components/TransformComponent'
import { Entity } from '../core/Entity'
import type { Scene } from '../core/Scene'
import * as ts from 'typescript'

interface RuntimeInput {
  isKeyDown: (code: string) => boolean
  isMouseDown: (button?: number) => boolean
  wasMousePressed: (button?: number) => boolean
  isActionDown: (action: string) => boolean
  wasActionPressed: (action: string) => boolean
  wasActionReleased: (action: string) => boolean
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

interface EntityMatchQuery {
  id?: string
  ids?: string[]
  idPrefix?: string
  name?: string
  names?: string[]
  namePrefix?: string
  scriptPath?: string
  scriptPaths?: string[]
  scriptPathPrefix?: string
  requireCollider?: boolean
  requireSprite?: boolean
}

const scriptConfigCache = new WeakMap<ScriptComponent, { raw: string; parsed: Record<string, unknown> | null }>()

export interface ScriptContext {
  entity: Entity
  scene: Scene
  api: {
    delta: number
    time: number
    getState: <T extends Record<string, unknown>>(entity: Entity) => T
    input: RuntimeInput
    getSelectedEntity: () => Entity | null
    findEntityByName: (name: string) => Entity | null
    removeEntity: (target: Entity) => void
    spawnEntity: (entity: Entity) => void
    switchScene: (sceneName: string) => void
    setBackgroundTexture: (texturePath: string) => void
    cycleBackgroundTexture: (texturePaths: string[]) => void
    isBlockedAt: (x: number, y: number) => boolean
    isBlockedRect: (centerX: number, centerY: number, halfWidth: number, halfHeight: number) => boolean
    findEnemyOverlap: (target?: Entity, matcher?: EntityMatchQuery | null) => Entity | null
    isTouching: (left: Entity, right: Entity) => boolean
    moveTowards: (source: Entity, target: Entity, speed: number, useCollision?: boolean) => void
    spawnEnemyLike: (
      source?: Entity,
      options?: { x?: number; y?: number; avoidX?: number; avoidY?: number; minDistance?: number }
    ) => Entity | null
    spawnBullet: (
      source?: Entity,
      options?: { angle?: number; targetX?: number; targetY?: number; speed?: number; life?: number; maxDistance?: number; width?: number; height?: number; tint?: number }
    ) => Entity | null
    audio: RuntimeAudio
  }
}

export interface ScriptHooks {
  onInit?: (ctx: ScriptContext) => void
  onStart?: (ctx: ScriptContext) => void
  onUpdate?: (ctx: ScriptContext) => void
  onInteract?: (ctx: ScriptContext) => void
  onDestroy?: (ctx: ScriptContext) => void
}

interface InteractionScriptAction {
  type?: string
  target?: 'self' | string
  scene?: string
  path?: string
  value?: number | string
  values?: Array<number | string>
  actions?: InteractionScriptAction[]
}

interface InteractionScriptDefinition {
  onInteract?: InteractionScriptAction[]
  actions?: InteractionScriptAction[]
}

interface ProjectRuntimeModule {
  scripts?: Record<string, ScriptHooks>
  [key: string]: unknown
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
      const script = entity.getComponent<ScriptComponent>('Script')
      const config = parseScriptConfigObject(script)
      const state = api.getState<{ facingBaseScaleX?: number; lastFireTime?: number }>(entity)
      if (!Number.isFinite(state.facingBaseScaleX)) {
        state.facingBaseScaleX = Math.max(0.001, Math.abs(transform.scaleX || 1))
      }
      const collider = entity.getComponent<ColliderComponent>('Collider')
      const moveSpeed = clampNumber(readConfigNumber(config, 'moveSpeed', 140), 1, 5000)
      const sprintSpeed = clampNumber(readConfigNumber(config, 'sprintSpeed', 280), 1, 5000)
      const speed = api.input.isActionDown('sprint') ? sprintSpeed : moveSpeed
      const move = api.input.getMoveVector(true)
      if (move.x > 1e-4) {
        transform.scaleX = -Math.abs(state.facingBaseScaleX || 1)
      } else if (move.x < -1e-4) {
        transform.scaleX = Math.abs(state.facingBaseScaleX || 1)
      }
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

      const shootAction = readConfigString(config, 'shootAction', 'fire')
      const fireCooldown = Math.max(0, readConfigNumber(config, 'fireCooldown', 0))
      if (!api.input.wasActionPressed(shootAction)) return
      if (fireCooldown > 0) {
        const lastFireTime = Number(state.lastFireTime ?? -1e9)
        if (api.time - lastFireTime < fireCooldown) return
        state.lastFireTime = api.time
      }
      const mouse = api.input.getMousePosition()
      const dx = mouse.x - transform.x
      const dy = mouse.y - transform.y
      const length = Math.hypot(dx, dy)
      if (length < 0.001) return
      const angle = Math.atan2(dy, dx)
      const bulletConfig = readConfigObject(config, 'bullet')
      api.spawnEntity(createBulletEntity(transform.x, transform.y, angle, {
        speed: readConfigNumber(bulletConfig, 'speed', 420),
        life: readConfigNumber(bulletConfig, 'life', 2),
        maxDistance: readConfigNumber(bulletConfig, 'maxDistance', 560),
        width: readConfigNumber(bulletConfig, 'width', 20),
        height: readConfigNumber(bulletConfig, 'height', 8),
        tint: readConfigNumber(bulletConfig, 'tint', 0xf2f5ff)
      }))
    }
  },
  'builtin://bullet-projectile': {
    onInit: ({ entity, api }) => {
      const state = api.getState<{ vx?: number; vy?: number; life?: number; originX?: number; originY?: number; maxDistance?: number }>(entity)
      const transform = entity.getTransform()
      const script = entity.getComponent<ScriptComponent>('Script')
      const config = parseScriptConfigObject(script)
      const speed = clampNumber(readConfigNumber(config, 'speed', 420), 1, 10000)
      const angle = transform?.rotation ?? 0
      state.vx = Math.cos(angle) * speed
      state.vy = Math.sin(angle) * speed
      state.life = clampNumber(readConfigNumber(config, 'life', 2), 0.05, 120)
      state.originX = transform?.x ?? 0
      state.originY = transform?.y ?? 0
      state.maxDistance = clampNumber(readConfigNumber(config, 'maxDistance', 560), 1, 200000)
    },
    onUpdate: ({ entity, api }) => {
      const transform = entity.getTransform()
      const collider = entity.getComponent<ColliderComponent>('Collider')
      if (!transform || !collider) return
      const script = entity.getComponent<ScriptComponent>('Script')
      const config = parseScriptConfigObject(script)
      const state = api.getState<{ vx?: number; vy?: number; life?: number; originX?: number; originY?: number; maxDistance?: number }>(entity)
      transform.x += Number(state.vx ?? 0) * api.delta
      transform.y += Number(state.vy ?? 0) * api.delta

      const distance = Math.hypot(
        transform.x - Number(state.originX ?? transform.x),
        transform.y - Number(state.originY ?? transform.y)
      )
      if (distance >= Math.max(1, Number(state.maxDistance ?? 560))) {
        api.removeEntity(entity)
        return
      }

      state.life = Number(state.life ?? 0) - api.delta
      if (Number(state.life ?? 0) <= 0) {
        api.removeEntity(entity)
        return
      }

      const hitEntity = api.findEnemyOverlap(entity, resolveEnemyMatchQuery(config))
      if (hitEntity) {
        api.removeEntity(entity)
        api.removeEntity(hitEntity)
        const player = api.findEntityByName('Player')
        const playerTransform = player?.getTransform()
        const hitScript = hitEntity.getComponent<ScriptComponent>('Script')
        const enemyConfig = parseScriptConfigObject(hitScript)
        const hitCollider = hitEntity.getComponent<ColliderComponent>('Collider')
        const hitSprite = hitEntity.getComponent<SpriteComponent>('Sprite')
        const hitAnimation = hitEntity.getComponent<AnimationComponent>('Animation')
        if (!hitCollider || !hitSprite) return
        const respawnMinDistance = clampNumber(readConfigNumber(enemyConfig, 'respawnMinDistance', 160), 0, 2000)
        const spawnPoint = randomSpawnAwayFrom(playerTransform?.x ?? 0, playerTransform?.y ?? 0, respawnMinDistance)
        api.spawnEntity(createEnemyEntityAt(
          spawnPoint.x,
          spawnPoint.y,
          hitCollider,
          hitSprite ?? undefined,
          hitAnimation ?? undefined,
          hitScript ?? undefined
        ))
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
      const selfAnimation = entity.getComponent<AnimationComponent>('Animation')
      const selfScript = entity.getComponent<ScriptComponent>('Script')
      const config = parseScriptConfigObject(selfScript)
      if (!selfTransform || !selfCollider || !selfSprite) return

      const player = api.findEntityByName('Player')
      const playerTransform = player?.getTransform()
      const playerCollider = player?.getComponent<ColliderComponent>('Collider')
      if (!player || !playerTransform || !playerCollider) return

      const dx = playerTransform.x - selfTransform.x
      const dy = playerTransform.y - selfTransform.y
      const distance = Math.hypot(dx, dy)
      const speed = clampNumber(readConfigNumber(config, 'chaseSpeed', 120), 1, 5000)
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

      const respawnMinDistance = clampNumber(readConfigNumber(config, 'respawnMinDistance', 160), 0, 2000)
      const spawnPoint = randomSpawnAwayFrom(playerTransform.x, playerTransform.y, respawnMinDistance)
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
      if (selfAnimation) {
        enemy.addComponent(
          new AnimationComponent(
            selfAnimation.enabled,
            true,
            selfAnimation.fps,
            selfAnimation.loop,
            0,
            0,
            [...selfAnimation.framePaths],
            [...selfAnimation.frameDurations],
            selfAnimation.animationAssetPath,
            selfAnimation.sourceAtlasPath,
            selfAnimation.atlasGrid ? { ...selfAnimation.atlasGrid } : null,
            selfAnimation.frameEvents.map((event) => ({ ...event })),
            {
              positionX: selfAnimation.transformTracks.positionX.map((point) => ({ ...point })),
              positionY: selfAnimation.transformTracks.positionY.map((point) => ({ ...point })),
              rotation: selfAnimation.transformTracks.rotation.map((point) => ({ ...point }))
            },
            {
              enabled: selfAnimation.stateMachine.enabled,
              initialState: selfAnimation.stateMachine.initialState,
              currentState: selfAnimation.stateMachine.initialState,
              clips: selfAnimation.stateMachine.clips.map((clip) => ({
                name: clip.name,
                framePaths: [...clip.framePaths],
                frameDurations: [...clip.frameDurations],
                loop: clip.loop
              })),
              transitions: selfAnimation.stateMachine.transitions.map((transition) => ({ ...transition }))
            }
          )
        )
      }
      enemy.addComponent(
        new ScriptComponent(
          selfScript?.scriptPath || 'assets/scripts/enemy-chase-respawn.js',
          selfScript?.sourceCode || `{
  "chaseSpeed": 120,
  "respawnMinDistance": 160
}`,
          true
        )
      )
      api.spawnEntity(enemy)
    }
  }
  ,
  'builtin://scene-door': {}
}

export class ScriptRuntime {
  private readonly entityState = new Map<string, Record<string, unknown>>()
  private readonly pendingRemovals = new Set<string>()
  private readonly pendingSpawns: Entity[] = []
  private elapsed = 0
  private activeScene: Scene | null = null
  private pendingSceneSwitch: string | null = null
  private selectedEntityId = ''
  private input: RuntimeInput = {
    isKeyDown: () => false,
    isMouseDown: () => false,
    wasMousePressed: () => false,
    isActionDown: () => false,
    wasActionPressed: () => false,
    wasActionReleased: () => false,
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
  private projectRuntimePath = ''
  private projectScriptRegistry: Record<string, ScriptHooks> = {}

  setProjectRuntimeSource(sourceCode: string | null, scriptPath = 'assets/scripts/ScriptRuntime.ts') {
    this.projectRuntimePath = normalizeScriptPath(scriptPath)
    this.projectScriptRegistry = parseProjectRuntimeRegistry(sourceCode, this.projectRuntimePath)
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

  setSelectedEntityId(entityId: string) {
    this.selectedEntityId = String(entityId || '')
  }

  initScene(scene: Scene) {
    this.activeScene = scene
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      if (!script || !script.enabled) continue
      const hooks = this.resolveScriptHooks(script)
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
    this.processInteractableSelection(scene)
    for (const entity of scene.entities) {
      if (this.pendingRemovals.has(entity.id)) continue
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled) continue
      hooks.onUpdate?.(this.createContext(entity, delta))
    }
    this.flushPendingMutations(scene)
  }

  consumeSceneSwitchRequest() {
    const next = this.pendingSceneSwitch
    this.pendingSceneSwitch = null
    return next
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
        getSelectedEntity: () => this.activeScene?.getEntityById(this.selectedEntityId) ?? null,
        findEntityByName: (name: string) => this.activeScene?.entities.find((candidate) => candidate.name === name) ?? null,
        removeEntity: (target: Entity) => {
          this.pendingRemovals.add(target.id)
        },
        spawnEntity: (newEntity: Entity) => {
          this.pendingSpawns.push(newEntity)
        },
        switchScene: (sceneName: string) => {
          const name = String(sceneName || '').trim()
          if (!name) return
          this.pendingSceneSwitch = name
        },
        setBackgroundTexture: (texturePath: string) => {
          this.setSceneBackgroundTexture(this.activeScene, texturePath)
        },
        cycleBackgroundTexture: (texturePaths: string[]) => {
          this.cycleSceneBackgroundTexture(this.activeScene, texturePaths)
        },
        isBlockedAt: (x: number, y: number) => isWorldBlocked(this.activeScene, x, y),
        isBlockedRect: (centerX: number, centerY: number, halfWidth: number, halfHeight: number) =>
          isWorldRectBlocked(this.activeScene, centerX, centerY, halfWidth, halfHeight),
        findEnemyOverlap: (target?: Entity, matcher?: EntityMatchQuery | null) => {
          const source = target ?? entity
          const transform = source.getComponent<TransformComponent>('Transform')
          const collider = source.getComponent<ColliderComponent>('Collider')
          if (!transform || !collider || !this.activeScene) return null
          return findFirstEntityOverlap(this.activeScene, source.id, transform, collider, matcher ?? null) ?? null
        },
        isTouching: (left: Entity, right: Entity) => {
          const leftTransform = left.getComponent<TransformComponent>('Transform')
          const leftCollider = left.getComponent<ColliderComponent>('Collider')
          const rightTransform = right.getComponent<TransformComponent>('Transform')
          const rightCollider = right.getComponent<ColliderComponent>('Collider')
          if (!leftTransform || !leftCollider || !rightTransform || !rightCollider) return false
          return isRectColliderOverlap(leftTransform, leftCollider, rightTransform, rightCollider)
        },
        moveTowards: (source: Entity, target: Entity, speed: number, useCollision = true) => {
          const sourceTransform = source.getComponent<TransformComponent>('Transform')
          const sourceCollider = source.getComponent<ColliderComponent>('Collider')
          const targetTransform = target.getComponent<TransformComponent>('Transform')
          if (!sourceTransform || !targetTransform) return
          const dx = targetTransform.x - sourceTransform.x
          const dy = targetTransform.y - sourceTransform.y
          const distance = Math.hypot(dx, dy)
          if (distance <= 1e-6) return
          const moveSpeed = clampNumber(Number(speed), 0, 100000)
          const stepX = (dx / distance) * moveSpeed * delta
          const stepY = (dy / distance) * moveSpeed * delta
          if (!useCollision || !sourceCollider) {
            sourceTransform.x += stepX
            sourceTransform.y += stepY
            return
          }
          const halfWidth = Math.max(2, Number(sourceCollider.width) / 2)
          const halfHeight = Math.max(2, Number(sourceCollider.height) / 2)
          const offsetX = Number(sourceCollider.offsetX || 0)
          const offsetY = Number(sourceCollider.offsetY || 0)
          const nextX = sourceTransform.x + stepX
          const nextY = sourceTransform.y + stepY
          if (!isWorldRectBlocked(this.activeScene, nextX + offsetX, sourceTransform.y + offsetY, halfWidth, halfHeight)) {
            sourceTransform.x = nextX
          }
          if (!isWorldRectBlocked(this.activeScene, sourceTransform.x + offsetX, nextY + offsetY, halfWidth, halfHeight)) {
            sourceTransform.y = nextY
          }
        },
        spawnEnemyLike: (source?: Entity, options?: { x?: number; y?: number; avoidX?: number; avoidY?: number; minDistance?: number }) => {
          const base = source ?? entity
          const transform = base.getComponent<TransformComponent>('Transform')
          const collider = base.getComponent<ColliderComponent>('Collider')
          const sprite = base.getComponent<SpriteComponent>('Sprite')
          const animation = base.getComponent<AnimationComponent>('Animation')
          const script = base.getComponent<ScriptComponent>('Script')
          if (!transform || !collider || !sprite) return null
          const spawnPoint = randomSpawnAwayFrom(
            Number(options?.avoidX ?? transform.x),
            Number(options?.avoidY ?? transform.y),
            clampNumber(Number(options?.minDistance ?? 160), 0, 2000)
          )
          const x = Number.isFinite(options?.x as number) ? Number(options?.x) : spawnPoint.x
          const y = Number.isFinite(options?.y as number) ? Number(options?.y) : spawnPoint.y
          const spawned = createEnemyEntityAt(x, y, collider, sprite, animation ?? undefined, script ?? undefined)
          this.pendingSpawns.push(spawned)
          return spawned
        },
        spawnBullet: (
          source?: Entity,
          options?: { angle?: number; targetX?: number; targetY?: number; speed?: number; life?: number; maxDistance?: number; width?: number; height?: number; tint?: number }
        ) => {
          const base = source ?? entity
          const transform = base.getComponent<TransformComponent>('Transform')
          if (!transform) return null
          let angle = Number(options?.angle ?? transform.rotation ?? 0)
          if (Number.isFinite(options?.targetX as number) && Number.isFinite(options?.targetY as number)) {
            angle = Math.atan2(Number(options?.targetY) - transform.y, Number(options?.targetX) - transform.x)
          }
          const spawned = createBulletEntity(transform.x, transform.y, angle, {
            speed: Number(options?.speed),
            life: Number(options?.life),
            maxDistance: Number(options?.maxDistance),
            width: Number(options?.width),
            height: Number(options?.height),
            tint: Number(options?.tint)
          })
          this.pendingSpawns.push(spawned)
          return spawned
        },
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
    const MAX_SPAWNS_PER_FRAME = 48

    if (this.pendingRemovals.size > 0) {
      const removals = Array.from(this.pendingRemovals)
      for (const id of removals) {
        scene.removeEntityById(id)
        this.entityState.delete(id)
      }
      this.pendingRemovals.clear()
    }

    if (this.pendingSpawns.length > 0) {
      const spawnCount = Math.min(MAX_SPAWNS_PER_FRAME, this.pendingSpawns.length)
      const batch = this.pendingSpawns.splice(0, spawnCount)
      for (const spawned of batch) {
        const transform = spawned.getTransform()
        if (transform) transform.zIndex = scene.entities.length
        scene.addEntity(spawned)
        const script = spawned.getComponent<ScriptComponent>('Script')
        if (script && script.enabled) {
          const hooks = this.resolveScriptHooks(script)
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
    }
  }

  private processInteractableSelection(scene: Scene) {
    if (!this.input.wasActionPressed('interact')) return
    const playerTransform = this.findPlayerTransform(scene)
    if (!playerTransform) return
    const pointer = this.input.getMousePosition()
    const target = this.pickInteractableAtPointer(scene, pointer.x, pointer.y, playerTransform)
    if (!target) return

    this.applyInteractableAction(scene, target.entity, target.interactable)

    const script = target.entity.getComponent<ScriptComponent>('Script')
    const hooks = script?.instance as ScriptHooks | null
    if (script?.enabled && hooks?.onInteract) {
      hooks.onInteract(this.createContext(target.entity, 0))
    }
  }

  private applyInteractableAction(scene: Scene, entity: Entity, interactable: InteractableComponent) {
    if (interactable.actionType === 'scripted') {
      return
    }

    if (interactable.actionType === 'switchScene') {
      const target = String(interactable.targetScene || '').trim()
      if (target) this.pendingSceneSwitch = target
      return
    }

    if (interactable.actionType === 'cycleTexture') {
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const cycle = Array.isArray(interactable.textureCycle) ? interactable.textureCycle.map((item) => String(item || '').trim()).filter(Boolean) : []
      if (!sprite || !cycle.length) return
      const state = this.ensureEntityState(entity)
      const key = '__interact_texture_cycle_index'
      const current = Number(state[key] ?? -1)
      const nextIndex = (current + 1 + cycle.length) % cycle.length
      state[key] = nextIndex
      sprite.texturePath = cycle[nextIndex]
      return
    }

    if (interactable.actionType === 'cycleTint') {
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const cycle = Array.isArray(interactable.tintCycle) ? interactable.tintCycle.map((item) => Number(item)).filter((value) => Number.isFinite(value)) : []
      if (!sprite || !cycle.length) return
      const state = this.ensureEntityState(entity)
      const key = '__interact_tint_cycle_index'
      const current = Number(state[key] ?? -1)
      const nextIndex = (current + 1 + cycle.length) % cycle.length
      state[key] = nextIndex
      sprite.tint = Math.max(0, Math.round(cycle[nextIndex]))
    }
  }

  private resolveScriptHooks(script: ScriptComponent) {
    const projectHooks = this.resolveProjectScriptHooks(script.scriptPath)
    const builtinKey = resolveBuiltinScriptKey(script.scriptPath)
    const builtinHooks = builtinKey ? scriptRegistry[builtinKey] ?? null : null
    const baseHooks = projectHooks ?? builtinHooks
    const customHooks = this.buildCustomInteractionHooks(script.sourceCode)
    if (!baseHooks && !customHooks) return null
    if (!baseHooks) return customHooks
    if (!customHooks) return baseHooks
    return {
      onInit: customHooks.onInit ?? baseHooks.onInit,
      onStart: customHooks.onStart ?? baseHooks.onStart,
      onUpdate: customHooks.onUpdate ?? baseHooks.onUpdate,
      onInteract: customHooks.onInteract ?? baseHooks.onInteract,
      onDestroy: customHooks.onDestroy ?? baseHooks.onDestroy
    }
  }

  private resolveProjectScriptHooks(scriptPath: string) {
    const normalized = normalizeScriptPath(scriptPath)
    if (!normalized) return null
    const direct = this.projectScriptRegistry[normalized]
    if (direct) return direct
    const builtin = resolveBuiltinScriptKey(normalized)
    if (builtin && this.projectScriptRegistry[builtin]) return this.projectScriptRegistry[builtin]
    const canonical = resolveCanonicalScriptPath(normalized)
    if (canonical && this.projectScriptRegistry[canonical]) return this.projectScriptRegistry[canonical]
    return null
  }

  private buildCustomInteractionHooks(sourceCode: string): ScriptHooks | null {
    const parsed = parseInteractionScriptDefinition(sourceCode)
    if (!parsed) return null
    const actions = normalizeInteractionActionList(parsed.onInteract ?? parsed.actions ?? [])
    if (!actions.length) return null
    return {
      onInteract: (ctx) => {
        this.runInteractionActions(actions, ctx.scene, ctx.entity)
      }
    }
  }

  private runInteractionActions(actions: InteractionScriptAction[], scene: Scene, self: Entity) {
    for (const action of actions) {
      this.runInteractionAction(action, scene, self)
    }
  }

  private runInteractionAction(action: InteractionScriptAction, scene: Scene, self: Entity) {
    const type = String(action.type || '').trim()
    if (!type) return

    if (type === 'sequence') {
      const actions = normalizeInteractionActionList(action.actions || [])
      this.runInteractionActions(actions, scene, self)
      return
    }

    if (type === 'randomOne') {
      const actions = normalizeInteractionActionList(action.actions || [])
      if (!actions.length) return
      const picked = actions[Math.floor(Math.random() * actions.length)]
      if (picked) this.runInteractionAction(picked, scene, self)
      return
    }

    const target = this.resolveInteractionTarget(scene, self, action.target)
    if (!target) return

    if (type === 'switchScene') {
      const targetScene = String(action.scene || '').trim()
      if (targetScene) this.pendingSceneSwitch = targetScene
      return
    }

    if (type === 'setBackgroundTexture') {
      const path = String(action.path || '').trim()
      if (!path) return
      this.setSceneBackgroundTexture(scene, path)
      return
    }

    if (type === 'cycleBackgroundTexture') {
      const paths = (action.values || []).map((item) => String(item || '').trim()).filter(Boolean)
      this.cycleSceneBackgroundTexture(scene, paths)
      return
    }

    if (type === 'setTexture') {
      const sprite = target.getComponent<SpriteComponent>('Sprite')
      const path = String(action.path || '').trim()
      if (!sprite || !path) return
      sprite.texturePath = path
      return
    }

    if (type === 'cycleTexture') {
      const sprite = target.getComponent<SpriteComponent>('Sprite')
      const cycle = (action.values || []).map((item) => String(item || '').trim()).filter(Boolean)
      if (!sprite || !cycle.length) return
      const state = this.ensureEntityState(target)
      const key = `__custom_cycle_texture_${target.id}`
      const current = Number(state[key] ?? -1)
      const nextIndex = (current + 1 + cycle.length) % cycle.length
      state[key] = nextIndex
      sprite.texturePath = cycle[nextIndex]
      return
    }

    if (type === 'setTint') {
      const sprite = target.getComponent<SpriteComponent>('Sprite')
      if (!sprite) return
      const parsed = parseNumericValue(action.value)
      if (parsed === null) return
      sprite.tint = Math.max(0, Math.round(parsed))
      return
    }

    if (type === 'cycleTint') {
      const sprite = target.getComponent<SpriteComponent>('Sprite')
      const cycle = (action.values || []).map((item) => parseNumericValue(item)).filter((item): item is number => item !== null)
      if (!sprite || !cycle.length) return
      const state = this.ensureEntityState(target)
      const key = `__custom_cycle_tint_${target.id}`
      const current = Number(state[key] ?? -1)
      const nextIndex = (current + 1 + cycle.length) % cycle.length
      state[key] = nextIndex
      sprite.tint = Math.max(0, Math.round(cycle[nextIndex]))
      return
    }

    if (type === 'toggleVisible') {
      const sprite = target.getComponent<SpriteComponent>('Sprite')
      if (!sprite) return
      sprite.visible = !sprite.visible
      return
    }

    if (type === 'setInteractDistance') {
      const interactable = target.getComponent<InteractableComponent>('Interactable')
      const parsed = parseNumericValue(action.value)
      if (!interactable || parsed === null) return
      interactable.interactDistance = Math.max(0, parsed)
      return
    }

    if (type === 'removeEntity') {
      this.pendingRemovals.add(target.id)
    }
  }

  private resolveInteractionTarget(scene: Scene, self: Entity, rawTarget?: string) {
    const target = String(rawTarget || 'self').trim()
    if (!target || target === 'self') return self
    if (target === 'selected') return scene.getEntityById(this.selectedEntityId) ?? null
    if (target.startsWith('id:')) return scene.getEntityById(target.slice(3).trim()) ?? null
    return scene.entities.find((entity) => entity.name === target) ?? null
  }

  private findSceneBackgroundEntity(scene: Scene | null) {
    if (!scene) return null
    const withComponent = scene.entities.find((entity) => {
      const background = entity.getComponent<BackgroundComponent>('Background')
      return !!background?.enabled
    })
    if (withComponent) return withComponent
    return scene.entities.find((entity) => entity.name === 'Background') || null
  }

  private setSceneBackgroundTexture(scene: Scene | null, texturePath: string) {
    const path = String(texturePath || '').trim()
    if (!scene || !path) return
    const target = this.findSceneBackgroundEntity(scene)
    const sprite = target?.getComponent<SpriteComponent>('Sprite')
    if (!sprite) return
    sprite.texturePath = path
  }

  private cycleSceneBackgroundTexture(scene: Scene | null, texturePaths: string[]) {
    if (!scene) return
    const paths = (texturePaths || []).map((item) => String(item || '').trim()).filter(Boolean)
    if (!paths.length) return
    const target = this.findSceneBackgroundEntity(scene)
    const sprite = target?.getComponent<SpriteComponent>('Sprite')
    if (!target || !sprite) return
    const state = this.ensureEntityState(target)
    const key = '__scene_background_cycle_index'
    const current = Number(state[key] ?? -1)
    const nextIndex = (current + 1 + paths.length) % paths.length
    state[key] = nextIndex
    sprite.texturePath = paths[nextIndex]
  }

  private isPointerInsideEntity(entity: Entity, pointerX: number, pointerY: number) {
    const transform = entity.getComponent<TransformComponent>('Transform')
    if (!transform) return false

    const collider = entity.getComponent<ColliderComponent>('Collider')
    if (collider && collider.width > 0 && collider.height > 0) {
      const halfWidth = Math.abs(transform.scaleX) * collider.width / 2
      const halfHeight = Math.abs(transform.scaleY) * collider.height / 2
      const centerX = transform.x + collider.offsetX
      const centerY = transform.y + collider.offsetY
      return (
        pointerX >= centerX - halfWidth &&
        pointerX <= centerX + halfWidth &&
        pointerY >= centerY - halfHeight &&
        pointerY <= centerY + halfHeight
      )
    }

    const sprite = entity.getComponent<SpriteComponent>('Sprite')
    if (sprite && sprite.visible && sprite.width > 0 && sprite.height > 0) {
      const halfWidth = Math.abs(transform.scaleX) * sprite.width / 2
      const halfHeight = Math.abs(transform.scaleY) * sprite.height / 2
      return (
        pointerX >= transform.x - halfWidth &&
        pointerX <= transform.x + halfWidth &&
        pointerY >= transform.y - halfHeight &&
        pointerY <= transform.y + halfHeight
      )
    }

    const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
    if (tilemap?.enabled) {
      const scaledWidth = tilemap.columns * tilemap.tileWidth * transform.scaleX
      const scaledHeight = tilemap.rows * tilemap.tileHeight * transform.scaleY
      const minX = Math.min(transform.x, transform.x + scaledWidth)
      const maxX = Math.max(transform.x, transform.x + scaledWidth)
      const minY = Math.min(transform.y, transform.y + scaledHeight)
      const maxY = Math.max(transform.y, transform.y + scaledHeight)
      return pointerX >= minX && pointerX <= maxX && pointerY >= minY && pointerY <= maxY
    }

    return false
  }

  private ensureEntityState(entity: Entity) {
    if (!this.entityState.has(entity.id)) this.entityState.set(entity.id, {})
    return this.entityState.get(entity.id) as Record<string, unknown>
  }

  getInteractableHintEntityIds(scene: Scene) {
    const playerTransform = this.findPlayerTransform(scene)
    if (!playerTransform) return [] as string[]
    const ids: string[] = []
    for (const entity of scene.entities) {
      const interactable = entity.getComponent<InteractableComponent>('Interactable')
      if (!interactable?.enabled) continue
      const transform = entity.getTransform()
      if (!transform) continue
      if (!this.isEntityWithinInteractDistance(transform, interactable, playerTransform)) continue
      ids.push(entity.id)
    }
    return ids
  }

  private findPlayerTransform(scene: Scene) {
    const player = scene.entities.find((entity) => entity.name === 'Player') || null
    return player?.getTransform() ?? null
  }

  private isEntityWithinInteractDistance(
    transform: TransformComponent,
    interactable: InteractableComponent,
    playerTransform: TransformComponent
  ) {
    const distance = Math.hypot(transform.x - playerTransform.x, transform.y - playerTransform.y)
    const maxDistance = Math.max(0, Number(interactable.interactDistance || 0))
    return distance <= maxDistance
  }

  private pickInteractableAtPointer(
    scene: Scene,
    pointerX: number,
    pointerY: number,
    playerTransform: TransformComponent
  ) {
    for (let i = scene.entities.length - 1; i >= 0; i -= 1) {
      const entity = scene.entities[i]
      const interactable = entity.getComponent<InteractableComponent>('Interactable')
      const transform = entity.getTransform()
      if (!interactable?.enabled || !transform) continue
      if (!this.isEntityWithinInteractDistance(transform, interactable, playerTransform)) continue
      if (!this.isPointerInsideEntity(entity, pointerX, pointerY)) continue
      return { entity, interactable }
    }
    return null
  }
}

function parseInteractionScriptDefinition(sourceCode: string): InteractionScriptDefinition | null {
  const trimmed = String(sourceCode || '').trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) return { onInteract: parsed as InteractionScriptAction[] }
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as InteractionScriptDefinition
  } catch {
    return null
  }
}

function normalizeInteractionActionList(input: unknown): InteractionScriptAction[] {
  if (!Array.isArray(input)) return []
  return input.filter((item) => item && typeof item === 'object') as InteractionScriptAction[]
}

function parseNumericValue(input: unknown) {
  if (typeof input === 'number' && Number.isFinite(input)) return input
  if (typeof input !== 'string') return null
  const text = input.trim()
  if (!text) return null
  if (/^0x[0-9a-f]+$/i.test(text)) {
    const parsedHex = Number.parseInt(text.slice(2), 16)
    return Number.isFinite(parsedHex) ? parsedHex : null
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function parseScriptConfigObject(script?: ScriptComponent | null) {
  if (!script) return null
  const raw = String(script.sourceCode || '').trim()
  if (!raw.startsWith('{')) return null
  const cached = scriptConfigCache.get(script)
  if (cached && cached.raw === raw) return cached.parsed
  try {
    const parsed = JSON.parse(raw) as unknown
    const normalized = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
    scriptConfigCache.set(script, { raw, parsed: normalized })
    return normalized
  } catch {
    scriptConfigCache.set(script, { raw, parsed: null })
    return null
  }
}

function readConfigNumber(config: Record<string, unknown> | null, key: string, fallback: number) {
  if (!config) return fallback
  const value = config[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readConfigString(config: Record<string, unknown> | null, key: string, fallback: string) {
  if (!config) return fallback
  const value = config[key]
  if (typeof value !== 'string') return fallback
  const text = value.trim()
  return text || fallback
}

function readConfigObject(config: Record<string, unknown> | null, key: string) {
  if (!config) return null
  const value = config[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function resolveEnemyMatchQuery(config: Record<string, unknown> | null) {
  const raw = readConfigObject(config, 'enemyMatch')
  if (!raw) return null
  const query: EntityMatchQuery = {}
  if (typeof raw.id === 'string' && raw.id.trim()) query.id = raw.id.trim()
  if (Array.isArray(raw.ids)) query.ids = raw.ids.map((item) => String(item || '').trim()).filter(Boolean)
  if (typeof raw.idPrefix === 'string' && raw.idPrefix.trim()) query.idPrefix = raw.idPrefix.trim()
  if (typeof raw.name === 'string' && raw.name.trim()) query.name = raw.name.trim()
  if (Array.isArray(raw.names)) query.names = raw.names.map((item) => String(item || '').trim()).filter(Boolean)
  if (typeof raw.namePrefix === 'string' && raw.namePrefix.trim()) query.namePrefix = raw.namePrefix.trim()
  if (typeof raw.scriptPath === 'string' && raw.scriptPath.trim()) query.scriptPath = raw.scriptPath.trim()
  if (Array.isArray(raw.scriptPaths)) query.scriptPaths = raw.scriptPaths.map((item) => String(item || '').trim()).filter(Boolean)
  if (typeof raw.scriptPathPrefix === 'string' && raw.scriptPathPrefix.trim()) query.scriptPathPrefix = raw.scriptPathPrefix.trim()
  if (typeof raw.requireCollider === 'boolean') query.requireCollider = raw.requireCollider
  if (typeof raw.requireSprite === 'boolean') query.requireSprite = raw.requireSprite
  return Object.keys(query).length ? query : null
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function resolveBuiltinScriptKey(scriptPath: string) {
  const normalized = String(scriptPath || '').trim().replace(/\\/g, '/')
  if (!normalized) return ''
  if (scriptRegistry[normalized]) return normalized

  const aliases: Record<string, string> = {
    'assets/scripts/player-input.js': 'builtin://player-input',
    'assets/scripts/bullet-projectile.js': 'builtin://bullet-projectile',
    'assets/scripts/patrol.js': 'builtin://patrol',
    'assets/scripts/orbit-around-chest.js': 'builtin://orbit-around-chest',
    'assets/scripts/spin.js': 'builtin://spin',
    'assets/scripts/enemy-chase-respawn.js': 'builtin://enemy-chase-respawn'
  }
  return aliases[normalized] || ''
}

function normalizeScriptPath(input: string) {
  return String(input || '').trim().replace(/\\/g, '/')
}

function resolveCanonicalScriptPath(scriptPath: string) {
  const normalized = normalizeScriptPath(scriptPath)
  if (!normalized) return ''
  const aliases: Record<string, string> = {
    'builtin://player-input': 'assets/scripts/player-input.js',
    'builtin://bullet-projectile': 'assets/scripts/bullet-projectile.js',
    'builtin://enemy-chase-respawn': 'assets/scripts/enemy-chase-respawn.js',
    'builtin://patrol': 'assets/scripts/patrol.js',
    'builtin://orbit-around-chest': 'assets/scripts/orbit-around-chest.js',
    'builtin://spin': 'assets/scripts/spin.js'
  }
  return aliases[normalized] || normalized
}

function parseProjectRuntimeRegistry(sourceCode: string | null, scriptPath: string) {
  const raw = String(sourceCode || '').trim()
  if (!raw) return {}
  try {
    const transpiled = ts.transpileModule(raw, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.Preserve
      },
      fileName: scriptPath || 'ScriptRuntime.ts'
    })
    const exportsBag: Record<string, unknown> = {}
    const moduleBag: { exports: Record<string, unknown> } = { exports: exportsBag }
    const evaluator = new Function('module', 'exports', transpiled.outputText)
    evaluator(moduleBag, exportsBag)
    const loaded = ((moduleBag.exports && (moduleBag.exports.default as unknown)) || moduleBag.exports) as ProjectRuntimeModule | null
    const scripts = loaded && typeof loaded === 'object'
      ? (loaded.scripts && typeof loaded.scripts === 'object' ? loaded.scripts : loaded)
      : null
    if (!scripts || typeof scripts !== 'object') return {}
    const result: Record<string, ScriptHooks> = {}
    for (const [key, value] of Object.entries(scripts as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue
      const normalizedKey = resolveCanonicalScriptPath(key)
      result[normalizedKey] = value as ScriptHooks
      const builtin = resolveBuiltinScriptKey(normalizedKey)
      if (builtin) result[builtin] = value as ScriptHooks
    }
    return result
  } catch (error) {
    console.warn('[UNU][runtime] failed to parse project ScriptRuntime.ts:', error)
    return {}
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

function findFirstEntityOverlap(
  scene: Scene,
  selfId: string,
  transform: TransformComponent,
  collider: ColliderComponent,
  matcher?: EntityMatchQuery | null
) {
  for (const candidate of scene.entities) {
    if (candidate.id === selfId) continue
    if (!matchesEntityQuery(candidate, matcher ?? null)) continue
    const candidateTransform = candidate.getComponent<TransformComponent>('Transform')
    const candidateCollider = candidate.getComponent<ColliderComponent>('Collider')
    if (!candidateTransform || !candidateCollider) continue
    if (!isRectColliderOverlap(transform, collider, candidateTransform, candidateCollider)) continue
    return candidate
  }
  return null
}

function matchesEntityQuery(entity: Entity, matcher?: EntityMatchQuery | null) {
  if (!matcher) return isDefaultEnemyEntity(entity)
  const query = matcher as Record<string, unknown>
  const hasAnyCondition = Object.keys(query).length > 0
  if (!hasAnyCondition) return isDefaultEnemyEntity(entity)

  const script = entity.getComponent<ScriptComponent>('Script')
  const normalizedScriptPath = normalizeScriptPath(script?.scriptPath || '')
  const normalizedId = String(entity.id || '')
  const normalizedName = String(entity.name || '')

  if (typeof matcher.id === 'string' && matcher.id && normalizedId !== matcher.id) return false
  if (Array.isArray(matcher.ids) && matcher.ids.length > 0 && !matcher.ids.includes(normalizedId)) return false
  if (typeof matcher.idPrefix === 'string' && matcher.idPrefix && !normalizedId.startsWith(matcher.idPrefix)) return false
  if (typeof matcher.name === 'string' && matcher.name && normalizedName !== matcher.name) return false
  if (Array.isArray(matcher.names) && matcher.names.length > 0 && !matcher.names.includes(normalizedName)) return false
  if (typeof matcher.namePrefix === 'string' && matcher.namePrefix && !normalizedName.startsWith(matcher.namePrefix)) return false
  if (typeof matcher.scriptPath === 'string' && matcher.scriptPath && normalizedScriptPath !== normalizeScriptPath(matcher.scriptPath)) return false
  if (
    Array.isArray(matcher.scriptPaths) &&
    matcher.scriptPaths.length > 0 &&
    !matcher.scriptPaths.some((path) => normalizeScriptPath(path) === normalizedScriptPath)
  ) return false
  if (typeof matcher.scriptPathPrefix === 'string' && matcher.scriptPathPrefix) {
    const prefix = normalizeScriptPath(matcher.scriptPathPrefix)
    if (!normalizedScriptPath.startsWith(prefix)) return false
  }
  if (matcher.requireCollider && !entity.getComponent<ColliderComponent>('Collider')) return false
  if (matcher.requireSprite && !entity.getComponent<SpriteComponent>('Sprite')) return false
  return true
}

function isDefaultEnemyEntity(entity: Entity) {
  const script = entity.getComponent<ScriptComponent>('Script')
  const scriptPath = normalizeScriptPath(script?.scriptPath || '')
  if (scriptPath === 'assets/scripts/enemy-chase-respawn.js' || scriptPath === 'builtin://enemy-chase-respawn') return true
  const name = String(entity.name || '')
  return name === 'Enemy' || name.startsWith('Enemy')
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

function createBulletEntity(
  x: number,
  y: number,
  angle: number,
  config?: { speed?: number; life?: number; maxDistance?: number; width?: number; height?: number; tint?: number }
) {
  const width = clampNumber(Number(config?.width ?? 20), 1, 2048)
  const height = clampNumber(Number(config?.height ?? 8), 1, 2048)
  const tint = Math.max(0, Math.round(Number(config?.tint ?? 0xf2f5ff)))
  const scriptConfig = {
    speed: clampNumber(Number(config?.speed ?? 420), 1, 10000),
    life: clampNumber(Number(config?.life ?? 2), 0.05, 120),
    maxDistance: clampNumber(Number(config?.maxDistance ?? 560), 1, 200000)
  }
  const bullet = new Entity(`bullet_${Math.random().toString(36).slice(2, 8)}`, 'Bullet')
  bullet.addComponent(new TransformComponent(x, y, 1, 1, angle, 0.5, 0.5))
  bullet.addComponent(new SpriteComponent('', width, height, true, 1, tint))
  bullet.addComponent(new ColliderComponent('rect', width, height))
  bullet.addComponent(
    new ScriptComponent(
      'assets/scripts/bullet-projectile.js',
      JSON.stringify(scriptConfig, null, 2)
    )
  )
  return bullet
}

function createEnemyEntityAt(
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



