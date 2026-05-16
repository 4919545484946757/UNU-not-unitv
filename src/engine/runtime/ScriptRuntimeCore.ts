import { ScriptComponent } from '../components/ScriptComponent'
import { AnimationComponent } from '../components/AnimationComponent'
import type { AudioGroup } from '../components/AudioComponent'
import { BackgroundComponent } from '../components/BackgroundComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { InteractableComponent } from '../components/InteractableComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TilemapComponent } from '../components/TilemapComponent'
import { TransformComponent } from '../components/TransformComponent'
import { UIComponent } from '../components/UIComponent'
import { Entity } from '../core/Entity'
import type { Scene } from '../core/Scene'
import { createBulletEntity, createEnemyEntityAt, randomSpawnAwayFrom } from './EntityFactory'
import { normalizeRuntimeError, parseProjectRuntimeRegistry } from './ProjectModuleLoader'
import { RuntimeCommandQueue } from './RuntimeCommandQueue'

interface RuntimeInput {
  isKeyDown: (code: string) => boolean
  isMouseDown: (button?: number) => boolean
  wasMousePressed: (button?: number) => boolean
  isActionDown: (action: string) => boolean
  wasActionPressed: (action: string) => boolean
  wasActionReleased: (action: string) => boolean
  getActionMap?: () => Record<string, string[]>
  getActionBindings?: (action: string) => string[]
  setActionBindings?: (action: string, bindings: string[]) => void
  resetActionBindings?: (action?: string) => void
  getPressedBindings?: () => string[]
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

export interface SceneSwitchRequest {
  sceneName: string
  targetSpawnId?: string
  sceneStateMode?: 'preserve' | 'reset'
}

export type GameCommandRequest =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'togglePause' }
  | { type: 'reset' }
  | { type: 'exit' }

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
  event?: ScriptEvent
  api: {
    delta: number
    time: number
    getState: <T extends Record<string, unknown>>(entity: Entity) => T
    input: RuntimeInput
    getSelectedEntity: () => Entity | null
    findEntityByName: (name: string) => Entity | null
    findEntitiesByFolder: (folderPath: string, includeDescendants?: boolean) => Entity[]
    findEntitiesByClass: (classPath: string, includeDescendants?: boolean) => Entity[]
    removeEntity: (target: Entity) => void
    spawnEntity: (entity: Entity) => void
    switchScene: (sceneName: string, options?: { targetSpawnId?: string; sceneStateMode?: 'preserve' | 'reset' }) => void
    pauseGame: () => void
    resumeGame: () => void
    togglePause: () => void
    resetGame: () => void
    exitGame: () => void
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
    log: (...values: unknown[]) => void
    warn: (...values: unknown[]) => void
    error: (...values: unknown[]) => void
    audio: RuntimeAudio
  }
}

export interface ScriptColliderEvent {
  type: 'collisionEnter' | 'collisionStay' | 'collisionExit' | 'triggerEnter' | 'triggerStay' | 'triggerExit'
  other: Entity
  selfCollider: ColliderComponent
  otherCollider: ColliderComponent
}

export interface ScriptSceneEvent {
  type: 'enterScene' | 'exitScene'
  scene: Scene
}

export interface ScriptUiEvent {
  type: 'uiClick'
  ui: UIComponent
  value?: number
  pointer?: { x: number; y: number }
}

export type ScriptEvent = ScriptColliderEvent | ScriptSceneEvent | ScriptUiEvent

export interface ScriptHooks {
  onInit?: (ctx: ScriptContext) => void
  onStart?: (ctx: ScriptContext) => void
  onEnterScene?: (ctx: ScriptContext) => void
  onExitScene?: (ctx: ScriptContext) => void
  onUpdate?: (ctx: ScriptContext) => void
  onPausedUpdate?: (ctx: ScriptContext) => void
  onInteract?: (ctx: ScriptContext) => void
  onUiClick?: (ctx: ScriptContext) => void
  onCollisionEnter?: (ctx: ScriptContext) => void
  onCollisionStay?: (ctx: ScriptContext) => void
  onCollisionExit?: (ctx: ScriptContext) => void
  onTriggerEnter?: (ctx: ScriptContext) => void
  onTriggerStay?: (ctx: ScriptContext) => void
  onTriggerExit?: (ctx: ScriptContext) => void
  onDestroy?: (ctx: ScriptContext) => void
}

