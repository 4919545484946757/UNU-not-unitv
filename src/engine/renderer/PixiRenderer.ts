import 'pixi.js/unsafe-eval'
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { AnimationComponent } from '../components/AnimationComponent'
import { AudioComponent } from '../components/AudioComponent'
import { CameraComponent } from '../components/CameraComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TilemapComponent } from '../components/TilemapComponent'
import { TransformComponent } from '../components/TransformComponent'
import { UIComponent } from '../components/UIComponent'
import { Scene } from '../core/Scene'
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
}

type GizmoMode = 'none' | 'move' | 'scale'

export class PixiRenderer {
  private app!: Application
  private readonly root = new Container()
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
  private textureCache = new Map<string, Texture>()
  private selectedEntityId = ''
  private activeTool: 'select' | 'move' | 'scale' = 'select'
  private gizmoMode: GizmoMode = 'none'
  private dragOffset = { x: 0, y: 0 }
  private scaleState = { startPointerX: 0, startPointerY: 0, startScaleX: 1, startScaleY: 1 }
  private renderVersion = 0
  private renderInFlight: Promise<void> | null = null
  private queuedScene: Scene | null = null

  constructor(private readonly options: PixiRendererOptions) {}

  async init(scene: Scene | null) {
    this.app = new Application()
    await this.app.init({
      background: '#0b0f16',
      resizeTo: this.options.container,
      antialias: true
    })

    this.root.addChild(this.world)
    this.root.addChild(this.ui)
    this.root.addChild(this.overlay)
    this.app.stage.addChild(this.root)
    this.options.container.appendChild(this.app.canvas)

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
        this.scriptRuntime.updateScene(this.currentScene, delta, this.inputState)
        applySceneAnimation(this.currentScene, delta, (event) => {
          projectStore.setStatus(`动画事件：${event.name} @ frame ${event.frame}`)
        })
        void this.audioRuntime.syncScene(this.currentScene)
        this.updateCameraFromScene(this.currentScene)
        void this.renderScene(this.currentScene)
      }
      this.inputState.endFrame()
    })
  }

  setGridVisible(visible: boolean) {
    this.gridVisible = visible
    this.drawGrid()
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
      this.audioRuntime.stopAll()
      this.resetCameraTransform()
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
      void this.renderScene(scene)
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
    this.audioRuntime.setPaused(isPaused)
    if (this.currentScene) {
      void this.audioRuntime.syncScene(this.currentScene)
      this.updateCameraFromScene(this.currentScene)
    }
  }

  setSelection(entityId: string) {
    this.selectedEntityId = entityId
    this.drawSelectionGizmo()
  }

  setTool(tool: 'select' | 'move' | 'scale') {
    this.activeTool = tool
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
    const version = ++this.renderVersion
    const worldNodes: Container[] = []
    const uiNodes: Container[] = []

    for (const entity of scene.entities) {
      const transform = entity.getComponent<TransformComponent>('Transform')
      const ui = entity.getComponent<UIComponent>('UI')
      const tilemap = entity.getComponent<TilemapComponent>('Tilemap')
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const collider = entity.getComponent<ColliderComponent>('Collider')
      if (!transform) continue

      if (ui?.enabled) {
        const uiNode = this.createUiNode(entity, transform, ui)
        uiNodes.push(uiNode)
        continue
      }
      if (tilemap?.enabled) {
        const tilemapNode = this.createTilemapNode(entity.id, entity.name, transform, tilemap)
        worldNodes.push(tilemapNode)
        continue
      }
      if (!sprite) continue

      const node = new Container()
      node.label = entity.id
      node.x = transform.x
      node.y = transform.y
      node.rotation = transform.rotation
      node.scale.set(transform.scaleX, transform.scaleY)
      node.eventMode = 'static'
      node.cursor = 'pointer'
      node.zIndex = transform.zIndex ?? 0
      node.on('pointerdown', (event: FederatedPointerEvent) => {
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
      if (version !== this.renderVersion) return
      node.addChild(textureNode)

      const label = new Text({
        text: entity.name,
        style: { fill: '#ffffff', fontSize: 12 }
      })
      label.x = -sprite.width / 2
      label.y = -sprite.height / 2 - 18
      node.addChild(label)

      if (collider) {
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

      worldNodes.push(node)
    }

    if (version !== this.renderVersion) return

    const removableWorld = this.world.children.filter((child) => child.label !== 'grid')
    removableWorld.forEach((child) => child.destroy())
    worldNodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach((node) => this.world.addChild(node))

    this.ui.removeChildren().forEach((child) => child.destroy())
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

  private createTilemapNode(entityId: string, entityName: string, transform: TransformComponent, tilemap: TilemapComponent) {
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
    for (let i = 0; i < total; i += 1) {
      const col = i % tilemap.columns
      const row = Math.floor(i / tilemap.columns)
      const x = col * tilemap.tileWidth
      const y = row * tilemap.tileHeight
      const tile = Number(tilemap.tiles[i] ?? 0)
      if (tile > 0) {
        graphics.rect(x, y, tilemap.tileWidth, tilemap.tileHeight)
        const color = palette[(tile - 1) % palette.length]
        graphics.fill({ color, alpha: 0.9 })
      }
      graphics.rect(x, y, tilemap.tileWidth, tilemap.tileHeight)
      graphics.stroke({ color: 0x1e2b3d, alpha: 0.65, width: 1 })
      if (tilemap.showCollision && Number(tilemap.collision[i] ?? 0) > 0) {
        graphics.rect(x + 3, y + 3, tilemap.tileWidth - 6, tilemap.tileHeight - 6)
        graphics.stroke({ color: 0xff6b6b, alpha: 0.8, width: 2 })
      }
    }
    node.addChild(graphics)

    const label = new Text({
      text: `${entityName} (${tilemap.columns}x${tilemap.rows})`,
      style: { fill: '#cde8ff', fontSize: 12 }
    })
    label.x = 0
    label.y = -18
    node.addChild(label)
    return node
  }

  private installStageInteractions() {
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.isPlaying) {
        const local = event.getLocalPosition(this.world)
        const picked = this.pickEntityAt(local.x, local.y)
        if (picked) {
          this.selectedEntityId = picked.id
          this.options.onEntitySelected?.(picked.id)
          this.drawSelectionGizmo()
          this.dragOffset.x = local.x - picked.transform.x
          this.dragOffset.y = local.y - picked.transform.y
          if (this.activeTool === 'move') {
            this.gizmoMode = 'move'
          }
        } else if (this.activeTool === 'select') {
          this.selectedEntityId = ''
          this.options.onEntitySelected?.('')
          this.drawSelectionGizmo()
        }
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
    })
    this.app.stage.on('pointerupoutside', () => {
      this.gizmoMode = 'none'
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

  private async createSpriteNode(sprite: SpriteComponent) {
    const texture = await this.resolveTexture(sprite.texturePath)
    if (texture) {
      const node = new Sprite(texture)
      node.visible = sprite.visible
      node.alpha = sprite.alpha
      node.anchor.set(0.5)
      if (sprite.preserveAspect) {
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

  private async resolveTexture(texturePath: string) {
    if (!texturePath) return null
    if (this.textureCache.has(texturePath)) return this.textureCache.get(texturePath) ?? null

    if (texturePath.startsWith('atlas://')) {
      const texture = await this.resolveAtlasFrameTexture(texturePath)
      if (texture) this.textureCache.set(texturePath, texture)
      return texture
    }

    const assets = useAssetStore()
    const project = useProjectStore()
    const dataUrl = assets.previews[texturePath] || await assets.ensurePreview(texturePath)
    if (!dataUrl) return null
    const texture = await this.loadTextureFromDataUrl(dataUrl)
    this.textureCache.set(texturePath, texture)
    project.setStatus(`宸插姞杞借创鍥撅細${texturePath}`)
    return texture
  }


  private async loadTextureFromDataUrl(dataUrl: string) {
    const image = new Image()
    image.decoding = 'async'
    image.src = dataUrl
    await image.decode().catch(() => {
      if (image.complete) return
      return new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('鍥剧墖瑙ｇ爜澶辫触'))
      })
    })
    return Texture.from(image)
  }

  private async resolveAtlasFrameTexture(texturePath: string) {
    const match = texturePath.match(/^atlas:\/\/(.+)#(\d+),(\d+),(\d+),(\d+)$/)
    if (!match) return null
    const [, imagePath, x, y, w, h] = match
    const baseTexture = await this.resolveTexture(imagePath)
    if (!baseTexture) return null
    const frame = new Rectangle(Number(x), Number(y), Number(w), Number(h))
    return new Texture({ source: (baseTexture as any).source, frame })
  }

  private resetAnimations(scene: Scene) {
    for (const entity of scene.entities) {
      const animation = entity.getComponent<AnimationComponent>('Animation')
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      if (!animation) continue
      animation.elapsed = 0
      animation.currentFrame = 0
      animation.playing = true
      const firstFrame = animation.framePaths[0]
      if (sprite && firstFrame) sprite.texturePath = firstFrame
    }
  }

  private updateCameraFromScene(scene: Scene) {
    const cameraEntity = scene.entities.find((entity) => {
      const camera = entity.getComponent<CameraComponent>('Camera')
      const transform = entity.getComponent<TransformComponent>('Transform')
      return !!camera && !!transform && camera.enabled
    })
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

  private resetCameraTransform() {
    this.world.scale.set(1)
    this.world.position.set(0, 0)
    this.overlay.scale.set(1)
    this.overlay.position.set(0, 0)
  }

  private drawSelectionGizmo() {
    this.overlay.removeChildren().forEach((child) => child.destroy())
    if (!this.currentScene || !this.selectedEntityId) return
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

  private drawGrid() {
    const existing = this.world.children.find((child) => child.label === 'grid')
    existing?.destroy()
    if (!this.gridVisible) return

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
    this.app?.destroy(true, { children: true })
  }
}

