import 'pixi.js/unsafe-eval'
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { AnimationComponent } from '../components/AnimationComponent'
import { AudioComponent } from '../components/AudioComponent'
import { BackgroundComponent } from '../components/BackgroundComponent'
import { CameraComponent } from '../components/CameraComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { InteractableComponent } from '../components/InteractableComponent'
import { ScriptComponent } from '../components/ScriptComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TilemapComponent } from '../components/TilemapComponent'
import { TransformComponent } from '../components/TransformComponent'
import { UIComponent } from '../components/UIComponent'
import { Scene } from '../core/Scene'
import { createSampleSceneByName } from '../sampleScene'
import { deserializeScene, serializeScene } from '../serialization/sceneSerializer'
import { ScriptRuntime, type ProjectRuntimeSourceFile, type ScriptConsoleMessage, type ScriptRuntimeError } from '../runtime/ScriptRuntime'
import { InputState } from '../runtime/InputState'
import { AudioRuntime } from '../runtime/AudioRuntime'
import { applySceneAnimation } from '../animation/applyAnimation'
import { buildAtlasFramePath, deserializeAtlasAsset, parseAtlasFrameRefPath } from '../animation/atlasAsset'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import { basicMarkdownToHtml, parseBasicMarkdownLines, sanitizeHtmlContent, stripInlineMarkdown } from './utils/markdown'
import { blendColor, colorToCss, hexToRgba } from './utils/color'
import type { UiMetrics } from './utils/uiMetrics'

interface PixiRendererOptions {
  container: HTMLDivElement
  onEntitySelected?: (entityId: string, options?: { additive?: boolean; selectedEntityIds?: string[]; primaryId?: string }) => void
  onSceneMutated?: () => void
  onRuntimeSceneUpdated?: (scene: Scene | null) => void
  onScriptError?: (error: ScriptRuntimeError) => void
  onConsoleMessage?: (message: ScriptConsoleMessage) => void
}

type EditorTool = 'select' | 'move' | 'scale' | 'rotate' | 'pan'
type GizmoMode = 'none' | 'move' | 'scale' | 'rotate' | 'pan'
interface CameraViewState {
  x: number
  y: number
  zoom: number
}
type CachedWorldNodeKind = 'sprite' | 'tilemap' | 'empty'
type CachedHtmlUiNode = {
  signature: string
  node: HTMLDivElement
  iframe: HTMLIFrameElement | null
  objectUrl: string | null
  scriptObjectUrls: string[]
}

const EMPTY_ENTITY_EDITOR_SIZE = 40
const UI_FONT_FAMILY = 'Microsoft YaHei, SimHei, Noto Sans CJK SC, Segoe UI, PingFang SC, sans-serif'
const UI_MONO_FONT_FAMILY = 'Consolas, Microsoft YaHei, SimHei, monospace'

function estimateUiTextWidth(text: string, fontSize: number) {
  const ascii = (text.match(/[\x00-\x7f]/g) || []).length
  const nonAscii = Math.max(0, text.length - ascii)
  return ascii * fontSize * 0.58 + nonAscii * fontSize * 0.95
}