export interface ScriptRuntimeError {
  message: string
  scriptPath: string
  line: number
  column?: number
  phase: string
  entityId?: string
  entityName?: string
  stack?: string
}

export interface ScriptConsoleMessage {
  level: 'log' | 'warn' | 'error'
  message: string
  scriptPath?: string
  line?: number
  column?: number
  entityId?: string
  entityName?: string
}


export interface ProjectRuntimeSourceFile {
  path: string
  content: string
}

type CollisionPairKind = 'collision' | 'trigger'
type CollisionHookName =
  | 'onCollisionEnter'
  | 'onCollisionStay'
  | 'onCollisionExit'
  | 'onTriggerEnter'
  | 'onTriggerStay'
  | 'onTriggerExit'

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
  'builtin://ui-button-click': {
    onUiClick: ({ entity, event, api }) => {
      const ui = event?.type === 'uiClick' ? event.ui : null
      const state = api.getState<{ clickCount?: number }>(entity)
      state.clickCount = Number(state.clickCount || 0) + 1
      api.log(`[UI Button] ${entity.name} clicked ${state.clickCount} time(s)`)
      if (ui) {
        ui.text = `Clicked ${state.clickCount}`
        ui.backgroundColor = state.clickCount % 2 === 0 ? 0x34528a : 0x4d8a34
      }
    }
  },
  'builtin://scene-door': {}
}

export class ScriptRuntime {
  private readonly entityState = new Map<string, Record<string, unknown>>()
  private readonly sceneElapsed = new Map<string, number>()
  private readonly pendingRemovals = new Set<string>()
  private readonly pendingSpawns: Entity[] = []
  private readonly commandQueue = new RuntimeCommandQueue()
  private activeScene: Scene | null = null
  private selectedEntityId = ''
  private input: RuntimeInput = {
    isKeyDown: () => false,
    isMouseDown: () => false,
    wasMousePressed: () => false,
    isActionDown: () => false,
    wasActionPressed: () => false,
    wasActionReleased: () => false,
    getActionMap: () => ({}),
    getActionBindings: () => [],
    setActionBindings: () => undefined,
    resetActionBindings: () => undefined,
    getPressedBindings: () => [],
    getAxis: () => 0,
    getMoveVector: () => ({ x: 0, y: 0 }),
    getMousePosition: () => ({ x: 0, y: 0 })
  }
  private audioAdapter: {
    playOneShot: (clipPath: string, options?: { group?: AudioGroup; volume?: number; loop?: boolean }) => Promise<void>
    playEntity: (target: Entity) => Promise<void>
    stopEntity: (target: Entity) => void
    setMasterVolume: (volume: number) => void
    setGroupVolume: (group: AudioGroup, volume: number) => void
    getMasterVolume: () => number
    getGroupVolume: (group: AudioGroup) => number
  } = {
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
  private projectScriptSourcePaths: Record<string, string> = {}
  private errorReporter: ((error: ScriptRuntimeError) => void) | null = null
  private consoleReporter: ((message: ScriptConsoleMessage) => void) | null = null
  private collisionPairsByScene = new Map<string, Set<string>>()
  private collisionPairKindsByScene = new Map<string, Map<string, CollisionPairKind>>()
  private enteredSceneIds = new Set<string>()

  setProjectRuntimeSource(sourceCode: string | null, scriptPath = 'assets/scripts/ScriptRuntime.ts') {
    this.projectRuntimePath = normalizeScriptPath(scriptPath)
    this.projectScriptRegistry = parseProjectRuntimeRegistry(sourceCode, this.projectRuntimePath, (error) => this.reportScriptError(error))
    this.projectScriptSourcePaths = {}
    for (const key of Object.keys(this.projectScriptRegistry)) this.projectScriptSourcePaths[key] = this.projectRuntimePath
  }

  setProjectRuntimeSources(files: ProjectRuntimeSourceFile[]) {
    const normalizedFiles = files
      .map((file) => ({
        path: normalizeScriptPath(file.path),
        content: String(file.content || '')
      }))
      .filter((file) => file.path)
    this.projectRuntimePath = normalizedFiles[0]?.path || 'assets/scripts/ScriptRuntime.ts'
    const merged: Record<string, ScriptHooks> = {}
    const sourcePaths: Record<string, string> = {}
    for (const file of normalizedFiles) {
      const parsed = parseProjectRuntimeRegistry(file.content, file.path, (error) => this.reportScriptError(error))
      Object.assign(merged, parsed)
      for (const key of Object.keys(parsed)) sourcePaths[key] = file.path
    }
    this.projectScriptRegistry = merged
    this.projectScriptSourcePaths = sourcePaths
  }

  setErrorReporter(reporter: ((error: ScriptRuntimeError) => void) | null) {
    this.errorReporter = reporter
  }

  setConsoleReporter(reporter: ((message: ScriptConsoleMessage) => void) | null) {
    this.consoleReporter = reporter
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
      this.invokeHook(hooks, 'onInit', entity, 0)
      script.initialized = true
    }
  }

