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
import { ScriptRuntime } from '../runtime/ScriptRuntime'
import { InputState } from '../runtime/InputState'
import { AudioRuntime } from '../runtime/AudioRuntime'
import { applySceneAnimation } from '../animation/applyAnimation'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'

interface PixiRendererOptions {
  container: HTMLDivElement
  onEntitySelected?: (entityId: string) => void
  onSceneMutated?: () => void
  onRuntimeSceneUpdated?: (scene: Scene | null) => void
}

type GizmoMode = 'none' | 'move' | 'scale' | 'pan'
interface CameraViewState {
  x: number
  y: number
  zoom: number
}
type CachedWorldNodeKind = 'sprite' | 'tilemap'

export class PixiRenderer {
  private app!: Application
  private readonly root = new Container()
  private readonly backdrop = new Container()
  private readonly world = new Container()
  private readonly ui = new Container()
  private readonly overlay = new Container()
  private resizeObserver: ResizeObserver | null = null
  private readonly scriptRuntime = new ScriptRuntime()
  private readonly inputState = new InputState()
  private readonly audioRuntime = new AudioRuntime()
  private sourceScene: Scene | null = null
  private playScene: Scene | null = null
  private currentScene: Scene | null = null
  private gridVisible = true
  private isPlaying = false
  private isPaused = false
  private playDebugEnabled = false
  private textureCache = new Map<string, Texture>()
  private selectedEntityId = ''
  private activeTool: 'select' | 'move' | 'scale' | 'pan' = 'select'
  private gizmoMode: GizmoMode = 'none'
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
    this.options.container.appendChild(this.app.canvas)
    this.app.canvas.style.imageRendering = 'pixelated'

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
    this.inputState.attach()
    this.resetCameraTransform()
    this.installStageInteractions()
    this.drawGrid()
    if (scene) await this.renderScene(scene)

    this.resizeObserver = new ResizeObserver(() => {
      this.drawGrid()
      this.drawSelectionGizmo()
      if (this.currentScene) {
        void this.renderScene(this.currentScene)
      }
    })
    this.resizeObserver.observe(this.options.container)

