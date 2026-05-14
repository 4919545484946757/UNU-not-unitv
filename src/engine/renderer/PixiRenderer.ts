import 'pixi.js/unsafe-eval'
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { AnimationComponent } from '../components/AnimationComponent'
import { AudioComponent } from '../components/AudioComponent'
import { BackgroundComponent } from '../components/BackgroundComponent'
import { CameraComponent } from '../components/CameraComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { InteractableComponent } from '../components/InteractableComponent'
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
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'

interface PixiRendererOptions {
  container: HTMLDivElement
  onEntitySelected?: (entityId: string) => void
  onSceneMutated?: () => void
  onRuntimeSceneUpdated?: (scene: Scene | null) => void
  onScriptError?: (error: ScriptRuntimeError) => void
  onConsoleMessage?: (message: ScriptConsoleMessage) => void
}

type GizmoMode = 'none' | 'move' | 'scale' | 'pan'
interface CameraViewState {
  x: number
  y: number
  zoom: number
}
type CachedWorldNodeKind = 'sprite' | 'tilemap' | 'empty'
type MarkdownLineKind = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'quote' | 'list' | 'code' | 'blank'

const EMPTY_ENTITY_EDITOR_SIZE = 40
const UI_FONT_FAMILY = 'Microsoft YaHei, SimHei, Noto Sans CJK SC, Segoe UI, PingFang SC, sans-serif'
const UI_MONO_FONT_FAMILY = 'Consolas, Microsoft YaHei, SimHei, monospace'

type MarkdownLine = {
  kind: MarkdownLineKind
  text: string
  bold?: boolean
  italic?: boolean
  indent?: number
}

function parseBasicMarkdownLines(source: string): MarkdownLine[] {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n')
  const output: MarkdownLine[] = []
  let inCodeBlock = false
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) {
      output.push({ kind: 'code', text: line || ' ' })
      continue
    }
    if (!line.trim()) {
      output.push({ kind: 'blank', text: '' })
      continue
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      output.push({
        kind: `heading${heading[1].length}` as MarkdownLineKind,
        text: stripInlineMarkdown(heading[2]),
        bold: true
      })
      continue
    }
    const quote = line.match(/^>\s*(.+)$/)
    if (quote) {
      output.push({ kind: 'quote', text: stripInlineMarkdown(quote[1]), italic: true, indent: 12 })
      continue
    }
    const list = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
    if (list) {
      output.push({
        kind: 'list',
        text: `• ${stripInlineMarkdown(list[3])}`,
        indent: Math.min(48, 14 + Math.floor(list[1].length / 2) * 12)
      })
      continue
    }
    const inline = analyzeInlineMarkdown(line)
    output.push({ kind: inline.isCode ? 'code' : 'paragraph', text: inline.text, bold: inline.bold, italic: inline.italic })
  }
  return output
}

function analyzeInlineMarkdown(source: string) {
  const isCode = /^`[^`]+`$/.test(source.trim())
  return {
    text: stripInlineMarkdown(source),
    bold: /\*\*[^*]+\*\*|__[^_]+__/.test(source),
    italic: /(^|[^*])\*[^*]+\*|(^|[^_])_[^_]+_/.test(source),
    isCode
  }
}

function stripInlineMarkdown(source: string) {
  return String(source || '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim()
}

function blendColor(left: number, right: number, amount: number) {
  const ratio = Math.max(0, Math.min(1, amount))
  const lr = (left >> 16) & 0xff
  const lg = (left >> 8) & 0xff
  const lb = left & 0xff
  const rr = (right >> 16) & 0xff
  const rg = (right >> 8) & 0xff
  const rb = right & 0xff
  const r = Math.round(lr * (1 - ratio) + rr * ratio)
  const g = Math.round(lg * (1 - ratio) + rg * ratio)
  const b = Math.round(lb * (1 - ratio) + rb * ratio)
  return (r << 16) | (g << 8) | b
}

function colorToCss(value: number) {
  const normalized = Math.max(0, Math.min(0xffffff, Math.round(Number(value) || 0)))
  return `#${normalized.toString(16).padStart(6, '0')}`
}