  startScene(scene: Scene) {
    this.activeScene = scene
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled || script.started) continue
      this.invokeHook(hooks, 'onStart', entity, 0)
      script.started = true
    }
  }

  enterScene(scene: Scene) {
    this.activeScene = scene
    this.enteredSceneIds.add(scene.id)
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled) continue
      this.invokeHook(hooks, 'onEnterScene', entity, 0, { type: 'enterScene', scene })
    }
  }

  exitScene(scene: Scene) {
    this.activeScene = scene
    if (!this.enteredSceneIds.has(scene.id)) {
      this.processCollisionExitsForScene(scene)
      return
    }
    this.enteredSceneIds.delete(scene.id)
    this.processCollisionExitsForScene(scene)
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled) continue
      this.invokeHook(hooks, 'onExitScene', entity, 0, { type: 'exitScene', scene })
    }
  }

  reloadSceneScripts(scene: Scene) {
    this.activeScene = scene
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const oldHooks = script?.instance as ScriptHooks | null
      if (!script || !script.enabled) continue
      if (oldHooks) this.invokeHook(oldHooks, 'onDestroy', entity, 0)
      const hooks = this.resolveScriptHooks(script)
      script.instance = hooks ?? null
      script.initialized = false
      script.started = false
      if (!hooks) continue
      this.invokeHook(hooks, 'onInit', entity, 0)
      script.initialized = true
      this.invokeHook(hooks, 'onStart', entity, 0)
      script.started = true
      this.invokeHook(hooks, 'onEnterScene', entity, 0, { type: 'enterScene', scene })
    }
  }

  updateScene(scene: Scene, delta: number, input?: RuntimeInput, collectPerformance = false) {
    const updateStart = collectPerformance ? performance.now() : 0
    this.activeScene = scene
    this.sceneElapsed.set(scene.id, this.getSceneElapsed(scene) + delta)
    if (input) this.input = input
    this.processInteractableSelection(scene)
    for (const entity of scene.entities) {
      if (this.pendingRemovals.has(entity.id)) continue
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled) continue
      this.invokeHook(hooks, 'onUpdate', entity, delta)
    }
    this.flushPendingMutations(scene)
    const collisionStart = collectPerformance ? performance.now() : 0
    this.processCollisionEvents(scene, delta)
    if (!collectPerformance) return { scriptTimeMs: 0, collisionTimeMs: 0 }
    const end = performance.now()
    return {
      scriptTimeMs: collisionStart - updateStart,
      collisionTimeMs: end - collisionStart
    }
  }

  updatePausedScene(scene: Scene, input?: RuntimeInput) {
    this.activeScene = scene
    if (input) this.input = input
    for (const entity of scene.entities) {
      if (this.pendingRemovals.has(entity.id)) continue
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled || !hooks.onPausedUpdate) continue
      this.invokeHook(hooks, 'onPausedUpdate', entity, 0)
    }
    this.flushPendingMutations(scene)
  }

  consumeSceneSwitchRequest() {
    return this.commandQueue.consumeSceneSwitchRequest()
  }

  consumeGameCommandRequest() {
    return this.commandQueue.consumeGameCommandRequest()
  }

  destroyScene(scene: Scene) {
    this.activeScene = scene
    this.exitScene(scene)
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks) continue
      this.invokeHook(hooks, 'onDestroy', entity, 0)
      script.instance = null
      script.initialized = false
      script.started = false
    }
    for (const key of Array.from(this.entityState.keys())) {
      if (key.startsWith(`${scene.id}::`)) this.entityState.delete(key)
    }
    this.sceneElapsed.delete(scene.id)
    this.collisionPairsByScene.delete(scene.id)
    this.collisionPairKindsByScene.delete(scene.id)
    this.enteredSceneIds.delete(scene.id)
    this.pendingRemovals.clear()
    this.pendingSpawns.length = 0
    this.commandQueue.clearGameCommand()
    this.activeScene = null
  }

  resetAll() {
    this.entityState.clear()
    this.sceneElapsed.clear()
    this.collisionPairsByScene.clear()
    this.collisionPairKindsByScene.clear()
    this.enteredSceneIds.clear()
    this.pendingRemovals.clear()
    this.pendingSpawns.length = 0
    this.commandQueue.clear()
    this.activeScene = null
  }

  private createContext(entity: Entity, delta: number, event?: ScriptEvent): ScriptContext {
    if (!this.activeScene) {
      throw new Error('ScriptRuntime context requested without active scene')
    }
    return {
      entity,
      scene: this.activeScene,
      event,
      api: {
        delta,
        time: this.getSceneElapsed(this.activeScene),
        getState: <T extends Record<string, unknown>>(target: Entity) => {
          const key = this.getEntityStateKey(target)
          if (!this.entityState.has(key)) this.entityState.set(key, {})
          return this.entityState.get(key) as T
        },
        input: this.input,
        getSelectedEntity: () => this.activeScene?.getEntityById(this.selectedEntityId) ?? null,
        findEntityByName: (name: string) => this.activeScene?.entities.find((candidate) => candidate.name === name) ?? null,
        findEntitiesByFolder: (folderPath: string, includeDescendants = true) =>
          this.findEntitiesBySceneFolder(folderPath, includeDescendants),
        findEntitiesByClass: (classPath: string, includeDescendants = true) =>
          this.findEntitiesBySceneFolder(classPath, includeDescendants),
        removeEntity: (target: Entity) => {
          this.pendingRemovals.add(target.id)
        },
        spawnEntity: (newEntity: Entity) => {
          this.pendingSpawns.push(newEntity)
        },
        switchScene: (sceneName: string, options?: { targetSpawnId?: string; sceneStateMode?: 'preserve' | 'reset' }) => {
          const name = String(sceneName || '').trim()
          if (!name) return
          this.commandQueue.requestSceneSwitch({
            sceneName: name,
            targetSpawnId: String(options?.targetSpawnId || '').trim(),
            sceneStateMode: options?.sceneStateMode === 'reset' ? 'reset' : 'preserve'
          })
        },
        pauseGame: () => {
          this.commandQueue.requestGameCommand({ type: 'pause' })
        },
        resumeGame: () => {
          this.commandQueue.requestGameCommand({ type: 'resume' })
        },
        togglePause: () => {
          this.commandQueue.requestGameCommand({ type: 'togglePause' })
        },
        resetGame: () => {
          this.commandQueue.requestGameCommand({ type: 'reset' })
        },
        exitGame: () => {
          this.commandQueue.requestGameCommand({ type: 'exit' })
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
        log: (...values: unknown[]) => this.reportConsoleMessage('log', formatConsoleValues(values), entity),
        warn: (...values: unknown[]) => this.reportConsoleMessage('warn', formatConsoleValues(values), entity),
        error: (...values: unknown[]) => this.reportConsoleMessage('error', formatConsoleValues(values), entity),
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

  private findEntitiesBySceneFolder(folderPath: string, includeDescendants = true) {
    if (!this.activeScene) return []
    const normalized = normalizeSceneFolderPath(folderPath)
    if (!normalized) return this.activeScene.entities.filter((candidate) => !normalizeSceneFolderPath(candidate.sceneFolderPath))
    return this.activeScene.entities.filter((candidate) => {
      const current = normalizeSceneFolderPath(candidate.sceneFolderPath)
      if (!current) return false
      return includeDescendants ? current === normalized || current.startsWith(`${normalized}/`) : current === normalized
    })
  }

  private invokeHook(hooks: ScriptHooks, hookName: keyof ScriptHooks, entity: Entity, delta: number, event?: ScriptEvent) {
    const hook = hooks[hookName]
    if (typeof hook !== 'function') return
    try {
      hook(this.createContext(entity, delta, event))
    } catch (error) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const fallbackPath = this.resolveErrorScriptPath(script)
      this.reportScriptError(normalizeRuntimeError(error, {
        scriptPath: fallbackPath,
        phase: String(hookName),
        entityId: entity.id,
        entityName: entity.name
      }))
    }
  }

  private invokeHookFromPath(hooks: ScriptHooks, hookName: keyof ScriptHooks, entity: Entity, delta: number, scriptPath: string, event?: ScriptEvent) {
    const hook = hooks[hookName]
    if (typeof hook !== 'function') return
    try {
      hook(this.createContext(entity, delta, event))
    } catch (error) {
      this.reportScriptError(normalizeRuntimeError(error, {
        scriptPath: this.resolveErrorScriptPathByPath(scriptPath),
        phase: String(hookName),
        entityId: entity.id,
        entityName: entity.name
      }))
    }
  }

  private resolveErrorScriptPath(script?: ScriptComponent | null) {
    const normalized = normalizeScriptPath(script?.scriptPath || '')
    const canonical = resolveCanonicalScriptPath(normalized)
    if (this.resolveProjectScriptHooks(normalized)) {
      return this.projectScriptSourcePaths[normalized] || this.projectScriptSourcePaths[canonical] || this.projectRuntimePath || canonical || normalized
    }
    if (canonical && canonical.startsWith('assets/')) return canonical
    return this.projectRuntimePath || canonical || normalized || 'assets/scripts/ScriptRuntime.ts'
  }

  private resolveErrorScriptPathByPath(scriptPath: string) {
    const normalized = normalizeScriptPath(scriptPath)
    const canonical = resolveCanonicalScriptPath(normalized)
    if (this.resolveProjectScriptHooks(normalized)) {
      return this.projectScriptSourcePaths[normalized] || this.projectScriptSourcePaths[canonical] || this.projectRuntimePath || canonical || normalized
    }
    if (canonical && canonical.startsWith('assets/')) return canonical
    return this.projectRuntimePath || canonical || normalized || 'assets/scripts/ScriptRuntime.ts'
  }

  private reportScriptError(error: ScriptRuntimeError) {
    this.errorReporter?.(error)
    this.consoleReporter?.({
      level: 'error',
      message: error.message,
      scriptPath: error.scriptPath,
      line: error.line,
      column: error.column,
      entityId: error.entityId,
      entityName: error.entityName
    })
    if (!this.errorReporter) {
      console.warn(`[UNU][runtime] ${error.scriptPath}:${error.line}:${error.column ?? 1} ${error.message}`, error.stack)
    }
  }

  private reportConsoleMessage(level: 'log' | 'warn' | 'error', message: string, entity?: Entity | null, scriptPathOverride?: string) {
    const script = entity?.getComponent<ScriptComponent>('Script')
    this.consoleReporter?.({
      level,
      message,
      scriptPath: scriptPathOverride ? this.resolveErrorScriptPathByPath(scriptPathOverride) : this.resolveErrorScriptPath(script),
      entityId: entity?.id,
      entityName: entity?.name
    })
  }

  private flushPendingMutations(scene: Scene) {
    const MAX_SPAWNS_PER_FRAME = 48

    if (this.pendingRemovals.size > 0) {
      const removals = Array.from(this.pendingRemovals)
      for (const id of removals) {
        this.processCollisionExitsForEntity(scene, id)
        scene.removeEntityById(id)
        this.entityState.delete(`${scene.id}::${id}`)
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
            this.invokeHook(hooks, 'onInit', spawned, 0)
            script.initialized = true
          }
          if (hooks && !script.started) {
            this.invokeHook(hooks, 'onStart', spawned, 0)
            script.started = true
          }
          if (hooks && this.enteredSceneIds.has(scene.id)) {
            this.invokeHook(hooks, 'onEnterScene', spawned, 0, { type: 'enterScene', scene })
          }
        }
      }
    }
  }

  private processCollisionEvents(scene: Scene, delta: number) {
    const previousPairs = this.collisionPairsByScene.get(scene.id) ?? new Set<string>()
    const previousKinds = this.collisionPairKindsByScene.get(scene.id) ?? new Map<string, CollisionPairKind>()
    const nextPairs = new Set<string>()
    const nextKinds = new Map<string, CollisionPairKind>()
    const collidable = scene.entities
      .map((entity) => ({
        entity,
        transform: entity.getComponent<TransformComponent>('Transform'),
        collider: entity.getComponent<ColliderComponent>('Collider')
      }))
      .filter((item): item is { entity: Entity; transform: TransformComponent; collider: ColliderComponent } =>
        !!item.transform && !!item.collider && item.collider.width > 0 && item.collider.height > 0
      )

    for (let i = 0; i < collidable.length; i += 1) {
      for (let j = i + 1; j < collidable.length; j += 1) {
        const left = collidable[i]
        const right = collidable[j]
        if (!left || !right) continue
        if (!canCollidersInteract(left.collider, right.collider)) continue
        if (!isRectColliderOverlap(left.transform, left.collider, right.transform, right.collider)) continue
        const key = this.getCollisionPairKey(left.entity.id, right.entity.id)
        const kind = this.getCollisionPairKind(left.collider, right.collider)
        nextPairs.add(key)
        nextKinds.set(key, kind)
        const entering = !previousPairs.has(key)
        const previousKind = previousKinds.get(key)
        if (!entering && previousKind && previousKind !== kind) {
          this.dispatchColliderPair(scene, left.entity, left.collider, right.entity, right.collider, this.getExitHookName(previousKind), delta)
          this.dispatchColliderPair(scene, left.entity, left.collider, right.entity, right.collider, this.getEnterHookName(kind), delta)
          continue
        }
        this.dispatchColliderPair(
          scene,
          left.entity,
          left.collider,
          right.entity,
          right.collider,
          entering ? this.getEnterHookName(kind) : this.getStayHookName(kind),
          delta
        )
      }
    }

    for (const key of previousPairs) {
      if (nextPairs.has(key)) continue
      const [leftId, rightId] = this.readCollisionPairKey(key)
      const left = scene.getEntityById(leftId)
      const right = scene.getEntityById(rightId)
      const leftCollider = left?.getComponent<ColliderComponent>('Collider')
      const rightCollider = right?.getComponent<ColliderComponent>('Collider')
      if (left && right && leftCollider && rightCollider) {
        this.dispatchColliderPair(scene, left, leftCollider, right, rightCollider, this.getExitHookName(previousKinds.get(key) ?? 'collision'), delta)
      }
    }

    this.collisionPairsByScene.set(scene.id, nextPairs)
    this.collisionPairKindsByScene.set(scene.id, nextKinds)
  }

  private processCollisionExitsForScene(scene: Scene) {
    const previousPairs = this.collisionPairsByScene.get(scene.id)
    if (!previousPairs?.size) return
    for (const key of previousPairs) {
      const [leftId, rightId] = this.readCollisionPairKey(key)
      const left = scene.getEntityById(leftId)
      const right = scene.getEntityById(rightId)
      const leftCollider = left?.getComponent<ColliderComponent>('Collider')
      const rightCollider = right?.getComponent<ColliderComponent>('Collider')
      const kind = this.collisionPairKindsByScene.get(scene.id)?.get(key) ?? 'collision'
      if (left && right && leftCollider && rightCollider) {
        this.dispatchColliderPair(scene, left, leftCollider, right, rightCollider, this.getExitHookName(kind))
      }
    }
    this.collisionPairsByScene.delete(scene.id)
    this.collisionPairKindsByScene.delete(scene.id)
  }

  private processCollisionExitsForEntity(scene: Scene, entityId: string) {
    const previousPairs = this.collisionPairsByScene.get(scene.id)
    if (!previousPairs?.size) return
    const target = scene.getEntityById(entityId)
    const targetCollider = target?.getComponent<ColliderComponent>('Collider')
    if (!target) return
    for (const key of Array.from(previousPairs)) {
      const [leftId, rightId] = this.readCollisionPairKey(key)
      if (leftId !== entityId && rightId !== entityId) continue
      const otherId = leftId === entityId ? rightId : leftId
      const other = scene.getEntityById(otherId)
      const otherCollider = other?.getComponent<ColliderComponent>('Collider')
      const kind = this.collisionPairKindsByScene.get(scene.id)?.get(key) ?? 'collision'
      if (other && targetCollider && otherCollider) {
        this.dispatchColliderHook(target, this.getExitHookName(kind), other, targetCollider, otherCollider)
        this.dispatchColliderHook(other, this.getExitHookName(kind), target, otherCollider, targetCollider)
      }
      previousPairs.delete(key)
      this.collisionPairKindsByScene.get(scene.id)?.delete(key)
    }
    if (!previousPairs.size) this.collisionPairsByScene.delete(scene.id)
    const kinds = this.collisionPairKindsByScene.get(scene.id)
    if (kinds && !kinds.size) this.collisionPairKindsByScene.delete(scene.id)
  }

  private dispatchColliderPair(
    scene: Scene,
    left: Entity,
    leftCollider: ColliderComponent,
    right: Entity,
    rightCollider: ColliderComponent,
    hookName: CollisionHookName,
    delta = 0
  ) {
    this.activeScene = scene
    this.dispatchColliderHook(left, hookName, right, leftCollider, rightCollider, delta)
    this.dispatchColliderHook(right, hookName, left, rightCollider, leftCollider, delta)
  }

  private dispatchColliderHook(
    entity: Entity,
    hookName: CollisionHookName,
    other: Entity,
    selfCollider: ColliderComponent,
    otherCollider: ColliderComponent,
    delta = 0
  ) {
    const script = entity.getComponent<ScriptComponent>('Script')
    const hooks = script?.instance as ScriptHooks | null
    if (!script || !hooks || !script.enabled) return
    this.invokeHook(hooks, hookName, entity, delta, {
      type: this.getColliderEventType(hookName),
      other,
      selfCollider,
      otherCollider
    })
  }

  private getCollisionPairKind(left: ColliderComponent, right: ColliderComponent): CollisionPairKind {
    return left.isTrigger || right.isTrigger ? 'trigger' : 'collision'
  }

  private getEnterHookName(kind: CollisionPairKind): CollisionHookName {
    return kind === 'trigger' ? 'onTriggerEnter' : 'onCollisionEnter'
  }

  private getStayHookName(kind: CollisionPairKind): CollisionHookName {
    return kind === 'trigger' ? 'onTriggerStay' : 'onCollisionStay'
  }

  private getExitHookName(kind: CollisionPairKind): CollisionHookName {
    return kind === 'trigger' ? 'onTriggerExit' : 'onCollisionExit'
  }

  private getColliderEventType(hookName: CollisionHookName): ScriptColliderEvent['type'] {
    if (hookName === 'onCollisionEnter') return 'collisionEnter'
    if (hookName === 'onCollisionStay') return 'collisionStay'
    if (hookName === 'onCollisionExit') return 'collisionExit'
    if (hookName === 'onTriggerEnter') return 'triggerEnter'
    if (hookName === 'onTriggerStay') return 'triggerStay'
    return 'triggerExit'
  }

  private getCollisionPairKey(leftId: string, rightId: string) {
    const [left, right] = [String(leftId), String(rightId)].sort()
    return `${left}\u0000${right}`
  }

  private readCollisionPairKey(key: string) {
    const [left = '', right = ''] = key.split('\u0000')
    return [left, right] as const
  }

  private processInteractableSelection(scene: Scene) {
    if (!this.input.wasActionPressed('interact')) return
    const playerTransform = this.findPlayerTransform(scene)
    if (!playerTransform) return
    const pointer = this.input.getMousePosition()
    const target = this.pickInteractableAtPointer(scene, pointer.x, pointer.y, playerTransform)
    if (!target) return

    const script = target.entity.getComponent<ScriptComponent>('Script')
    const hooks = script?.instance as ScriptHooks | null
    if (script?.enabled && hooks?.onInteract) {
      this.invokeHook(hooks, 'onInteract', target.entity, 0)
    }
  }

  handleUiClick(scene: Scene, entity: Entity, ui: UIComponent, pointer?: { x: number; y: number }) {
    this.activeScene = scene
    const boundPath = normalizeScriptPath(ui.onClickScriptPath || '')
    if (boundPath) {
      const hooks = this.resolveProjectScriptHooks(boundPath) ?? this.resolveBuiltinHooks(boundPath)
      if (!hooks) {
        this.reportConsoleMessage('warn', `UI Button script not found: ${boundPath}`, entity, boundPath)
        return
      }
      this.invokeHookFromPath(hooks, hooks.onUiClick ? 'onUiClick' : 'onInteract', entity, 0, boundPath, {
        type: 'uiClick',
        ui,
        pointer
      })
      this.flushPendingMutations(scene)
      return
    }

    const script = entity.getComponent<ScriptComponent>('Script')
    const hooks = script?.instance as ScriptHooks | null
    if (script?.enabled && hooks && (hooks.onUiClick || hooks.onInteract)) {
      this.invokeHook(hooks, hooks.onUiClick ? 'onUiClick' : 'onInteract', entity, 0, {
        type: 'uiClick',
        ui,
        pointer
      })
      this.flushPendingMutations(scene)
    }
  }

  private resolveScriptHooks(script: ScriptComponent) {
    const projectHooks = this.resolveProjectScriptHooks(script.scriptPath)
    const builtinKey = resolveBuiltinScriptKey(script.scriptPath)
    const builtinHooks = builtinKey ? scriptRegistry[builtinKey] ?? null : null
    return projectHooks ?? builtinHooks
  }

  private resolveBuiltinHooks(scriptPath: string) {
    const builtinKey = resolveBuiltinScriptKey(scriptPath)
    return builtinKey ? scriptRegistry[builtinKey] ?? null : null
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
    const key = this.getEntityStateKey(entity)
    if (!this.entityState.has(key)) this.entityState.set(key, {})
    return this.entityState.get(key) as Record<string, unknown>
  }

  private getEntityStateKey(entity: Entity) {
    return `${this.activeScene?.id || 'scene'}::${entity.id}`
  }

  private getSceneElapsed(scene: Scene) {
    return Number(this.sceneElapsed.get(scene.id) ?? 0)
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
    'assets/scripts/ui-button-click.js': 'builtin://ui-button-click',
    'assets/scripts/enemy-chase-respawn.js': 'builtin://enemy-chase-respawn'
  }
  return aliases[normalized] || ''
}

