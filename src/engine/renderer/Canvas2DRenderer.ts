import { BackgroundComponent } from '../components/BackgroundComponent'
import { AnimationComponent } from '../components/AnimationComponent'
import { AudioComponent } from '../components/AudioComponent'
import { CameraComponent } from '../components/CameraComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { InteractableComponent } from '../components/InteractableComponent'
import { ScriptComponent } from '../components/ScriptComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TilemapComponent } from '../components/TilemapComponent'
import { TransformComponent } from '../components/TransformComponent'
import { UIComponent } from '../components/UIComponent'
import { Scene } from '../core/Scene'
import { Entity } from '../core/Entity'
import { applySceneAnimation } from '../animation/applyAnimation'
import { buildAtlasFramePath, deserializeAtlasAsset, parseAtlasFrameRefPath } from '../animation/atlasAsset'
import { deserializeScene, serializeScene } from '../serialization/sceneSerializer'
import { AudioRuntime } from '../runtime/AudioRuntime'
import { ScriptRuntime, type ProjectRuntimeSourceFile } from '../runtime/ScriptRuntime'
import type { DebugOverlayOptions } from '../../stores/editor'
import { useAssetStore } from '../../stores/assets'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import type { EditorTool, SceneRenderer, SceneRendererOptions } from './RendererTypes'

type ImageSource = {
  image: HTMLImageElement
  sx: number
  sy: number
  sw: number
  sh: number
}

type EntityBounds = {
  entityId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  viewport: boolean
  viewportHorizontal: TransformComponent['viewportHorizontal']
  viewportVertical: TransformComponent['viewportVertical']
}

type EditorDragState = {
  active: boolean
  mode: 'move' | 'scale' | 'rotate'
  pointerId: number
  startWorldX: number
  startWorldY: number
  centerX: number
  centerY: number
  startAngle: number
  entityIds: string[]
  transforms: Map<string, { x: number; y: number; scaleX: number; scaleY: number; rotation: number }>
}

type UiMetrics = {
  width: number
  height: number
}

type UiPosition = UiMetrics & {
  x: number
  y: number
}

type CachedCanvasHtmlUi = {
  signature: string
  frame: HTMLIFrameElement
  ready: boolean
  snapshotKey: string
  snapshot: HTMLImageElement | null
  width: number
  height: number
  resizeKey: string
  lastClickAt: number
  lastClickX: number
  lastClickY: number
}

type HtmlUiPointerState = {
  entityId: string
  pointerId: number
  sourceTarget: Element
  lastTarget: Element | null
  dragActive: boolean
  moved: boolean
  startX: number
  startY: number
  x: number
  y: number
}

const EMPTY_ENTITY_SIZE = 40
const GRID_SIZE = 48

export class Canvas2DRenderer implements SceneRenderer {
  private readonly canvas = document.createElement('canvas')
  private readonly ctx = this.canvas.getContext('2d')!
  private readonly scriptRuntime = new ScriptRuntime()
  private readonly audioRuntime = new AudioRuntime()
  private readonly htmlUiHost = document.createElement('div')
  private resizeObserver: ResizeObserver | null = null
  private sourceScene: Scene | null = null
  private playScene: Scene | null = null
  private currentScene: Scene | null = null
  private gridVisible = true
  private playDebugEnabled = false
  private debugOverlayVisible = true
  private debugOverlayOptions: DebugOverlayOptions = { bounds: false, colliders: false, axes: true, lights: true, cameras: true }
  private isPlaying = false
  private isPaused = false
  private activeTool: EditorTool = 'select'
  private selectedEntityIds: string[] = []
  private selectedEntityId = ''
  private camera = { x: 0, y: 0, zoom: 1 }
  private imageCache = new Map<string, Promise<ImageSource | null>>()
  private atlasContentCache = new Map<string, string>()
  private htmlUiCache = new Map<string, CachedCanvasHtmlUi>()
  private htmlUiAssetDataUrlCache = new Map<string, string>()
  private pendingHtmlUiMessages = new Map<string, unknown[]>()
  private htmlUiPointer: HtmlUiPointerState | null = null
  private entityBounds: EntityBounds[] = []
  private pointerDownHandler: ((event: PointerEvent) => void) | null = null
  private pointerUpHandler: ((event: PointerEvent) => void) | null = null
  private wheelHandler: ((event: WheelEvent) => void) | null = null
  private keyDownHandler: ((event: KeyboardEvent) => void) | null = null
  private keyUpHandler: ((event: KeyboardEvent) => void) | null = null
  private animationFrameId = 0
  private lastFrameAt = 0
  private renderInFlight = false
  private renderQueued = false
  private pressedKeys = new Set<string>()
  private keysPressedThisFrame = new Set<string>()
  private keysReleasedThisFrame = new Set<string>()
  private pressedActions = new Set<string>()
  private actionsPressedThisFrame = new Set<string>()
  private actionsReleasedThisFrame = new Set<string>()
  private pointerPan = { active: false, x: 0, y: 0 }
  private pointerMoveHandler: ((event: PointerEvent) => void) | null = null
  private lastPointerClientX = 0
  private lastPointerClientY = 0
  private editorDrag: EditorDragState | null = null

  constructor(private readonly options: SceneRendererOptions) {}