function hexToRgba(value: number, alpha: number) {
  const normalized = Math.max(0, Math.min(0xffffff, Math.round(Number(value) || 0)))
  const r = (normalized >> 16) & 0xff
  const g = (normalized >> 8) & 0xff
  const b = normalized & 0xff
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}

function escapeHtmlContent(source: string) {
  return String(source || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeHtmlContent(source: string) {
  const template = document.createElement('template')
  template.innerHTML = String(source || '')
  const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'CODE', 'PRE', 'P', 'BR', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'SPAN', 'DIV', 'SMALL', 'MARK', 'HR'])
  const allowedAttrs = new Set(['class', 'title'])
  const visit = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement
        if (!allowedTags.has(element.tagName)) {
          element.replaceWith(document.createTextNode(element.textContent || ''))
          continue
        }
        for (const attr of Array.from(element.attributes)) {
          if (!allowedAttrs.has(attr.name.toLowerCase())) element.removeAttribute(attr.name)
        }
      }
      visit(child)
    }
  }
  visit(template.content)
  return template.innerHTML
}

function basicMarkdownToHtml(source: string) {
  const lines = parseBasicMarkdownLines(source)
  const html: string[] = []
  let listOpen = false
  const closeList = () => {
    if (!listOpen) return
    html.push('</ul>')
    listOpen = false
  }
  for (const line of lines) {
    if (line.kind !== 'list') closeList()
    if (line.kind === 'blank') {
      html.push('<br />')
      continue
    }
    const content = renderInlineMarkdownToHtml(line.text)
    if (line.kind === 'heading1') html.push(`<h1>${content}</h1>`)
    else if (line.kind === 'heading2') html.push(`<h2>${content}</h2>`)
    else if (line.kind === 'heading3') html.push(`<h3>${content}</h3>`)
    else if (line.kind === 'quote') html.push(`<blockquote>${content}</blockquote>`)
    else if (line.kind === 'code') html.push(`<pre><code>${escapeHtmlContent(line.text)}</code></pre>`)
    else if (line.kind === 'list') {
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${content.replace(/^•\s*/, '')}</li>`)
    } else {
      html.push(`<p>${content}</p>`)
    }
  }
  closeList()
  return html.join('')
}

function renderInlineMarkdownToHtml(source: string) {
  return escapeHtmlContent(source)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
}

export class PixiRenderer {
  private app!: Application
  private readonly root = new Container()
  private readonly backdrop = new Container()
  private readonly world = new Container()
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
  private selectedEntityId = ''
  private activeTool: 'select' | 'move' | 'scale' | 'pan' = 'select'
  private gizmoMode: GizmoMode = 'none'
  private uiSliderDragEntityId = ''
  private uiSliderWindowMoveHandler: ((event: PointerEvent) => void) | null = null
  private uiSliderWindowUpHandler: ((event: PointerEvent) => void) | null = null
  private dragOffset = { x: 0, y: 0 }
  private scaleState = { startPointerX: 0, startPointerY: 0, startScaleX: 1, startScaleY: 1 }
  private panState = { lastX: 0, lastY: 0 }
  private renderVersion = 0
  private renderInFlight: Promise<void> | null = null
  private queuedScene: Scene | null = null
  private cachedSceneRef: Scene | null = null
  private readonly backdropNodeCache = new Map<string, { signature: string; node: Container }>()
  private readonly worldNodeCache = new Map<string, { kind: CachedWorldNodeKind; signature: string; node: Container }>()
  private readonly uiNodeCache = new Map<string, { signature: string; node: Container }>()
  private readonly htmlUiNodeCache = new Map<string, { signature: string; node: HTMLDivElement }>()
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

    this.sourceScene = scene
    this.currentScene = scene
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
      setMasterVolume: (volume) => this.audioRuntime.setMasterVolume(volume),
      setGroupVolume: (group, volume) => this.audioRuntime.setGroupVolume(group, volume),
      getMasterVolume: () => this.audioRuntime.getMasterVolume(),
      getGroupVolume: (group) => this.audioRuntime.getGroupVolume(group)
    })
    this.audioRuntime.setProjectRoot(useProjectStore().rootPath)
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
          projectStore.setStatus(`动画事件：${event.name} @ frame ${event.frame}`)
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
    this.options.onEntitySelected?.('')
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
    if (projectStore.rootPath === 'sample-project') {
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
    this.audioRuntime.setProjectRoot(useProjectStore().rootPath)

    if (!scene) {
      this.isPlaying = false
      this.isPaused = false
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
    const scriptRuntimePath = 'assets/scripts/ScriptRuntime.ts'
    const inputRuntimePath = 'assets/scripts/InputState.ts'
    const audioRuntimePath = 'assets/scripts/AudioRuntime.ts'
    if (!window.unu?.readTextAsset || !projectStore.rootPath || projectStore.rootPath === 'sample-project') {
      this.scriptRuntime.setProjectRuntimeSource('', scriptRuntimePath)
      this.inputState.setProjectRuntimeSource('', inputRuntimePath)
      this.audioRuntime.setProjectRuntimeSource('', audioRuntimePath)
      return
    }
    const discoveredProjectScriptPaths = assetStore.flat
      .filter((node) => node.type === 'script')
      .map((node) => node.path.replace(/\\/g, '/'))
      .filter((path) => /\.(js|ts)$/i.test(path))
      .filter((path) => (
        path.startsWith('assets/scripts/') &&
        !path.startsWith('assets/scripts/InputState.') &&
        !path.startsWith('assets/scripts/AudioRuntime.')
      ))
      .filter((path) => (
        path === scriptRuntimePath ||
        !path.slice('assets/scripts/'.length).includes('/') ||
        path.startsWith('assets/scripts/shared/') ||
        path.startsWith('assets/scripts/interactions/') ||
        path.startsWith('assets/scripts/scenes/')
      ))
    const projectScriptPaths = [scriptRuntimePath, ...discoveredProjectScriptPaths]
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
    projectStore.setStatus(`脚本已重新载入：${label}，下次播放生效`)
  }

  setSelection(entityId: string) {
    this.selectedEntityId = entityId
    this.scriptRuntime.setSelectedEntityId(entityId)
    this.drawSelectionGizmo()
  }

  setTool(tool: 'select' | 'move' | 'scale' | 'pan') {
    this.activeTool = tool
    this.app.stage.cursor = tool === 'pan' && !this.isPlaying ? 'grab' : 'default'
    this.drawSelectionGizmo()
  }

  private installViewportWheelInteractions() {
    this.wheelHandler = (event: WheelEvent) => {
      if (this.isPlaying) return
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

  private zoomViewportAt(clientX: number, clientY: number, deltaY: number) {
    const rect = this.options.container.getBoundingClientRect()
    const pointerX = clientX - rect.left
    const pointerY = clientY - rect.top
    const previousScale = this.world.scale.x || 1
    const factor = deltaY < 0 ? 1.12 : 1 / 1.12
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

    for (const entity of scene.entities) {
      const transform = entity.getComponent<TransformComponent>('Transform')
      const ui = entity.getComponent<UIComponent>('UI')
      const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const collider = entity.getComponent<ColliderComponent>('Collider')
      const background = entity.getComponent<BackgroundComponent>('Background')
      if (!transform) continue

      if (ui?.enabled) {
        if (ui.renderMode === 'html') {
          this.updateHtmlUiNode(entity, transform, ui)
          activeHtmlUiIds.add(entity.id)
          continue
        }
        const uiNode = this.getCachedUiNode(entity, transform, ui)
        const uiPosition = this.resolveViewportPosition(transform, ui.width, ui.height, ui.anchorX, ui.anchorY)
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
        const tilemapNode = await this.getCachedTilemapNode(entity.id, entity.name, transform, tilemap)
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
            entity.name
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
        node.eventMode = 'static'
        node.cursor = 'pointer'
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

  private createUiNode(entity: Scene['entities'][number], transform: TransformComponent, ui: UIComponent) {
    const node = new Container()
    node.label = entity.id
    node.zIndex = transform.zIndex ?? 0
    const uiPosition = this.resolveViewportPosition(transform, ui.width, ui.height, ui.anchorX, ui.anchorY)
    node.x = uiPosition.x
    node.y = uiPosition.y
    node.rotation = transform.rotation
    node.scale.set(transform.scaleX, transform.scaleY)
    node.eventMode = 'static'
    if (ui.mode === 'button' || ui.mode === 'slider') {
      node.hitArea = new Rectangle(-ui.width / 2, -ui.height / 2, ui.width, ui.height)
    }
    node.cursor = (ui.mode === 'button' || ui.mode === 'slider') && ui.interactable ? 'pointer' : 'default'

    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      this.options.onEntitySelected?.(entity.id)
      this.selectedEntityId = entity.id
      this.drawSelectionGizmo()
      const global = event.global
      const dragPosition = this.resolveViewportPosition(transform, ui.width, ui.height, ui.anchorX, ui.anchorY)
      this.dragOffset.x = global.x - dragPosition.x
      this.dragOffset.y = global.y - dragPosition.y
      if (this.activeTool === 'move') {
        this.gizmoMode = 'move'
      }
      event.stopPropagation()
    })

    if (ui.mode === 'button') {
      const buttonBg = new Graphics()
      buttonBg.roundRect(-ui.width / 2, -ui.height / 2, ui.width, ui.height, 10)
      buttonBg.fill({ color: ui.backgroundColor, alpha: 0.95 })
      buttonBg.stroke({ color: 0xffffff, alpha: 0.25, width: 1.5 })
      node.addChild(buttonBg)
    }

    if (ui.mode === 'slider') {
      node.addChild(this.createSliderUiContent(ui))
    } else {
      const label = ui.markdownEnabled
        ? this.createMarkdownUiContent(ui)
        : this.createPlainUiText(ui)
      node.addChild(label)
    }

    if (ui.mode === 'button' && ui.interactable) {
      node.on('pointertap', (event: FederatedPointerEvent) => {
        if (!this.isPlaying) return
        useProjectStore().setStatus(`UI 按钮点击：${ui.text}`)
        if (this.currentScene) {
          this.scriptRuntime.handleUiClick(this.currentScene, entity, ui, {
            x: event.global.x,
            y: event.global.y
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
        const uiPosition = this.resolveViewportPosition(transform, ui.width, ui.height, ui.anchorX, ui.anchorY)
        const dx = screenX - uiPosition.x
        const dy = screenY - uiPosition.y
        const cos = Math.cos(-transform.rotation)
        const sin = Math.sin(-transform.rotation)
        const localX = (dx * cos - dy * sin) / (Math.abs(transform.scaleX) > 0.0001 ? transform.scaleX : 1)
        const min = Number.isFinite(ui.sliderMin) ? ui.sliderMin : 0
        const max = Number.isFinite(ui.sliderMax) ? ui.sliderMax : 1
        const range = Math.max(0.0001, max - min)
        const usableWidth = Math.max(1, ui.width - 28)
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

  private createSliderUiContent(ui: UIComponent) {
    const content = new Container()
    const min = Number.isFinite(ui.sliderMin) ? ui.sliderMin : 0
    const max = Number.isFinite(ui.sliderMax) ? ui.sliderMax : 1
    const range = Math.max(0.0001, max - min)
    const ratio = Math.max(0, Math.min(1, (Number(ui.sliderValue ?? min) - min) / range))
    const usableWidth = Math.max(1, ui.width - 28)
    const trackHeight = Math.max(6, Math.min(14, ui.height * 0.22))
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
    const knobRadius = Math.max(8, Math.min(16, ui.height * 0.34))
    const knob = new Graphics()
    knob.circle(knobX, y, knobRadius)
    knob.fill({ color: 0xffffff, alpha: 1 })
    knob.stroke({ color: ui.textColor, alpha: 0.85, width: 2 })
    content.addChild(knob)
    return content
  }

  private createPlainUiText(ui: UIComponent) {
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
        wordWrapWidth: Math.max(1, ui.width)
      }
    })
    label.anchor.set(0.5)
    return label
  }

  private createMarkdownUiContent(ui: UIComponent) {
    const baseSize = Math.max(10, ui.fontSize)
    const maxWidth = Math.max(1, ui.width)
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

    content.y = -Math.min(Math.max(1, ui.height), Math.max(1, y)) / 2
    return content
  }

  private getCachedUiNode(entity: Scene['entities'][number], transform: TransformComponent, ui: UIComponent) {
    const signature = [
      ui.mode,
      ui.text,
      ui.fontSize,
      ui.textColor,
      ui.width,
      ui.height,
      ui.backgroundColor,
      ui.anchorX,
      ui.anchorY,
      ui.interactable,
      ui.onClickScriptPath,
      ui.sliderValue,
      ui.sliderMin,
      ui.sliderMax,
      ui.markdownEnabled,
      ui.enabled,
      transform.zIndex ?? 0,
      transform.positionMode,
      transform.viewportHorizontal,
      transform.viewportVertical
    ].join('|')
    const cached = this.uiNodeCache.get(entity.id)
    if (cached && cached.signature === signature) return cached.node

    const node = this.createUiNode(entity, transform, ui)
    if (cached) cached.node.destroy({ children: true })
    this.uiNodeCache.set(entity.id, { signature, node })
    return node
  }

  private updateHtmlUiNode(entity: Scene['entities'][number], transform: TransformComponent, ui: UIComponent) {
    const signature = [
      ui.mode,
      ui.text,
      ui.fontSize,
      ui.textColor,
      ui.width,
      ui.height,
      ui.backgroundColor,
      ui.interactable,
      ui.onClickScriptPath,
      ui.sliderValue,
      ui.sliderMin,
      ui.sliderMax,
      ui.markdownEnabled,
      ui.renderMode,
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
        this.options.onEntitySelected?.(entity.id)
        this.selectedEntityId = entity.id
        this.drawSelectionGizmo()
        event.stopPropagation()
      })
      this.htmlUiLayer.appendChild(node)
      cached = { signature: '', node }
      this.htmlUiNodeCache.set(entity.id, cached)
    }

    const node = cached.node
    node.onclick = (event) => {
      if (!this.isPlaying || ui.mode !== 'button' || !ui.interactable) return
      useProjectStore().setStatus(`HTML UI 按钮点击：${stripInlineMarkdown(ui.text)}`)
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
      const html = ui.markdownEnabled ? basicMarkdownToHtml(ui.text) : sanitizeHtmlContent(ui.text)
      node.innerHTML = html || '&nbsp;'
      cached.signature = signature
    }

    const { x, y } = this.resolveViewportPosition(transform, ui.width, ui.height, ui.anchorX, ui.anchorY)
    Object.assign(node.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${Math.max(1, ui.width)}px`,
      height: `${Math.max(1, ui.height)}px`,
      boxSizing: 'border-box',
      transform: `translate(-50%, -50%) rotate(${transform.rotation}rad) scale(${transform.scaleX}, ${transform.scaleY})`,
      transformOrigin: 'center center',
      zIndex: String(1000 + (transform.zIndex ?? 0)),
      color: colorToCss(ui.textColor),
      fontSize: `${Math.max(10, ui.fontSize)}px`,
      fontFamily: UI_FONT_FAMILY,
      lineHeight: '1.35',
      overflow: 'auto',
      padding: ui.mode === 'button' ? '8px 12px' : '0',
      borderRadius: ui.mode === 'button' ? '10px' : '0',
      border: ui.mode === 'button' ? '1px solid rgba(255,255,255,0.28)' : '0',
      background: ui.mode === 'button' ? hexToRgba(ui.backgroundColor, 0.95) : 'transparent',
      pointerEvents: this.isPlaying && ui.mode !== 'button' ? 'none' : 'auto',
      cursor: ui.mode === 'button' && ui.interactable ? 'pointer' : 'default'
    })
  }

  private async createTilemapNode(entityId: string, entityName: string, transform: TransformComponent, tilemap: TilemapComponent) {
    const node = new Container()
    node.label = entityId
    node.x = transform.x
    node.y = transform.y
    node.rotation = transform.rotation
    node.scale.set(transform.scaleX, transform.scaleY)
    node.eventMode = 'static'
    node.cursor = 'pointer'
    node.zIndex = transform.zIndex ?? 0
    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      this.options.onEntitySelected?.(entityId)
      this.selectedEntityId = entityId
      this.drawSelectionGizmo()
      if (transform.positionMode === 'viewport') {
        const position = this.resolveViewportPosition(transform, tilemap.columns * tilemap.tileWidth, tilemap.rows * tilemap.tileHeight, 0, 0)
        this.dragOffset.x = event.global.x - position.x
        this.dragOffset.y = event.global.y - position.y
      } else {
        const local = event.getLocalPosition(this.world)
        this.dragOffset.x = local.x - transform.x
        this.dragOffset.y = local.y - transform.y
      }
      if (this.activeTool === 'move') {
        this.gizmoMode = 'move'
      }
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
      const showDebug = !this.isPlaying || this.playDebugEnabled
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

    if (!this.isPlaying || this.playDebugEnabled) {
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

  private async getCachedTilemapNode(entityId: string, entityName: string, transform: TransformComponent, tilemap: TilemapComponent) {
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
      textureMapSig,
      tilemap.tiles.join(','),
      tilemap.collision.join(',')
    ].join('|')
    const cached = this.worldNodeCache.get(entityId)
    if (cached && cached.kind === 'tilemap' && cached.signature === signature) return cached.node

    const node = await this.createTilemapNode(entityId, entityName, transform, tilemap)
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
      this.gizmoMode = 'none'
      if (this.activeTool === 'select') {
        this.selectedEntityId = ''
        this.options.onEntitySelected?.('')
        this.drawSelectionGizmo()
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
            this.setTransformFromViewportPosition(transform, centerX, centerY, ui.width, ui.height)
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
      if (sprite && sprite.visible) {
        const halfW = (sprite.width * Math.abs(transform.scaleX)) / 2
        const halfH = (sprite.height * Math.abs(transform.scaleY)) / 2
        if (x >= transform.x - halfW && x <= transform.x + halfW && y >= transform.y - halfH && y <= transform.y + halfH) {
          return { id: entity.id, transform }
        }
      } else if (tilemap?.enabled) {
        const width = tilemap.columns * tilemap.tileWidth * Math.abs(transform.scaleX)
        const height = tilemap.rows * tilemap.tileHeight * Math.abs(transform.scaleY)
        if (x >= transform.x && x <= transform.x + width && y >= transform.y && y <= transform.y + height) {
          return { id: entity.id, transform }
        }
      } else {
        const halfW = (EMPTY_ENTITY_EDITOR_SIZE * Math.abs(transform.scaleX)) / 2
        const halfH = (EMPTY_ENTITY_EDITOR_SIZE * Math.abs(transform.scaleY)) / 2
        if (x >= transform.x - halfW && x <= transform.x + halfW && y >= transform.y - halfH && y <= transform.y + halfH) {
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
    box.fill({ color: sprite.tint, alpha: sprite.alpha })
    box.stroke({ color: 0xffffff, alpha: 0.35, width: 1 })
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
    const showDebug = !this.isPlaying || this.playDebugEnabled
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
    node.eventMode = 'static'
    node.cursor = 'pointer'
    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      this.options.onEntitySelected?.(entity.id)
      this.selectedEntityId = entity.id
      this.drawSelectionGizmo()
      if (transform.positionMode === 'viewport') {
        const position = this.resolveViewportPosition(transform, sprite.width, sprite.height)
        this.dragOffset.x = event.global.x - position.x
        this.dragOffset.y = event.global.y - position.y
      } else {
        const local = event.getLocalPosition(this.world)
        this.dragOffset.x = local.x - transform.x
        this.dragOffset.y = local.y - transform.y
      }
      if (this.activeTool === 'move') {
        this.gizmoMode = 'move'
      }
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
    const showDebug = !this.isPlaying || this.playDebugEnabled
    const signature = [entity.name, showDebug ? 1 : 0].join('|')
    const cached = this.worldNodeCache.get(entity.id)
    if (cached && cached.kind === 'empty' && cached.signature === signature) return cached.node

    const node = new Container()
    node.label = entity.id
    node.eventMode = 'static'
    node.cursor = 'pointer'
    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      this.options.onEntitySelected?.(entity.id)
      this.selectedEntityId = entity.id
      this.drawSelectionGizmo()
      if (transform.positionMode === 'viewport') {
        const position = this.resolveViewportPosition(transform, EMPTY_ENTITY_EDITOR_SIZE, EMPTY_ENTITY_EDITOR_SIZE)
        this.dragOffset.x = event.global.x - position.x
        this.dragOffset.y = event.global.y - position.y
      } else {
        const local = event.getLocalPosition(this.world)
        this.dragOffset.x = local.x - transform.x
        this.dragOffset.y = local.y - transform.y
      }
      if (this.activeTool === 'move') {
        this.gizmoMode = 'move'
      }
      event.stopPropagation()
    })

    const marker = new Graphics()
    const half = EMPTY_ENTITY_EDITOR_SIZE / 2
    const markerColor = /spawn/i.test(`${entity.id} ${entity.name}`) ? 0xffc857 : 0x56b6c2
    marker.rect(-half, -half, EMPTY_ENTITY_EDITOR_SIZE, EMPTY_ENTITY_EDITOR_SIZE)
    marker.fill({ color: markerColor, alpha: 0.08 })
    marker.stroke({ color: markerColor, alpha: 0.9, width: 2 })
    marker.moveTo(-half, 0)
    marker.lineTo(half, 0)
    marker.moveTo(0, -half)
    marker.lineTo(0, half)
    marker.stroke({ color: markerColor, alpha: 0.75, width: 1 })
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
      zoom: Math.max(0.1, Math.min(5, camera.zoom || 1))
    }
  }

  private async resolveTexture(texturePath: string) {
    if (!texturePath) return null
    if (this.textureCache.has(texturePath)) return this.textureCache.get(texturePath) ?? null

    if (texturePath.startsWith('data:image/')) {
      const texture = await this.loadTextureFromDataUrl(texturePath)
      this.configurePixelTextureSampling(texture)
      this.textureCache.set(texturePath, texture)
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


  private async loadTextureFromDataUrl(dataUrl: string) {
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

  private async loadTextureFromUrl(url: string) {
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

  private async resolveAtlasFrameTexture(texturePath: string) {
    const match = texturePath.match(/^atlas:\/\/(.+)#(\d+),(\d+),(\d+),(\d+)$/)
    if (!match) return null
    const [, imagePath, x, y, w, h] = match
    const baseTexture = await this.resolveTexture(imagePath)
    if (!baseTexture) return null
    const frame = new Rectangle(Number(x), Number(y), Number(w), Number(h))
    const texture = new Texture({ source: (baseTexture as any).source, frame })
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

    const zoom = Math.max(0.1, Math.min(5, camera.zoom || 1))
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
    this.world.scale.set(1)
    this.world.position.set(0, 0)
    this.overlay.scale.set(1)
    this.overlay.position.set(0, 0)
  }

  private drawSelectionGizmo() {
    this.overlay.removeChildren().forEach((child) => child.destroy())
    if (!this.currentScene) return
    if (this.isPlaying) {
      this.drawPlayModeInteractableHints(this.currentScene)
      return
    }
    if (!this.selectedEntityId) return
    const entity = this.currentScene.getEntityById(this.selectedEntityId)
    const transform = entity?.getComponent<TransformComponent>('Transform')
    const sprite = entity?.getComponent<SpriteComponent>('Sprite')
    const tilemap = entity?.getComponent<TilemapComponent>('Tilemap')
    const ui = entity?.getComponent<UIComponent>('UI')
    if (!entity || !transform) return
    if (ui?.enabled) return

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
    const centerX = boxX + boxWidth / 2
    const centerY = boxY + boxHeight / 2

    const box = new Graphics()
    box.rect(boxX, boxY, boxWidth, boxHeight)
    box.stroke({ color: 0x56b6c2, alpha: 1, width: 2 })

    const center = new Graphics()
    center.moveTo(centerX - 12, centerY)
    center.lineTo(centerX + 12, centerY)
    center.moveTo(centerX, centerY - 12)
    center.lineTo(centerX, centerY + 12)
    center.stroke({ color: 0x56b6c2, alpha: 0.9, width: 2 })

    this.overlay.addChild(box, center)

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

      let boxX = 0
      let boxY = 0
      let boxWidth = 0
      let boxHeight = 0

      if (collider && collider.width > 0 && collider.height > 0) {
        const width = Math.max(1, collider.width * Math.abs(transform.scaleX))
        const height = Math.max(1, collider.height * Math.abs(transform.scaleY))
        const centerX = transform.x + collider.offsetX
        const centerY = transform.y + collider.offsetY
        boxX = centerX - width / 2
        boxY = centerY - height / 2
        boxWidth = width
        boxHeight = height
      } else if (sprite && sprite.visible) {
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
        continue
      }

      const box = new Graphics()
      box.rect(boxX, boxY, boxWidth, boxHeight)
      box.fill({ color: 0xffc857, alpha: 0.08 })
      box.stroke({ color: 0xffe082, alpha: 0.95, width: 2 })
      this.overlay.addChild(box)

      if (this.playDebugEnabled) {
        const hint = new Text({
          text: '右键交互',
          style: { fill: '#ffe9b3', fontSize: 12, fontWeight: '700' }
        })
        hint.x = boxX
        hint.y = boxY - 18
        this.overlay.addChild(hint)
      }
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
    this.cachedSceneRef = null
    this.clearSceneNodeCaches()
    this.htmlUiLayer.remove()
    this.app?.destroy(true, { children: true })
  }

  private clearSceneNodeCaches() {
    this.backdrop.removeChildren()
    this.world.removeChildren()
    this.ui.removeChildren()
    this.htmlUiLayer.replaceChildren()
    for (const cached of this.backdropNodeCache.values()) cached.node.destroy({ children: true })
    this.backdropNodeCache.clear()
    for (const cached of this.worldNodeCache.values()) cached.node.destroy({ children: true })
    this.worldNodeCache.clear()
    for (const cached of this.uiNodeCache.values()) cached.node.destroy({ children: true })
    this.uiNodeCache.clear()
    this.htmlUiNodeCache.clear()
  }

  private async getCachedBackdropNode(
    entityId: string,
    sprite: SpriteComponent,
    options: { targetWidth: number; targetHeight: number; fitMode: 'cover' | 'contain' },
    transform: TransformComponent,
    entityName: string
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
    node.eventMode = 'static'
    node.cursor = 'pointer'
    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (this.shouldStartPan(event)) {
        this.startPan(event.global.x, event.global.y)
        event.stopPropagation()
        return
      }
      this.options.onEntitySelected?.(entityId)
      this.selectedEntityId = entityId
      this.drawSelectionGizmo()
      if (this.activeTool === 'move') {
        this.gizmoMode = 'move'
      }
      event.stopPropagation()
    })

    const textureNode = await this.createSpriteNode(sprite, options)
    node.addChild(textureNode)

    const showDebug = !this.isPlaying || this.playDebugEnabled
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