function normalizeScriptPath(input: string) {
  return String(input || '').trim().replace(/\\/g, '/')
}

function normalizeSceneFolderPath(input: unknown) {
  return String(input || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')
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
    'builtin://spin': 'assets/scripts/spin.js',
    'builtin://ui-button-click': 'assets/scripts/ui-button-click.js'
  }
  return aliases[normalized] || normalized
}

function formatConsoleValues(values: unknown[]) {
  return values.map((value) => {
    if (typeof value === 'string') return value
    if (value instanceof Error) return value.message
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }).join(' ')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
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

function canCollidersInteract(left: ColliderComponent, right: ColliderComponent) {
  const leftLayer = normalizeRuntimeCollisionLayer(left.layer)
  const rightLayer = normalizeRuntimeCollisionLayer(right.layer)
  return normalizeRuntimeCollisionMask(left, leftLayer).includes(rightLayer) &&
    normalizeRuntimeCollisionMask(right, rightLayer).includes(leftLayer)
}

function normalizeRuntimeCollisionLayer(layer: unknown) {
  const text = String(layer || 'Default').trim()
  const known = ['Default', 'Player', 'Enemy', 'World', 'Door', 'Pickup', 'Trap', 'Attack', 'Sensor', 'UI']
  return known.includes(text) ? text : 'Default'
}

function normalizeRuntimeCollisionMask(collider: ColliderComponent, layer: string) {
  const defaults: Record<string, string[]> = {
    Default: ['Default', 'Player', 'Enemy', 'World', 'Door', 'Pickup', 'Trap', 'Attack', 'Sensor'],
    Player: ['Default', 'Enemy', 'World', 'Door', 'Pickup', 'Trap', 'Sensor'],
    Enemy: ['Default', 'Player', 'World', 'Attack', 'Trap', 'Sensor'],
    World: ['Default', 'Player', 'Enemy'],
    Door: ['Player'],
    Pickup: ['Player'],
    Trap: ['Player', 'Enemy'],
    Attack: ['Enemy', 'Default'],
    Sensor: ['Player', 'Enemy', 'Default'],
    UI: []
  }
  const raw = Array.isArray(collider.collidesWith) ? collider.collidesWith : defaults[layer] || defaults.Default
  return raw.map(normalizeRuntimeCollisionLayer)
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
    if (!canCollidersInteract(collider, candidateCollider)) continue
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