function worldToLocalPoint(transform: TransformComponent, worldX: number, worldY: number) {
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

export class PixiRenderer {
  private app!: Application
  private readonly root = new Container()
  private readonly backdrop = new Container()
  private readonly world = new Container()
  private readonly playHintOverlay = new Container()
  private readonly ui = new Container()
  private readonly overlay = new Container()
  private readonly htmlUiLayer = document.createElement('div')
  private resizeObserver: ResizeObserver | null = null
  private readonly scriptRuntime = new ScriptRuntime()
  private readonly inputState = new InputState()
  private readonly audioRuntime = new AudioRuntime()
  private sourceScene: Scene | null = null
  private playScene: Scene | null = null
  private readonly playSceneCache = new Map<string, Scene>()
  private currentScene: Scene | null = null
  private gridVisible = true
  private isPlaying = false
  private isPaused = false
  private playDebugEnabled = false
  private textureCache = new Map<string, Texture>()
  private textureLoadPromises = new Map<string, Promise<Texture | null>>()
  private atlasAssetContentCache = new Map<string, string>()
  private selectedEntityId = ''
  private selectedEntityIds: string[] = []
  private selectionNotifyFrame = 0
  private activeTool: EditorTool = 'select'
  private gizmoMode: GizmoMode = 'none'
  private uiSliderDragEntityId = ''
  private uiSliderWindowMoveHandler: ((event: PointerEvent) => void) | null = null
  private uiSliderWindowUpHandler: ((event: PointerEvent) => void) | null = null
  private dragOffset = { x: 0, y: 0 }
  private scaleState = { startPointerX: 0, startPointerY: 0, startScaleX: 1, startScaleY: 1 }
  private batchGestureStart = {
    pointerWorldX: 0,
    pointerWorldY: 0,
    pointerGlobalX: 0,
    pointerGlobalY: 0,
    transforms: new Map<string, { x: number; y: number; scaleX: number; scaleY: number; rotation: number }>()
  }
  private rotateState = { centerX: 0, centerY: 0, startAngle: 0 }
  private panState = { lastX: 0, lastY: 0 }
  private renderVersion = 0
  private renderInFlight: Promise<void> | null = null
  private queuedScene: Scene | null = null
  private cachedSceneRef: Scene | null = null
  private readonly backdropNodeCache = new Map<string, { signature: string; node: Container }>()
  private readonly worldNodeCache = new Map<string, { kind: CachedWorldNodeKind; signature: string; node: Container }>()
  private readonly uiNodeCache = new Map<string, { signature: string; node: Container }>()
  private readonly htmlUiNodeCache = new Map<string, CachedHtmlUiNode>()
  private readonly htmlUiAssetDataUrlCache = new Map<string, string>()
  private wheelHandler: ((event: WheelEvent) => void) | null = null
  private auxClickHandler: ((event: MouseEvent) => void) | null = null
  private lastViewportWidth = 0
  private lastViewportHeight = 0
  private resizePendingDuringPanelDrag = false
  private readonly layoutResizeEndHandler = () => {
    if (!this.resizePendingDuringPanelDrag) return
    this.resizePendingDuringPanelDrag = false
    this.resizeAndRedraw()
  }
  private readonly htmlUiMessageHandler = (event: MessageEvent) => {
    const data = event.data as { source?: string; entityId?: string; type?: string; payload?: unknown; requestId?: string } | null
    if (!data || data.source !== 'unu-html-ui' || !data.entityId) return
    const cached = this.htmlUiNodeCache.get(data.entityId)
    if (!cached?.iframe || event.source !== cached.iframe.contentWindow) return
    if (data.type === '__unu_asset_url') {
      void this.resolveHtmlUiAssetUrl(data.entityId, String(data.requestId || ''), data.payload)
      return
    }
    if (!this.currentScene) return
    const entity = this.currentScene.getEntityById(data.entityId)
    const ui = entity?.getComponent<UIComponent>('UI')
    if (!entity || !ui) return
    this.scriptRuntime.handleHtmlUiMessage(this.currentScene, entity, ui, {
      type: String(data.type || 'message'),
      payload: data.payload
    })
    this.consumeGameCommandRequest()
    if (!this.isPlaying) void this.renderScene(this.currentScene)
  }
  constructor(private readonly options: PixiRendererOptions) {}

  async init(scene: Scene | null) {
    this.app = new Application()
    await this.app.init({
      background: '#0b0f16',
      resizeTo: this.options.container,
      antialias: false,
      roundPixels: true
    })

    this.root.addChild(this.backdrop)
    this.root.addChild(this.world)
    this.root.addChild(this.playHintOverlay)
    this.root.addChild(this.ui)
    this.root.addChild(this.overlay)
    this.app.stage.addChild(this.root)
    this.options.container.style.position = this.options.container.style.position || 'relative'
    this.options.container.appendChild(this.app.canvas)
    Object.assign(this.app.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block'
    })
    this.app.canvas.style.imageRendering = 'pixelated'
    this.installViewportWheelInteractions()
    this.htmlUiLayer.className = 'unu-html-ui-layer'
    Object.assign(this.htmlUiLayer.style, {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '5'
    })
    this.options.container.appendChild(this.htmlUiLayer)
    window.addEventListener('message', this.htmlUiMessageHandler)

    this.sourceScene = scene
    this.currentScene = scene
    this.inputState.setStorageKey(this.getInputStorageKey())
    this.scriptRuntime.setAudioAdapter({
      playOneShot: async (clipPath, options) => {
        await this.audioRuntime.playOneShot(clipPath, options)
      },
      playEntity: async (target) => {
        await this.audioRuntime.playEntityAudio(target)
      },
      stopEntity: (target) => {
        this.audioRuntime.stopEntityAudio(target.id)
      },
      pauseEntity: (target) => {
        this.audioRuntime.pauseEntityAudio(target.id)
      },
      resumeEntity: (target) => {
        this.audioRuntime.resumeEntityAudio(target.id)
      },
      seekEntity: (target, seconds) => {
        this.audioRuntime.seekEntityAudio(target.id, seconds)
      },
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
    const projectStoreForAudio = useProjectStore()
    this.audioRuntime.setProjectRoot(projectStoreForAudio.rootPath, projectStoreForAudio.mode)
    this.scriptRuntime.setErrorReporter((error) => this.options.onScriptError?.(error))
    this.scriptRuntime.setConsoleReporter((message) => this.options.onConsoleMessage?.(message))
    await this.refreshProjectRuntimeFiles()
    this.inputState.attach()
    this.resizeToContainer(true)
    this.resetCameraTransform()
    this.installStageInteractions()
    this.drawGrid()
    if (scene) await this.renderScene(scene)

    this.resizeObserver = new ResizeObserver(() => {
      if (document.body.classList.contains('is-resizing-panels')) {
        this.resizePendingDuringPanelDrag = true
        return
      }
      this.resizeAndRedraw()
    })
    this.resizeObserver.observe(this.options.container)
    window.addEventListener('unu:layout-resize-end', this.layoutResizeEndHandler)

    const runtimeStore = useRuntimeStore()
    const projectStore = useProjectStore()
    this.app.ticker.add((ticker) => {
      if (!this.currentScene) return
      const collectPerformance = runtimeStore.detailedPerformanceEnabled
      const frameStart = collectPerformance ? performance.now() : 0
      const delta = ticker.deltaMS / 1000
      runtimeStore.setDeltaTime(delta)
      runtimeStore.setPerformanceMetrics({ entityCount: this.currentScene.entities.length })
      const rect = this.options.container.getBoundingClientRect()
      this.inputState.setViewportTransform({
        viewportLeft: rect.left,
        viewportTop: rect.top,
        worldOffsetX: this.world.position.x,
        worldOffsetY: this.world.position.y,
        worldScale: this.world.scale.x || 1
      })
      if (this.isPlaying && !this.isPaused) {
        this.scriptRuntime.setSelectedEntityId(this.selectedEntityId)
        const scriptMetrics = this.scriptRuntime.updateScene(this.currentScene, delta, this.inputState, collectPerformance)
        if (this.consumeGameCommandRequest()) {
          this.inputState.endFrame()
          return
        }
        if (this.consumeSceneSwitchRequest()) {
          this.inputState.endFrame()
          return
        }
        const animationStart = collectPerformance ? performance.now() : 0
        applySceneAnimation(this.currentScene, delta, (event) => {
          projectStore.setStatus(`Animation event: ${event.name} @ frame ${event.frame}`)
        }, this.inputState)
        const animationEnd = collectPerformance ? performance.now() : 0
        const audioStart = collectPerformance ? performance.now() : 0
        const audioSync = this.audioRuntime.syncScene(this.currentScene)
        if (collectPerformance) {
          void audioSync.finally(() => {
            runtimeStore.setPerformanceMetrics({ audioTimeMs: performance.now() - audioStart })
          })
        } else {
          void audioSync
        }
        const cameraStart = collectPerformance ? performance.now() : 0
        this.updateCameraFromScene(this.currentScene)
        const cameraEnd = collectPerformance ? performance.now() : 0
        const renderStart = collectPerformance ? performance.now() : 0
        const renderPromise = this.renderScene(this.currentScene)
        if (collectPerformance) {
          void renderPromise.finally(() => {
            runtimeStore.setPerformanceMetrics({
              frameTimeMs: performance.now() - frameStart,
              renderTimeMs: performance.now() - renderStart,
              scriptTimeMs: scriptMetrics.scriptTimeMs,
              collisionTimeMs: scriptMetrics.collisionTimeMs,
              animationTimeMs: animationEnd - animationStart,
              cameraTimeMs: cameraEnd - cameraStart,
              entityCount: this.currentScene?.entities.length ?? 0
            })
          })
        } else {
          void renderPromise
        }
        this.options.onRuntimeSceneUpdated?.(this.currentScene)
      } else if (this.isPlaying && this.isPaused) {
        this.scriptRuntime.updatePausedScene(this.currentScene, this.inputState)
        this.consumeGameCommandRequest()
        void this.renderScene(this.currentScene)
        this.options.onRuntimeSceneUpdated?.(this.currentScene)
      } else if (collectPerformance) {
        runtimeStore.setPerformanceMetrics({
          frameTimeMs: performance.now() - frameStart,
          entityCount: this.currentScene.entities.length
        })
      }
      this.inputState.endFrame()
    })
  }

  private resizeToContainer(force = false) {
    const width = Math.max(1, Math.floor(this.options.container.clientWidth || 1))
    const height = Math.max(1, Math.floor(this.options.container.clientHeight || 1))
    if (!force && width === this.lastViewportWidth && height === this.lastViewportHeight) return
    this.lastViewportWidth = width
    this.lastViewportHeight = height
    this.app.renderer.resize(width, height)
    this.app.stage.hitArea = this.app.screen
  }

  private getViewportAutoScale() {
    const width = Math.max(1, this.options.container.clientWidth || this.lastViewportWidth || 1)
    const height = Math.max(1, this.options.container.clientHeight || this.lastViewportHeight || 1)
    if (width >= 560 && height >= 360) return 1
    const fitScale = Math.min(width / 960, height / 540)
    return Math.max(0.35, Math.min(1, fitScale))
  }

  private resizeAndRedraw() {
    this.resizeToContainer()
    if (this.currentScene && this.isPlaying) {
      this.updateCameraFromScene(this.currentScene, true)
    }
    this.drawGrid()
    this.drawSelectionGizmo()
    if (this.currentScene) {
      void this.renderScene(this.currentScene)
    }
  }

  private consumeSceneSwitchRequest() {
    const request = this.scriptRuntime.consumeSceneSwitchRequest()
    if (!request) return false
    if (!this.isPlaying) return false
    const normalized = String(request.sceneName).trim()
    if (!normalized) return false

    const runtimeStore = useRuntimeStore()
    runtimeStore.startLoading(`Loading ${normalized}...`)
    const nextSceneTemplate = this.resolveSceneTemplateByName(normalized)
    if (!nextSceneTemplate) {
      runtimeStore.stopLoading()
      useProjectStore().setStatus(`场景切换失败：未找到场景 ${normalized}`)
      return false
    }

    this.audioRuntime.stopAll()
    if (this.playScene) this.scriptRuntime.exitScene(this.playScene)

    if (request.sceneStateMode === 'reset') {
      this.playSceneCache.delete(this.getRuntimeSceneKey(nextSceneTemplate))
    }
    this.playScene = this.getOrCreatePlayScene(nextSceneTemplate)
    this.applyPlayerSpawnPoint(this.playScene, request.targetSpawnId)
    this.currentScene = this.playScene
    this.selectedEntityId = ''
    this.selectedEntityIds = []
    this.scheduleSelectionChanged()
    this.scriptRuntime.setSelectedEntityId('')

    this.scriptRuntime.initScene(this.playScene)
    this.scriptRuntime.startScene(this.playScene)
    this.scriptRuntime.enterScene(this.playScene)
    void this.audioRuntime.syncScene(this.playScene)
    this.updateCameraFromScene(this.playScene)
    this.drawSelectionGizmo()
    void this.renderScene(this.playScene)
    window.setTimeout(() => runtimeStore.stopLoading(), 180)
    useProjectStore().setStatus(`已切换场景：${this.playScene.name}`)
    return true
  }

  private consumeGameCommandRequest() {
    const request = this.scriptRuntime.consumeGameCommandRequest()
    if (!request) return false
    const runtimeStore = useRuntimeStore()
    if (request.type === 'pause') {
      runtimeStore.pause()
      void this.setRuntimeState(true, true, this.sourceScene ?? this.currentScene)
      if (this.currentScene) void this.renderScene(this.currentScene)
      return false
    }
    if (request.type === 'resume') {
      runtimeStore.resume()
      void this.setRuntimeState(true, false, this.sourceScene ?? this.currentScene)
      if (this.currentScene) void this.renderScene(this.currentScene)
      return false
    }
    if (request.type === 'togglePause') {
      runtimeStore.togglePause()
      void this.setRuntimeState(true, runtimeStore.isPaused, this.sourceScene ?? this.currentScene)
      if (this.currentScene) void this.renderScene(this.currentScene)
      return false
    }
    if (request.type === 'reset') {
      runtimeStore.resume()
      void this.setRuntimeState(true, false, this.sourceScene ?? this.currentScene, true)
      return true
    }
    if (request.type === 'exit') {
      runtimeStore.stop()
      void this.setRuntimeState(false, false, this.sourceScene ?? this.currentScene)
      return true
    }
    return false
  }

  private applyPlayerSpawnPoint(scene: Scene, spawnId = '') {
    const normalized = String(spawnId || '').trim()
    if (!normalized) return
    const spawn =
      scene.getEntityById(normalized) ||
      scene.entities.find((entity) => entity.name.trim().toLowerCase() === normalized.toLowerCase()) ||
      null
    const spawnTransform = spawn?.getComponent<TransformComponent>('Transform')
    if (!spawnTransform) return
    const player = scene.entities.find((entity) => entity.name === 'Player') || null
    const playerTransform = player?.getComponent<TransformComponent>('Transform')
    if (!playerTransform) return
    playerTransform.x = spawnTransform.x
    playerTransform.y = spawnTransform.y
    playerTransform.rotation = spawnTransform.rotation
  }

  private resolveSceneTemplateByName(sceneName: string) {
    const normalized = String(sceneName || '').trim()
    if (!normalized) return null

    const match = (value: string) => value.trim().toLowerCase() === normalized.toLowerCase()
    const currentSourceName = this.sourceScene?.name || ''
    if (this.sourceScene && (match(currentSourceName) || match(this.sourceScene.id))) {
      return this.sourceScene
    }

    const sceneStore = useSceneStore()
    const localScene =
      sceneStore.scenes.find((item) => match(item.name)) ||
      sceneStore.scenes.find((item) => match(item.id)) ||
      null
    if (localScene) return localScene

    const projectStore = useProjectStore()
    if (projectStore.isMemoryProject) {
      return createSampleSceneByName(normalized)
    }
    return null
  }

  setGridVisible(visible: boolean) {
    this.gridVisible = visible
    this.drawGrid()
  }

  setPlayDebugEnabled(enabled: boolean) {
    this.playDebugEnabled = !!enabled
    this.drawGrid()
    this.drawSelectionGizmo()
    if (this.currentScene) void this.renderScene(this.currentScene)
  }

  async setRuntimeState(isPlaying: boolean, isPaused: boolean, scene: Scene | null, refreshPlayingScene = false) {
    const wasPlaying = this.isPlaying
    this.sourceScene = scene
    const projectStore = useProjectStore()
    this.audioRuntime.setProjectRoot(projectStore.rootPath, projectStore.mode)

    if (!scene) {
      this.isPlaying = false
      this.isPaused = false
      this.inputState.setMobileControlsVisible(false)
      for (const cachedScene of this.playSceneCache.values()) {
        this.scriptRuntime.destroyScene(cachedScene)
      }
      this.playScene = null
      this.playSceneCache.clear()
      this.scriptRuntime.resetAll()
      this.currentScene = null
      this.cachedSceneRef = null
      this.clearSceneNodeCaches()
      this.audioRuntime.stopAll()
      this.resetCameraTransform()
      this.app.stage.cursor = this.activeTool === 'pan' ? 'grab' : 'default'
      this.drawSelectionGizmo()
      this.options.onRuntimeSceneUpdated?.(null)
      return
    }

    if (!isPlaying) {
      this.isPlaying = false
      this.isPaused = false
      this.inputState.setMobileControlsVisible(false)
      for (const cachedScene of this.playSceneCache.values()) {
        this.scriptRuntime.destroyScene(cachedScene)
      }
      this.audioRuntime.stopAll()
      this.playScene = null
      this.playSceneCache.clear()
      this.scriptRuntime.resetAll()
      this.currentScene = scene
      this.resetAnimations(scene)
      this.resetCameraTransform()
      this.app.stage.cursor = this.activeTool === 'pan' ? 'grab' : 'default'
      this.drawSelectionGizmo()
      void this.renderScene(scene)
      this.options.onRuntimeSceneUpdated?.(null)
      return
    }

    if (!wasPlaying || refreshPlayingScene) {
      await this.refreshProjectRuntimeFiles()
      if (wasPlaying || refreshPlayingScene) {
        for (const cachedScene of this.playSceneCache.values()) {
          this.scriptRuntime.destroyScene(cachedScene)
        }
        this.playSceneCache.clear()
        this.scriptRuntime.resetAll()
      }
      this.playScene = this.getOrCreatePlayScene(scene)
      this.currentScene = this.playScene
      this.scriptRuntime.initScene(this.playScene)
      this.scriptRuntime.startScene(this.playScene)
      this.scriptRuntime.enterScene(this.playScene)
      void this.audioRuntime.syncScene(this.playScene)
      this.updateCameraFromScene(this.playScene)
      void this.renderScene(this.playScene)
    }

    this.isPlaying = true
    this.isPaused = isPaused
    this.inputState.setMobileControlsVisible(true)
    this.app.stage.cursor = 'default'
    this.audioRuntime.setPaused(isPaused)
    if (this.currentScene) {
      void this.audioRuntime.syncScene(this.currentScene)
      this.updateCameraFromScene(this.currentScene)
    }
    this.drawSelectionGizmo()
    this.options.onRuntimeSceneUpdated?.(this.currentScene)
  }

  private getOrCreatePlayScene(template: Scene) {
    const key = this.getRuntimeSceneKey(template)
    const cached = this.playSceneCache.get(key)
    if (cached) return cached
    const scene = deserializeScene(serializeScene(template))
    this.resetAnimations(scene)
    this.playSceneCache.set(key, scene)
    return scene
  }

  private getRuntimeSceneKey(scene: Scene) {
    const id = String(scene.id || '').trim()
    if (id) return `id:${id}`
    return `name:${String(scene.name || '').trim().toLowerCase()}`
  }

  private async refreshProjectRuntimeFiles() {
    const projectStore = useProjectStore()
    const assetStore = useAssetStore()
    const sceneStore = useSceneStore()
    const scriptRuntimePath = 'assets/scripts/ScriptRuntime.ts'
    const inputRuntimePath = 'assets/scripts/InputState.ts'
    const audioRuntimePath = 'assets/scripts/AudioRuntime.ts'
    this.inputState.setStorageKey(this.getInputStorageKey())
    if (!window.unu?.readTextAsset || !projectStore.rootPath || projectStore.isMemoryProject) {
      this.scriptRuntime.setProjectRuntimeSource('', scriptRuntimePath)
      this.inputState.setProjectRuntimeSource('', inputRuntimePath)
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
        if (scriptPath && isLoadableProjectScriptPath(scriptPath)) {
          sceneScriptPaths.add(scriptPath)
        }
      }
    }
    for (const scene of sceneStore.scenes) collectSceneScriptPaths(scene)
    collectSceneScriptPaths(sceneStore.currentScene)
    collectSceneScriptPaths(this.sourceScene)
    collectSceneScriptPaths(this.currentScene)
    const projectScriptPaths = [scriptRuntimePath, ...discoveredProjectScriptPaths]
      .concat(Array.from(sceneScriptPaths))
      .filter((path, index, list) => list.indexOf(path) === index)
      .sort((left, right) => {
        if (left === scriptRuntimePath) return -1
        if (right === scriptRuntimePath) return 1
        return left.localeCompare(right)
      })
    const [scriptLoaded, inputLoaded, audioLoaded] = await Promise.all([
      Promise.all(
        projectScriptPaths.map((relativePath) => window.unu!.readTextAsset!({
          projectRoot: projectStore.rootPath,
          relativePath
        }).then((result) => result ? {
          path: result.relativePath || relativePath,
          content: result.content || ''
        } : null).catch(() => null))
      ),
      window.unu.readTextAsset({
        projectRoot: projectStore.rootPath,
        relativePath: inputRuntimePath
      }).catch(() => null),
      window.unu.readTextAsset({
        projectRoot: projectStore.rootPath,
        relativePath: audioRuntimePath
      }).catch(() => null)
    ])
    const scriptFiles = (scriptLoaded.filter(Boolean) as ProjectRuntimeSourceFile[])
    this.scriptRuntime.setProjectRuntimeSources(scriptFiles.length ? scriptFiles : [{ path: scriptRuntimePath, content: '' }])
    this.inputState.setProjectRuntimeSource(inputLoaded?.content || '', inputRuntimePath)
    this.audioRuntime.setProjectRuntimeSource(audioLoaded?.content || '', audioRuntimePath)
  }

  private getInputStorageKey() {
    const projectStore = useProjectStore()
    const id = String(projectStore.rootPath || projectStore.name || 'export-web').replace(/\\/g, '/').trim() || 'export-web'
    return `unu:inputActionMap:${id}`
  }

  async hotReloadProjectRuntimeFiles(changedPath = '') {
    await this.refreshProjectRuntimeFiles()
    const projectStore = useProjectStore()
    const label = changedPath ? changedPath.replace(/\\/g, '/') : '项目脚本'
    if (this.currentScene && this.isPlaying) {
      this.scriptRuntime.reloadSceneScripts(this.currentScene)
      void this.audioRuntime.syncScene(this.currentScene)
      projectStore.setStatus(`脚本热重载完成：${label}`)
      return
    }
    projectStore.setStatus(`Scripts reloaded: ${label}. Changes apply on next play.`)
  }

  setSelection(entityId: string) {
    this.setSelections(entityId ? [entityId] : [], entityId)
  }

  setSelections(entityIds: string[], primaryId?: string) {
    const unique = entityIds.map((id) => String(id || '').trim()).filter(Boolean).filter((id, index, list) => list.indexOf(id) === index)
    const primary = String(primaryId || '').trim()
    this.selectedEntityIds = unique
    this.selectedEntityId = primary && unique.includes(primary) ? primary : (unique[unique.length - 1] || '')
    this.scriptRuntime.setSelectedEntityId(this.selectedEntityId)
    this.drawSelectionGizmo()
  }

  setTool(tool: EditorTool) {
    this.activeTool = tool
    this.app.stage.cursor = tool === 'pan' && !this.isPlaying ? 'grab' : 'default'
    this.drawSelectionGizmo()
  }

  private selectEntityFromPointer(entityId: string, event: FederatedPointerEvent) {
    const additive = Boolean((event as unknown as { shiftKey?: boolean }).shiftKey || (event.originalEvent as unknown as PointerEvent | undefined)?.shiftKey)
    const previousPrimary = this.selectedEntityId
    const previousIds = this.selectedEntityIds.join('|')
    if (additive) {
      if (this.selectedEntityIds.includes(entityId)) {
        this.selectedEntityIds = this.selectedEntityIds.filter((id) => id !== entityId)
      } else {
        this.selectedEntityIds = [...this.selectedEntityIds, entityId]
      }
      this.selectedEntityId = this.selectedEntityIds.includes(entityId)
        ? entityId
        : (this.selectedEntityIds[this.selectedEntityIds.length - 1] || '')
    } else if (!this.selectedEntityIds.includes(entityId) || this.selectedEntityIds.length <= 1) {
      this.selectedEntityIds = [entityId]
      this.selectedEntityId = entityId
    } else {
      this.selectedEntityId = entityId
    }
    const nextIds = this.selectedEntityIds.join('|')
    if (previousPrimary === this.selectedEntityId && previousIds === nextIds) return
    this.scriptRuntime.setSelectedEntityId(this.selectedEntityId)
    this.scheduleSelectionChanged(additive)
  }

  private captureBatchGestureStart(event: FederatedPointerEvent) {
    const worldPoint = event.getLocalPosition(this.world)
    this.captureBatchGestureStartFromPoints(worldPoint.x, worldPoint.y, event.global.x, event.global.y)
  }

  private captureBatchGestureStartFromPoints(pointerWorldX: number, pointerWorldY: number, pointerGlobalX: number, pointerGlobalY: number) {
    this.batchGestureStart.pointerWorldX = pointerWorldX
    this.batchGestureStart.pointerWorldY = pointerWorldY
    this.batchGestureStart.pointerGlobalX = pointerGlobalX
    this.batchGestureStart.pointerGlobalY = pointerGlobalY
    this.batchGestureStart.transforms.clear()
    if (!this.currentScene) return
    const ids = this.selectedEntityIds.length ? this.selectedEntityIds : (this.selectedEntityId ? [this.selectedEntityId] : [])
    for (const id of ids) {
      const transform = this.currentScene.getEntityById(id)?.getComponent<TransformComponent>('Transform')
      if (!transform) continue
      this.batchGestureStart.transforms.set(id, {
        x: transform.x,
        y: transform.y,
        scaleX: transform.scaleX,
        scaleY: transform.scaleY,
        rotation: transform.rotation
      })
    }
  }

  private installViewportWheelInteractions() {
    this.wheelHandler = (event: WheelEvent) => {
      if (this.isPlaying) {
        return
      }
      event.preventDefault()
      this.zoomViewportAt(event.clientX, event.clientY, event.deltaY)
    }
    this.auxClickHandler = (event: MouseEvent) => {
      if (event.button !== 1) return
      event.preventDefault()
    }
    this.app.canvas.addEventListener('wheel', this.wheelHandler, { passive: false })
    this.app.canvas.addEventListener('auxclick', this.auxClickHandler)
  }

  private shouldStartPan(event: { button?: number }) {
    return !this.isPlaying && (this.activeTool === 'pan' || event.button === 1)
  }

  private startPan(globalX: number, globalY: number) {
    this.gizmoMode = 'pan'
    this.panState.lastX = globalX
    this.panState.lastY = globalY
    this.app.stage.cursor = 'grabbing'
  }

  private finishPointerGesture() {
    this.gizmoMode = 'none'
    this.app.stage.cursor = this.activeTool === 'pan' && !this.isPlaying ? 'grab' : 'default'
  }

  private panViewport(dx: number, dy: number) {
    this.world.position.x += dx
    this.world.position.y += dy
    this.overlay.position.x += dx
    this.overlay.position.y += dy
  }

  private worldPointFromGlobal(globalX: number, globalY: number) {
    const scale = this.world.scale.x || 1
    return {
      x: (globalX - this.world.position.x) / scale,
      y: (globalY - this.world.position.y) / scale
    }
  }

  private zoomViewportAt(clientX: number, clientY: number, deltaY: number) {
    const factor = deltaY < 0 ? 1.12 : 1 / 1.12
    this.zoomViewportByFactor(clientX, clientY, factor)
  }

  zoomViewportByFactor(clientX: number, clientY: number, factor: number) {
    if (this.isPlaying) return
    const rect = this.options.container.getBoundingClientRect()
    const pointerX = clientX - rect.left
    const pointerY = clientY - rect.top
    const previousScale = this.world.scale.x || 1
    const nextScale = Math.max(0.15, Math.min(8, previousScale * factor))
    if (Math.abs(nextScale - previousScale) < 0.0001) return

    const worldX = (pointerX - this.world.position.x) / previousScale
    const worldY = (pointerY - this.world.position.y) / previousScale
    const nextX = pointerX - worldX * nextScale
    const nextY = pointerY - worldY * nextScale
    this.world.scale.set(nextScale)
    this.overlay.scale.set(nextScale)
    this.world.position.set(nextX, nextY)
    this.overlay.position.set(nextX, nextY)
    this.drawGrid()
    this.drawSelectionGizmo()
    if (this.currentScene) void this.renderScene(this.currentScene)
  }

  async renderScene(scene: Scene) {
    this.currentScene = scene
    this.queuedScene = scene
    if (this.renderInFlight) {
      await this.renderInFlight
      return
    }

    this.renderInFlight = this.flushQueuedRenders()
    await this.renderInFlight
  }

  private async flushQueuedRenders() {
    while (this.queuedScene) {
      const scene = this.queuedScene
      this.queuedScene = null
      await this.renderSceneImmediate(scene)
    }
    this.renderInFlight = null
  }

  private async renderSceneImmediate(scene: Scene) {
    this.currentScene = scene
    if (this.cachedSceneRef !== scene) {
      this.clearSceneNodeCaches()
      this.cachedSceneRef = scene
    }
    const version = ++this.renderVersion
    const backdropNodes: Container[] = []
    const worldNodes: Container[] = []
    const uiNodes: Container[] = []
    const cameraView = this.getSceneCameraView(scene)
    const activeBackdropIds = new Set<string>()
    const activeWorldIds = new Set<string>()
    const activeUiIds = new Set<string>()
    const activeHtmlUiIds = new Set<string>()
    const uiMetrics = this.buildUiMetrics(scene)

    for (const entity of scene.entities) {
      const transform = entity.getComponent<TransformComponent>('Transform')
      const ui = entity.getComponent<UIComponent>('UI')
      const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const collider = entity.getComponent<ColliderComponent>('Collider')
      const background = entity.getComponent<BackgroundComponent>('Background')
      if (!transform) continue

      if (ui?.enabled) {
        const metrics = uiMetrics.get(entity.id) || this.resolveUiMetrics(ui)
        if (ui.renderMode === 'html') {
          await this.updateHtmlUiNode(entity, transform, ui, metrics, scene, uiMetrics)
          activeHtmlUiIds.add(entity.id)
          continue
        }
        const uiNode = this.getCachedUiNode(entity, transform, ui, metrics)
        const uiPosition = this.resolveUiPosition(scene, entity, transform, ui, metrics, uiMetrics)
        uiNode.x = uiPosition.x
        uiNode.y = uiPosition.y
        uiNode.rotation = transform.rotation
        uiNode.scale.set(transform.scaleX, transform.scaleY)
        uiNode.zIndex = transform.zIndex ?? 0
        activeUiIds.add(entity.id)
        uiNodes.push(uiNode)
        continue
      }
      if (tilemap?.enabled) {
        const tilemapNode = await this.getCachedTilemapNode(entity.id, entity.name, transform, tilemap, this.shouldShowEntityDebug(entity))
        if (version !== this.renderVersion) return
        const viewportPosition = transform.positionMode === 'viewport'
          ? this.resolveViewportPosition(transform, tilemap.columns * tilemap.tileWidth, tilemap.rows * tilemap.tileHeight, 0, 0)
          : null
        tilemapNode.x = viewportPosition?.x ?? transform.x
        tilemapNode.y = viewportPosition?.y ?? transform.y
        tilemapNode.rotation = transform.rotation
        tilemapNode.scale.set(transform.scaleX, transform.scaleY)
        tilemapNode.zIndex = transform.zIndex ?? 0
        activeWorldIds.add(entity.id)
        if (viewportPosition) uiNodes.push(tilemapNode)
        else worldNodes.push(tilemapNode)
        continue
      }
      if (!sprite) {
        if (!this.isPlaying || this.playDebugEnabled) {
          const emptyNode = this.getCachedEmptyEntityNode(entity, transform)
          const viewportPosition = transform.positionMode === 'viewport'
            ? this.resolveViewportPosition(transform, EMPTY_ENTITY_EDITOR_SIZE, EMPTY_ENTITY_EDITOR_SIZE)
            : null
          emptyNode.x = viewportPosition?.x ?? transform.x
          emptyNode.y = viewportPosition?.y ?? transform.y
          emptyNode.rotation = transform.rotation
          emptyNode.scale.set(transform.scaleX, transform.scaleY)
          emptyNode.zIndex = transform.zIndex ?? 0
          activeWorldIds.add(entity.id)
          if (viewportPosition) uiNodes.push(emptyNode)
          else worldNodes.push(emptyNode)
        }
        continue
      }

      const isBackgroundEntity = Boolean(background?.enabled || entity.name === 'Background')
      const shouldFollowCamera = background ? !!background.followCamera : entity.name === 'Background'
      const isCameraBoundBackground = isBackgroundEntity && shouldFollowCamera && !!cameraView
      const node = isCameraBoundBackground
        ? await this.getCachedBackdropNode(
            entity.id,
            sprite,
            {
              targetWidth: this.options.container.clientWidth,
              targetHeight: this.options.container.clientHeight,
              fitMode: background?.fitMode || 'cover'
            },
            transform,
            entity.name,
            this.shouldShowEntityDebug(entity)
          )
        : await this.getCachedWorldSpriteNode(entity, transform, sprite, collider)
      if (version !== this.renderVersion) return

      node.label = entity.id
      const viewportPosition = !isCameraBoundBackground && transform.positionMode === 'viewport'
        ? this.resolveViewportPosition(transform, sprite.width, sprite.height)
        : null
      if (isCameraBoundBackground) {
        // Follow-camera backgrounds are rendered in a dedicated screen-space backdrop layer.
        node.x = this.options.container.clientWidth / 2
        node.y = this.options.container.clientHeight / 2
        activeBackdropIds.add(entity.id)
      } else {
        node.x = viewportPosition?.x ?? transform.x
        node.y = viewportPosition?.y ?? transform.y
      }
      node.rotation = transform.rotation
      node.scale.set(transform.scaleX, transform.scaleY)
      if (!isCameraBoundBackground) {
        node.eventMode = 'none'
        node.interactiveChildren = false
        node.cursor = 'default'
      }
      node.zIndex = isBackgroundEntity ? -100000 + (transform.zIndex ?? 0) : (transform.zIndex ?? 0)

      if (isCameraBoundBackground) {
        backdropNodes.push(node)
      } else {
        activeWorldIds.add(entity.id)
        if (viewportPosition) uiNodes.push(node)
        else worldNodes.push(node)
      }
    }

    if (version !== this.renderVersion) return

    for (const [id, cached] of this.backdropNodeCache.entries()) {
      if (activeBackdropIds.has(id)) continue
      cached.node.destroy({ children: true })
      this.backdropNodeCache.delete(id)
    }
    for (const [id, cached] of this.worldNodeCache.entries()) {
      if (activeWorldIds.has(id)) continue
      cached.node.destroy({ children: true })
      this.worldNodeCache.delete(id)
    }
    for (const [id, cached] of this.uiNodeCache.entries()) {
      if (activeUiIds.has(id)) continue
      cached.node.destroy({ children: true })
      this.uiNodeCache.delete(id)
    }
    for (const [id, cached] of this.htmlUiNodeCache.entries()) {
      if (activeHtmlUiIds.has(id)) continue
      this.revokeHtmlUiObjectUrl(cached)
      cached.node.remove()
      this.htmlUiNodeCache.delete(id)
    }

    this.backdrop.removeChildren()
    backdropNodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach((node) => this.backdrop.addChild(node))

    this.world.removeChildren()
    worldNodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach((node) => this.world.addChild(node))

    this.ui.removeChildren()
    uiNodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach((node) => this.ui.addChild(node))

    this.drawGrid()
    this.drawSelectionGizmo()
  }

  private resolveViewportPosition(
    transform: TransformComponent,
    width = 0,
    height = 0,
    fallbackAnchorX = 0.5,
    fallbackAnchorY = 0.5
  ) {
    const viewportWidth = this.options.container.clientWidth
    const viewportHeight = this.options.container.clientHeight
    if (transform.positionMode !== 'viewport') {
      return {
        x: viewportWidth * fallbackAnchorX + transform.x,
        y: viewportHeight * fallbackAnchorY + transform.y
      }
    }

    const halfWidth = Math.max(0, width * Math.abs(transform.scaleX)) / 2
    const halfHeight = Math.max(0, height * Math.abs(transform.scaleY)) / 2
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

  private setTransformFromViewportPosition(transform: TransformComponent, centerX: number, centerY: number, width = 0, height = 0) {
    const viewportWidth = this.options.container.clientWidth
    const viewportHeight = this.options.container.clientHeight
    const halfWidth = Math.max(0, width * Math.abs(transform.scaleX)) / 2
    const halfHeight = Math.max(0, height * Math.abs(transform.scaleY)) / 2
    transform.x = transform.viewportHorizontal === 'left'
      ? centerX - halfWidth
      : transform.viewportHorizontal === 'right'
        ? viewportWidth - centerX - halfWidth
        : centerX - viewportWidth / 2
    transform.y = transform.viewportVertical === 'top'
      ? centerY - halfHeight
      : transform.viewportVertical === 'bottom'
        ? viewportHeight - centerY - halfHeight
        : centerY - viewportHeight / 2
  }

  private scheduleSelectionChanged(additive = false) {
    if (this.selectionNotifyFrame) window.cancelAnimationFrame(this.selectionNotifyFrame)
    const entityId = this.selectedEntityId
    const selectedEntityIds = [...this.selectedEntityIds]
    this.selectionNotifyFrame = window.requestAnimationFrame(() => {
      this.selectionNotifyFrame = 0
      this.drawSelectionGizmo()
      this.options.onEntitySelected?.(entityId, {
        additive,
        selectedEntityIds,
        primaryId: entityId
      })
    })
  }

  private buildUiMetrics(scene: Scene) {
    const metrics = new Map<string, UiMetrics>()
    for (const entity of scene.entities) {
      const ui = entity.getComponent<UIComponent>('UI')
      if (!ui) continue
      metrics.set(entity.id, this.resolveUiMetrics(ui))
    }
    return metrics
  }

  private resolveUiMetrics(ui: UIComponent): UiMetrics {
    const explicitWidth = this.resolveUiSizeValue(ui.width, 'width', 1)
    const explicitHeight = this.resolveUiSizeValue(ui.height, 'height', 1)
    const paddingX = Math.max(0, Number(ui.paddingX ?? 14))
    const paddingY = Math.max(0, Number(ui.paddingY ?? 8))
    const fontSize = Math.max(10, Number(ui.fontSize || 20))
    const lines = String(ui.text || '').split(/\r?\n/)
    const longest = Math.max(1, ...lines.map((line) => stripInlineMarkdown(line).length || 1))
    const contentWidth = Math.ceil(longest * fontSize * 0.62)
    const contentHeight = Math.ceil(Math.max(1, lines.length) * fontSize * 1.25)
    const minWidth = this.resolveUiSizeValue(ui.minWidth, 'width', 1)
    const minHeight = this.resolveUiSizeValue(ui.minHeight, 'height', 1)
    const autoWidth = ui.autoWidth || ui.mode === 'button'
    const autoHeight = ui.autoHeight || ui.mode === 'button'
    return {
      width: Math.max(minWidth, autoWidth ? Math.max(explicitWidth, contentWidth + paddingX * 2) : explicitWidth),
      height: Math.max(minHeight, autoHeight ? Math.max(explicitHeight, contentHeight + paddingY * 2) : explicitHeight)
    }
  }

  private resolveUiSizeValue(value: unknown, axis: 'width' | 'height', fallback: number) {
    const viewportSize = axis === 'width'
      ? this.options.container.clientWidth
      : this.options.container.clientHeight
    if (typeof value === 'string') {
      const trimmed = value.trim()
      const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)%$/)
      if (percentMatch) return Math.max(1, viewportSize * Number(percentMatch[1]) / 100)
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? Math.max(1, parsed) : fallback
    }
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.max(1, parsed) : fallback
  }

  private resolveUiPosition(
    scene: Scene,
    entity: Scene['entities'][number],
    transform: TransformComponent,
    ui: UIComponent,
    metrics: UiMetrics,
    metricsById: Map<string, UiMetrics>
  ) {
    const parentKey = String(ui.parentId || '').trim()
    if (!parentKey) return this.resolveViewportPosition(transform, metrics.width, metrics.height, ui.anchorX, ui.anchorY)
    const parent = scene.entities.find((candidate) => candidate.id === parentKey || candidate.name === parentKey)
    const parentTransform = parent?.getComponent<TransformComponent>('Transform')
    const parentUi = parent?.getComponent<UIComponent>('UI')
    if (!parent || !parentTransform || !parentUi) {
      return this.resolveViewportPosition(transform, metrics.width, metrics.height, ui.anchorX, ui.anchorY)
    }

    const parentMetrics = metricsById.get(parent.id) || this.resolveUiMetrics(parentUi)
    const parentPosition = this.resolveViewportPosition(parentTransform, parentMetrics.width, parentMetrics.height, parentUi.anchorX, parentUi.anchorY)
    const siblings = scene.entities
      .filter((candidate) => {
        const candidateUi = candidate.getComponent<UIComponent>('UI')
        return candidateUi?.enabled && String(candidateUi.parentId || '').trim() === parentKey
      })
      .sort((left, right) => {
        const lt = left.getComponent<TransformComponent>('Transform')
        const rt = right.getComponent<TransformComponent>('Transform')
        return (lt?.zIndex ?? 0) - (rt?.zIndex ?? 0)
      })
    if (parentUi.layout === 'vertical' || parentUi.layout === 'horizontal') {
      const gap = Math.max(0, Number(parentUi.layoutGap ?? 8))
      const sizes = siblings.map((sibling) => metricsById.get(sibling.id) || this.resolveUiMetrics(sibling.getComponent<UIComponent>('UI')!))
      const index = Math.max(0, siblings.findIndex((sibling) => sibling.id === entity.id))
      if (parentUi.layout === 'vertical') {
        const totalHeight = sizes.reduce((sum, size) => sum + size.height, 0) + Math.max(0, sizes.length - 1) * gap
        const before = sizes.slice(0, index).reduce((sum, size) => sum + size.height, 0) + index * gap
        return {
          x: parentPosition.x + transform.x,
          y: parentPosition.y - totalHeight / 2 + before + metrics.height / 2 + transform.y
        }
      }
      const totalWidth = sizes.reduce((sum, size) => sum + size.width, 0) + Math.max(0, sizes.length - 1) * gap
      const before = sizes.slice(0, index).reduce((sum, size) => sum + size.width, 0) + index * gap
      return {
        x: parentPosition.x - totalWidth / 2 + before + metrics.width / 2 + transform.x,
        y: parentPosition.y + transform.y
      }
    }

    return {
      x: parentPosition.x + transform.x,
      y: parentPosition.y + transform.y
    }
  }

  private createUiNode(entity: Scene['entities'][number], transform: TransformComponent, ui: UIComponent, metrics: UiMetrics) {
    const node = new Container()
    node.label = entity.id
    node.zIndex = transform.zIndex ?? 0
    const uiPosition = this.resolveViewportPosition(transform, metrics.width, metrics.height, ui.anchorX, ui.anchorY)
    node.x = uiPosition.x
    node.y = uiPosition.y
    node.rotation = transform.rotation
    node.scale.set(transform.scaleX, transform.scaleY)
    node.eventMode = 'static'
    if (ui.mode === 'button' || ui.mode === 'slider') {
      node.hitArea = new Rectangle(-metrics.width / 2, -metrics.height / 2, metrics.width, metrics.height)
    }
    node.cursor = (ui.mode === 'button' || ui.mode === 'slider') && ui.interactable ? 'pointer' : 'default'

    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) {
        if ((ui.mode === 'button' || ui.mode === 'slider') && ui.interactable && this.shouldHandleUiPointer(transform, ui, metrics, event)) {
          this.inputState.consumePrimaryPointerPress()
          event.stopPropagation()
        }
        return
      }
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      if (this.activeTool === 'move') {
        this.captureBatchGestureStart(event)
        const global = event.global
        const dragPosition = this.resolveViewportPosition(transform, metrics.width, metrics.height, ui.anchorX, ui.anchorY)
        this.dragOffset.x = global.x - dragPosition.x
        this.dragOffset.y = global.y - dragPosition.y
        this.gizmoMode = 'move'
      }
      this.selectEntityFromPointer(entity.id, event)
      event.stopPropagation()
    })

    if (ui.mode === 'button') {
      const buttonBg = new Graphics()
      buttonBg.roundRect(-metrics.width / 2, -metrics.height / 2, metrics.width, metrics.height, 10)
      const bgAlpha = ui.backgroundColor === 0 ? 0 : 0.95
      buttonBg.fill({ color: ui.backgroundColor, alpha: bgAlpha })
      buttonBg.stroke({ color: 0xffffff, alpha: bgAlpha > 0 ? 0.25 : 0, width: 1.5 })
      node.addChild(buttonBg)
    }

    if (ui.mode === 'slider') {
      node.addChild(this.createSliderUiContent(ui, metrics))
    } else {
      const label = ui.markdownEnabled
        ? this.createMarkdownUiContent(ui, metrics)
        : this.createPlainUiText(ui, metrics)
      node.addChild(label)
    }

    if (ui.mode === 'button' && ui.interactable) {
      node.on('pointertap', (event: FederatedPointerEvent) => {
        if (!this.isPlaying) return
        if (!this.shouldHandleUiPointer(transform, ui, metrics, event)) return
        this.inputState.consumePrimaryPointerPress()
        event.stopPropagation()
        useProjectStore().setStatus(`UI clicked: ${ui.text}`)
        if (this.currentScene) {
          const local = this.resolveUiLocalPoint(transform, metrics, ui, event)
          this.scriptRuntime.handleUiClick(this.currentScene, entity, ui, {
            x: event.global.x,
            y: event.global.y,
            localX: local.x,
            localY: local.y,
            width: metrics.width,
            height: metrics.height
          })
          this.consumeGameCommandRequest()
          void this.renderScene(this.currentScene)
        }
        const audio = entity.getComponent<AudioComponent>('Audio')
        if (audio?.enabled && audio.clipPath) {
          void this.audioRuntime.playOneShot(audio.clipPath, {
            group: audio.group,
            volume: audio.volume,
            loop: false
          })
        }
      })
    }

    if (ui.mode === 'slider' && ui.interactable) {
      const updateSliderFromScreen = (screenX: number, screenY: number) => {
        if (!this.isPlaying || !this.currentScene) return
        const uiPosition = this.resolveViewportPosition(transform, metrics.width, metrics.height, ui.anchorX, ui.anchorY)
        const dx = screenX - uiPosition.x
        const dy = screenY - uiPosition.y
        const cos = Math.cos(-transform.rotation)
        const sin = Math.sin(-transform.rotation)
        const localX = (dx * cos - dy * sin) / (Math.abs(transform.scaleX) > 0.0001 ? transform.scaleX : 1)
        const min = Number.isFinite(ui.sliderMin) ? ui.sliderMin : 0
        const max = Number.isFinite(ui.sliderMax) ? ui.sliderMax : 1
        const range = Math.max(0.0001, max - min)
        const usableWidth = Math.max(1, metrics.width - 28)
        const ratio = Math.max(0, Math.min(1, (localX + usableWidth / 2) / usableWidth))
        ui.sliderValue = min + ratio * range
        this.scriptRuntime.handleUiClick(this.currentScene, entity, ui, {
          x: screenX,
          y: screenY
        })
        this.consumeGameCommandRequest()
        void this.renderScene(this.currentScene)
      }
      const updateSlider = (event: FederatedPointerEvent) => {
        this.inputState.consumePrimaryPointerPress()
        updateSliderFromScreen(event.global.x, event.global.y)
        event.stopPropagation()
      }
      const stopWindowDrag = () => {
        if (this.uiSliderWindowMoveHandler) window.removeEventListener('pointermove', this.uiSliderWindowMoveHandler)
        if (this.uiSliderWindowUpHandler) window.removeEventListener('pointerup', this.uiSliderWindowUpHandler)
        this.uiSliderWindowMoveHandler = null
        this.uiSliderWindowUpHandler = null
        if (this.uiSliderDragEntityId === entity.id) this.uiSliderDragEntityId = ''
      }
      node.on('pointerdown', (event: FederatedPointerEvent) => {
        stopWindowDrag()
        this.uiSliderDragEntityId = entity.id
        updateSlider(event)
        this.uiSliderWindowMoveHandler = (pointerEvent: PointerEvent) => {
          if (this.uiSliderDragEntityId !== entity.id) return
          const rect = this.options.container.getBoundingClientRect()
          updateSliderFromScreen(pointerEvent.clientX - rect.left, pointerEvent.clientY - rect.top)
          pointerEvent.preventDefault()
        }
        this.uiSliderWindowUpHandler = () => stopWindowDrag()
        window.addEventListener('pointermove', this.uiSliderWindowMoveHandler, { passive: false })
        window.addEventListener('pointerup', this.uiSliderWindowUpHandler, { passive: true })
      })
      node.on('pointermove', (event: FederatedPointerEvent) => {
        if (this.uiSliderDragEntityId !== entity.id) return
        updateSlider(event)
      })
      node.on('pointerup', stopWindowDrag)
      node.on('pointerupoutside', stopWindowDrag)
    }

    return node
  }

  private shouldHandleUiPointer(transform: TransformComponent, ui: UIComponent, metrics: UiMetrics, event: FederatedPointerEvent) {
    if (ui.mode !== 'button') return true
    const local = this.resolveUiLocalPoint(transform, metrics, ui, event)
    const halfHeight = metrics.height / 2
    if (local.y < -halfHeight || local.y > halfHeight) return false
    const transparentButton = Number(ui.backgroundColor || 0) === 0
    const hitWidth = transparentButton ? this.resolveUiTextHitWidth(ui, metrics) : metrics.width
    return local.x >= -hitWidth / 2 && local.x <= hitWidth / 2
  }

  private resolveUiLocalPoint(transform: TransformComponent, metrics: UiMetrics, ui: UIComponent, event: FederatedPointerEvent) {
    const uiPosition = this.resolveViewportPosition(transform, metrics.width, metrics.height, ui.anchorX, ui.anchorY)
    const dx = event.global.x - uiPosition.x
    const dy = event.global.y - uiPosition.y
    const cos = Math.cos(-transform.rotation)
    const sin = Math.sin(-transform.rotation)
    const scaleX = Math.abs(transform.scaleX) > 0.0001 ? transform.scaleX : 1
    const scaleY = Math.abs(transform.scaleY) > 0.0001 ? transform.scaleY : 1
    return {
      x: (dx * cos - dy * sin) / scaleX,
      y: (dx * sin + dy * cos) / scaleY
    }
  }

  private resolveUiTextHitWidth(ui: UIComponent, metrics: UiMetrics) {
    const fontSize = Math.max(10, Number(ui.fontSize || 20))
    const text = String(ui.text || '')
    const lines = text.split(/\r?\n/)
    const longest = lines.reduce((max, line) => Math.max(max, estimateUiTextWidth(line, fontSize)), 1)
    const paddingX = Math.max(0, Number(ui.paddingX || 0)) * 2
    return Math.max(1, Math.min(metrics.width, Math.ceil(longest + paddingX)))
  }

  private createSliderUiContent(ui: UIComponent, metrics: UiMetrics) {
    const content = new Container()
    const min = Number.isFinite(ui.sliderMin) ? ui.sliderMin : 0
    const max = Number.isFinite(ui.sliderMax) ? ui.sliderMax : 1
    const range = Math.max(0.0001, max - min)
    const ratio = Math.max(0, Math.min(1, (Number(ui.sliderValue ?? min) - min) / range))
    const usableWidth = Math.max(1, metrics.width - 28)
    const trackHeight = Math.max(6, Math.min(14, metrics.height * 0.22))
    const y = 0
    const track = new Graphics()
    track.roundRect(-usableWidth / 2, y - trackHeight / 2, usableWidth, trackHeight, trackHeight / 2)
    track.fill({ color: ui.backgroundColor, alpha: 0.55 })
    track.stroke({ color: 0xffffff, alpha: 0.28, width: 1 })
    content.addChild(track)

    const fill = new Graphics()
    fill.roundRect(-usableWidth / 2, y - trackHeight / 2, usableWidth * ratio, trackHeight, trackHeight / 2)
    fill.fill({ color: ui.textColor, alpha: 0.9 })
    content.addChild(fill)

    const knobX = -usableWidth / 2 + usableWidth * ratio
    const knobRadius = Math.max(8, Math.min(16, metrics.height * 0.34))
    const knob = new Graphics()
    knob.circle(knobX, y, knobRadius)
    knob.fill({ color: 0xffffff, alpha: 1 })
    knob.stroke({ color: ui.textColor, alpha: 0.85, width: 2 })
    content.addChild(knob)
    return content
  }

  private createPlainUiText(ui: UIComponent, metrics: UiMetrics) {
    const label = new Text({
      text: ui.text,
      style: {
        fill: ui.textColor,
        fontSize: Math.max(10, ui.fontSize),
        fontFamily: UI_FONT_FAMILY,
        align: 'center',
        breakWords: true,
        lineHeight: Math.round(Math.max(10, ui.fontSize) * 1.25),
        wordWrap: true,
        wordWrapWidth: Math.max(1, metrics.width - Math.max(0, ui.paddingX || 0) * 2)
      }
    })
    label.anchor.set(0.5)
    return label
  }

  private createMarkdownUiContent(ui: UIComponent, metrics: UiMetrics) {
    const baseSize = Math.max(10, ui.fontSize)
    const maxWidth = Math.max(1, metrics.width - Math.max(0, ui.paddingX || 0) * 2)
    const content = new Container()
    const lines = parseBasicMarkdownLines(ui.text)
    let y = 0

    for (const line of lines) {
      if (line.kind === 'blank') {
        y += Math.round(baseSize * 0.55)
        continue
      }
      const fontSize = line.kind === 'heading1'
        ? Math.round(baseSize * 1.45)
        : line.kind === 'heading2'
          ? Math.round(baseSize * 1.25)
          : line.kind === 'heading3'
            ? Math.round(baseSize * 1.1)
            : baseSize
      const isCode = line.kind === 'code'
      const isQuote = line.kind === 'quote'
      const textNode = new Text({
        text: line.text,
        style: {
          fill: isQuote ? blendColor(ui.textColor, 0xbfd3ea, 0.45) : ui.textColor,
          fontFamily: isCode ? UI_MONO_FONT_FAMILY : UI_FONT_FAMILY,
          fontSize,
          fontStyle: line.italic ? 'italic' : 'normal',
          fontWeight: line.bold || line.kind.startsWith('heading') ? '700' : '400',
          breakWords: true,
          lineHeight: Math.round(fontSize * 1.25),
          wordWrap: true,
          wordWrapWidth: Math.max(1, maxWidth - (line.indent || 0))
        }
      })
      textNode.x = -maxWidth / 2 + (line.indent || 0)
      textNode.y = y
      content.addChild(textNode)

      if (isQuote) {
        const bar = new Graphics()
        bar.rect(-maxWidth / 2, y + 2, 3, Math.max(fontSize, textNode.height - 4))
        bar.fill({ color: ui.textColor, alpha: 0.45 })
        content.addChild(bar)
      }

      if (isCode) {
        const bg = new Graphics()
        bg.roundRect(textNode.x - 4, y - 2, Math.min(maxWidth, textNode.width + 8), textNode.height + 4, 4)
        bg.fill({ color: ui.backgroundColor, alpha: 0.75 })
        content.addChildAt(bg, Math.max(0, content.children.length - 1))
      }

      y += Math.max(fontSize, textNode.height) + Math.round(baseSize * 0.2)
    }

    content.y = -Math.min(Math.max(1, metrics.height), Math.max(1, y)) / 2
    return content
  }

  private getCachedUiNode(entity: Scene['entities'][number], transform: TransformComponent, ui: UIComponent, metrics: UiMetrics) {
    const signature = [
      ui.mode,
      ui.text,
      ui.fontSize,
      ui.textColor,
      ui.width,
      ui.height,
      metrics.width,
      metrics.height,
      ui.backgroundColor,
      ui.anchorX,
      ui.anchorY,
      ui.interactable,
      ui.onClickScriptPath,
      ui.sliderValue,
      ui.sliderMin,
      ui.sliderMax,
      ui.parentId,
      ui.layout,
      ui.layoutGap,
      ui.paddingX,
      ui.paddingY,
      ui.autoWidth,
      ui.autoHeight,
      ui.minWidth,
      ui.minHeight,
      ui.markdownEnabled,
      ui.enabled,
      transform.zIndex ?? 0,
      transform.positionMode,
      transform.viewportHorizontal,
      transform.viewportVertical
    ].join('|')
    const cached = this.uiNodeCache.get(entity.id)
    if (cached && cached.signature === signature) return cached.node

    const node = this.createUiNode(entity, transform, ui, metrics)
    if (cached) cached.node.destroy({ children: true })
    this.uiNodeCache.set(entity.id, { signature, node })
    return node
  }

  private async updateHtmlUiNode(
    entity: Scene['entities'][number],
    transform: TransformComponent,
    ui: UIComponent,
    metrics: UiMetrics,
    scene: Scene,
    metricsById: Map<string, UiMetrics>
  ) {
    const externalHtml = await this.resolveHtmlUiSource(ui.htmlSourcePath)
    const signature = [
      ui.mode,
      ui.text,
      externalHtml ?? '',
      ui.fontSize,
      ui.textColor,
      ui.width,
      ui.height,
      metrics.width,
      metrics.height,
      ui.backgroundColor,
      ui.interactable,
      ui.onClickScriptPath,
      ui.sliderValue,
      ui.sliderMin,
      ui.sliderMax,
      ui.markdownEnabled,
      ui.renderMode,
      ui.parentId,
      ui.layout,
      ui.layoutGap,
      ui.paddingX,
      ui.paddingY,
      ui.autoWidth,
      ui.autoHeight,
      ui.minWidth,
      ui.minHeight,
      ui.htmlSourcePath,
      ui.htmlUseIframe,
      ui.htmlAllowScripts,
      ui.htmlBridgeEnabled,
      transform.positionMode,
      transform.viewportHorizontal,
      transform.viewportVertical,
      transform.zIndex ?? 0
    ].join('|')
    let cached = this.htmlUiNodeCache.get(entity.id)
      if (!cached) {
      const node = document.createElement('div')
      node.className = 'unu-html-ui-node'
      node.dataset.entityId = entity.id
      node.addEventListener('pointerdown', (event) => {
        if (this.isPlaying) return
        if (this.shouldStartPan(event)) {
          this.startPan(event.clientX, event.clientY)
          event.stopPropagation()
          return
        }
        this.selectedEntityId = entity.id
        this.selectedEntityIds = [entity.id]
        this.scriptRuntime.setSelectedEntityId(entity.id)
        this.scheduleSelectionChanged()
        event.stopPropagation()
      })
      this.htmlUiLayer.appendChild(node)
      cached = { signature: '', node, iframe: null, objectUrl: null, scriptObjectUrls: [] }
      this.htmlUiNodeCache.set(entity.id, cached)
    }

    const node = cached.node
    node.onclick = (event) => {
      if (!this.isPlaying || ui.mode !== 'button' || !ui.interactable) return
      this.inputState.consumePrimaryPointerPress()
      useProjectStore().setStatus(`UI clicked: ${ui.text}`)
      if (this.currentScene) {
        this.scriptRuntime.handleUiClick(this.currentScene, entity, ui, {
          x: event.clientX,
          y: event.clientY
        })
        this.consumeGameCommandRequest()
        void this.renderScene(this.currentScene)
      }
      const audio = entity.getComponent<AudioComponent>('Audio')
      if (audio?.enabled && audio.clipPath) {
        void this.audioRuntime.playOneShot(audio.clipPath, {
          group: audio.group,
          volume: audio.volume,
          loop: false
        })
      }
      event.stopPropagation()
    }
    if (cached.signature !== signature) {
      this.revokeHtmlUiObjectUrl(cached)
      cached.iframe = null
      node.replaceChildren()
      const rawHtml = externalHtml ?? ui.text
      const html = ui.markdownEnabled ? basicMarkdownToHtml(rawHtml) : rawHtml
      const useIframe = ui.htmlUseIframe || ui.htmlAllowScripts || !!ui.htmlSourcePath
      if (useIframe) {
        const iframe = document.createElement('iframe')
        iframe.className = 'unu-html-ui-frame'
        iframe.setAttribute('allowtransparency', 'true')
        iframe.sandbox.add('allow-forms', 'allow-modals', 'allow-popups', 'allow-pointer-lock')
        if (ui.htmlAllowScripts) {
          // Scriptable HTML UI needs the iframe to keep the parent's blob origin so
          // extracted blob scripts can load. The bridge still only exposes postMessage.
          iframe.sandbox.add('allow-scripts', 'allow-same-origin')
        }
        const documentHtml = this.buildHtmlUiDocument(entity, ui, html)
        if (ui.htmlAllowScripts) {
          // Inline scripts are blocked by the editor CSP even inside blob iframes.
          // Convert them to blob script URLs, then allow only blob-loaded scripts via CSP.
          const scriptableHtml = this.prepareScriptableHtmlUiDocument(documentHtml, cached)
          cached.objectUrl = URL.createObjectURL(new Blob([scriptableHtml], { type: 'text/html' }))
          iframe.src = cached.objectUrl
        } else {
          iframe.srcdoc = documentHtml
        }
        Object.assign(iframe.style, {
          width: '100%',
          height: '100%',
          border: '0',
          display: 'block',
          background: 'transparent',
          backgroundColor: 'transparent',
          colorScheme: 'normal',
          pointerEvents: this.isPlaying && ui.interactable ? 'auto' : 'none'
        })
        node.appendChild(iframe)
        cached.iframe = iframe
      } else {
        node.innerHTML = sanitizeHtmlContent(html) || '&nbsp;'
      }
      cached.signature = signature
    }

    const { x, y } = this.resolveUiPosition(scene, entity, transform, ui, metrics, metricsById)
    Object.assign(node.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${Math.max(1, metrics.width)}px`,
      height: `${Math.max(1, metrics.height)}px`,
      boxSizing: 'border-box',
      transform: `translate(-50%, -50%) rotate(${transform.rotation}rad) scale(${transform.scaleX}, ${transform.scaleY})`,
      transformOrigin: 'center center',
      zIndex: String(1000 + (transform.zIndex ?? 0)),
      color: colorToCss(ui.textColor),
      fontSize: `${Math.max(10, ui.fontSize)}px`,
      fontFamily: UI_FONT_FAMILY,
      lineHeight: '1.35',
      overflow: 'auto',
      padding: ui.mode === 'button' ? `${Math.max(0, ui.paddingY || 0)}px ${Math.max(0, ui.paddingX || 0)}px` : '0',
      borderRadius: ui.mode === 'button' ? '10px' : '0',
      border: ui.mode === 'button' ? '1px solid rgba(255,255,255,0.28)' : '0',
      background: ui.mode === 'button' ? hexToRgba(ui.backgroundColor, 0.95) : 'transparent',
      pointerEvents: this.resolveHtmlUiPointerEvents(ui),
      cursor: ui.mode === 'button' && ui.interactable ? 'pointer' : 'default'
    })
    if (cached.iframe) {
      cached.iframe.width = String(Math.max(1, Math.round(metrics.width)))
      cached.iframe.height = String(Math.max(1, Math.round(metrics.height)))
      Object.assign(cached.iframe.style, {
        width: `${Math.max(1, metrics.width)}px`,
        height: `${Math.max(1, metrics.height)}px`,
        pointerEvents: this.isPlaying && ui.interactable ? 'auto' : 'none'
      })
      this.postHtmlMessageToEntity(entity.id, {
        type: '__unu_resize',
        width: Math.max(1, metrics.width),
        height: Math.max(1, metrics.height)
      })
    }
  }

  private resolveHtmlUiPointerEvents(ui: UIComponent) {
    if (!this.isPlaying) return 'auto'
    return ui.interactable ? 'auto' : 'none'
  }

  private async resolveHtmlUiSource(relativePath: string) {
    const normalized = String(relativePath || '').replace(/\\/g, '/').trim()
    if (!normalized) return null
    const project = useProjectStore()
    if (!window.unu?.readTextAsset) {
      try {
        const response = await fetch(normalized)
        return response.ok ? await response.text() : null
      } catch {
        return null
      }
    }
    if (!project.rootPath || project.isMemoryProject) return null
    try {
      const result = await window.unu.readTextAsset({
        projectRoot: project.rootPath,
        relativePath: normalized
      })
      return result?.content ?? null
    } catch (error) {
      project.setStatus(`HTML UI file read failed: ${normalized}`)
      return null
    }
  }

  private async resolveHtmlUiAssetUrl(entityId: string, requestId: string, payload: unknown) {
    const cached = this.htmlUiNodeCache.get(entityId)
    if (!cached?.iframe || !requestId) return
    const path = typeof payload === 'string'
      ? payload
      : payload && typeof payload === 'object' && 'path' in payload
        ? String((payload as { path?: unknown }).path || '')
        : ''
    const dataUrl = await this.readHtmlUiAssetDataUrl(path)
    cached.iframe.contentWindow?.postMessage({
      source: 'unu-game-ui',
      entityId,
      assetRequestId: requestId,
      assetUrl: dataUrl || ''
    }, '*')
  }

  private async readHtmlUiAssetDataUrl(relativePath: string) {
    const normalized = String(relativePath || '').replace(/\\/g, '/').trim()
    if (!normalized) return ''
    if (/^(https?|data|blob):/i.test(normalized)) return normalized
    const project = useProjectStore()
    if (!window.unu?.readAssetDataUrl || !project.rootPath || project.isMemoryProject) return normalized
    const cacheKey = `${project.rootPath}|${normalized}`
    if (this.htmlUiAssetDataUrlCache.has(cacheKey)) {
      return this.htmlUiAssetDataUrlCache.get(cacheKey) || ''
    }
    try {
      const result = await window.unu.readAssetDataUrl({
        projectRoot: project.rootPath,
        relativePath: normalized
      })
      const dataUrl = result?.dataUrl || ''
      if (dataUrl) this.htmlUiAssetDataUrlCache.set(cacheKey, dataUrl)
      return dataUrl
    } catch {
      return ''
    }
  }

  private buildHtmlUiDocument(entity: Scene['entities'][number], ui: UIComponent, html: string) {
    const project = useProjectStore()
    const bridge = ui.htmlBridgeEnabled ? `
<script>
(() => {
  const entityId = ${JSON.stringify(entity.id)};
  const listeners = new Set();
  const pendingAssetRequests = new Map();
  let assetRequestCounter = 0;
  window.UNU = {
    entityId,
    emit(type, payload) {
      window.parent.postMessage({ source: 'unu-html-ui', entityId, type, payload }, '*');
    },
    onMessage(callback) {
      if (typeof callback !== 'function') return () => {};
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    assetUrl(path) {
      return new Promise((resolve) => {
        const requestId = String(++assetRequestCounter);
        pendingAssetRequests.set(requestId, resolve);
        window.parent.postMessage({ source: 'unu-html-ui', entityId, type: '__unu_asset_url', requestId, payload: { path } }, '*');
      });
    }
  };
  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.source === 'unu-game-ui' && data.entityId === entityId && data.assetRequestId) {
      const resolve = pendingAssetRequests.get(String(data.assetRequestId));
      pendingAssetRequests.delete(String(data.assetRequestId));
      if (resolve) resolve(String(data.assetUrl || ''));
      return;
    }
    if (data.source !== 'unu-game-ui' || data.entityId !== entityId) return;
    if (data.message && data.message.type === '__unu_resize') {
      document.documentElement.style.setProperty('--unu-ui-width', String(data.message.width || 0) + 'px');
      document.documentElement.style.setProperty('--unu-ui-height', String(data.message.height || 0) + 'px');
      window.dispatchEvent(new CustomEvent('unu:resize', { detail: data.message }));
    }
    for (const callback of Array.from(listeners)) {
      try { callback(data.message); } catch (error) { console.error(error); }
    }
  });
  document.addEventListener('click', (event) => {
    const target = event.target && event.target.closest ? event.target.closest('[data-unu-action]') : null;
    if (!target) return;
    window.UNU.emit(String(target.getAttribute('data-unu-action') || 'click'), {
      value: target.getAttribute('data-unu-value'),
      text: target.textContent || ''
    });
  });
})();
</script>` : ''
    const baseHref = this.getHtmlUiBaseHref(project.rootPath, ui.htmlSourcePath)
    const transparentFrameStyle = `