  async init(scene: Scene | null) {
    this.sourceScene = scene
    this.currentScene = scene
    this.configureRuntimeAdapters()
    this.options.container.style.position = this.options.container.style.position || 'relative'
    Object.assign(this.htmlUiHost.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: '5'
    })
    Object.assign(this.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      imageRendering: 'pixelated',
      touchAction: 'none',
      zIndex: '0'
    })
    this.options.container.appendChild(this.htmlUiHost)
    this.options.container.appendChild(this.canvas)
    this.pointerDownHandler = (event) => this.handlePointerDown(event)
    this.pointerUpHandler = (event) => this.handlePointerUp(event)
    this.pointerMoveHandler = (event) => this.handlePointerMove(event)
    this.wheelHandler = (event) => this.handleWheel(event)
    this.keyDownHandler = (event) => {
      if (!this.pressedKeys.has(event.code)) this.keysPressedThisFrame.add(event.code)
      this.pressedKeys.add(event.code)
    }
    this.keyUpHandler = (event) => {
      if (this.pressedKeys.has(event.code)) this.keysReleasedThisFrame.add(event.code)
      this.pressedKeys.delete(event.code)
    }
    this.canvas.addEventListener('pointerdown', this.pointerDownHandler)
    window.addEventListener('pointermove', this.pointerMoveHandler)
    window.addEventListener('pointerup', this.pointerUpHandler)
    window.addEventListener('pointercancel', this.pointerUpHandler)
    this.canvas.addEventListener('wheel', this.wheelHandler, { passive: false })
    window.addEventListener('keydown', this.keyDownHandler)
    window.addEventListener('keyup', this.keyUpHandler)
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas()
      this.requestRender()
    })
    this.resizeObserver.observe(this.options.container)
    this.resizeCanvas()
    if (scene) await this.renderScene(scene)
  }

  async renderScene(scene: Scene) {
    this.currentScene = scene
    await this.drawScene(scene)
  }

  setGridVisible(visible: boolean) {
    this.gridVisible = visible
    this.requestRender()
  }

  setPlayDebugEnabled(enabled: boolean) {
    this.playDebugEnabled = enabled
    this.requestRender()
  }

  setDebugOverlayVisible(visible: boolean) {
    this.debugOverlayVisible = !!visible
    this.requestRender()
  }

  setDebugOverlayOptions(options: DebugOverlayOptions) {
    this.debugOverlayOptions = { ...options }
    this.requestRender()
  }

  async setRuntimeState(isPlaying: boolean, isPaused: boolean, scene: Scene | null, refreshPlayingScene = false) {
    const wasPlaying = this.isPlaying
    this.isPlaying = isPlaying
    this.isPaused = isPaused
    if (!isPlaying) {
      this.stopRuntimeLoop()
      if (this.playScene) this.scriptRuntime.destroyScene(this.playScene)
      this.audioRuntime.stopAll()
      this.sourceScene = scene
      this.playScene = null
      this.currentScene = scene
      if (scene) await this.renderScene(scene)
      return
    }

    this.sourceScene = scene
    await this.refreshProjectRuntimeFiles()
    if (!this.playScene || refreshPlayingScene || !wasPlaying) {
      if (this.playScene) this.scriptRuntime.destroyScene(this.playScene)
      this.playScene = scene ? this.cloneScene(scene) : null
      if (this.playScene) {
        this.scriptRuntime.initScene(this.playScene)
        this.scriptRuntime.startScene(this.playScene)
        this.scriptRuntime.enterScene(this.playScene)
        await this.preloadSceneVisualAssets(this.playScene)
      }
    }
    this.currentScene = this.playScene
    if (this.currentScene) await this.renderScene(this.currentScene)
    this.startRuntimeLoop()
  }

  async hotReloadProjectRuntimeFiles() {
    await this.refreshProjectRuntimeFiles()
    if (this.currentScene && this.isPlaying) this.scriptRuntime.reloadSceneScripts(this.currentScene)
  }

  setSelections(entityIds: string[], primaryId?: string) {
    this.selectedEntityIds = [...entityIds]
    this.selectedEntityId = primaryId || entityIds[0] || ''
    this.requestRender()
  }

  setTool(tool: EditorTool) {
    this.activeTool = tool
  }

  zoomViewportByFactor(clientX: number, clientY: number, factor: number) {
    const before = this.screenToWorld(clientX, clientY)
    this.camera.zoom = Math.max(0.1, Math.min(6, this.camera.zoom * factor))
    const after = this.screenToWorld(clientX, clientY)
    this.camera.x += before.x - after.x
    this.camera.y += before.y - after.y
    this.requestRender()
  }

  destroy() {
    this.stopRuntimeLoop()
    if (this.playScene) this.scriptRuntime.destroyScene(this.playScene)
    this.audioRuntime.stopAll()
    if (this.pointerDownHandler) this.canvas.removeEventListener('pointerdown', this.pointerDownHandler)
    if (this.pointerUpHandler) {
      window.removeEventListener('pointerup', this.pointerUpHandler)
      window.removeEventListener('pointercancel', this.pointerUpHandler)
    }
    if (this.pointerMoveHandler) window.removeEventListener('pointermove', this.pointerMoveHandler)
    if (this.wheelHandler) this.canvas.removeEventListener('wheel', this.wheelHandler)
    if (this.keyDownHandler) window.removeEventListener('keydown', this.keyDownHandler)
    if (this.keyUpHandler) window.removeEventListener('keyup', this.keyUpHandler)
    this.resizeObserver?.disconnect()
    this.canvas.remove()
    this.htmlUiHost.remove()
    for (const cached of this.htmlUiCache.values()) cached.frame.remove()
    this.htmlUiCache.clear()
    this.htmlUiAssetDataUrlCache.clear()
    this.pendingHtmlUiMessages.clear()
    this.htmlUiPointer = null
    this.imageCache.clear()
    this.atlasContentCache.clear()
    this.entityBounds = []
  }

  private resizeCanvas() {
    const width = Math.max(1, this.options.container.clientWidth)
    const height = Math.max(1, this.options.container.clientHeight)
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.ctx.imageSmoothingEnabled = false
  }

  private requestRender() {
    if (!this.currentScene) return
    if (this.renderInFlight) {
      this.renderQueued = true
      return
    }
    void this.drawScene(this.currentScene)
  }

  private async drawScene(scene: Scene) {
    if (this.renderInFlight) {
      this.renderQueued = true
      return
    }
    this.renderInFlight = true
    const width = this.options.container.clientWidth
    const height = this.options.container.clientHeight
    try {
      this.ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0)
      this.ctx.clearRect(0, 0, width, height)
      this.ctx.fillStyle = '#0b0f16'
      this.ctx.fillRect(0, 0, width, height)
      this.entityBounds = []
      const activeHtmlUiIds = new Set<string>()

      if (this.gridVisible && !this.isPlaying) this.drawGrid(width, height)

      const ordered = [...scene.entities].sort((a, b) => {
        const at = a.getTransform()
        const bt = b.getTransform()
        return (at?.zIndex ?? 0) - (bt?.zIndex ?? 0)
      })

      for (const entity of ordered) {
        await this.drawEntity(scene, entity, width, height, activeHtmlUiIds)
      }
      for (const [id, cached] of this.htmlUiCache.entries()) {
        if (activeHtmlUiIds.has(id)) continue
        cached.frame.remove()
        this.htmlUiCache.delete(id)
      }
      this.drawPlayModeInteractableHints(scene)
      this.drawSelections()
      this.drawRendererBadge(width)
    } finally {
      this.renderInFlight = false
      if (this.renderQueued && this.currentScene) {
        this.renderQueued = false
        this.requestRender()
      }
    }
  }

  private startRuntimeLoop() {
    if (this.animationFrameId) return
    this.lastFrameAt = performance.now()
    const tick = (now: number) => {
      this.animationFrameId = 0
      if (!this.isPlaying || !this.playScene) return
      const delta = Math.max(0, Math.min(0.05, (now - this.lastFrameAt) / 1000 || 0))
      this.lastFrameAt = now
      const frameStart = performance.now()
      if (!this.isPaused) {
        this.updateRuntimeInputViewportTransform()
        this.scriptRuntime.setSelectedEntityId(this.selectedEntityId)
        const scriptStart = performance.now()
        const scriptMetrics = this.scriptRuntime.updateScene(this.playScene, delta, this.createRuntimeInput(), true)
        if (this.consumeGameCommandRequest()) {
          this.endInputFrame()
          return
        }
        if (this.consumeSceneSwitchRequest()) {
          this.endInputFrame()
          this.animationFrameId = window.requestAnimationFrame(tick)
          return
        }
        const animationStart = performance.now()
        applySceneAnimation(this.playScene, delta, undefined, this.createAnimationInput())
        this.updateCameraFromScene(this.playScene)
        void this.audioRuntime.syncScene(this.playScene)
        useRuntimeStore().setDeltaTime(delta)
        useRuntimeStore().setPerformanceMetrics({
          frameTimeMs: performance.now() - frameStart,
          scriptTimeMs: scriptMetrics.scriptTimeMs || performance.now() - scriptStart,
          collisionTimeMs: scriptMetrics.collisionTimeMs,
          animationTimeMs: performance.now() - animationStart,
          entityCount: this.playScene.entities.length
        })
        this.options.onRuntimeSceneUpdated?.(this.playScene)
      } else {
        this.updateRuntimeInputViewportTransform()
        this.scriptRuntime.updatePausedScene(this.playScene, this.createRuntimeInput())
        if (this.consumeGameCommandRequest()) {
          this.endInputFrame()
          this.animationFrameId = window.requestAnimationFrame(tick)
          return
        }
      }
      this.requestRender()
      this.endInputFrame()
      this.animationFrameId = window.requestAnimationFrame(tick)
    }
    this.animationFrameId = window.requestAnimationFrame(tick)
  }

  private stopRuntimeLoop() {
    if (!this.animationFrameId) return
    window.cancelAnimationFrame(this.animationFrameId)
    this.animationFrameId = 0
  }

  private cloneScene(scene: Scene) {
    return deserializeScene(serializeScene(scene))
  }

  private async preloadSceneVisualAssets(scene: Scene) {
    const paths = new Set<string>()
    const addPath = (path: unknown) => {
      const normalized = String(path || '').trim()
      if (normalized) paths.add(normalized)
    }
    for (const entity of scene.entities) {
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const animation = entity.getComponent<AnimationComponent>('Animation')
      const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
      const ui = entity.getComponent<UIComponent>('UI')
      addPath(sprite?.texturePath)
      addPath(ui?.backgroundTexturePath)
      for (const path of animation?.framePaths || []) addPath(path)
      for (const clip of animation?.stateMachine?.clips || []) {
        for (const path of clip.framePaths || []) addPath(path)
      }
      for (const path of Object.values(tilemap?.tileTextureMap || {})) addPath(path)
    }
    const queue = Array.from(paths)
    const concurrency = 8
    let cursor = 0
    const worker = async () => {
      while (cursor < queue.length) {
        const path = queue[cursor]
        cursor += 1
        await this.resolveImage(path).catch(() => null)
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()))
  }

  private configureRuntimeAdapters() {
    this.scriptRuntime.setErrorReporter(this.options.onScriptError || null)
    this.scriptRuntime.setConsoleReporter(this.options.onConsoleMessage || null)
    this.scriptRuntime.setAudioAdapter({
      playOneShot: async (clipPath, options) => {
        await this.audioRuntime.playOneShot(clipPath, options)
      },
      playEntity: async (target) => {
        await this.audioRuntime.playEntityAudio(target)
      },
      stopEntity: (target) => this.audioRuntime.stopEntityAudio(target.id),
      pauseEntity: (target) => this.audioRuntime.pauseEntityAudio(target.id),
      resumeEntity: (target) => this.audioRuntime.resumeEntityAudio(target.id),
      seekEntity: (target, seconds) => this.audioRuntime.seekEntityAudio(target.id, seconds),
      getEntityState: (target) => this.audioRuntime.getEntityAudioState(target.id),
      stopGroup: (group, fadeOut) => this.audioRuntime.stopGroup(group, fadeOut),
      setMasterVolume: (volume) => this.audioRuntime.setMasterVolume(volume),
      setMasterMuted: (muted) => this.audioRuntime.setMasterMuted(muted),
      setGroupVolume: (group, volume) => this.audioRuntime.setGroupVolume(group, volume),
      setGroupMuted: (group, muted) => this.audioRuntime.setGroupMuted(group, muted),
      getMasterVolume: () => this.audioRuntime.getMasterVolume(),
      getMasterMuted: () => this.audioRuntime.getMasterMuted(),
      getGroupVolume: (group) => this.audioRuntime.getGroupVolume(group),
      getGroupMuted: (group) => this.audioRuntime.getGroupMuted(group)
    })
    this.scriptRuntime.setUiAdapter({
      postHtmlMessage: (entityId, message) => this.postHtmlMessageToEntity(entityId, message)
    })
  }

  private async refreshProjectRuntimeFiles() {
    const projectStore = useProjectStore()
    const assetStore = useAssetStore()
    const sceneStore = useSceneStore()
    const scriptRuntimePath = 'assets/scripts/ScriptRuntime.ts'
    const inputRuntimePath = 'assets/scripts/InputState.ts'
    const audioRuntimePath = 'assets/scripts/AudioRuntime.ts'
    this.audioRuntime.setProjectRoot(projectStore.rootPath, projectStore.mode)
    if (!window.unu?.readTextAsset || !projectStore.rootPath || projectStore.isMemoryProject) {
      this.scriptRuntime.setProjectRuntimeSources([{ path: scriptRuntimePath, content: '' }])
      this.audioRuntime.setProjectRuntimeSource('', audioRuntimePath)
      return
    }
    const isLoadableProjectScriptPath = (scriptPath: string) => {
      const normalized = scriptPath.replace(/\\/g, '/').trim()
      if (!/\.(js|ts)$/i.test(normalized)) return false
      if (!normalized.startsWith('assets/scripts/')) return false
      if (normalized.startsWith('assets/scripts/InputState.')) return false
      if (normalized.startsWith('assets/scripts/AudioRuntime.')) return false
      if (normalized === scriptRuntimePath) return true
      const localPath = normalized.slice('assets/scripts/'.length)
      return (
        !localPath.includes('/') ||
        normalized.startsWith('assets/scripts/shared/') ||
        normalized.startsWith('assets/scripts/interactions/') ||
        normalized.startsWith('assets/scripts/scenes/')
      )
    }
    const discoveredProjectScriptPaths = assetStore.flat
      .filter((node) => node.type === 'script')
      .map((node) => node.path.replace(/\\/g, '/'))
      .filter(isLoadableProjectScriptPath)
    const sceneScriptPaths = new Set<string>()
    const collectSceneScriptPaths = (scene: Scene | null | undefined) => {
      if (!scene) return
      for (const entity of scene.entities) {
        const script = entity.getComponent<ScriptComponent>('Script')
        const scriptPath = script?.scriptPath?.replace(/\\/g, '/').trim()
        if (scriptPath && isLoadableProjectScriptPath(scriptPath)) sceneScriptPaths.add(scriptPath)
      }
    }
    for (const scene of sceneStore.scenes) collectSceneScriptPaths(scene)
    collectSceneScriptPaths(sceneStore.currentScene)
    collectSceneScriptPaths(this.sourceScene)
    const projectScriptPaths = [scriptRuntimePath, ...discoveredProjectScriptPaths, ...Array.from(sceneScriptPaths)]
      .filter((path, index, list) => list.indexOf(path) === index)
      .sort((left, right) => {
        if (left === scriptRuntimePath) return -1
        if (right === scriptRuntimePath) return 1
        return left.localeCompare(right)
      })
    const [scriptLoaded, audioLoaded] = await Promise.all([
      Promise.all(projectScriptPaths.map((relativePath) => window.unu!.readTextAsset!({
        projectRoot: projectStore.rootPath,
        relativePath
      }).then((result) => result ? {
        path: result.relativePath || relativePath,
        content: result.content || ''
      } : null).catch(() => null))),
      window.unu.readTextAsset({
        projectRoot: projectStore.rootPath,
        relativePath: audioRuntimePath
      }).catch(() => null)
    ])
    const scriptFiles = scriptLoaded.filter(Boolean) as ProjectRuntimeSourceFile[]
    this.scriptRuntime.setProjectRuntimeSources(scriptFiles.length ? scriptFiles : [{ path: scriptRuntimePath, content: '' }])
    this.audioRuntime.setProjectRuntimeSource(audioLoaded?.content || '', audioRuntimePath)
    void inputRuntimePath
  }

  private createRuntimeInput() {
    return {
      isKeyDown: (code: string) => this.pressedKeys.has(code),
      isMouseDown: (button = 0) => this.pressedActions.has(`Mouse${button}`),
      wasMousePressed: (button = 0) => this.actionsPressedThisFrame.has(`Mouse${button}`),
      isActionDown: (action: string) => this.isActionDown(action),
      wasActionPressed: (action: string) => this.wasActionPressed(action),
      wasActionReleased: (action: string) => this.wasActionReleased(action),
      getAxis: (axis: 'horizontal' | 'vertical') => axis === 'horizontal' ? this.getMoveVector(false).x : this.getMoveVector(false).y,
      getMoveVector: (normalized?: boolean) => this.getMoveVector(!!normalized),
      getMousePosition: () => this.screenToWorld(this.lastPointerClientX, this.lastPointerClientY),
      getPressedBindings: () => [...this.pressedKeys, ...this.pressedActions],
      consumePrimaryPointerPress: () => this.actionsPressedThisFrame.delete('Mouse0')
    }
  }

  private updateRuntimeInputViewportTransform() {
    const rect = this.options.container.getBoundingClientRect()
    this.lastPointerClientX = Math.max(rect.left, Math.min(rect.right, this.lastPointerClientX || rect.left + rect.width / 2))
    this.lastPointerClientY = Math.max(rect.top, Math.min(rect.bottom, this.lastPointerClientY || rect.top + rect.height / 2))
  }

  private consumeGameCommandRequest() {
    const request = this.scriptRuntime.consumeGameCommandRequest()
    if (!request) return false
    const runtimeStore = useRuntimeStore()
    if (request.type === 'pause') {
      runtimeStore.pause()
      this.isPaused = true
      this.audioRuntime.setPaused(true)
      return false
    }
    if (request.type === 'resume') {
      runtimeStore.resume()
      this.isPaused = false
      this.audioRuntime.setPaused(false)
      return false
    }
    if (request.type === 'togglePause') {
      runtimeStore.togglePause()
      this.isPaused = runtimeStore.isPaused
      this.audioRuntime.setPaused(this.isPaused)
      return false
    }
    if (request.type === 'reset') {
      void this.setRuntimeState(true, false, this.sourceScene, true)
      return true
    }
    if (request.type === 'exit') {
      runtimeStore.stop()
      void this.setRuntimeState(false, false, this.sourceScene)
      return true
    }
    return false
  }

  private consumeSceneSwitchRequest() {
    const request = this.scriptRuntime.consumeSceneSwitchRequest()
    if (!request || !this.isPlaying) return false
    const nextTemplate = this.resolveSceneTemplateByName(request.sceneName)
    if (!nextTemplate) {
      useProjectStore().setStatus(`Canvas 场景切换失败：未找到场景 ${request.sceneName}`)
      return false
    }
    if (this.playScene) {
      this.scriptRuntime.destroyScene(this.playScene)
      this.audioRuntime.stopAll()
    }
    this.playScene = this.cloneScene(nextTemplate)
    this.applyPlayerSpawnPoint(this.playScene, request.targetSpawnId)
    this.currentScene = this.playScene
    this.scriptRuntime.initScene(this.playScene)
    this.scriptRuntime.startScene(this.playScene)
    this.scriptRuntime.enterScene(this.playScene)
    this.updateCameraFromScene(this.playScene)
    void this.renderScene(this.playScene)
    useProjectStore().setStatus(`Canvas 已切换场景：${this.playScene.name}`)
    return true
  }

  private resolveSceneTemplateByName(sceneName: string) {
    const normalized = String(sceneName || '').trim().toLowerCase()
    if (!normalized) return null
    const match = (scene: Scene) => scene.name.trim().toLowerCase() === normalized || scene.id.trim().toLowerCase() === normalized
    if (this.sourceScene && match(this.sourceScene)) return this.sourceScene
    const sceneStore = useSceneStore()
    return sceneStore.scenes.find(match) || (sceneStore.currentScene && match(sceneStore.currentScene) ? sceneStore.currentScene : null)
  }

  private applyPlayerSpawnPoint(scene: Scene, spawnId = '') {
    const normalized = String(spawnId || '').trim()
    if (!normalized) return
    const spawn = scene.getEntityById(normalized) || scene.entities.find((entity) => entity.name.trim().toLowerCase() === normalized.toLowerCase()) || null
    const spawnTransform = spawn?.getComponent<TransformComponent>('Transform')
    if (!spawnTransform) return
    const player = scene.entities.find((entity) => entity.name === 'Player') || null
    const playerTransform = player?.getComponent<TransformComponent>('Transform')
    if (!playerTransform) return
    playerTransform.x = spawnTransform.x
    playerTransform.y = spawnTransform.y
    playerTransform.rotation = spawnTransform.rotation
  }

  private endInputFrame() {
    this.keysPressedThisFrame.clear()
    this.keysReleasedThisFrame.clear()
    this.actionsPressedThisFrame.clear()
    this.actionsReleasedThisFrame.clear()
  }

  private createAnimationInput() {
    return {
      getMoveVector: (normalized?: boolean) => this.getMoveVector(!!normalized),
      isActionDown: (action: string) => this.isActionDown(action),
      wasActionPressed: (action: string) => this.wasActionPressed(action),
      wasActionReleased: (action: string) => this.wasActionReleased(action)
    }
  }

  private applyBuiltinPlayerInput(scene: Scene, delta: number) {
    const move = this.getMoveVector(true)
    if (Math.abs(move.x) < 1e-4 && Math.abs(move.y) < 1e-4) return
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      if (entity.name !== 'Player' && script?.scriptPath !== 'builtin://player-input') continue
      const transform = entity.getComponent<TransformComponent>('Transform')
      if (!transform) continue
      const speed = this.readBuiltinSpeed(script)
      const nextX = transform.x + move.x * speed * delta
      if (!this.isEntityBlockedAt(scene, entity, nextX, transform.y)) transform.x = nextX
      const nextY = transform.y + move.y * speed * delta
      if (!this.isEntityBlockedAt(scene, entity, transform.x, nextY)) transform.y = nextY
      if (move.x > 0.001) transform.scaleX = Math.abs(transform.scaleX || 1)
      else if (move.x < -0.001) transform.scaleX = -Math.abs(transform.scaleX || 1)
    }
  }

  private updateCameraFromScene(scene: Scene) {
    const cameraEntity = this.findActiveCameraEntity(scene)
    if (!cameraEntity) return
    const camera = cameraEntity.getComponent<CameraComponent>('Camera')
    const transform = cameraEntity.getComponent<TransformComponent>('Transform')
    if (!camera || !transform) return
    if (camera.followEntityId) {
      const target = scene.getEntityById(camera.followEntityId)
      const targetTransform = target?.getComponent<TransformComponent>('Transform')
      if (targetTransform) {
        const desiredX = targetTransform.x + camera.offsetX
        const desiredY = targetTransform.y + camera.offsetY
        const smoothing = Math.max(0, Math.min(1, Number(camera.followSmoothing) || 0))
        if (smoothing <= 0) {
          transform.x = desiredX
          transform.y = desiredY
        } else {
          transform.x += (desiredX - transform.x) * smoothing
          transform.y += (desiredY - transform.y) * smoothing
        }
      }
    }
    let nextX = transform.x
    let nextY = transform.y
    if (camera.boundsEnabled) {
      nextX = Math.max(camera.minX, Math.min(camera.maxX, nextX))
      nextY = Math.max(camera.minY, Math.min(camera.maxY, nextY))
      transform.x = nextX
      transform.y = nextY
    }
    this.camera.x = nextX
    this.camera.y = nextY
    this.camera.zoom = Math.max(0.1, Math.min(5, Number(camera.zoom) || 1))
  }

  private findActiveCameraEntity(scene: Scene) {
    return scene.entities.find((entity) => {
      const camera = entity.getComponent<CameraComponent>('Camera')
      const transform = entity.getComponent<TransformComponent>('Transform')
      const background = entity.getComponent<BackgroundComponent>('Background')
      return !!camera?.enabled && !!transform && !background?.enabled
    }) || null
  }

  private isEntityBlockedAt(scene: Scene, entity: Entity, x: number, y: number) {
    const transform = entity.getComponent<TransformComponent>('Transform')
    const collider = entity.getComponent<ColliderComponent>('Collider')
    if (!transform || !collider || collider.isTrigger || collider.width <= 0 || collider.height <= 0) return false
    const halfW = collider.width / 2
    const halfH = collider.height / 2
    const samplePoints = [
      { x: x + collider.offsetX - halfW, y: y + collider.offsetY - halfH },
      { x: x + collider.offsetX + halfW, y: y + collider.offsetY - halfH },
      { x: x + collider.offsetX - halfW, y: y + collider.offsetY + halfH },
      { x: x + collider.offsetX + halfW, y: y + collider.offsetY + halfH },
      { x: x + collider.offsetX, y: y + collider.offsetY }
    ]
    return samplePoints.some((point) => this.isWorldBlocked(scene, point.x, point.y))
  }

  private isWorldBlocked(scene: Scene, x: number, y: number) {
    for (const entity of scene.entities) {
      const transform = entity.getComponent<TransformComponent>('Transform')
      const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
      if (!transform || !tilemap?.enabled) continue
      if (this.isPointBlockedByTilemap(transform, tilemap, x, y)) return true
    }
    return false
  }

  private isPointBlockedByTilemap(transform: TransformComponent, tilemap: TilemapComponent, worldX: number, worldY: number) {
    const width = tilemap.columns * tilemap.tileWidth
    const height = tilemap.rows * tilemap.tileHeight
    const local = this.worldToLocalPoint(transform, worldX, worldY)
    const left = -width * transform.anchorX
    const top = -height * transform.anchorY
    const tileX = Math.floor((local.x - left) / tilemap.tileWidth)
    const tileY = Math.floor((local.y - top) / tilemap.tileHeight)
    if (tileX < 0 || tileY < 0 || tileX >= tilemap.columns || tileY >= tilemap.rows) return false
    const index = tileY * tilemap.columns + tileX
    return Number(tilemap.collision[index] ?? 0) > 0
  }

  private worldToLocalPoint(transform: TransformComponent, worldX: number, worldY: number) {
    const dx = worldX - transform.x
    const dy = worldY - transform.y
    const cos = Math.cos(-transform.rotation)
    const sin = Math.sin(-transform.rotation)
    const scaleX = Math.abs(transform.scaleX) > 0.0001 ? transform.scaleX : 1
    const scaleY = Math.abs(transform.scaleY) > 0.0001 ? transform.scaleY : 1
    return {
      x: (dx * cos - dy * sin) / scaleX,
      y: (dx * sin + dy * cos) / scaleY
    }
  }

  private readBuiltinSpeed(script?: ScriptComponent) {
    const fallback = 220
    if (!script?.sourceCode?.trim().startsWith('{')) return fallback
    try {
      const parsed = JSON.parse(script.sourceCode) as Record<string, unknown>
      const value = Number(parsed.moveSpeed ?? parsed.speed ?? fallback)
      return Number.isFinite(value) ? Math.max(0, value) : fallback
    } catch {
      return fallback
    }
  }

  private getMoveVector(normalized: boolean) {
    const x = (this.isActionDown('move_right') ? 1 : 0) - (this.isActionDown('move_left') ? 1 : 0)
    const y = (this.isActionDown('move_down') ? 1 : 0) - (this.isActionDown('move_up') ? 1 : 0)
    if (!normalized) return { x, y }
    const length = Math.hypot(x, y)
    return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 }
  }

  private isActionDown(action: string) {
    const map: Record<string, string[]> = {
      move_left: ['KeyA', 'ArrowLeft'],
      move_right: ['KeyD', 'ArrowRight'],
      move_up: ['KeyW', 'ArrowUp'],
      move_down: ['KeyS', 'ArrowDown'],
      sprint: ['ShiftLeft', 'ShiftRight'],
      jump: ['Space'],
      fire: ['Mouse0', 'KeyJ'],
      interact: ['Mouse2'],
      inventory: ['KeyE'],
      use_item: ['KeyQ'],
      reload: ['KeyR'],
      menu: ['Escape'],
      hotbar_1: ['Digit1'],
      hotbar_2: ['Digit2'],
      hotbar_3: ['Digit3'],
      hotbar_4: ['Digit4'],
      hotbar_5: ['Digit5'],
      hotbar_6: ['Digit6']
    }
    return (map[action] || [action]).some((code) => this.pressedKeys.has(code) || this.pressedActions.has(code))
  }

  private wasActionPressed(action: string) {
    const map: Record<string, string[]> = {
      move_left: ['KeyA', 'ArrowLeft'],
      move_right: ['KeyD', 'ArrowRight'],
      move_up: ['KeyW', 'ArrowUp'],
      move_down: ['KeyS', 'ArrowDown'],
      sprint: ['ShiftLeft', 'ShiftRight'],
      jump: ['Space'],
      fire: ['Mouse0', 'KeyJ'],
      interact: ['Mouse2'],
      inventory: ['KeyE'],
      use_item: ['KeyQ'],
      reload: ['KeyR'],
      menu: ['Escape'],
      hotbar_1: ['Digit1'],
      hotbar_2: ['Digit2'],
      hotbar_3: ['Digit3'],
      hotbar_4: ['Digit4'],
      hotbar_5: ['Digit5'],
      hotbar_6: ['Digit6']
    }
    return (map[action] || [action]).some((code) => this.keysPressedThisFrame.has(code) || this.actionsPressedThisFrame.has(code))
  }

  private wasActionReleased(action: string) {
    const map: Record<string, string[]> = {
      move_left: ['KeyA', 'ArrowLeft'],
      move_right: ['KeyD', 'ArrowRight'],
      move_up: ['KeyW', 'ArrowUp'],
      move_down: ['KeyS', 'ArrowDown'],
      sprint: ['ShiftLeft', 'ShiftRight'],
      jump: ['Space'],
      fire: ['Mouse0', 'KeyJ'],
      interact: ['Mouse2'],
      inventory: ['KeyE'],
      use_item: ['KeyQ'],
      reload: ['KeyR'],
      menu: ['Escape'],
      hotbar_1: ['Digit1'],
      hotbar_2: ['Digit2'],
      hotbar_3: ['Digit3'],
      hotbar_4: ['Digit4'],
      hotbar_5: ['Digit5'],
      hotbar_6: ['Digit6']
    }
    return (map[action] || [action]).some((code) => this.keysReleasedThisFrame.has(code) || this.actionsReleasedThisFrame.has(code))
  }

  private drawGrid(width: number, height: number) {
    const zoom = this.camera.zoom
    const step = GRID_SIZE * zoom
    const origin = this.worldToScreen(0, 0)
    const startX = ((origin.x % step) + step) % step
    const startY = ((origin.y % step) + step) % step
    this.ctx.save()
    this.ctx.strokeStyle = 'rgba(92, 111, 141, 0.28)'
    this.ctx.lineWidth = 1
    for (let x = startX; x < width; x += step) {
      this.ctx.beginPath()
      this.ctx.moveTo(Math.round(x) + 0.5, 0)
      this.ctx.lineTo(Math.round(x) + 0.5, height)
      this.ctx.stroke()
    }
    for (let y = startY; y < height; y += step) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, Math.round(y) + 0.5)
      this.ctx.lineTo(width, Math.round(y) + 0.5)
      this.ctx.stroke()
    }
    this.ctx.restore()
  }

  private async drawEntity(scene: Scene, entity: Entity, viewportWidth: number, viewportHeight: number, activeHtmlUiIds: Set<string>) {
    const transform = entity.getComponent<TransformComponent>('Transform')
    if (!transform) return
    const sprite = entity.getComponent<SpriteComponent>('Sprite')
    const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
    const collider = entity.getComponent<ColliderComponent>('Collider')
    const background = entity.getComponent<BackgroundComponent>('Background')
    const ui = entity.getComponent<UIComponent>('UI')
    const tilemapWidth = tilemap ? tilemap.columns * tilemap.tileWidth : 0
    const tilemapHeight = tilemap ? tilemap.rows * tilemap.tileHeight : 0
    const uiMetrics = ui?.enabled ? this.resolveUiMetrics(ui) : null
    const uiWidth = uiMetrics?.width || 0
    const uiHeight = uiMetrics?.height || 0
    const isViewport = transform.positionMode === 'viewport'
    const position = isViewport
      ? this.viewportPosition(transform, sprite?.width || tilemapWidth || uiWidth || collider?.width || EMPTY_ENTITY_SIZE, sprite?.height || tilemapHeight || uiHeight || collider?.height || EMPTY_ENTITY_SIZE, viewportWidth, viewportHeight)
      : this.worldToScreen(transform.x, transform.y)
    const zoom = isViewport ? 1 : this.camera.zoom

    if (sprite?.visible && sprite.alpha > 0 && background?.enabled && background.followCamera) {
      await this.drawBackgroundSprite(entity, transform, sprite, background, viewportWidth, viewportHeight)
      return
    }
    if (ui?.enabled && ui.renderMode === 'html') {
      const uiPosition = this.resolveUiPosition(scene, entity, transform, ui, uiMetrics || { width: uiWidth, height: uiHeight })
      await this.drawHtmlUi(scene, entity, transform, ui, uiPosition)
      activeHtmlUiIds.add(entity.id)
      return
    }
    if (ui?.enabled) {
      const uiPosition = this.resolveUiPosition(scene, entity, transform, ui, uiMetrics || { width: uiWidth, height: uiHeight })
      await this.drawUi(entity, transform, ui, uiPosition.x, uiPosition.y, 1, uiPosition.width, uiPosition.height)
      return
    }
    if (sprite?.visible && sprite.alpha > 0) {
      await this.drawSprite(entity, transform, sprite, position.x, position.y, zoom, !!background?.enabled)
      this.drawSpriteDebugFrame(entity, transform, sprite, position.x, position.y, zoom)
      this.drawColliderDebugFrame(entity, transform, collider, position.x, position.y, zoom)
      return
    }
    if (tilemap?.enabled) {
      await this.drawTilemap(entity, transform, tilemap, position.x, position.y, zoom)
      this.drawColliderDebugFrame(entity, transform, collider, position.x, position.y, zoom)
      return
    }
    if (collider || !this.isPlaying) {
      const width = collider?.width || EMPTY_ENTITY_SIZE
      const height = collider?.height || EMPTY_ENTITY_SIZE
      this.drawFallbackBox(entity, transform, position.x, position.y, width, height, zoom, collider ? 'rgba(125, 211, 252, 0.16)' : 'rgba(148, 163, 184, 0.12)')
      this.drawColliderDebugFrame(entity, transform, collider, position.x, position.y, zoom)
    }
  }

  private async drawSprite(entity: Entity, transform: TransformComponent, sprite: SpriteComponent, x: number, y: number, zoom: number, isBackground: boolean) {
    const source = await this.resolveImage(sprite.texturePath)
    const drawWidth = Math.max(1, sprite.width * zoom)
    const drawHeight = Math.max(1, sprite.height * zoom)
    this.registerBounds(entity, transform, sprite.width, sprite.height, transform.positionMode === 'viewport')
    this.ctx.save()
    this.ctx.translate(x + sprite.offsetX * zoom, y + sprite.offsetY * zoom)
    this.ctx.rotate(transform.rotation)
    this.ctx.scale(transform.scaleX, transform.scaleY)
    this.ctx.globalAlpha = Math.max(0, Math.min(1, sprite.alpha))
    if (source) {
      const fit = this.fitImage(source.sw, source.sh, drawWidth, drawHeight, sprite.preserveAspect || isBackground)
      this.ctx.drawImage(source.image, source.sx, source.sy, source.sw, source.sh, fit.x, fit.y, fit.width, fit.height)
      if (sprite.tint !== 0xffffff) {
        this.ctx.globalCompositeOperation = 'source-atop'
        this.ctx.fillStyle = this.colorToCss(sprite.tint, 0.28)
        this.ctx.fillRect(-drawWidth * transform.anchorX, -drawHeight * transform.anchorY, drawWidth, drawHeight)
      }
    } else {
      this.ctx.fillStyle = this.colorToCss(sprite.tint, Math.max(0, Math.min(1, sprite.alpha)))
      this.ctx.fillRect(-drawWidth * transform.anchorX, -drawHeight * transform.anchorY, drawWidth, drawHeight)
    }
    this.ctx.restore()
  }

  private async drawBackgroundSprite(entity: Entity, transform: TransformComponent, sprite: SpriteComponent, background: BackgroundComponent, viewportWidth: number, viewportHeight: number) {
    const source = await this.resolveImage(sprite.texturePath)
    const targetWidth = Math.max(1, viewportWidth)
    const targetHeight = Math.max(1, viewportHeight)
    this.registerViewportCenterBounds(entity, transform, targetWidth, targetHeight)
    this.ctx.save()
    this.ctx.translate(targetWidth / 2 + Number(sprite.offsetX || 0), targetHeight / 2 + Number(sprite.offsetY || 0))
    this.ctx.rotate(transform.rotation)
    this.ctx.scale(transform.scaleX || 1, transform.scaleY || 1)
    this.ctx.globalAlpha = Math.max(0, Math.min(1, sprite.alpha))
    if (source) {
      const fit = this.fitBackgroundImage(source.sw, source.sh, targetWidth, targetHeight, background.fitMode || 'cover')
      this.ctx.drawImage(source.image, source.sx, source.sy, source.sw, source.sh, fit.x, fit.y, fit.width, fit.height)
      if (sprite.tint !== 0xffffff) {
        this.ctx.globalCompositeOperation = 'source-atop'
        this.ctx.fillStyle = this.colorToCss(sprite.tint, 0.28)
        this.ctx.fillRect(fit.x, fit.y, fit.width, fit.height)
      }
    } else {
      this.ctx.fillStyle = this.colorToCss(sprite.tint, Math.max(0, Math.min(1, sprite.alpha)))
      this.ctx.fillRect(-targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight)
    }
    this.ctx.restore()
  }

  private async drawHtmlUi(scene: Scene, entity: Entity, transform: TransformComponent, ui: UIComponent, position: UiPosition) {
    this.registerBounds(entity, transform, position.width, position.height, true)
    await this.ensureHtmlUi(scene, entity, transform, ui, position)
  }

  private drawHtmlUiFallback(entity: Entity, x: number, y: number, width: number, height: number) {
    this.ctx.save()
    this.ctx.fillStyle = 'rgba(12, 18, 28, 0.78)'
    this.roundRect(x, y, width, height, Math.min(14, height / 2))
    this.ctx.fill()
    this.ctx.strokeStyle = 'rgba(216, 170, 74, 0.55)'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    if (entity.id === 'ui_inventory_panel' || entity.name.includes('Inventory')) {
      this.drawInventoryFallback(entity, x, y, width, height)
    } else {
      this.ctx.fillStyle = 'rgba(237,245,255,0.9)'
      this.ctx.font = '14px "Microsoft YaHei", "Segoe UI", sans-serif'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(entity.name || 'HTML UI', x + width / 2, y + height / 2)
    }
    this.ctx.restore()
  }

  private drawInventoryFallback(entity: Entity, x: number, y: number, width: number, height: number) {
    this.ctx.fillStyle = '#edf5ff'
    this.ctx.font = '18px "Microsoft YaHei", "Segoe UI", sans-serif'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    this.ctx.fillStyle = '#edf5ff'
    this.ctx.fillText('背包 / 装备', x + 18, y + 16)
    const gridX = x + 18
    const gridY = y + Math.max(58, height * 0.32)
    const gap = 6
    const cols = 6
    const slotW = Math.max(34, Math.min(82, (width - 36 - gap * (cols - 1)) / cols))
    const slotH = Math.max(28, Math.min(58, (height - (gridY - y) - 22 - gap * 3) / 4))
    for (let index = 0; index < 24; index += 1) {
      const col = index % cols
      const row = Math.floor(index / cols)
      const sx = gridX + col * (slotW + gap)
      const sy = gridY + row * (slotH + gap)
      this.ctx.fillStyle = row === 3 ? 'rgba(35, 70, 98, 0.82)' : 'rgba(21, 27, 39, 0.88)'
      this.roundRect(sx, sy, slotW, slotH, 6)
      this.ctx.fill()
      this.ctx.strokeStyle = 'rgba(120, 214, 255, 0.32)'
      this.ctx.lineWidth = 1
      this.ctx.stroke()
      const name = row === 3 ? String(index - 17) : ''
      if (!name) continue
      this.ctx.fillStyle = '#edf5ff'
      this.ctx.font = '10px "Microsoft YaHei", "Segoe UI", sans-serif'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(`[${name}]`, sx + slotW / 2, sy + slotH / 2, slotW - 6)
    }
  }

  private async ensureHtmlUi(scene: Scene, entity: Entity, transform: TransformComponent, ui: UIComponent, position: UiPosition) {
    let cached = this.htmlUiCache.get(entity.id)
    if (!cached) {
      const frame = document.createElement('iframe')
      frame.setAttribute('allowtransparency', 'true')
      Object.assign(frame.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: `${Math.max(1, position.width)}px`,
        height: `${Math.max(1, position.height)}px`,
        border: '0',
        display: 'block',
        background: 'transparent',
        backgroundColor: 'transparent',
        colorScheme: 'normal'
      })
      this.htmlUiHost.appendChild(frame)
      cached = {
        signature: '',
        frame,
        ready: false,
        snapshotKey: '',
        snapshot: null,
        width: 0,
        height: 0,
        resizeKey: '',
        lastClickAt: 0,
        lastClickX: 0,
        lastClickY: 0
      }
      this.htmlUiCache.set(entity.id, cached)
    }

    cached.width = Math.max(1, Math.round(position.width))
    cached.height = Math.max(1, Math.round(position.height))
    Object.assign(cached.frame.style, {
      width: `${cached.width}px`,
      height: `${cached.height}px`,
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: `translate(-50%, -50%) rotate(${transform.rotation}rad) scale(${transform.scaleX || 1}, ${transform.scaleY || 1})`,
      transformOrigin: 'center center',
      zIndex: String(1000 + (transform.zIndex ?? 0)),
      pointerEvents: this.isPlaying && ui.interactable ? 'auto' : 'none',
      touchAction: 'none',
      backgroundColor: this.shouldDrawUiBackground(ui) ? this.colorToCss(ui.backgroundColor, this.resolveUiBackgroundAlpha(ui)) : 'transparent',
      outline: ui.htmlDebugOverlay ? '1px dashed rgba(125, 211, 252, 0.9)' : 'none',
      boxShadow: ui.htmlDebugOverlay ? '0 0 0 1px rgba(8, 13, 24, 0.8) inset' : 'none'
    })
    cached.frame.dataset.unuEntityId = entity.id
    cached.frame.dataset.unuEntityName = entity.name
    cached.frame.dataset.unuHtmlUi = ui.htmlSourcePath || 'inline'
    cached.frame.title = ui.htmlDebugOverlay ? `${entity.name || entity.id} HTML UI (${cached.width}x${cached.height})` : ''
    this.applyHtmlUiBackgroundTexture(cached.frame, ui)

    const externalHtml = ui.htmlSourcePath ? await this.resolveHtmlUiSource(ui.htmlSourcePath) : null
    const sourceHtml = ui.htmlPreviewContent || externalHtml || ui.text
    const html = ui.markdownEnabled ? this.basicMarkdownToHtml(sourceHtml) : sourceHtml
    const signature = [
      html,
      ui.htmlSourcePath,
      ui.htmlPreviewContent,
      ui.backgroundVisible ? 1 : 0,
      this.resolveUiBackgroundAlpha(ui),
      ui.backgroundColor,
      ui.backgroundTexturePath,
      ui.htmlBridgeEnabled ? 1 : 0,
      ui.htmlAllowScripts ? 1 : 0,
      ui.htmlDebugOverlay ? 1 : 0,
      ui.htmlDebugConsole ? 1 : 0,
      cached.width,
      cached.height
    ].join('|')
    if (cached.signature !== signature) {
      cached.signature = signature
      cached.ready = false
      cached.snapshot = null
      cached.snapshotKey = ''
      this.writeHtmlUiFrame(cached, scene, entity, ui, html)
    }
    this.postHtmlResizeIfNeeded(entity.id, cached)
    this.flushPendingHtmlUiMessages(entity.id)
    return cached
  }

  private writeHtmlUiFrame(cached: CachedCanvasHtmlUi, scene: Scene, entity: Entity, ui: UIComponent, html: string) {
    const frameWindow = cached.frame.contentWindow
    const doc = cached.frame.contentDocument
    if (!frameWindow || !doc) return
    const scripts: string[] = []
    const documentHtml = this.buildCanvasHtmlUiDocument(entity, ui, html).replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_match, code) => {
      scripts.push(String(code || ''))
      return ''
    })
    doc.open()
    doc.write(documentHtml)
    doc.close()
    this.installHtmlUiBridge(frameWindow, scene, entity, ui)
    this.installHtmlUiDebugConsole(frameWindow, entity, ui)
    cached.ready = true
    for (const script of scripts) {
      if (!ui.htmlAllowScripts) continue
      try {
        ;(frameWindow as Window & { Function: FunctionConstructor }).Function(script).call(frameWindow)
      } catch (error) {
        this.options.onConsoleMessage?.({
          level: 'error',
          message: `HTML UI script failed: ${error instanceof Error ? error.message : String(error)}`,
          entityId: entity.id,
          entityName: entity.name,
          scriptPath: ui.htmlSourcePath || 'html-ui'
        })
      }
    }
    this.postHtmlResizeIfNeeded(entity.id, cached, true)
    this.scriptRuntime.handleHtmlUiMessage(scene, entity, ui, {
      type: 'ready',
      payload: { width: cached.width, height: cached.height }
    })
  }

  private installHtmlUiDebugConsole(frameWindow: Window, entity: Entity, ui: UIComponent) {
    if (!ui.htmlDebugConsole) return
    const levels: Array<'log' | 'info' | 'warn' | 'error'> = ['log', 'info', 'warn', 'error']
    const targetConsole = (frameWindow as Window & { console: Console }).console
    for (const level of levels) {
      const original = targetConsole[level]?.bind(targetConsole)
      targetConsole[level] = (...args: unknown[]) => {
        original?.(...args)
        this.options.onConsoleMessage?.({
          level: level === 'info' ? 'log' : level,
          message: `[HTML UI] ${args.map((arg) => this.stringifyHtmlUiDebugValue(arg)).join(' ')}`,
          entityId: entity.id,
          entityName: entity.name,
          scriptPath: ui.htmlSourcePath || 'inline-html-ui'
        })
      }
    }
  }

  private stringifyHtmlUiDebugValue(value: unknown) {
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  private installHtmlUiBridge(frameWindow: Window, scene: Scene, entity: Entity, ui: UIComponent) {
    const listeners = new Set<(message: unknown) => void>()
    const bridge = {
      entityId: entity.id,
      emit: (type: string, payload: unknown) => {
        if (!this.currentScene) return
        if (type === '__unu_asset_url') return
        this.scriptRuntime.handleHtmlUiMessage(this.currentScene || scene, entity, ui, {
          type: String(type || 'message'),
          payload
        })
        this.consumeGameCommandRequest()
        this.requestRender()
      },
      onMessage: (callback: unknown) => {
        if (typeof callback !== 'function') return () => {}
        listeners.add(callback as (message: unknown) => void)
        return () => listeners.delete(callback as (message: unknown) => void)
      },
      assetUrl: async (path: string) => {
        const url = await this.readHtmlUiAssetDataUrl(path)
        return url
      }
    }
    ;(frameWindow as Window & { UNU?: unknown; __unuReceiveMessage?: (message: unknown) => void }).UNU = bridge
    ;(frameWindow as Window & { __unuReceiveMessage?: (message: unknown) => void }).__unuReceiveMessage = (message: unknown) => {
      const doc = frameWindow.document
      if (message && typeof message === 'object' && (message as { type?: unknown }).type === '__unu_resize') {
        const width = Number((message as { width?: unknown }).width || 0)
        const height = Number((message as { height?: unknown }).height || 0)
        doc.documentElement.style.setProperty('--unu-ui-width', `${width}px`)
        doc.documentElement.style.setProperty('--unu-ui-height', `${height}px`)
      }
      for (const listener of Array.from(listeners)) {
        try {
          listener(message)
        } catch (error) {
          console.error(error)
        }
      }
    }
  }

  private async updateHtmlUiSnapshot(cached: CachedCanvasHtmlUi) {
    const doc = cached.frame.contentDocument
    if (!doc || !cached.ready) return
    const wrapper = doc.createElement('div')
    wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
    wrapper.setAttribute('style', `width:${cached.width}px;height:${cached.height}px;overflow:hidden;`)
    for (const style of Array.from(doc.head?.querySelectorAll('style') || [])) {
      wrapper.appendChild(style.cloneNode(true))
    }
    for (const child of Array.from(doc.body?.childNodes || [])) {
      wrapper.appendChild(child.cloneNode(true))
    }
    const html = new XMLSerializer().serializeToString(wrapper)
    const key = `${cached.width}x${cached.height}|${html}`
    if (cached.snapshotKey === key && cached.snapshot) return
    cached.snapshotKey = key
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cached.width}" height="${cached.height}" viewBox="0 0 ${cached.width} ${cached.height}">
<foreignObject x="0" y="0" width="100%" height="100%">${html}</foreignObject>
</svg>`
    const image = new Image()
    const loaded = new Promise<boolean>((resolve) => {
      image.onload = () => resolve(true)
      image.onerror = () => resolve(false)
      window.setTimeout(() => resolve(false), 350)
    })
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    if (await loaded) cached.snapshot = image
  }

  private postHtmlMessageToEntity(entityId: string, message: unknown) {
    const cached = this.htmlUiCache.get(entityId)
    if (!cached) {
      this.queueHtmlUiMessage(entityId, message)
      return
    }
    const receiver = cached?.frame.contentWindow as (Window & { __unuReceiveMessage?: (message: unknown) => void }) | null | undefined
    if (!receiver?.__unuReceiveMessage) {
      this.queueHtmlUiMessage(entityId, message)
      return
    }
    receiver.__unuReceiveMessage(message)
    cached.snapshotKey = ''
  }

  private queueHtmlUiMessage(entityId: string, message: unknown) {
    const queued = this.pendingHtmlUiMessages.get(entityId) || []
    queued.push(message)
    this.pendingHtmlUiMessages.set(entityId, queued.slice(-24))
  }

  private flushPendingHtmlUiMessages(entityId: string) {
    const queued = this.pendingHtmlUiMessages.get(entityId)
    if (!queued?.length) return
    this.pendingHtmlUiMessages.delete(entityId)
    const cached = this.htmlUiCache.get(entityId)
    const receiver = cached?.frame.contentWindow as (Window & { __unuReceiveMessage?: (message: unknown) => void }) | null | undefined
    if (!cached || !receiver?.__unuReceiveMessage) {
      this.pendingHtmlUiMessages.set(entityId, queued)
      return
    }
    for (const message of queued) receiver.__unuReceiveMessage(message)
    cached.snapshotKey = ''
  }

  private postHtmlResizeIfNeeded(entityId: string, cached: CachedCanvasHtmlUi, force = false) {
    const key = `${cached.width}x${cached.height}`
    if (!force && cached.resizeKey === key) return
    cached.resizeKey = key
    const receiver = cached.frame.contentWindow as (Window & { __unuReceiveMessage?: (message: unknown) => void }) | null | undefined
    receiver?.__unuReceiveMessage?.({
      type: '__unu_resize',
      width: cached.width,
      height: cached.height
    })
  }

  private applyHtmlUiBackgroundTexture(frame: HTMLIFrameElement, ui: UIComponent) {
    const path = String(ui.backgroundTexturePath || '').trim()
    if (!path || !this.shouldDrawUiBackground(ui)) {
      frame.style.backgroundImage = ''
      return
    }
    frame.style.backgroundSize = 'cover'
    frame.style.backgroundPosition = 'center'
    frame.style.backgroundRepeat = 'no-repeat'
    void this.readHtmlUiAssetDataUrl(path).then((url) => {
      if (!url) return
      frame.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`
    })
  }

  private buildCanvasHtmlUiDocument(entity: Entity, ui: UIComponent, html: string) {
    const baseStyle = `<style data-unu-canvas-html>
      :root { --unu-ui-width: 100vw; --unu-ui-height: 100vh; }
      html, body { width: 100%; height: 100%; margin: 0; background: transparent !important; overflow: hidden; }
      body::after { content: ${ui.htmlDebugOverlay ? JSON.stringify(`${entity.name || entity.id} ${ui.htmlSourcePath || 'inline'}`) : "''"}; display: ${ui.htmlDebugOverlay ? 'block' : 'none'}; position: fixed; left: 4px; top: 4px; z-index: 2147483647; max-width: calc(100% - 8px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 2px 5px; border-radius: 4px; background: rgba(8, 13, 24, 0.82); color: #7dd3fc; font: 10px/1.2 monospace; pointer-events: none; }
      * { box-sizing: border-box; }
    </style>`
    const hasDocument = /<html[\s>]/i.test(html) || /<!doctype/i.test(html)
    if (hasDocument) {
      return /<head[\s>]/i.test(html)
        ? html.replace(/<head([^>]*)>/i, `<head$1>${baseStyle}`)
        : `${baseStyle}${html}`
    }
    return `<!doctype html><html><head><meta charset="UTF-8">${baseStyle}</head><body>${html || '&nbsp;'}</body></html>`
  }

  private async resolveHtmlUiSource(relativePath: string) {
    const normalized = String(relativePath || '').replace(/\\/g, '/').trim()
    if (!normalized) return null
    const project = useProjectStore()
    if (window.unu?.readTextAsset && project.rootPath && !project.isMemoryProject) {
      try {
        const result = await window.unu.readTextAsset({ projectRoot: project.rootPath, relativePath: normalized })
        return result?.content ?? null
      } catch {
        return null
      }
    }
    try {
      const response = await fetch(normalized)
      return response.ok ? await response.text() : null
    } catch {
      return null
    }
  }

  private async readHtmlUiAssetDataUrl(relativePath: string) {
    const normalized = String(relativePath || '').replace(/\\/g, '/').trim()
    if (!normalized) return ''
    if (/^(https?|data|blob):/i.test(normalized)) return normalized
    const project = useProjectStore()
    if (!window.unu?.readAssetDataUrl || !project.rootPath || project.isMemoryProject) return normalized
    const cacheKey = `${project.rootPath}|${normalized}`
    if (this.htmlUiAssetDataUrlCache.has(cacheKey)) return this.htmlUiAssetDataUrlCache.get(cacheKey) || ''
    try {
      const result = await window.unu.readAssetDataUrl({ projectRoot: project.rootPath, relativePath: normalized })
      const dataUrl = result?.dataUrl || ''
      if (dataUrl) this.htmlUiAssetDataUrlCache.set(cacheKey, dataUrl)
      return dataUrl || normalized
    } catch {
      return normalized
    }
  }

  private basicMarkdownToHtml(markdown: string) {
    return String(markdown || '')
      .split(/\r?\n/)
      .map((line) => `<p>${this.escapeHtml(line)}</p>`)
      .join('')
  }

  private escapeHtml(value: string) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char] || char))
  }

  private async drawUi(entity: Entity, transform: TransformComponent, ui: UIComponent, x: number, y: number, zoom: number, width: number, height: number) {
    const fontSize = Math.max(8, Number(ui.fontSize || 14)) * zoom
    const paddingX = Math.max(0, Number(ui.paddingX || 0)) * zoom
    const paddingY = Math.max(0, Number(ui.paddingY || 0)) * zoom
    const text = this.stripMarkdown(String(ui.text || ''))
    this.ctx.save()
    this.ctx.font = `${fontSize}px "Microsoft YaHei", "Segoe UI", sans-serif`
    const measured = this.measureUiText(text, Math.max(16, width - paddingX * 2), fontSize)
    const minWidth = this.resolveUiSize(ui.minWidth, this.options.container.clientWidth, 1, 1) * zoom
    const minHeight = this.resolveUiSize(ui.minHeight, this.options.container.clientHeight, 1, 1) * zoom
    const drawWidth = Math.max(minWidth, ui.autoWidth ? measured.width + paddingX * 2 : width * zoom)
    const drawHeight = Math.max(minHeight, ui.autoHeight ? measured.height + paddingY * 2 : height * zoom)
    this.registerBounds(entity, transform, drawWidth / Math.max(0.0001, zoom), drawHeight / Math.max(0.0001, zoom), transform.positionMode === 'viewport')
    this.ctx.translate(x, y)
    this.ctx.rotate(transform.rotation)
    this.ctx.scale(transform.scaleX, transform.scaleY)
    const left = -drawWidth / 2
    const top = -drawHeight / 2
    const backgroundAlpha = this.resolveUiBackgroundAlpha(ui)
    const shouldDrawBackground = this.shouldDrawUiBackground(ui)
    if (shouldDrawBackground) {
      if (Number(ui.backgroundColor || 0) !== 0) {
        this.ctx.fillStyle = this.colorToCss(ui.backgroundColor, backgroundAlpha)
        this.roundRect(left, top, drawWidth, drawHeight, Math.min(10 * zoom, drawHeight / 2))
        this.ctx.fill()
      }
      const background = await this.resolveImage(ui.backgroundTexturePath)
      if (background) {
        const fit = this.fitBackgroundImage(background.sw, background.sh, drawWidth, drawHeight, 'cover')
        this.ctx.save()
        this.ctx.globalAlpha *= backgroundAlpha
        this.ctx.drawImage(background.image, background.sx, background.sy, background.sw, background.sh, fit.x, fit.y, fit.width, fit.height)
        this.ctx.restore()
      }
    }
    if (ui.mode === 'button') {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      this.ctx.lineWidth = Math.max(1, zoom)
      if (shouldDrawBackground) {
        this.roundRect(left, top, drawWidth, drawHeight, Math.min(10 * zoom, drawHeight / 2))
        this.ctx.stroke()
      }
    }
    if (ui.mode === 'slider') {
      const range = Math.max(0.0001, Number(ui.sliderMax) - Number(ui.sliderMin))
      const ratio = Math.max(0, Math.min(1, (Number(ui.sliderValue) - Number(ui.sliderMin)) / range))
      this.ctx.fillStyle = 'rgba(125, 211, 252, 0.65)'
      this.ctx.fillRect(left + paddingX, top + drawHeight - paddingY - 5 * zoom, Math.max(0, drawWidth - paddingX * 2) * ratio, 4 * zoom)
    }
    this.ctx.fillStyle = this.colorToCss(ui.textColor, 1)
    this.ctx.textBaseline = 'middle'
    this.ctx.textAlign = 'center'
    const lines = this.wrapUiText(text, Math.max(16, drawWidth - paddingX * 2), fontSize)
    const lineHeight = fontSize * 1.18
    const totalHeight = lines.length * lineHeight
    const startY = top + drawHeight / 2 - totalHeight / 2 + lineHeight / 2
    lines.forEach((line, index) => {
      this.ctx.fillText(line, left + drawWidth / 2, startY + index * lineHeight, Math.max(16, drawWidth - paddingX * 2))
    })
    this.ctx.restore()
  }

  private async drawTilemap(entity: Entity, transform: TransformComponent, tilemap: TilemapComponent, x: number, y: number, zoom: number) {
    const width = tilemap.columns * tilemap.tileWidth
    const height = tilemap.rows * tilemap.tileHeight
    this.registerTilemapBounds(entity, transform, width, height)
    const textureMap = new Map<number, ImageSource | null>()
    for (const [key, path] of Object.entries(tilemap.tileTextureMap || {})) {
      textureMap.set(Math.round(Number(key)), await this.resolveImage(path))
    }
    const showDebug = (!this.isPlaying || this.playDebugEnabled) && entity.debugFrameVisible !== false
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(transform.rotation)
    this.ctx.scale(transform.scaleX * zoom, transform.scaleY * zoom)
    for (let row = 0; row < tilemap.rows; row += 1) {
      for (let col = 0; col < tilemap.columns; col += 1) {
        const index = row * tilemap.columns + col
        const value = Math.round(Number(tilemap.tiles[index] || 0))
        const tx = col * tilemap.tileWidth
        const ty = row * tilemap.tileHeight
        if (value > 0) {
          const source = textureMap.get(value)
          if (source) this.ctx.drawImage(source.image, source.sx, source.sy, source.sw, source.sh, tx, ty, tilemap.tileWidth, tilemap.tileHeight)
          else {
            this.ctx.fillStyle = '#20314d'
            this.ctx.fillRect(tx, ty, tilemap.tileWidth, tilemap.tileHeight)
          }
        }
        if (showDebug) {
          this.ctx.strokeStyle = 'rgba(30, 43, 61, 0.65)'
          this.ctx.lineWidth = 1 / Math.max(0.5, zoom)
          this.ctx.strokeRect(tx, ty, tilemap.tileWidth, tilemap.tileHeight)
        }
        if (showDebug && tilemap.showCollision && tilemap.collision[index]) {
          this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)'
          this.ctx.lineWidth = 2 / Math.max(0.5, zoom)
          this.ctx.strokeRect(tx + 3, ty + 3, Math.max(1, tilemap.tileWidth - 6), Math.max(1, tilemap.tileHeight - 6))
        }
      }
    }
    this.ctx.restore()
  }

  private drawFallbackBox(entity: Entity, transform: TransformComponent, x: number, y: number, width: number, height: number, zoom: number, fill: string) {
    this.registerBounds(entity, transform, width, height, transform.positionMode === 'viewport')
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(transform.rotation)
    this.ctx.scale(transform.scaleX, transform.scaleY)
    this.ctx.fillStyle = fill
    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.75)'
    this.ctx.lineWidth = 1
    this.ctx.fillRect(-width * zoom * transform.anchorX, -height * zoom * transform.anchorY, width * zoom, height * zoom)
    this.ctx.strokeRect(-width * zoom * transform.anchorX, -height * zoom * transform.anchorY, width * zoom, height * zoom)
    this.ctx.restore()
  }

  private drawSpriteDebugFrame(entity: Entity, transform: TransformComponent, sprite: SpriteComponent | undefined, x: number, y: number, zoom: number) {
    if (!sprite || sprite.showDebugFrame === false || !this.shouldShowEntityDebug(entity)) return
    this.ctx.save()
    this.ctx.translate(x + Number(sprite.offsetX || 0) * zoom, y + Number(sprite.offsetY || 0) * zoom)
    this.ctx.rotate(transform.rotation)
    this.ctx.scale(transform.scaleX, transform.scaleY)
    this.ctx.strokeStyle = 'rgba(255, 209, 102, 0.9)'
    this.ctx.lineWidth = Math.max(1, 1.5 * zoom)
    this.ctx.setLineDash([6 * zoom, 4 * zoom])
    this.ctx.strokeRect(-sprite.width * zoom * 0.5, -sprite.height * zoom * 0.5, sprite.width * zoom, sprite.height * zoom)
    this.ctx.restore()
  }

  private drawColliderDebugFrame(entity: Entity, transform: TransformComponent, collider: ColliderComponent | undefined, x: number, y: number, zoom: number) {
    if (!collider || collider.showDebugFrame === false || !this.shouldShowEntityDebug(entity)) return
    if (collider.width <= 0 || collider.height <= 0) return
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(transform.rotation)
    this.ctx.scale(transform.scaleX, transform.scaleY)
    this.ctx.strokeStyle = collider.isTrigger ? 'rgba(168, 85, 247, 0.95)' : 'rgba(0, 209, 255, 0.95)'
    this.ctx.lineWidth = Math.max(1, 2 * zoom)
    this.ctx.setLineDash(collider.isTrigger ? [4 * zoom, 4 * zoom] : [])
    this.ctx.strokeRect(
      (Number(collider.offsetX || 0) - collider.width / 2) * zoom,
      (Number(collider.offsetY || 0) - collider.height / 2) * zoom,
      collider.width * zoom,
      collider.height * zoom
    )
    this.ctx.restore()
  }

  private shouldShowEntityDebug(entity: Entity) {
    return this.debugOverlayVisible && (this.debugOverlayOptions.bounds || this.debugOverlayOptions.colliders) && (!this.isPlaying || this.playDebugEnabled) && entity.debugFrameVisible !== false
  }

  private drawSelections() {
    if (!this.selectedEntityIds.length) return
    this.ctx.save()
    for (const bounds of this.entityBounds) {
      if (!this.selectedEntityIds.includes(bounds.entityId)) continue
      const center = bounds.viewport ? this.viewportPositionFromBounds(bounds) : this.worldToScreen(bounds.x, bounds.y)
      const zoom = bounds.viewport ? 1 : this.camera.zoom
      this.ctx.save()
      this.ctx.translate(center.x, center.y)
      this.ctx.rotate(bounds.rotation)
      this.ctx.scale(bounds.scaleX, bounds.scaleY)
      this.ctx.strokeStyle = bounds.entityId === this.selectedEntityId ? '#ffd166' : '#6ed6ff'
      this.ctx.lineWidth = 2
      this.ctx.setLineDash(bounds.entityId === this.selectedEntityId ? [] : [6, 4])
      this.ctx.strokeRect(-bounds.width * zoom * 0.5, -bounds.height * zoom * 0.5, bounds.width * zoom, bounds.height * zoom)
      this.ctx.restore()
    }
    this.ctx.restore()
  }

  private drawRendererBadge(viewportWidth: number) {
    this.ctx.save()
    this.ctx.font = '12px sans-serif'
    this.ctx.fillStyle = 'rgba(9, 14, 24, 0.72)'
    this.ctx.fillRect(Math.max(8, viewportWidth - 144), 8, 136, 24)
    this.ctx.fillStyle = '#9dd6ff'
    this.ctx.fillText(this.isPlaying ? 'Canvas 2D Preview' : 'Canvas 2D Editor', Math.max(18, viewportWidth - 134), 24)
    this.ctx.restore()
  }

  private registerBounds(entity: Entity, transform: TransformComponent, width: number, height: number, viewport: boolean) {
    this.entityBounds.push({
      entityId: entity.id,
      x: transform.x,
      y: transform.y,
      width,
      height,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
      viewport,
      viewportHorizontal: transform.viewportHorizontal,
      viewportVertical: transform.viewportVertical
    })
  }

  private registerTilemapBounds(entity: Entity, transform: TransformComponent, width: number, height: number) {
    const scaleX = transform.scaleX || 1
    const scaleY = transform.scaleY || 1
    const localCenterX = width * 0.5 * scaleX
    const localCenterY = height * 0.5 * scaleY
    const cos = Math.cos(transform.rotation)
    const sin = Math.sin(transform.rotation)
    this.entityBounds.push({
      entityId: entity.id,
      x: transform.x + localCenterX * cos - localCenterY * sin,
      y: transform.y + localCenterX * sin + localCenterY * cos,
      width,
      height,
      rotation: transform.rotation,
      scaleX,
      scaleY,
      viewport: transform.positionMode === 'viewport',
      viewportHorizontal: transform.viewportHorizontal,
      viewportVertical: transform.viewportVertical
    })
  }

  private registerViewportCenterBounds(entity: Entity, transform: TransformComponent, width: number, height: number) {
    this.entityBounds.push({
      entityId: entity.id,
      x: 0,
      y: 0,
      width,
      height,
      rotation: transform.rotation,
      scaleX: transform.scaleX || 1,
      scaleY: transform.scaleY || 1,
      viewport: true,
      viewportHorizontal: 'center',
      viewportVertical: 'middle'
    })
  }

  private drawPlayModeInteractableHints(scene: Scene) {
    if (!this.isPlaying) return
    const hintIds = this.scriptRuntime.getInteractableHintEntityIds(scene)
    if (!hintIds.length) return
    this.ctx.save()
    for (const id of hintIds) {
      const entity = scene.getEntityById(id)
      if (!entity) continue
      const transform = entity.getComponent<TransformComponent>('Transform')
      const interactable = entity.getComponent<InteractableComponent>('Interactable')
      if (!transform || !interactable?.enabled) continue
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
      const collider = entity.getComponent<ColliderComponent>('Collider')
      const box = this.getInteractableHintBox(sprite, tilemap, collider, transform)
      if (!box) continue
      const center = transform.positionMode === 'viewport'
        ? this.viewportPosition(transform, box.width, box.height, this.options.container.clientWidth, this.options.container.clientHeight)
        : this.worldToScreen(transform.x, transform.y)
      const zoom = transform.positionMode === 'viewport' ? 1 : this.camera.zoom
      this.ctx.save()
      this.ctx.translate(center.x, center.y)
      this.ctx.rotate(transform.rotation)
      this.ctx.scale(transform.scaleX || 1, transform.scaleY || 1)
      this.ctx.fillStyle = 'rgba(255, 200, 87, 0.08)'
      this.ctx.strokeStyle = 'rgba(255, 224, 130, 0.95)'
      this.ctx.lineWidth = Math.max(1, 2 / Math.max(0.5, zoom))
      this.ctx.fillRect(box.x * zoom, box.y * zoom, box.width * zoom, box.height * zoom)
      this.ctx.strokeRect(box.x * zoom, box.y * zoom, box.width * zoom, box.height * zoom)
      if (this.playDebugEnabled) {
        this.ctx.fillStyle = '#ffe9b3'
        this.ctx.font = '12px "Microsoft YaHei", "Segoe UI", sans-serif'
        this.ctx.textAlign = 'left'
        this.ctx.textBaseline = 'bottom'
        this.ctx.fillText('右键交互', box.x * zoom, box.y * zoom - 6)
      }
      this.ctx.restore()
    }
    this.ctx.restore()
  }

  private getInteractableHintBox(
    sprite: SpriteComponent | undefined,
    tilemap: TilemapComponent | undefined,
    collider: ColliderComponent | undefined,
    transform: TransformComponent
  ) {
    if (collider && collider.width > 0 && collider.height > 0) {
      const width = Math.max(1, collider.width)
      const height = Math.max(1, collider.height)
      return {
        x: collider.offsetX - width / 2,
        y: collider.offsetY - height / 2,
        width,
        height
      }
    }
    if (sprite?.visible) {
      const width = Math.max(1, sprite.width)
      const height = Math.max(1, sprite.height)
      return {
        x: -width * transform.anchorX,
        y: -height * transform.anchorY,
        width,
        height
      }
    }
    if (tilemap?.enabled) {
      return {
        x: 0,
        y: 0,
        width: Math.max(1, tilemap.columns * tilemap.tileWidth),
        height: Math.max(1, tilemap.rows * tilemap.tileHeight)
      }
    }
    return null
  }

  private handlePointerDown(event: PointerEvent) {
    this.lastPointerClientX = event.clientX
    this.lastPointerClientY = event.clientY
    if (this.isPlaying && event.button === 0 && this.handleRuntimeUiPointerDown(event)) {
      event.preventDefault()
      return
    }
    const code = `Mouse${event.button}`
    if (!this.pressedActions.has(code)) this.actionsPressedThisFrame.add(code)
    this.pressedActions.add(code)
    if (this.activeTool === 'pan' || event.button === 1) {
      this.pointerPan = { active: true, x: event.clientX, y: event.clientY }
      event.preventDefault()
      return
    }
    if (this.isPlaying) return
    const hit = this.hitTest(event.clientX, event.clientY)
    if (!hit) {
      this.selectedEntityIds = []
      this.selectedEntityId = ''
      this.options.onEntitySelected?.('')
      this.requestRender()
      return
    }
    const additive = event.shiftKey || event.ctrlKey || event.metaKey
    const nextSelection = additive
      ? Array.from(new Set(this.selectedEntityIds.includes(hit) ? this.selectedEntityIds.filter((id) => id !== hit) : [...this.selectedEntityIds, hit]))
      : (this.selectedEntityIds.includes(hit) ? [...this.selectedEntityIds] : [hit])
    this.selectedEntityIds = nextSelection.length ? nextSelection : [hit]
    this.selectedEntityId = hit
    this.options.onEntitySelected?.(hit, additive ? { additive } : { selectedEntityIds: this.selectedEntityIds, primaryId: hit })
    if (this.activeTool === 'move' || this.activeTool === 'scale' || this.activeTool === 'rotate') {
      this.startEditorDrag(event, this.activeTool, hit)
    }
    this.requestRender()
  }

  private handleRuntimeUiPointerDown(event: PointerEvent) {
    if (!this.currentScene) return false
    const hit = this.hitTestRuntimeUi(event.clientX, event.clientY)
    if (!hit) return false
    const { entity, ui, metrics, local } = hit
    if (ui.renderMode === 'html') {
      return this.dispatchHtmlUiPointer(event, entity.id, metrics, local)
    }
    if (ui.mode === 'slider') {
      const min = Number.isFinite(ui.sliderMin) ? ui.sliderMin : 0
      const max = Number.isFinite(ui.sliderMax) ? ui.sliderMax : 1
      const range = Math.max(0.0001, max - min)
      const usableWidth = Math.max(1, metrics.width - 28)
      const ratio = Math.max(0, Math.min(1, (local.x + usableWidth / 2) / usableWidth))
      ui.sliderValue = min + ratio * range
    }
    this.scriptRuntime.handleUiClick(this.currentScene, entity, ui, {
      x: event.clientX,
      y: event.clientY,
      localX: local.x,
      localY: local.y,
      width: metrics.width,
      height: metrics.height
    })
    this.consumeGameCommandRequest()
    const audio = entity.getComponent<AudioComponent>('Audio')
    if (audio?.enabled && audio.clipPath) {
      void this.audioRuntime.playOneShot(audio.clipPath, {
        group: audio.group,
        volume: audio.volume,
        loop: false
      })
    }
    this.requestRender()
    return true
  }

  private hitTestRuntimeUi(clientX: number, clientY: number) {
    if (!this.currentScene) return null
    const point = this.clientToViewport(clientX, clientY)
    const candidates = this.currentScene.entities
      .map((entity) => {
        const transform = entity.getComponent<TransformComponent>('Transform')
        const ui = entity.getComponent<UIComponent>('UI')
        if (!transform || !ui?.enabled) return null
        if (!ui.interactable || (ui.renderMode !== 'html' && ui.mode !== 'button' && ui.mode !== 'slider')) return null
        const metrics = this.resolveUiMetrics(ui)
        const position = this.resolveUiPosition(this.currentScene!, entity, transform, ui, metrics)
        return { entity, transform, ui, metrics, position, zIndex: transform.zIndex ?? 0 }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.zIndex - a!.zIndex))
    for (const candidate of candidates) {
      if (!candidate) continue
      const local = this.screenToUiLocal(point.x, point.y, candidate.position.x, candidate.position.y, candidate.transform)
      if (candidate.ui.renderMode === 'html' || this.shouldHandleUiPointer(candidate.ui, candidate.metrics, local)) {
        return { ...candidate, local }
      }
    }
    return null
  }

  private dispatchHtmlUiPointer(event: PointerEvent, entityId: string, metrics: UiMetrics, local: { x: number; y: number }) {
    const hit = this.getHtmlUiPointerHit(entityId, metrics, local)
    if (!hit) return false
    const { cached, win, target, x, y } = hit
    const init = this.createHtmlUiEventInit(win, event, x, y)
    this.dispatchHtmlUiPointerLike(win, target, 'pointerdown', init)
    this.dispatchHtmlUiMouseLike(win, target, 'mousedown', init)
    const dragSource = this.findHtmlUiDraggableTarget(target)
    if (dragSource) {
      this.dispatchHtmlUiDragLike(win, dragSource, 'dragstart', init)
      this.htmlUiPointer = {
        entityId,
        pointerId: event.pointerId,
        sourceTarget: dragSource,
        lastTarget: null,
        dragActive: true,
        moved: false,
        startX: x,
        startY: y,
        x,
        y
      }
    } else {
      this.htmlUiPointer = {
        entityId,
        pointerId: event.pointerId,
        sourceTarget: target,
        lastTarget: null,
        dragActive: false,
        moved: false,
        startX: x,
        startY: y,
        x,
        y
      }
    }
    cached.snapshotKey = ''
    this.requestRender()
    return true
  }

  private getHtmlUiPointerHit(entityId: string, metrics: UiMetrics, local: { x: number; y: number }) {
    const cached = this.htmlUiCache.get(entityId)
    const doc = cached?.frame.contentDocument
    const win = cached?.frame.contentWindow
    if (!cached || !doc || !win) return null
    const x = Math.max(0, Math.min(metrics.width - 1, local.x + metrics.width / 2))
    const y = Math.max(0, Math.min(metrics.height - 1, local.y + metrics.height / 2))
    const target = doc.elementFromPoint(x, y) || doc.body || doc.documentElement
    return { cached, doc, win, target, x, y }
  }

  private createHtmlUiEventInit(win: Window, event: PointerEvent, x: number, y: number) {
    return {
      bubbles: true,
      cancelable: true,
      view: win,
      clientX: x,
      clientY: y,
      screenX: event.screenX,
      screenY: event.screenY,
      button: event.button,
      buttons: event.buttons || 1,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      pointerId: event.pointerId,
      pointerType: event.pointerType || 'mouse',
      isPrimary: event.isPrimary
    }
  }

  private finishHtmlUiClick(event: PointerEvent, cached: CachedCanvasHtmlUi, win: Window, target: Element, init: ReturnType<Canvas2DRenderer['createHtmlUiEventInit']>, x: number, y: number) {
    this.dispatchHtmlUiPointerLike(win, target, 'pointerup', { ...init, buttons: 0 })
    this.dispatchHtmlUiMouseLike(win, target, 'mouseup', { ...init, buttons: 0 })
    this.dispatchHtmlUiMouseLike(win, target, 'click', init)
    const now = performance.now()
    const distance = Math.hypot(x - cached.lastClickX, y - cached.lastClickY)
    if (now - cached.lastClickAt < 460 && distance < 8) {
      this.dispatchHtmlUiMouseLike(win, target, 'dblclick', init)
      cached.lastClickAt = 0
    } else {
      cached.lastClickAt = now
      cached.lastClickX = x
      cached.lastClickY = y
    }
  }

  private dispatchHtmlUiPointerLike(win: Window, target: Element, type: string, init: Record<string, unknown>) {
    const pointerEventCtor = (win as Window & { PointerEvent?: typeof PointerEvent }).PointerEvent || PointerEvent
    target.dispatchEvent(new pointerEventCtor(type, init as PointerEventInit))
  }

  private dispatchHtmlUiMouseLike(win: Window, target: Element, type: string, init: Record<string, unknown>) {
    const mouseEventCtor = (win as Window & { MouseEvent?: typeof MouseEvent }).MouseEvent || MouseEvent
    target.dispatchEvent(new mouseEventCtor(type, init as MouseEventInit))
  }

  private dispatchHtmlUiDragLike(win: Window, target: Element, type: string, init: Record<string, unknown>) {
    const dragEventCtor = (win as Window & { DragEvent?: typeof DragEvent }).DragEvent || DragEvent
    try {
      target.dispatchEvent(new dragEventCtor(type, init as DragEventInit))
    } catch {
      this.dispatchHtmlUiMouseLike(win, target, type, init)
    }
  }

  private findHtmlUiDraggableTarget(target: Element) {
    return target.closest?.('[draggable="true"], [data-slot]') || null
  }

  private updateHtmlUiPointerDrag(event: PointerEvent) {
    const state = this.htmlUiPointer
    if (!state || !this.currentScene) return false
    const hit = this.hitTestRuntimeUi(event.clientX, event.clientY)
    if (!hit || hit.entity.id !== state.entityId || hit.ui.renderMode !== 'html') return true
    const pointerHit = this.getHtmlUiPointerHit(state.entityId, hit.metrics, hit.local)
    if (!pointerHit) return true
    const { cached, win, target, x, y } = pointerHit
    const init = this.createHtmlUiEventInit(win, event, x, y)
    this.dispatchHtmlUiPointerLike(win, target, 'pointermove', init)
    this.dispatchHtmlUiMouseLike(win, target, 'mousemove', init)
    if (Math.hypot(x - state.startX, y - state.startY) > 6) state.moved = true
    if (state.dragActive && state.moved) {
      const dragTarget = this.findHtmlUiDraggableTarget(target) || target
      if (state.lastTarget && state.lastTarget !== dragTarget) {
        this.dispatchHtmlUiDragLike(win, state.lastTarget, 'dragleave', init)
      }
      if (state.lastTarget !== dragTarget) {
        this.dispatchHtmlUiDragLike(win, dragTarget, 'dragenter', init)
        state.lastTarget = dragTarget
      }
      this.dispatchHtmlUiDragLike(win, dragTarget, 'dragover', init)
    }
    state.x = x
    state.y = y
    cached.snapshotKey = ''
    this.requestRender()
    return true
  }

  private finishHtmlUiPointerDrag(event: PointerEvent) {
    const state = this.htmlUiPointer
    this.htmlUiPointer = null
    if (!state || !this.currentScene) return false
    const hit = this.hitTestRuntimeUi(event.clientX, event.clientY)
    const cachedForFallback = this.htmlUiCache.get(state.entityId)
    const metrics = hit?.entity.id === state.entityId
      ? hit.metrics
      : { width: cachedForFallback?.width || 1, height: cachedForFallback?.height || 1 }
    const local = hit?.entity.id === state.entityId ? hit.local : { x: state.x - metrics.width / 2, y: state.y - metrics.height / 2 }
    const pointerHit = this.getHtmlUiPointerHit(state.entityId, metrics, local)
    if (!pointerHit) return false
    const { cached, win, target, x, y } = pointerHit
    const init = this.createHtmlUiEventInit(win, event, x, y)
    const dropTarget = this.findHtmlUiDraggableTarget(target) || target
    this.dispatchHtmlUiPointerLike(win, target, 'pointerup', { ...init, buttons: 0 })
    this.dispatchHtmlUiMouseLike(win, target, 'mouseup', { ...init, buttons: 0 })
    if (state.dragActive && state.moved) {
      if (state.lastTarget && state.lastTarget !== dropTarget) {
        this.dispatchHtmlUiDragLike(win, state.lastTarget, 'dragleave', init)
      }
      this.dispatchHtmlUiDragLike(win, dropTarget, 'drop', init)
      this.dispatchHtmlUiDragLike(win, state.sourceTarget, 'dragend', init)
    } else {
      if (state.dragActive) this.dispatchHtmlUiDragLike(win, state.sourceTarget, 'dragend', init)
      this.finishHtmlUiClick(event, cached, win, target, init, x, y)
    }
    cached.snapshotKey = ''
    this.requestRender()
    return true
  }

  private handlePointerMove(event: PointerEvent) {
    this.lastPointerClientX = event.clientX
    this.lastPointerClientY = event.clientY
    if (this.htmlUiPointer?.pointerId === event.pointerId && this.updateHtmlUiPointerDrag(event)) {
      event.preventDefault()
      return
    }
    if (this.editorDrag?.active && this.editorDrag.pointerId === event.pointerId) {
      this.updateEditorDrag(event)
      event.preventDefault()
      return
    }
    if (!this.pointerPan.active) return
    const dx = event.clientX - this.pointerPan.x
    const dy = event.clientY - this.pointerPan.y
    this.pointerPan.x = event.clientX
    this.pointerPan.y = event.clientY
    this.camera.x -= dx / this.camera.zoom
    this.camera.y -= dy / this.camera.zoom
    this.requestRender()
    event.preventDefault()
  }

  private handlePointerUp(event: PointerEvent) {
    this.lastPointerClientX = event.clientX
    this.lastPointerClientY = event.clientY
    if (this.htmlUiPointer?.pointerId === event.pointerId) {
      this.finishHtmlUiPointerDrag(event)
      event.preventDefault()
      return
    }
    const code = `Mouse${event.button}`
    if (this.pressedActions.has(code)) this.actionsReleasedThisFrame.add(code)
    this.pressedActions.delete(code)
    this.pointerPan.active = false
    if (this.editorDrag?.pointerId === event.pointerId) {
      this.editorDrag = null
      this.options.onSceneMutated?.()
    }
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault()
    const factor = Math.exp(-event.deltaY * 0.001)
    this.zoomViewportByFactor(event.clientX, event.clientY, factor)
  }

  private hitTest(clientX: number, clientY: number) {
    const point = this.clientToViewport(clientX, clientY)
    for (let i = this.entityBounds.length - 1; i >= 0; i -= 1) {
      const bounds = this.entityBounds[i]
      const center = bounds.viewport ? this.viewportPositionFromBounds(bounds) : this.worldToScreen(bounds.x, bounds.y)
      const zoom = bounds.viewport ? 1 : this.camera.zoom
      const dx = point.x - center.x
      const dy = point.y - center.y
      const cos = Math.cos(-bounds.rotation)
      const sin = Math.sin(-bounds.rotation)
      const localX = (dx * cos - dy * sin) / (bounds.scaleX || 1)
      const localY = (dx * sin + dy * cos) / (bounds.scaleY || 1)
      if (Math.abs(localX) <= bounds.width * zoom * 0.5 && Math.abs(localY) <= bounds.height * zoom * 0.5) return bounds.entityId
    }
    return ''
  }

  private startEditorDrag(event: PointerEvent, mode: EditorDragState['mode'], hitEntityId: string) {
    if (!this.currentScene) return
    const world = this.screenToWorld(event.clientX, event.clientY)
    const ids = (this.selectedEntityIds.length ? this.selectedEntityIds : [hitEntityId])
      .filter((id) => !!this.currentScene?.getEntityById(id)?.getComponent<TransformComponent>('Transform'))
    if (!ids.length) return
    const transforms = new Map<string, { x: number; y: number; scaleX: number; scaleY: number; rotation: number }>()
    let centerX = 0
    let centerY = 0
    for (const id of ids) {
      const transform = this.currentScene.getEntityById(id)?.getComponent<TransformComponent>('Transform')
      if (!transform) continue
      transforms.set(id, { x: transform.x, y: transform.y, scaleX: transform.scaleX, scaleY: transform.scaleY, rotation: transform.rotation })
      centerX += transform.x
      centerY += transform.y
    }
    centerX /= Math.max(1, transforms.size)
    centerY /= Math.max(1, transforms.size)
    this.editorDrag = {
      active: true,
      mode,
      pointerId: event.pointerId,
      startWorldX: world.x,
      startWorldY: world.y,
      centerX,
      centerY,
      startAngle: Math.atan2(world.y - centerY, world.x - centerX),
      entityIds: ids,
      transforms
    }
    this.canvas.setPointerCapture?.(event.pointerId)
  }

  private updateEditorDrag(event: PointerEvent) {
    if (!this.currentScene || !this.editorDrag) return
    const drag = this.editorDrag
    const world = this.screenToWorld(event.clientX, event.clientY)
    const dx = world.x - drag.startWorldX
    const dy = world.y - drag.startWorldY
    const currentDistance = Math.max(1, Math.hypot(world.x - drag.centerX, world.y - drag.centerY))
    const startDistance = Math.max(1, Math.hypot(drag.startWorldX - drag.centerX, drag.startWorldY - drag.centerY))
    const scaleFactor = Math.max(0.05, Math.min(20, currentDistance / startDistance))
    const angleDelta = Math.atan2(world.y - drag.centerY, world.x - drag.centerX) - drag.startAngle
    for (const id of drag.entityIds) {
      const entity = this.currentScene.getEntityById(id)
      const transform = entity?.getComponent<TransformComponent>('Transform')
      const start = drag.transforms.get(id)
      if (!transform || !start) continue
      if (drag.mode === 'move') {
        transform.x = start.x + dx
        transform.y = start.y + dy
      } else if (drag.mode === 'scale') {
        transform.scaleX = start.scaleX * scaleFactor
        transform.scaleY = start.scaleY * scaleFactor
      } else if (drag.mode === 'rotate') {
        transform.rotation = start.rotation + angleDelta
      }
    }
    this.options.onSceneMutated?.()
    this.requestRender()
  }

  private clientToViewport(clientX: number, clientY: number) {
    const rect = this.options.container.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  private worldToScreen(x: number, y: number) {
    return {
      x: this.options.container.clientWidth / 2 + (x - this.camera.x) * this.camera.zoom,
      y: this.options.container.clientHeight / 2 + (y - this.camera.y) * this.camera.zoom
    }
  }

  private screenToWorld(clientX: number, clientY: number) {
    const rect = this.options.container.getBoundingClientRect()
    return {
      x: this.camera.x + (clientX - rect.left - rect.width / 2) / this.camera.zoom,
      y: this.camera.y + (clientY - rect.top - rect.height / 2) / this.camera.zoom
    }
  }

  private viewportPosition(transform: TransformComponent, width: number, height: number, viewportWidth: number, viewportHeight: number, fallbackAnchorX = 0.5, fallbackAnchorY = 0.5) {
    if (transform.positionMode !== 'viewport') {
      return {
        x: viewportWidth * fallbackAnchorX + transform.x,
        y: viewportHeight * fallbackAnchorY + transform.y
      }
    }
    const halfWidth = width * Math.abs(transform.scaleX) * 0.5
    const halfHeight = height * Math.abs(transform.scaleY) * 0.5
    const x = transform.viewportHorizontal === 'left'
      ? transform.x + halfWidth
      : transform.viewportHorizontal === 'right'
        ? viewportWidth - transform.x - halfWidth
        : viewportWidth / 2 + transform.x
    const y = transform.viewportVertical === 'top'
      ? transform.y + halfHeight
      : transform.viewportVertical === 'bottom'
        ? viewportHeight - transform.y - halfHeight
        : viewportHeight / 2 + transform.y
    return { x, y }
  }

  private viewportPositionFromBounds(bounds: EntityBounds) {
    return this.viewportPosition(
      new TransformComponent(bounds.x, bounds.y, bounds.scaleX, bounds.scaleY, bounds.rotation, 0.5, 0.5, 0, 'viewport', bounds.viewportHorizontal, bounds.viewportVertical),
      bounds.width,
      bounds.height,
      this.options.container.clientWidth,
      this.options.container.clientHeight
    )
  }

  private fitImage(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, preserveAspect: boolean) {
    if (!preserveAspect || sourceWidth <= 0 || sourceHeight <= 0) {
      return { x: -targetWidth / 2, y: -targetHeight / 2, width: targetWidth, height: targetHeight }
    }
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
    const width = sourceWidth * scale
    const height = sourceHeight * scale
    return { x: -width / 2, y: -height / 2, width, height }
  }

  private fitBackgroundImage(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, fitMode: 'cover' | 'contain') {
    const scale = fitMode === 'contain'
      ? Math.min(targetWidth / Math.max(1, sourceWidth), targetHeight / Math.max(1, sourceHeight))
      : Math.max(targetWidth / Math.max(1, sourceWidth), targetHeight / Math.max(1, sourceHeight))
    const width = Math.max(1, Math.ceil(sourceWidth * scale))
    const height = Math.max(1, Math.ceil(sourceHeight * scale))
    return { x: -width / 2, y: -height / 2, width, height }
  }

  private resolveUiMetrics(ui: UIComponent): UiMetrics {
    const explicitWidth = this.resolveUiSize(ui.width, this.options.container.clientWidth, ui.minWidth, 180)
    const explicitHeight = this.resolveUiSize(ui.height, this.options.container.clientHeight, ui.minHeight, 48)
    const fontSize = Math.max(10, Number(ui.fontSize || 20))
    const paddingX = Math.max(0, Number(ui.paddingX ?? 14))
    const paddingY = Math.max(0, Number(ui.paddingY ?? 8))
    const lines = this.stripMarkdown(String(ui.text || '')).split(/\r?\n/)
    const longest = Math.max(1, ...lines.map((line) => Array.from(line).length || 1))
    const contentWidth = Math.ceil(longest * fontSize * 0.62)
    const contentHeight = Math.ceil(Math.max(1, lines.length) * fontSize * 1.25)
    const autoWidth = ui.autoWidth || ui.mode === 'button'
    const autoHeight = ui.autoHeight || ui.mode === 'button'
    return {
      width: Math.max(explicitWidth, autoWidth ? contentWidth + paddingX * 2 : explicitWidth),
      height: Math.max(explicitHeight, autoHeight ? contentHeight + paddingY * 2 : explicitHeight)
    }
  }

  private resolveUiPosition(scene: Scene, entity: Entity, transform: TransformComponent, ui: UIComponent, metrics: UiMetrics): UiPosition {
    const parentKey = String(ui.parentId || '').trim()
    if (!parentKey) {
      const position = this.viewportPosition(transform, metrics.width, metrics.height, this.options.container.clientWidth, this.options.container.clientHeight, ui.anchorX, ui.anchorY)
      return { ...position, width: metrics.width, height: metrics.height }
    }
    const parent = scene.entities.find((candidate) => candidate.id === parentKey || candidate.name === parentKey)
    const parentTransform = parent?.getComponent<TransformComponent>('Transform')
    const parentUi = parent?.getComponent<UIComponent>('UI')
    if (!parent || !parentTransform || !parentUi) {
      const position = this.viewportPosition(transform, metrics.width, metrics.height, this.options.container.clientWidth, this.options.container.clientHeight, ui.anchorX, ui.anchorY)
      return { ...position, width: metrics.width, height: metrics.height }
    }

    const parentMetrics = this.resolveUiMetrics(parentUi)
    const parentPosition = this.resolveUiPosition(scene, parent, parentTransform, parentUi, parentMetrics)
    const siblings = scene.entities
      .filter((candidate) => {
        const candidateUi = candidate.getComponent<UIComponent>('UI')
        return candidateUi?.enabled && candidateUi.renderMode !== 'html' && String(candidateUi.parentId || '').trim() === parentKey
      })
      .sort((left, right) => ((left.getTransform()?.zIndex ?? 0) - (right.getTransform()?.zIndex ?? 0)))
    if (parentUi.layout === 'vertical' || parentUi.layout === 'horizontal') {
      const gap = Math.max(0, Number(parentUi.layoutGap ?? 8))
      const sizes = siblings.map((sibling) => this.resolveUiMetrics(sibling.getComponent<UIComponent>('UI')!))
      const index = Math.max(0, siblings.findIndex((sibling) => sibling.id === entity.id))
      if (parentUi.layout === 'vertical') {
        const totalHeight = sizes.reduce((sum, size) => sum + size.height, 0) + Math.max(0, sizes.length - 1) * gap
        const before = sizes.slice(0, index).reduce((sum, size) => sum + size.height, 0) + index * gap
        return {
          x: parentPosition.x + transform.x,
          y: parentPosition.y - totalHeight / 2 + before + metrics.height / 2 + transform.y,
          width: metrics.width,
          height: metrics.height
        }
      }
      const totalWidth = sizes.reduce((sum, size) => sum + size.width, 0) + Math.max(0, sizes.length - 1) * gap
      const before = sizes.slice(0, index).reduce((sum, size) => sum + size.width, 0) + index * gap
      return {
        x: parentPosition.x - totalWidth / 2 + before + metrics.width / 2 + transform.x,
        y: parentPosition.y + transform.y,
        width: metrics.width,
        height: metrics.height
      }
    }
    return {
      x: parentPosition.x + transform.x,
      y: parentPosition.y + transform.y,
      width: metrics.width,
      height: metrics.height
    }
  }

  private screenToUiLocal(screenX: number, screenY: number, centerX: number, centerY: number, transform: TransformComponent) {
    const dx = screenX - centerX
    const dy = screenY - centerY
    const cos = Math.cos(-transform.rotation)
    const sin = Math.sin(-transform.rotation)
    const scaleX = Math.abs(transform.scaleX) > 0.0001 ? transform.scaleX : 1
    const scaleY = Math.abs(transform.scaleY) > 0.0001 ? transform.scaleY : 1
    return {
      x: (dx * cos - dy * sin) / scaleX,
      y: (dx * sin + dy * cos) / scaleY
    }
  }

  private shouldHandleUiPointer(ui: UIComponent, metrics: UiMetrics, local: { x: number; y: number }) {
    const halfHeight = metrics.height / 2
    if (local.y < -halfHeight || local.y > halfHeight) return false
    const transparentButton = ui.mode === 'button' && !this.shouldDrawUiBackground(ui)
    const hitWidth = transparentButton ? this.resolveUiTextHitWidth(ui, metrics) : metrics.width
    return local.x >= -hitWidth / 2 && local.x <= hitWidth / 2
  }

  private shouldDrawUiBackground(ui: UIComponent) {
    return ui.backgroundVisible !== false && this.resolveUiBackgroundAlpha(ui) > 0 && (Number(ui.backgroundColor || 0) !== 0 || String(ui.backgroundTexturePath || '').trim().length > 0)
  }

  private resolveUiBackgroundAlpha(ui: UIComponent) {
    const value = Number(ui.backgroundAlpha)
    if (!Number.isFinite(value)) return ui.mode === 'button' ? 0.95 : 0.78
    return Math.max(0, Math.min(1, value))
  }

  private resolveUiTextHitWidth(ui: UIComponent, metrics: UiMetrics) {
    const fontSize = Math.max(10, Number(ui.fontSize || 20))
    const lines = String(ui.text || '').split(/\r?\n/)
    const longest = lines.reduce((max, line) => Math.max(max, this.estimateUiTextWidth(line, fontSize)), 1)
    const paddingX = Math.max(0, Number(ui.paddingX || 0)) * 2
    return Math.max(1, Math.min(metrics.width, Math.ceil(longest + paddingX)))
  }

  private estimateUiTextWidth(text: string, fontSize: number) {
    const chars = Array.from(text)
    const ascii = chars.filter((char) => char.charCodeAt(0) <= 127).length
    const nonAscii = Math.max(0, chars.length - ascii)
    return ascii * fontSize * 0.58 + nonAscii * fontSize * 0.95
  }

  private resolveUiSize(value: unknown, containerSize: number, minValue: unknown, fallback: number) {
    const raw = typeof value === 'string' ? value.trim() : value
    let resolved = fallback
    if (typeof raw === 'string' && raw.endsWith('%')) {
      const ratio = Number(raw.slice(0, -1)) / 100
      if (Number.isFinite(ratio)) resolved = containerSize * ratio
    } else {
      const numeric = Number(raw)
      if (Number.isFinite(numeric) && numeric > 0) resolved = numeric
    }
    const minRaw = typeof minValue === 'string' ? minValue.trim() : minValue
    const minNumeric = typeof minRaw === 'string' && minRaw.endsWith('%')
      ? containerSize * (Number(minRaw.slice(0, -1)) / 100)
      : Number(minRaw)
    return Math.max(Number.isFinite(minNumeric) ? minNumeric : 1, resolved)
  }

  private stripMarkdown(text: string) {
    return text
      .replace(/[*_`#>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  }

  private measureUiText(text: string, maxWidth: number, fontSize: number) {
    const lines = this.wrapUiText(text, maxWidth, fontSize)
    const width = Math.max(1, ...lines.map((line) => this.ctx.measureText(line).width))
    return { width, height: Math.max(fontSize, lines.length * fontSize * 1.18) }
  }

  private wrapUiText(text: string, maxWidth: number, fontSize: number) {
    const result: string[] = []
    const hardLines = String(text || '').split(/\r?\n/)
    for (const hardLine of hardLines) {
      const source = hardLine || ' '
      let line = ''
      for (const char of Array.from(source)) {
        const next = line + char
        if (line && this.ctx.measureText(next).width > maxWidth) {
          result.push(line)
          line = char
        } else {
          line = next
        }
      }
      result.push(line || ' ')
    }
    return result.slice(0, Math.max(1, Math.floor((this.options.container.clientHeight || 720) / Math.max(1, fontSize))))
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number) {
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2))
    this.ctx.beginPath()
    this.ctx.moveTo(x + r, y)
    this.ctx.lineTo(x + width - r, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    this.ctx.lineTo(x + width, y + height - r)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    this.ctx.lineTo(x + r, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    this.ctx.lineTo(x, y + r)
    this.ctx.quadraticCurveTo(x, y, x + r, y)
    this.ctx.closePath()
  }

  private async resolveImage(texturePath: string): Promise<ImageSource | null> {
    const normalized = String(texturePath || '').trim()
    if (!normalized) return null
    if (!this.imageCache.has(normalized)) {
      this.imageCache.set(normalized, this.resolveImageUncached(normalized))
    }
    const source = await this.imageCache.get(normalized)!
    if (!source) this.imageCache.delete(normalized)
    return source
  }

  private async resolveImageUncached(texturePath: string): Promise<ImageSource | null> {
    const directAtlas = texturePath.match(/^atlas:\/\/(.+)#([\d.]+),([\d.]+),([\d.]+),([\d.]+)$/)
    if (directAtlas) {
      const image = await this.loadHtmlImage(directAtlas[1])
      if (!image) return null
      return {
        image,
        sx: Number(directAtlas[2]) || 0,
        sy: Number(directAtlas[3]) || 0,
        sw: Number(directAtlas[4]) || image.naturalWidth,
        sh: Number(directAtlas[5]) || image.naturalHeight
      }
    }
    const frameRef = parseAtlasFrameRefPath(texturePath)
    if (frameRef) {
      const atlasContent = await this.readTextAsset(frameRef.atlasPath)
      if (!atlasContent) return null
      const atlas = deserializeAtlasAsset(atlasContent)
      return this.resolveImageUncached(buildAtlasFramePath(atlas.atlas, frameRef.frameIndex))
    }
    const image = await this.loadHtmlImage(texturePath)
    if (!image) return null
    return { image, sx: 0, sy: 0, sw: image.naturalWidth || image.width, sh: image.naturalHeight || image.height }
  }

  private async loadHtmlImage(path: string): Promise<HTMLImageElement | null> {
    let src = path
    if (!src.startsWith('data:')) {
      const dataUrl = await useAssetStore().ensurePreview(path).catch(() => '')
      src = dataUrl || `/${path.replace(/^\/+/, '')}`
    }
    return new Promise((resolve) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => {
        this.requestRender()
        resolve(image)
      }
      image.onerror = () => resolve(null)
      image.src = src
    })
  }

  private async readTextAsset(relativePath: string) {
    const normalized = String(relativePath || '').replace(/\\/g, '/')
    if (this.atlasContentCache.has(normalized)) return this.atlasContentCache.get(normalized) || ''
    const project = useProjectStore()
    const result = await window.unu?.readTextAsset?.({ projectRoot: project.rootPath, relativePath: normalized }).catch(() => null)
    const content = result?.content || ''
    if (content) this.atlasContentCache.set(normalized, content)
    return content
  }

  private colorToCss(color: number, alpha = 1) {
    const value = Number(color) || 0
    const r = (value >> 16) & 255
    const g = (value >> 8) & 255
    const b = value & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
}