    const runtimeStore = useRuntimeStore()
    const projectStore = useProjectStore()
    this.app.ticker.add((ticker) => {
      if (!this.currentScene) return
      const delta = ticker.deltaMS / 1000
      runtimeStore.setDeltaTime(delta)
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
        this.scriptRuntime.updateScene(this.currentScene, delta, this.inputState)
        if (this.consumeSceneSwitchRequest()) {
          this.inputState.endFrame()
          return
        }
        applySceneAnimation(this.currentScene, delta, (event) => {
          projectStore.setStatus(`动画事件：${event.name} @ frame ${event.frame}`)
        }, this.inputState)
        void this.audioRuntime.syncScene(this.currentScene)
        this.updateCameraFromScene(this.currentScene)
        void this.renderScene(this.currentScene)
        this.options.onRuntimeSceneUpdated?.(this.currentScene)
      }
      this.inputState.endFrame()
    })
  }

  private consumeSceneSwitchRequest() {
    const targetSceneName = this.scriptRuntime.consumeSceneSwitchRequest()
    if (!targetSceneName) return false
    if (!this.isPlaying) return false
    const normalized = String(targetSceneName).trim()
    if (!normalized) return false

    const nextSceneTemplate = this.resolveSceneTemplateByName(normalized)
    if (!nextSceneTemplate) {
      useProjectStore().setStatus(`场景切换失败：未找到场景 ${normalized}`)
      return false
    }

    if (this.playScene) {
      this.scriptRuntime.destroyScene(this.playScene)
    }
    this.audioRuntime.stopAll()

    this.playScene = deserializeScene(serializeScene(nextSceneTemplate))
    this.currentScene = this.playScene
    this.selectedEntityId = ''
    this.options.onEntitySelected?.('')
    this.scriptRuntime.setSelectedEntityId('')

    this.resetAnimations(this.playScene)
    this.scriptRuntime.initScene(this.playScene)
    this.scriptRuntime.startScene(this.playScene)
    void this.audioRuntime.syncScene(this.playScene)
    this.updateCameraFromScene(this.playScene)
    this.drawSelectionGizmo()
    void this.renderScene(this.playScene)
    useProjectStore().setStatus(`已切换场景：${this.playScene.name}`)
    return true
  }

  private resolveSceneTemplateByName(sceneName: string) {
    const currentSourceName = this.sourceScene?.name || ''
    if (currentSourceName === sceneName && this.sourceScene) return this.sourceScene
    return createSampleSceneByName(sceneName)
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

  setRuntimeState(isPlaying: boolean, isPaused: boolean, scene: Scene | null, refreshPlayingScene = false) {
    const wasPlaying = this.isPlaying
    this.sourceScene = scene
    this.audioRuntime.setProjectRoot(useProjectStore().rootPath)

    if (!scene) {
      this.isPlaying = false
      this.isPaused = false
      this.playScene = null
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
      if (this.playScene) {
        this.scriptRuntime.destroyScene(this.playScene)
      }
      this.audioRuntime.stopAll()
      this.playScene = null
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
      if (this.playScene) {
        this.scriptRuntime.destroyScene(this.playScene)
      }
      this.playScene = deserializeScene(serializeScene(scene))
      this.currentScene = this.playScene
      this.resetAnimations(this.playScene)
      this.scriptRuntime.initScene(this.playScene)
      this.scriptRuntime.startScene(this.playScene)
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

    for (const entity of scene.entities) {
      const transform = entity.getComponent<TransformComponent>('Transform')
      const ui = entity.getComponent<UIComponent>('UI')
      const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const collider = entity.getComponent<ColliderComponent>('Collider')
      const background = entity.getComponent<BackgroundComponent>('Background')
      if (!transform) continue

      if (ui?.enabled) {
        const uiNode = this.getCachedUiNode(entity, transform, ui)
        uiNode.x = this.options.container.clientWidth * ui.anchorX + transform.x
        uiNode.y = this.options.container.clientHeight * ui.anchorY + transform.y
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
        tilemapNode.x = transform.x
        tilemapNode.y = transform.y
        tilemapNode.rotation = transform.rotation
        tilemapNode.scale.set(transform.scaleX, transform.scaleY)
        tilemapNode.zIndex = transform.zIndex ?? 0
        activeWorldIds.add(entity.id)
        worldNodes.push(tilemapNode)
        continue
      }
      if (!sprite) continue

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
      if (isCameraBoundBackground) {
        // Follow-camera backgrounds are rendered in a dedicated screen-space backdrop layer.
        node.x = this.options.container.clientWidth / 2
        node.y = this.options.container.clientHeight / 2
        activeBackdropIds.add(entity.id)
      } else {
        node.x = transform.x
        node.y = transform.y
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
        worldNodes.push(node)
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

    this.backdrop.removeChildren()
    backdropNodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach((node) => this.backdrop.addChild(node))

    this.world.removeChildren()
    worldNodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach((node) => this.world.addChild(node))

    this.ui.removeChildren()
    uiNodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach((node) => this.ui.addChild(node))

    this.drawGrid()
    this.drawSelectionGizmo()
  }

  private createUiNode(entity: Scene['entities'][number], transform: TransformComponent, ui: UIComponent) {
    const node = new Container()
    node.label = entity.id
    node.zIndex = transform.zIndex ?? 0
    const viewportWidth = this.options.container.clientWidth
    const viewportHeight = this.options.container.clientHeight
    node.x = viewportWidth * ui.anchorX + transform.x
    node.y = viewportHeight * ui.anchorY + transform.y
    node.rotation = transform.rotation
    node.scale.set(transform.scaleX, transform.scaleY)
    node.eventMode = 'static'
    node.cursor = ui.mode === 'button' && ui.interactable ? 'pointer' : 'default'

    node.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) return
      if (!this.isPlaying && this.activeTool === 'pan') {
        this.gizmoMode = 'pan'
        this.panState.lastX = event.global.x
        this.panState.lastY = event.global.y
        this.app.stage.cursor = 'grabbing'
        event.stopPropagation()
        return
      }
      this.options.onEntitySelected?.(entity.id)
      this.selectedEntityId = entity.id
      this.drawSelectionGizmo()
      const global = event.global
      this.dragOffset.x = global.x - (viewportWidth * ui.anchorX + transform.x)
      this.dragOffset.y = global.y - (viewportHeight * ui.anchorY + transform.y)
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

    const label = new Text({
      text: ui.text,
      style: {
        fill: ui.textColor,
        fontSize: Math.max(10, ui.fontSize),
        fontFamily: 'Segoe UI, PingFang SC, sans-serif',
        align: 'center'
      }
    })
    label.anchor.set(0.5)
    node.addChild(label)

    if (ui.mode === 'button' && ui.interactable) {
      node.on('pointertap', () => {
        if (!this.isPlaying) return
        useProjectStore().setStatus(`UI 按钮点击：${ui.text}`)
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

    return node
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
      ui.enabled,
      transform.zIndex ?? 0
    ].join('|')
    const cached = this.uiNodeCache.get(entity.id)
    if (cached && cached.signature === signature) return cached.node

    const node = this.createUiNode(entity, transform, ui)
    if (cached) cached.node.destroy({ children: true })
    this.uiNodeCache.set(entity.id, { signature, node })
    return node
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
      if (!this.isPlaying && this.activeTool === 'pan') {
        this.gizmoMode = 'pan'
        this.panState.lastX = event.global.x
        this.panState.lastY = event.global.y
        this.app.stage.cursor = 'grabbing'
        event.stopPropagation()
        return
      }
      this.options.onEntitySelected?.(entityId)
      this.selectedEntityId = entityId
      this.drawSelectionGizmo()
      const local = event.getLocalPosition(this.world)
      this.dragOffset.x = local.x - transform.x
      this.dragOffset.y = local.y - transform.y
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

      if (this.activeTool === 'pan') {
        this.gizmoMode = 'pan'
        this.panState.lastX = event.global.x
        this.panState.lastY = event.global.y
        this.app.stage.cursor = 'grabbing'
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
        this.world.position.x += dx
        this.world.position.y += dy
        this.overlay.position.x += dx
        this.overlay.position.y += dy
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

      if (this.gizmoMode === 'move') {
        if (ui?.enabled) {
          const global = event.global
          const viewportWidth = this.options.container.clientWidth
          const viewportHeight = this.options.container.clientHeight
          transform.x = global.x - viewportWidth * ui.anchorX - this.dragOffset.x
          transform.y = global.y - viewportHeight * ui.anchorY - this.dragOffset.y
        } else {
          const local = event.getLocalPosition(this.world)
          transform.x = local.x - this.dragOffset.x
          transform.y = local.y - this.dragOffset.y
        }
        if (this.isPlaying) void this.renderScene(this.currentScene)
        else this.options.onSceneMutated?.()
      } else if (this.gizmoMode === 'scale') {
        if (!sprite && !tilemap) return
        const local = event.getLocalPosition(this.world)
        const dx = local.x - this.scaleState.startPointerX
        const dy = local.y - this.scaleState.startPointerY
        const baseW = sprite ? sprite.width : (tilemap ? tilemap.columns * tilemap.tileWidth : 40)
        const baseH = sprite ? sprite.height : (tilemap ? tilemap.rows * tilemap.tileHeight : 40)
        transform.scaleX = Math.max(0.1, this.scaleState.startScaleX + dx / Math.max(40, baseW))
        transform.scaleY = Math.max(0.1, this.scaleState.startScaleY + dy / Math.max(40, baseH))
        if (this.isPlaying) void this.renderScene(this.currentScene)
        else this.options.onSceneMutated?.()
      }
    })
    this.app.stage.on('pointerup', () => {
      this.gizmoMode = 'none'
      this.app.stage.cursor = this.activeTool === 'pan' && !this.isPlaying ? 'grab' : 'default'
    })
    this.app.stage.on('pointerupoutside', () => {
      this.gizmoMode = 'none'
      this.app.stage.cursor = this.activeTool === 'pan' && !this.isPlaying ? 'grab' : 'default'
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
      return node
    }

    const box = new Graphics()
    box.rect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height)
    box.fill({ color: sprite.tint, alpha: sprite.alpha })
    box.stroke({ color: 0xffffff, alpha: 0.35, width: 1 })
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
      if (!this.isPlaying && this.activeTool === 'pan') {
        this.gizmoMode = 'pan'
        this.panState.lastX = event.global.x
        this.panState.lastY = event.global.y
        this.app.stage.cursor = 'grabbing'
        event.stopPropagation()
        return
      }
      this.options.onEntitySelected?.(entity.id)
      this.selectedEntityId = entity.id
      this.drawSelectionGizmo()
      const local = event.getLocalPosition(this.world)
      this.dragOffset.x = local.x - transform.x
      this.dragOffset.y = local.y - transform.y
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

    if (!/^https?:\/\//i.test(texturePath) && !texturePath.startsWith('/')) {
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

  private updateCameraFromScene(scene: Scene) {
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
        if (smoothing <= 0) {
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
    if (!sprite && !tilemap) return

    const boxX = sprite
      ? transform.x - (sprite.width * transform.scaleX) / 2
      : transform.x
    const boxY = sprite
      ? transform.y - (sprite.height * transform.scaleY) / 2
      : transform.y
    const boxWidth = sprite
      ? sprite.width * transform.scaleX
      : (tilemap ? tilemap.columns * tilemap.tileWidth * transform.scaleX : 0)
    const boxHeight = sprite
      ? sprite.height * transform.scaleY
      : (tilemap ? tilemap.rows * tilemap.tileHeight * transform.scaleY : 0)
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
    if (this.playScene) {
      this.scriptRuntime.destroyScene(this.playScene)
    } else if (this.currentScene) {
      this.scriptRuntime.destroyScene(this.currentScene)
    }
    this.audioRuntime.stopAll()
    this.inputState.detach()
    this.resizeObserver?.disconnect()
    this.cachedSceneRef = null
    this.clearSceneNodeCaches()
    this.app?.destroy(true, { children: true })
  }

  private clearSceneNodeCaches() {
    this.backdrop.removeChildren()
    this.world.removeChildren()
    this.ui.removeChildren()
    for (const cached of this.backdropNodeCache.values()) cached.node.destroy({ children: true })
    this.backdropNodeCache.clear()
    for (const cached of this.worldNodeCache.values()) cached.node.destroy({ children: true })
    this.worldNodeCache.clear()
    for (const cached of this.uiNodeCache.values()) cached.node.destroy({ children: true })
    this.uiNodeCache.clear()
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
      if (!this.isPlaying && this.activeTool === 'pan') {
        this.gizmoMode = 'pan'
        this.panState.lastX = event.global.x
        this.panState.lastY = event.global.y
        this.app.stage.cursor = 'grabbing'
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