<style data-unu-frame-defaults>
  :root { --unu-ui-width: 100vw; --unu-ui-height: 100vh; }
  html, body { width: 100%; height: 100%; margin: 0; background: transparent !important; }
</style>`
    const hasDocument = /<html[\s>]/i.test(html) || /<!doctype/i.test(html)
    if (hasDocument) {
      let withBase = baseHref && !/<base[\s>]/i.test(html)
        ? html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`)
        : html
      withBase = /<head[\s>]/i.test(withBase)
        ? withBase.replace(/<head([^>]*)>/i, `<head$1>${transparentFrameStyle}`)
        : `${transparentFrameStyle}${withBase}`
      return this.injectHtmlUiBridgeBeforeUserScripts(withBase, bridge)
    }
    return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  ${baseHref ? `<base href="${baseHref}">` : ''}
  <style>
    html, body { width: 100%; height: 100%; margin: 0; background: transparent; overflow: auto; }
    body { color: ${colorToCss(ui.textColor)}; font: ${Math.max(8, ui.fontSize)}px/1.35 ${UI_FONT_FAMILY}; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>${bridge}${html || '&nbsp;'}</body>
</html>`
  }

  private injectHtmlUiBridgeBeforeUserScripts(html: string, bridge: string) {
    if (!bridge) return html
    if (/<body[^>]*>/i.test(html)) {
      return html.replace(/<body([^>]*)>/i, `<body$1>${bridge}`)
    }
    if (/<script\b/i.test(html)) {
      return html.replace(/<script\b/i, `${bridge}<script`)
    }
    return `${bridge}${html}`
  }

  private getHtmlUiBaseHref(projectRoot: string, htmlSourcePath: string) {
    const root = String(projectRoot || '').replace(/\\/g, '/').replace(/\/+$/g, '')
    const source = String(htmlSourcePath || '').replace(/\\/g, '/')
    const folder = source.includes('/') ? source.slice(0, source.lastIndexOf('/')) : ''
    if (!root) return folder ? `${folder}/` : ''
    const path = [root, folder].filter(Boolean).join('/')
    return `file:///${path.replace(/^\/+/, '')}/`
  }

  private revokeHtmlUiObjectUrl(cached: CachedHtmlUiNode) {
    if (cached.objectUrl) URL.revokeObjectURL(cached.objectUrl)
    cached.objectUrl = null
    for (const scriptUrl of cached.scriptObjectUrls) URL.revokeObjectURL(scriptUrl)
    cached.scriptObjectUrls = []
  }

  private prepareScriptableHtmlUiDocument(html: string, cached: CachedHtmlUiNode) {
    return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, code) => {
      const attrText = String(attrs || '')
      if (/\bsrc\s*=/i.test(attrText)) return full
      const typeMatch = attrText.match(/\btype\s*=\s*(['"]?)([^'"\s>]+)\1/i)
      const scriptType = String(typeMatch?.[2] || '').toLowerCase()
      if (scriptType && !['text/javascript', 'application/javascript', 'module'].includes(scriptType)) return full
      const scriptUrl = URL.createObjectURL(new Blob([String(code || '')], { type: 'text/javascript' }))
      cached.scriptObjectUrls.push(scriptUrl)
      return `<script${attrText} src="${scriptUrl}"></script>`
    })
  }

  private postHtmlMessageToEntity(entityId: string, message: unknown) {
    const cached = this.htmlUiNodeCache.get(entityId)
    cached?.iframe?.contentWindow?.postMessage({
      source: 'unu-game-ui',
      entityId,
      message
    }, '*')
  }

  private shouldShowEntityDebug(entity: Scene['entities'][number]) {
    return (!this.isPlaying || this.playDebugEnabled) && entity.debugFrameVisible !== false
  }

  private async createTilemapNode(entityId: string, entityName: string, transform: TransformComponent, tilemap: TilemapComponent, showDebug: boolean) {
    const node = new Container()
    node.label = entityId
    node.x = transform.x
    node.y = transform.y
    node.rotation = transform.rotation
    node.scale.set(transform.scaleX, transform.scaleY)
    node.eventMode = 'none'
    node.interactiveChildren = false
    node.cursor = 'default'
    node.zIndex = transform.zIndex ?? 0
    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      if (this.activeTool === 'move') {
        this.captureBatchGestureStart(event)
        if (transform.positionMode === 'viewport') {
          const position = this.resolveViewportPosition(transform, tilemap.columns * tilemap.tileWidth, tilemap.rows * tilemap.tileHeight, 0, 0)
          this.dragOffset.x = event.global.x - position.x
          this.dragOffset.y = event.global.y - position.y
        } else {
          const local = event.getLocalPosition(this.world)
          this.dragOffset.x = local.x - transform.x
          this.dragOffset.y = local.y - transform.y
        }
        this.gizmoMode = 'move'
      }
      this.selectEntityFromPointer(entityId, event)
      event.stopPropagation()
    })

    const graphics = new Graphics()
    const total = Math.max(1, tilemap.columns * tilemap.rows)
    const palette = [0x203246, 0x2a4058, 0x355274, 0x44658d]
    const textureByValue = new Map<number, Texture | null>()

    const textureEntries = Object.entries(tilemap.tileTextureMap || {})
      .map(([key, value]) => ({ key: Number(key), path: String(value || '').trim() }))
      .filter((item) => Number.isFinite(item.key) && item.key > 0 && !!item.path)

    await Promise.all(textureEntries.map(async (item) => {
      const texture = await this.resolveTexture(item.path)
      textureByValue.set(Math.round(item.key), texture)
    }))

    for (let i = 0; i < total; i += 1) {
      const col = i % tilemap.columns
      const row = Math.floor(i / tilemap.columns)
      const x = col * tilemap.tileWidth
      const y = row * tilemap.tileHeight
      const tile = Number(tilemap.tiles[i] ?? 0)
      if (tile > 0) {
        const tileTexture = textureByValue.get(Math.round(tile)) || null
        if (tileTexture) {
          const sprite = new Sprite(tileTexture)
          sprite.x = x + tilemap.tileWidth / 2
          sprite.y = y + tilemap.tileHeight / 2
          sprite.anchor.set(0.5)
          sprite.width = tilemap.tileWidth
          sprite.height = tilemap.tileHeight
          node.addChild(sprite)
        } else {
          graphics.rect(x, y, tilemap.tileWidth, tilemap.tileHeight)
          const color = palette[(tile - 1) % palette.length]
          graphics.fill({ color, alpha: 0.9 })
        }
      }
      if (showDebug) {
        graphics.rect(x, y, tilemap.tileWidth, tilemap.tileHeight)
        graphics.stroke({ color: 0x1e2b3d, alpha: 0.65, width: 1 })
      }
      if (showDebug && tilemap.showCollision && Number(tilemap.collision[i] ?? 0) > 0) {
        graphics.rect(x + 3, y + 3, tilemap.tileWidth - 6, tilemap.tileHeight - 6)
        graphics.stroke({ color: 0xff6b6b, alpha: 0.8, width: 2 })
      }
    }
    node.addChild(graphics)

    if (showDebug) {
      const label = new Text({
        text: `${entityName} (${tilemap.columns}x${tilemap.rows})`,
        style: { fill: '#cde8ff', fontSize: 12 }
      })
      label.x = 0
      label.y = -18
      node.addChild(label)
    }
    return node
  }

  private async getCachedTilemapNode(entityId: string, entityName: string, transform: TransformComponent, tilemap: TilemapComponent, showDebug: boolean) {
    const textureMapSig = Object.entries(tilemap.tileTextureMap || {})
      .map(([key, value]) => `${key}:${String(value || '').trim()}`)
      .sort()
      .join('|')
    const signature = [
      entityName,
      tilemap.enabled,
      tilemap.columns,
      tilemap.rows,
      tilemap.tileWidth,
      tilemap.tileHeight,
      tilemap.showCollision,
      this.isPlaying ? 1 : 0,
      this.playDebugEnabled ? 1 : 0,
      showDebug ? 1 : 0,
      textureMapSig,
      tilemap.tiles.join(','),
      tilemap.collision.join(',')
    ].join('|')
    const cached = this.worldNodeCache.get(entityId)
    if (cached && cached.kind === 'tilemap' && cached.signature === signature) return cached.node

    const node = await this.createTilemapNode(entityId, entityName, transform, tilemap, showDebug)
    if (cached) cached.node.destroy({ children: true })
    this.worldNodeCache.set(entityId, { kind: 'tilemap', signature, node })
    return node
  }

  private installStageInteractions() {
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return

      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        return
      }

      const target = event.target as Container | null
      if (target && target !== this.app.stage && target.label !== 'grid') return

      const worldPoint = this.worldPointFromGlobal(event.global.x, event.global.y)
      const picked = this.pickEntityAt(worldPoint.x, worldPoint.y)
      if (picked) {
        if (this.activeTool === 'move') {
          this.captureBatchGestureStartFromPoints(worldPoint.x, worldPoint.y, event.global.x, event.global.y)
          this.dragOffset.x = worldPoint.x - picked.transform.x
          this.dragOffset.y = worldPoint.y - picked.transform.y
          this.gizmoMode = 'move'
        }
        this.selectEntityFromPointer(picked.id, event)
        return
      }

      this.gizmoMode = 'none'
      if (this.activeTool === 'select') {
        this.selectedEntityId = ''
        this.selectedEntityIds = []
        this.scriptRuntime.setSelectedEntityId('')
        this.scheduleSelectionChanged()
      }
    })
    this.app.stage.on('globalpointermove', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.gizmoMode === 'pan' && !this.isPlaying) {
        const dx = event.global.x - this.panState.lastX
        const dy = event.global.y - this.panState.lastY
        this.panViewport(dx, dy)
        this.panState.lastX = event.global.x
        this.panState.lastY = event.global.y
        return
      }

      if (!this.currentScene) return
      if (this.selectedEntityIds.length > 1 && (this.gizmoMode === 'move' || this.gizmoMode === 'scale' || this.gizmoMode === 'rotate')) {
        const local = event.getLocalPosition(this.world)
        const dxWorld = local.x - this.batchGestureStart.pointerWorldX
        const dyWorld = local.y - this.batchGestureStart.pointerWorldY
        const dxGlobal = event.global.x - this.batchGestureStart.pointerGlobalX
        const dyGlobal = event.global.y - this.batchGestureStart.pointerGlobalY
        const rotationDelta = this.gizmoMode === 'rotate'
          ? Math.atan2(local.y - this.rotateState.centerY, local.x - this.rotateState.centerX) - this.rotateState.startAngle
          : 0
        for (const id of this.selectedEntityIds) {
          const entity = this.currentScene.getEntityById(id)
          const transform = entity?.getComponent<TransformComponent>('Transform')
          const start = this.batchGestureStart.transforms.get(id)
          if (!entity || !transform || !start) continue
          if (this.gizmoMode === 'move') {
            if (transform.positionMode === 'viewport') {
              transform.x = start.x + dxGlobal
              transform.y = start.y + dyGlobal
            } else {
              transform.x = start.x + dxWorld
              transform.y = start.y + dyWorld
            }
          } else {
            if (this.gizmoMode === 'scale') {
              transform.scaleX = Math.max(0.1, start.scaleX + dxWorld / 140)
              transform.scaleY = Math.max(0.1, start.scaleY + dyWorld / 140)
            } else {
              transform.rotation = start.rotation + rotationDelta
            }
          }
        }
        this.options.onSceneMutated?.()
        return
      }
      const entity = this.currentScene.getEntityById(this.selectedEntityId)
      const transform = entity?.getComponent<TransformComponent>('Transform')
      const ui = entity?.getComponent<UIComponent>('UI')
      const sprite = entity?.getComponent<SpriteComponent>('Sprite')
      const tilemap = entity?.getComponent<TilemapComponent>('Tilemap')
      if (!entity || !transform) return
      const isEmptyEditorEntity = !ui?.enabled && !sprite && !tilemap

      if (this.gizmoMode === 'move') {
        if (ui?.enabled) {
          const global = event.global
          const centerX = global.x - this.dragOffset.x
          const centerY = global.y - this.dragOffset.y
          if (transform.positionMode === 'viewport') {
            const metrics = this.resolveUiMetrics(ui)
            this.setTransformFromViewportPosition(transform, centerX, centerY, metrics.width, metrics.height)
          } else {
            const viewportWidth = this.options.container.clientWidth
            const viewportHeight = this.options.container.clientHeight
            transform.x = centerX - viewportWidth * ui.anchorX
            transform.y = centerY - viewportHeight * ui.anchorY
          }
        } else if (transform.positionMode === 'viewport' && (sprite || tilemap || isEmptyEditorEntity)) {
          const global = event.global
          const width = sprite ? sprite.width : tilemap ? tilemap.columns * tilemap.tileWidth : EMPTY_ENTITY_EDITOR_SIZE
          const height = sprite ? sprite.height : tilemap ? tilemap.rows * tilemap.tileHeight : EMPTY_ENTITY_EDITOR_SIZE
          this.setTransformFromViewportPosition(
            transform,
            global.x - this.dragOffset.x,
            global.y - this.dragOffset.y,
            width,
            height
          )
        } else {
          const local = event.getLocalPosition(this.world)
          transform.x = local.x - this.dragOffset.x
          transform.y = local.y - this.dragOffset.y
        }
        if (this.isPlaying) void this.renderScene(this.currentScene)
        else this.options.onSceneMutated?.()
      } else if (this.gizmoMode === 'scale') {
        const local = event.getLocalPosition(this.world)
        const dx = local.x - this.scaleState.startPointerX
        const dy = local.y - this.scaleState.startPointerY
        const baseW = sprite ? sprite.width : (tilemap ? tilemap.columns * tilemap.tileWidth : EMPTY_ENTITY_EDITOR_SIZE)
        const baseH = sprite ? sprite.height : (tilemap ? tilemap.rows * tilemap.tileHeight : EMPTY_ENTITY_EDITOR_SIZE)
        transform.scaleX = Math.max(0.1, this.scaleState.startScaleX + dx / Math.max(40, baseW))
        transform.scaleY = Math.max(0.1, this.scaleState.startScaleY + dy / Math.max(40, baseH))
        if (this.isPlaying) void this.renderScene(this.currentScene)
        else this.options.onSceneMutated?.()
      } else if (this.gizmoMode === 'rotate') {
        const local = event.getLocalPosition(this.world)
        const start = this.batchGestureStart.transforms.get(this.selectedEntityId)
        if (!start) return
        const nextAngle = Math.atan2(local.y - this.rotateState.centerY, local.x - this.rotateState.centerX)
        transform.rotation = start.rotation + (nextAngle - this.rotateState.startAngle)
        if (this.isPlaying) void this.renderScene(this.currentScene)
        else this.options.onSceneMutated?.()
      }
    })
    this.app.stage.on('pointerup', () => {
      this.finishPointerGesture()
    })
    this.app.stage.on('pointerupoutside', () => {
      this.finishPointerGesture()
    })
  }

  private pickEntityAt(x: number, y: number) {
    if (!this.currentScene) return null
    for (let i = this.currentScene.entities.length - 1; i >= 0; i -= 1) {
      const entity = this.currentScene.entities[i]
      const transform = entity.getComponent<TransformComponent>('Transform')
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
      if (!transform) continue
      const local = worldToLocalPoint(transform, x, y)
      if (sprite && sprite.visible) {
        const halfW = sprite.width / 2
        const halfH = sprite.height / 2
        if (local.x >= -halfW && local.x <= halfW && local.y >= -halfH && local.y <= halfH) {
          return { id: entity.id, transform }
        }
      } else if (tilemap?.enabled) {
        const width = tilemap.columns * tilemap.tileWidth
        const height = tilemap.rows * tilemap.tileHeight
        if (local.x >= 0 && local.x <= width && local.y >= 0 && local.y <= height) {
          return { id: entity.id, transform }
        }
      } else {
        const halfW = EMPTY_ENTITY_EDITOR_SIZE / 2
        const halfH = EMPTY_ENTITY_EDITOR_SIZE / 2
        if (local.x >= -halfW && local.x <= halfW && local.y >= -halfH && local.y <= halfH) {
          return { id: entity.id, transform }
        }
      }
    }
    return null
  }

  private async createSpriteNode(
    sprite: SpriteComponent,
    options?: { targetWidth: number; targetHeight: number; fitMode: 'cover' | 'contain' }
  ) {
    const texture = await this.resolveTexture(sprite.texturePath)
    if (texture) {
      const node = new Sprite(texture)
      node.visible = sprite.visible
      node.alpha = sprite.alpha
      node.anchor.set(0.5)
      if (options && options.targetWidth > 0 && options.targetHeight > 0) {
        const sourceWidth = texture.width || sprite.width
        const sourceHeight = texture.height || sprite.height
        const scale = options.fitMode === 'contain'
          ? Math.min(
              options.targetWidth / Math.max(1, sourceWidth),
              options.targetHeight / Math.max(1, sourceHeight)
            )
          : Math.max(
              options.targetWidth / Math.max(1, sourceWidth),
              options.targetHeight / Math.max(1, sourceHeight)
            )
        node.width = Math.max(1, Math.ceil(sourceWidth * scale))
        node.height = Math.max(1, Math.ceil(sourceHeight * scale))
      } else if (sprite.preserveAspect) {
        const sourceWidth = texture.width || sprite.width
        const sourceHeight = texture.height || sprite.height
        const fit = Math.min(sprite.width / Math.max(1, sourceWidth), sprite.height / Math.max(1, sourceHeight))
        node.width = Math.max(1, Math.round(sourceWidth * fit))
        node.height = Math.max(1, Math.round(sourceHeight * fit))
      } else {
        node.width = sprite.width
        node.height = sprite.height
      }
      node.tint = sprite.tint
      node.x = Number(sprite.offsetX || 0)
      node.y = Number(sprite.offsetY || 0)
      return node
    }

    const box = new Graphics()
    box.rect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height)
    const alpha = Math.max(0, Math.min(1, Number(sprite.alpha || 0)))
    box.visible = sprite.visible && alpha > 0
    box.fill({ color: sprite.tint, alpha: sprite.visible ? alpha : 0 })
    box.stroke({ color: 0xffffff, alpha: sprite.visible ? 0.35 * alpha : 0, width: 1 })
    box.x = Number(sprite.offsetX || 0)
    box.y = Number(sprite.offsetY || 0)
    return box
  }

  private async getCachedWorldSpriteNode(
    entity: Scene['entities'][number],
    transform: TransformComponent,
    sprite: SpriteComponent,
    collider: ColliderComponent | undefined
  ) {
    const showDebug = this.shouldShowEntityDebug(entity)
    const signature = [
      entity.name,
      sprite.texturePath,
      sprite.width,
      sprite.height,
      sprite.visible,
      sprite.alpha,
      sprite.tint,
      sprite.preserveAspect,
      sprite.offsetX,
      sprite.offsetY,
      showDebug ? 1 : 0,
      collider ? [collider.width, collider.height, collider.offsetX, collider.offsetY, collider.isTrigger ? 1 : 0].join(',') : 'no-collider'
    ].join('|')

    const cached = this.worldNodeCache.get(entity.id)
    if (cached && cached.kind === 'sprite' && cached.signature === signature) return cached.node

    const node = new Container()
    node.label = entity.id
    node.eventMode = 'none'
    node.interactiveChildren = false
    node.cursor = 'default'
    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      if (this.activeTool === 'move') {
        this.captureBatchGestureStart(event)
        if (transform.positionMode === 'viewport') {
          const position = this.resolveViewportPosition(transform, sprite.width, sprite.height)
          this.dragOffset.x = event.global.x - position.x
          this.dragOffset.y = event.global.y - position.y
        } else {
          const local = event.getLocalPosition(this.world)
          this.dragOffset.x = local.x - transform.x
          this.dragOffset.y = local.y - transform.y
        }
        this.gizmoMode = 'move'
      }
      this.selectEntityFromPointer(entity.id, event)
      event.stopPropagation()
    })

    const textureNode = await this.createSpriteNode(sprite)
    node.addChild(textureNode)

    if (showDebug) {
      const label = new Text({
        text: entity.name,
        style: { fill: '#ffffff', fontSize: 12 }
      })
      label.x = -sprite.width / 2
      label.y = -sprite.height / 2 - 18
      node.addChild(label)
    }

    if (collider && showDebug) {
      const colliderGfx = new Graphics()
      colliderGfx.rect(
        -collider.width / 2 + collider.offsetX,
        -collider.height / 2 + collider.offsetY,
        collider.width,
        collider.height
      )
      colliderGfx.stroke({ color: 0x00d1ff, alpha: 0.9, width: 2 })
      node.addChild(colliderGfx)
    }

    if (cached) cached.node.destroy({ children: true })
    this.worldNodeCache.set(entity.id, { kind: 'sprite', signature, node })
    return node
  }

  private getCachedEmptyEntityNode(entity: Scene['entities'][number], transform: TransformComponent) {
    const showDebug = this.shouldShowEntityDebug(entity)
    const signature = [entity.name, showDebug ? 1 : 0].join('|')
    const cached = this.worldNodeCache.get(entity.id)
    if (cached && cached.kind === 'empty' && cached.signature === signature) return cached.node

    const node = new Container()
    node.label = entity.id
    node.eventMode = 'none'
    node.interactiveChildren = false
    node.cursor = 'default'
    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      if (this.activeTool === 'move') {
        this.captureBatchGestureStart(event)
        if (transform.positionMode === 'viewport') {
          const position = this.resolveViewportPosition(transform, EMPTY_ENTITY_EDITOR_SIZE, EMPTY_ENTITY_EDITOR_SIZE)
          this.dragOffset.x = event.global.x - position.x
          this.dragOffset.y = event.global.y - position.y
        } else {
          const local = event.getLocalPosition(this.world)
          this.dragOffset.x = local.x - transform.x
          this.dragOffset.y = local.y - transform.y
        }
        this.gizmoMode = 'move'
      }
      this.selectEntityFromPointer(entity.id, event)
      event.stopPropagation()
    })

    const marker = new Graphics()
    const half = EMPTY_ENTITY_EDITOR_SIZE / 2
    const markerColor = /spawn/i.test(`${entity.id} ${entity.name}`) ? 0xffc857 : 0x56b6c2
    marker.rect(-half, -half, EMPTY_ENTITY_EDITOR_SIZE, EMPTY_ENTITY_EDITOR_SIZE)
    marker.fill({ color: markerColor, alpha: showDebug ? 0.08 : 0 })
    marker.stroke({ color: markerColor, alpha: showDebug ? 0.9 : 0, width: 2 })
    if (showDebug) {
      marker.moveTo(-half, 0)
      marker.lineTo(half, 0)
      marker.moveTo(0, -half)
      marker.lineTo(0, half)
      marker.stroke({ color: markerColor, alpha: 0.75, width: 1 })
    }
    marker.hitArea = new Rectangle(-half, -half, EMPTY_ENTITY_EDITOR_SIZE, EMPTY_ENTITY_EDITOR_SIZE)
    node.addChild(marker)

    if (showDebug) {
      const label = new Text({
        text: entity.name || entity.id,
        style: { fill: '#ffffff', fontSize: 12 }
      })
      label.x = -half
      label.y = -half - 18
      node.addChild(label)
    }

    if (cached) cached.node.destroy({ children: true })
    this.worldNodeCache.set(entity.id, { kind: 'empty', signature, node })
    return node
  }

  private getSceneCameraView(scene: Scene): CameraViewState | null {
    const cameraEntity = this.findActiveCameraEntity(scene)
    if (!cameraEntity) return null
    const camera = cameraEntity.getComponent<CameraComponent>('Camera')
    const transform = cameraEntity.getComponent<TransformComponent>('Transform')
    if (!camera || !transform) return null
    return {
      x: transform.x,
      y: transform.y,
      zoom: Math.max(0.1, Math.min(5, camera.zoom || 1)) * this.getViewportAutoScale()
    }
  }

  private async resolveTexture(texturePath: string): Promise<Texture | null> {
    if (!texturePath) return null
    if (this.textureCache.has(texturePath)) return this.textureCache.get(texturePath) ?? null
    const pending = this.textureLoadPromises.get(texturePath)
    if (pending) return pending

    const loadPromise = this.resolveTextureUncached(texturePath).finally(() => {
      this.textureLoadPromises.delete(texturePath)
    })
    this.textureLoadPromises.set(texturePath, loadPromise)
    return loadPromise
  }

  private async resolveTextureUncached(texturePath: string): Promise<Texture | null> {
    if (texturePath.startsWith('data:image/')) {
      const texture = await this.loadTextureFromDataUrl(texturePath)
      this.configurePixelTextureSampling(texture)
      this.textureCache.set(texturePath, texture)
      return texture
    }

    if (texturePath.startsWith('atlasframe://')) {
      const texture = await this.resolveAtlasFrameRefTexture(texturePath)
      if (texture) {
        this.configurePixelTextureSampling(texture)
        this.textureCache.set(texturePath, texture)
      }
      return texture
    }

    if (/\.atlas\.json#\d+$/i.test(texturePath)) {
      const texture = await this.resolveAtlasFrameRefTexture(`atlasframe://${texturePath}`)
      if (texture) {
        this.configurePixelTextureSampling(texture)
        this.textureCache.set(texturePath, texture)
      }
      return texture
    }

    if (texturePath.startsWith('atlas://')) {
      const texture = await this.resolveAtlasFrameTexture(texturePath)
      if (texture) {
        this.configurePixelTextureSampling(texture)
        this.textureCache.set(texturePath, texture)
      }
      return texture
    }

    const assets = useAssetStore()
    const project = useProjectStore()
    const dataUrl = assets.previews[texturePath] || await assets.ensurePreview(texturePath)
    if (dataUrl) {
      const texture = await this.loadTextureFromDataUrl(dataUrl)
      this.configurePixelTextureSampling(texture)
      this.textureCache.set(texturePath, texture)
      project.setStatus(`已加载贴图：${texturePath}`)
      return texture
    }

    if (
      !window.unu &&
      window.location.protocol !== 'file:' &&
      !/^https?:\/\//i.test(texturePath) &&
      !texturePath.startsWith('/')
    ) {
      const fromPublic = await this.loadTextureFromUrl(`/${texturePath}`)
      if (fromPublic) {
        this.configurePixelTextureSampling(fromPublic)
        this.textureCache.set(texturePath, fromPublic)
        project.setStatus(`已加载贴图：${texturePath}`)
        return fromPublic
      }
    }
    return null
  }

  private async resolveAtlasFrameRefTexture(texturePath: string): Promise<Texture | null> {
    const ref = parseAtlasFrameRefPath(texturePath)
    if (!ref) return null
    const project = useProjectStore()
    let content = this.atlasAssetContentCache.get(ref.atlasPath) || ''
    if (!content && project.rootPath && window.unu?.readTextAsset) {
      const result = await window.unu.readTextAsset({ projectRoot: project.rootPath, relativePath: ref.atlasPath })
      content = result?.content || ''
    }
    if (!content && typeof fetch === 'function') {
      const candidates = [ref.atlasPath, `/${ref.atlasPath}`]
      for (const candidate of candidates) {
        const response = await fetch(candidate).catch(() => null)
        if (response?.ok) {
          content = await response.text()
          break
        }
      }
    }
    if (!content) return null
    this.atlasAssetContentCache.set(ref.atlasPath, content)
    const atlas = deserializeAtlasAsset(content)
    return this.resolveAtlasFrameTexture(buildAtlasFramePath(atlas.atlas, ref.frameIndex))
  }


  private async loadTextureFromDataUrl(dataUrl: string): Promise<Texture> {
    const image = new Image()
    image.decoding = 'async'
    image.src = dataUrl
    await image.decode().catch(() => {
      if (image.complete) return
      return new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('图片解码失败'))
      })
    })
    return Texture.from(image)
  }

  private async loadTextureFromUrl(url: string): Promise<Texture | null> {
    const image = new Image()
    image.decoding = 'async'
    image.crossOrigin = 'anonymous'
    image.src = url
    try {
      await image.decode()
    } catch {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('图片加载失败'))
      }).catch(() => undefined)
    }
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) return null
    return Texture.from(image)
  }

  private async resolveAtlasFrameTexture(texturePath: string): Promise<Texture | null> {
    const match = texturePath.match(/^atlas:\/\/(.+)#(\d+),(\d+),(\d+),(\d+)$/)
    if (!match) return null
    const [, imagePath, x, y, w, h] = match
    const baseTexture = await this.resolveTexture(imagePath)
    if (!baseTexture) return null
    const frame = new Rectangle(Number(x), Number(y), Number(w), Number(h))
    const texture = new Texture({ source: (baseTexture as unknown as { source: Texture['source'] }).source, frame })
    this.configurePixelTextureSampling(texture)
    return texture
  }

  private configurePixelTextureSampling(texture: Texture) {
    const anyTexture = texture as unknown as {
      source?: { scaleMode?: 'nearest' | 'linear'; antialias?: boolean; style?: { imageRendering?: string } }
    }
    if (anyTexture.source) {
      anyTexture.source.scaleMode = 'nearest'
      anyTexture.source.antialias = false
      if (anyTexture.source.style) anyTexture.source.style.imageRendering = 'pixelated'
    }
  }

  private resetAnimations(scene: Scene) {
    for (const entity of scene.entities) {
      const animation = entity.getComponent<AnimationComponent>('Animation')
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      if (!animation) continue
      animation.elapsed = 0
      animation.currentFrame = 0
      animation.playing = true
      if (animation.stateMachine?.enabled) {
        animation.stateMachine.currentState = animation.stateMachine.initialState || animation.stateMachine.clips[0]?.name || ''
      }
      const activeClip = animation.stateMachine?.enabled
        ? animation.stateMachine.clips.find((clip) => clip.name === animation.stateMachine.currentState) || animation.stateMachine.clips[0]
        : null
      const firstFrame = activeClip?.framePaths[0] || animation.framePaths[0]
      if (sprite && firstFrame) sprite.texturePath = firstFrame
    }
  }

  private updateCameraFromScene(scene: Scene, snapFollow = false) {
    const cameraEntity = this.findActiveCameraEntity(scene)
    if (!cameraEntity) {
      this.resetCameraTransform()
      return
    }

    const camera = cameraEntity.getComponent<CameraComponent>('Camera')
    const cameraTransform = cameraEntity.getComponent<TransformComponent>('Transform')
    if (!camera || !cameraTransform) {
      this.resetCameraTransform()
      return
    }

    if (camera.followEntityId) {
      const target = scene.getEntityById(camera.followEntityId)
      const targetTransform = target?.getComponent<TransformComponent>('Transform')
      if (targetTransform) {
        const desiredX = targetTransform.x + camera.offsetX
        const desiredY = targetTransform.y + camera.offsetY
        const smoothing = Math.max(0, Math.min(1, camera.followSmoothing))
        if (smoothing <= 0 || snapFollow) {
          cameraTransform.x = desiredX
          cameraTransform.y = desiredY
        } else {
          cameraTransform.x += (desiredX - cameraTransform.x) * smoothing
          cameraTransform.y += (desiredY - cameraTransform.y) * smoothing
        }
      }
    }

    const zoom = Math.max(0.1, Math.min(5, camera.zoom || 1)) * this.getViewportAutoScale()
    let camX = cameraTransform.x
    let camY = cameraTransform.y
    if (camera.boundsEnabled) {
      camX = Math.max(camera.minX, Math.min(camera.maxX, camX))
      camY = Math.max(camera.minY, Math.min(camera.maxY, camY))
    }

    const viewWidth = this.options.container.clientWidth
    const viewHeight = this.options.container.clientHeight
    const worldX = viewWidth / 2 - camX * zoom
    const worldY = viewHeight / 2 - camY * zoom
    this.world.scale.set(zoom)
    this.world.position.set(worldX, worldY)
    this.playHintOverlay.scale.set(zoom)
    this.playHintOverlay.position.set(worldX, worldY)
    this.overlay.scale.set(zoom)
    this.overlay.position.set(worldX, worldY)
  }

  private findActiveCameraEntity(scene: Scene) {
    const candidates = scene.entities.filter((entity) => {
      const camera = entity.getComponent<CameraComponent>('Camera')
      const transform = entity.getComponent<TransformComponent>('Transform')
      if (!camera || !transform || !camera.enabled) return false
      // Background entities may carry a camera component for inspector tooling,
      // but they should never drive the runtime viewport camera.
      const background = entity.getComponent<BackgroundComponent>('Background')
      return !background
    })
    if (!candidates.length) return null
    const namedMain = candidates.find((entity) => entity.name === 'MainCamera')
    return namedMain || candidates[0]
  }

  private resetCameraTransform() {
    const zoom = this.getViewportAutoScale()
    this.world.scale.set(zoom)
    this.world.position.set(0, 0)
    this.playHintOverlay.scale.set(zoom)
    this.playHintOverlay.position.set(0, 0)
    this.overlay.scale.set(zoom)
    this.overlay.position.set(0, 0)
  }

  private getEntityEditorBounds(entity: Scene['entities'][number]) {
    const transform = entity.getComponent<TransformComponent>('Transform')
    if (!transform) return null
    const sprite = entity.getComponent<SpriteComponent>('Sprite')
    const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
    const ui = entity.getComponent<UIComponent>('UI')
    if (ui?.enabled) return null

    let boxX = transform.x
    let boxY = transform.y
    let boxWidth = EMPTY_ENTITY_EDITOR_SIZE * Math.abs(transform.scaleX)
    let boxHeight = EMPTY_ENTITY_EDITOR_SIZE * Math.abs(transform.scaleY)

    if (sprite) {
      boxWidth = Math.max(1, sprite.width * Math.abs(transform.scaleX))
      boxHeight = Math.max(1, sprite.height * Math.abs(transform.scaleY))
      boxX = transform.x - boxWidth / 2
      boxY = transform.y - boxHeight / 2
    } else if (tilemap?.enabled) {
      const scaledWidth = tilemap.columns * tilemap.tileWidth * transform.scaleX
      const scaledHeight = tilemap.rows * tilemap.tileHeight * transform.scaleY
      boxX = Math.min(transform.x, transform.x + scaledWidth)
      boxY = Math.min(transform.y, transform.y + scaledHeight)
      boxWidth = Math.max(1, Math.abs(scaledWidth))
      boxHeight = Math.max(1, Math.abs(scaledHeight))
    } else {
      boxWidth = Math.max(1, boxWidth)
      boxHeight = Math.max(1, boxHeight)
      boxX = transform.x - boxWidth / 2
      boxY = transform.y - boxHeight / 2
    }
    return { transform, sprite, tilemap, boxX, boxY, boxWidth, boxHeight }
  }

  private drawSelectionGizmo() {
    this.overlay.removeChildren().forEach((child) => child.destroy())
    this.playHintOverlay.removeChildren().forEach((child) => child.destroy())
    if (!this.currentScene) return
    if (this.isPlaying) {
      this.drawPlayModeInteractableHints(this.currentScene)
      return
    }
    const ids = this.selectedEntityIds.length ? this.selectedEntityIds : (this.selectedEntityId ? [this.selectedEntityId] : [])
    if (!ids.length) return
    let primaryBounds: ReturnType<PixiRenderer['getEntityEditorBounds']> = null
    for (const id of ids) {
      const entity = this.currentScene.getEntityById(id)
      if (!entity) continue
      const bounds = this.getEntityEditorBounds(entity)
      if (!bounds) continue
      if (id === this.selectedEntityId) primaryBounds = bounds
      const box = new Graphics()
      box.rect(bounds.boxX, bounds.boxY, bounds.boxWidth, bounds.boxHeight)
      box.stroke({ color: id === this.selectedEntityId ? 0x56b6c2 : 0x8fdbe4, alpha: id === this.selectedEntityId ? 1 : 0.62, width: id === this.selectedEntityId ? 2 : 1.5 })
      box.eventMode = 'none'
      this.overlay.addChild(box)
    }
    if (!primaryBounds) return
    const { transform, sprite, tilemap, boxX, boxY, boxWidth, boxHeight } = primaryBounds
    const centerX = boxX + boxWidth / 2
    const centerY = boxY + boxHeight / 2

    const center = new Graphics()
    center.moveTo(centerX - 12, centerY)
    center.lineTo(centerX + 12, centerY)
    center.moveTo(centerX, centerY - 12)
    center.lineTo(centerX, centerY + 12)
    center.stroke({ color: 0x56b6c2, alpha: 0.9, width: 2 })
    center.eventMode = 'none'

    this.overlay.addChild(center)

    const editor = useEditorStore()
    if (editor.tool === 'scale') {
      const handleSize = 12
      const handleX = boxX + boxWidth
      const handleY = boxY + boxHeight
      const handle = new Graphics()
      handle.roundRect(handleX - handleSize / 2, handleY - handleSize / 2, handleSize, handleSize, 3)
      handle.fill({ color: 0xf2c94c, alpha: 1 })
      handle.stroke({ color: 0xffffff, alpha: 0.9, width: 1 })
      handle.eventMode = 'static'
      handle.cursor = 'nwse-resize'
      handle.on('pointerdown', (event: FederatedPointerEvent) => {
        event.stopPropagation()
        this.gizmoMode = 'scale'
        this.captureBatchGestureStart(event)
        const local = event.getLocalPosition(this.world)
        this.scaleState = {
          startPointerX: local.x,
          startPointerY: local.y,
          startScaleX: transform.scaleX,
          startScaleY: transform.scaleY
        }
      })
      this.overlay.addChild(handle)
    }
    if (editor.tool === 'rotate') {
      const radius = Math.max(28, Math.min(140, Math.max(boxWidth, boxHeight) / 2 + 22))
      const handleSize = 14
      const handleX = centerX
      const handleY = centerY - radius
      const ring = new Graphics()
      ring.circle(centerX, centerY, radius)
      ring.stroke({ color: 0x70d6ff, alpha: 0.55, width: 1.5 })
      ring.eventMode = 'none'
      const handle = new Graphics()
      handle.circle(handleX, handleY, handleSize / 2)
      handle.fill({ color: 0x70d6ff, alpha: 1 })
      handle.stroke({ color: 0xffffff, alpha: 0.95, width: 1.5 })
      handle.eventMode = 'static'
      handle.cursor = 'grab'
      handle.on('pointerdown', (event: FederatedPointerEvent) => {
        event.stopPropagation()
        this.gizmoMode = 'rotate'
        this.captureBatchGestureStart(event)
        const local = event.getLocalPosition(this.world)
        this.rotateState = {
          centerX,
          centerY,
          startAngle: Math.atan2(local.y - centerY, local.x - centerX)
        }
      })
      this.overlay.addChild(ring)
      this.overlay.addChild(handle)
    }
  }

  private drawPlayModeInteractableHints(scene: Scene) {
    const hintIds = this.scriptRuntime.getInteractableHintEntityIds(scene)
    if (!hintIds.length) return
    for (const id of hintIds) {
      const entity = scene.getEntityById(id)
      if (!entity) continue
      const transform = entity.getComponent<TransformComponent>('Transform')
      const interactable = entity.getComponent<InteractableComponent>('Interactable')
      if (!transform || !interactable?.enabled) continue
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
      const collider = entity.getComponent<ColliderComponent>('Collider')

      let localBoxX = 0
      let localBoxY = 0
      let boxWidth = 0
      let boxHeight = 0

      if (collider && collider.width > 0 && collider.height > 0) {
        boxWidth = Math.max(1, collider.width)
        boxHeight = Math.max(1, collider.height)
        localBoxX = collider.offsetX - boxWidth / 2
        localBoxY = collider.offsetY - boxHeight / 2
      } else if (sprite && sprite.visible) {
        boxWidth = Math.max(1, sprite.width)
        boxHeight = Math.max(1, sprite.height)
        localBoxX = -boxWidth / 2
        localBoxY = -boxHeight / 2
      } else if (tilemap?.enabled) {
        boxWidth = Math.max(1, tilemap.columns * tilemap.tileWidth)
        boxHeight = Math.max(1, tilemap.rows * tilemap.tileHeight)
      } else {
        continue
      }

      const hintNode = new Container()
      hintNode.position.set(transform.x, transform.y)
      hintNode.rotation = transform.rotation
      hintNode.scale.set(transform.scaleX, transform.scaleY)
      hintNode.eventMode = 'none'

      const box = new Graphics()
      box.rect(localBoxX, localBoxY, boxWidth, boxHeight)
      box.fill({ color: 0xffc857, alpha: 0.08 })
      box.stroke({ color: 0xffe082, alpha: 0.95, width: 2 })
      box.eventMode = 'none'
      hintNode.addChild(box)

      if (this.playDebugEnabled) {
        const hint = new Text({
          text: '右键交互',
          style: { fill: '#ffe9b3', fontSize: 12, fontWeight: '700' }
        })
        hint.x = localBoxX
        hint.y = localBoxY - 18
        hint.eventMode = 'none'
        hintNode.addChild(hint)
      }
      this.playHintOverlay.addChild(hintNode)
    }
  }

  private drawGrid() {
    const existing = this.world.children.find((child) => child.label === 'grid')
    existing?.destroy()
    if (!this.gridVisible) return
    if (this.isPlaying && !this.playDebugEnabled) return

    const grid = new Graphics()
    grid.label = 'grid'
    const width = this.options.container.clientWidth
    const height = this.options.container.clientHeight
    const size = 32

    for (let x = 0; x <= width; x += size) {
      grid.moveTo(x, 0)
      grid.lineTo(x, height)
    }
    for (let y = 0; y <= height; y += size) {
      grid.moveTo(0, y)
      grid.lineTo(width, y)
    }

    grid.stroke({ color: 0x263244, alpha: 0.65, width: 1 })
    this.world.addChildAt(grid, 0)
  }

  destroy() {
    if (this.selectionNotifyFrame) {
      window.cancelAnimationFrame(this.selectionNotifyFrame)
      this.selectionNotifyFrame = 0
    }
    if (this.wheelHandler) {
      this.app.canvas.removeEventListener('wheel', this.wheelHandler)
      this.wheelHandler = null
    }
    if (this.auxClickHandler) {
      this.app.canvas.removeEventListener('auxclick', this.auxClickHandler)
      this.auxClickHandler = null
    }
    if (this.uiSliderWindowMoveHandler) {
      window.removeEventListener('pointermove', this.uiSliderWindowMoveHandler)
      this.uiSliderWindowMoveHandler = null
    }
    if (this.uiSliderWindowUpHandler) {
      window.removeEventListener('pointerup', this.uiSliderWindowUpHandler)
      this.uiSliderWindowUpHandler = null
    }
    this.uiSliderDragEntityId = ''
    if (this.playSceneCache.size > 0) {
      for (const cachedScene of this.playSceneCache.values()) {
        this.scriptRuntime.destroyScene(cachedScene)
      }
      this.playSceneCache.clear()
      this.scriptRuntime.resetAll()
    } else if (this.currentScene) {
      this.scriptRuntime.destroyScene(this.currentScene)
    }
    this.audioRuntime.stopAll()
    this.inputState.detach()
    this.resizeObserver?.disconnect()
    window.removeEventListener('unu:layout-resize-end', this.layoutResizeEndHandler)
    window.removeEventListener('message', this.htmlUiMessageHandler)
    this.cachedSceneRef = null
    this.clearSceneNodeCaches()
    this.htmlUiLayer.remove()
    this.app?.destroy(true, { children: true })
  }

  private clearSceneNodeCaches() {
    this.backdrop.removeChildren()
    this.world.removeChildren()
    this.playHintOverlay.removeChildren().forEach((child) => child.destroy())
    this.ui.removeChildren()
    this.htmlUiLayer.replaceChildren()
    for (const cached of this.backdropNodeCache.values()) cached.node.destroy({ children: true })
    this.backdropNodeCache.clear()
    for (const cached of this.worldNodeCache.values()) cached.node.destroy({ children: true })
    this.worldNodeCache.clear()
    for (const cached of this.uiNodeCache.values()) cached.node.destroy({ children: true })
    this.uiNodeCache.clear()
    for (const cached of this.htmlUiNodeCache.values()) this.revokeHtmlUiObjectUrl(cached)
    this.htmlUiNodeCache.clear()
  }

  private async getCachedBackdropNode(
    entityId: string,
    sprite: SpriteComponent,
    options: { targetWidth: number; targetHeight: number; fitMode: 'cover' | 'contain' },
    transform: TransformComponent,
    entityName: string,
    showDebug: boolean
  ) {
    const signature = [
      sprite.texturePath,
      sprite.width,
      sprite.height,
      sprite.alpha,
      sprite.tint,
      sprite.visible,
      sprite.offsetX,
      sprite.offsetY,
      options.targetWidth,
      options.targetHeight,
      options.fitMode,
      this.isPlaying ? 1 : 0,
      this.playDebugEnabled ? 1 : 0,
      showDebug ? 1 : 0,
      transform.rotation,
      transform.scaleX,
      transform.scaleY
    ].join('|')

    const cached = this.backdropNodeCache.get(entityId)
    if (cached && cached.signature === signature) {
      return cached.node
    }

    const node = new Container()
    node.label = entityId
    node.eventMode = 'none'
    node.interactiveChildren = false
    node.cursor = 'default'
    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      if (this.activeTool === 'move') {
        this.captureBatchGestureStart(event)
        this.gizmoMode = 'move'
      }
      this.selectEntityFromPointer(entityId, event)
      event.stopPropagation()
    })

    const textureNode = await this.createSpriteNode(sprite, options)
    node.addChild(textureNode)

    if (showDebug) {
      const label = new Text({
        text: entityName,
        style: { fill: '#ffffff', fontSize: 12 }
      })
      label.x = -Math.max(40, options.targetWidth / 2) + 12
      label.y = -Math.max(24, options.targetHeight / 2) + 8
      node.addChild(label)
    }

    if (cached) {
      cached.node.destroy({ children: true })
    }
    this.backdropNodeCache.set(entityId, { signature, node })
    return node
  }
}

