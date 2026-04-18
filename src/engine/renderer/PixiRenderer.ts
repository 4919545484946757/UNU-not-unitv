import 'pixi.js/unsafe-eval'
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { AnimationComponent } from '../components/AnimationComponent'
import { CameraComponent } from '../components/CameraComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TransformComponent } from '../components/TransformComponent'
import { Scene } from '../core/Scene'
import { deserializeScene, serializeScene } from '../serialization/sceneSerializer'
import { ScriptRuntime } from '../runtime/ScriptRuntime'
import { InputState } from '../runtime/InputState'
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
  private readonly overlay = new Container()
  private resizeObserver: ResizeObserver | null = null
  private readonly scriptRuntime = new ScriptRuntime()
  private readonly inputState = new InputState()
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
    this.root.addChild(this.overlay)
    this.app.stage.addChild(this.root)
    this.options.container.appendChild(this.app.canvas)

    this.sourceScene = scene
    this.currentScene = scene
    this.inputState.attach()
    this.resetCameraTransform()
    this.installStageInteractions()
    this.drawGrid()
    if (scene) await this.renderScene(scene)

    this.resizeObserver = new ResizeObserver(() => {
      this.drawGrid()
      this.drawSelectionGizmo()
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

    if (!scene) {
      this.isPlaying = false
      this.isPaused = false
      this.playScene = null
      this.currentScene = null
      this.resetCameraTransform()
      return
    }

    if (!isPlaying) {
      this.isPlaying = false
      this.isPaused = false
      if (this.playScene) {
        this.scriptRuntime.destroyScene(this.playScene)
      }
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
      this.updateCameraFromScene(this.playScene)
      void this.renderScene(this.playScene)
    }

    this.isPlaying = true
    this.isPaused = isPaused
    if (this.currentScene) this.updateCameraFromScene(this.currentScene)
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
    const nodes: Container[] = []

    for (const entity of scene.entities) {
      const transform = entity.getComponent<TransformComponent>('Transform')
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const collider = entity.getComponent<ColliderComponent>('Collider')
      if (!transform || !sprite) continue

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

      nodes.push(node)
    }

    if (version !== this.renderVersion) return

    const removable = this.world.children.filter((child) => child.label !== 'grid')
    removable.forEach((child) => child.destroy())
    nodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach((node) => this.world.addChild(node))
    this.drawGrid()
    this.drawSelectionGizmo()
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
      const sprite = entity?.getComponent<SpriteComponent>('Sprite')
      if (!entity || !transform || !sprite) return

      const local = event.getLocalPosition(this.world)
      if (this.gizmoMode === 'move') {
        transform.x = local.x - this.dragOffset.x
        transform.y = local.y - this.dragOffset.y
        if (this.isPlaying) void this.renderScene(this.currentScene)
        else this.options.onSceneMutated?.()
      } else if (this.gizmoMode === 'scale') {
        const dx = local.x - this.scaleState.startPointerX
        const dy = local.y - this.scaleState.startPointerY
        transform.scaleX = Math.max(0.1, this.scaleState.startScaleX + dx / Math.max(40, sprite.width))
        transform.scaleY = Math.max(0.1, this.scaleState.startScaleY + dy / Math.max(40, sprite.height))
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
      if (!transform || !sprite || !sprite.visible) continue
      const halfW = (sprite.width * Math.abs(transform.scaleX)) / 2
      const halfH = (sprite.height * Math.abs(transform.scaleY)) / 2
      if (x >= transform.x - halfW && x <= transform.x + halfW && y >= transform.y - halfH && y <= transform.y + halfH) {
        return { id: entity.id, transform }
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
    project.setStatus(`已加载贴图：${texturePath}`)
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
        image.onerror = () => reject(new Error('图片解码失败'))
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
    if (!entity || !transform || !sprite) return

    const box = new Graphics()
    box.rect(
      transform.x - (sprite.width * transform.scaleX) / 2,
      transform.y - (sprite.height * transform.scaleY) / 2,
      sprite.width * transform.scaleX,
      sprite.height * transform.scaleY
    )
    box.stroke({ color: 0x56b6c2, alpha: 1, width: 2 })

    const center = new Graphics()
    center.moveTo(transform.x - 12, transform.y)
    center.lineTo(transform.x + 12, transform.y)
    center.moveTo(transform.x, transform.y - 12)
    center.lineTo(transform.x, transform.y + 12)
    center.stroke({ color: 0x56b6c2, alpha: 0.9, width: 2 })

    this.overlay.addChild(box, center)

    const editor = useEditorStore()
    if (editor.tool === 'scale') {
      const handleSize = 12
      const handleX = transform.x + (sprite.width * transform.scaleX) / 2
      const handleY = transform.y + (sprite.height * transform.scaleY) / 2
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
    this.inputState.detach()
    this.resizeObserver?.disconnect()
    this.app?.destroy(true, { children: true })
  }
}
