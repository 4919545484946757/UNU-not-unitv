import * as THREE from 'three'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { CameraComponent } from '../components/CameraComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { CustomComponent } from '../components/CustomComponent'
import { ScriptComponent } from '../components/ScriptComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import { TransformComponent } from '../components/TransformComponent'
import { Scene } from '../core/Scene'
import { ScriptRuntime } from '../runtime/ScriptRuntime'
import { deserializeScene, serializeScene } from '../serialization/sceneSerializer'
import type { DebugOverlayOptions } from '../../stores/editor'
import { useAssetStore } from '../../stores/assets'
import { useProjectStore } from '../../stores/project'
import { EditorCameraController, type EditorCameraSettings, type EditorCameraState } from './EditorCameraController'
import { loadGltfModel, loadThreeTexture } from './modelAssetLoader'
import type { EditorTool, SceneRenderer, SceneRendererOptions } from './RendererTypes'

type ThreeObjectConfig = {
  kind?: string
  z?: number
  depth?: number
  intensity?: number
  metalness?: number
  roughness?: number
  opacity?: number
  color?: number | string
  texturePath?: string
  normalMapPath?: string
  modelNodeOverrides?: Record<string, ModelNodeOverride>
  rotationX?: number
  rotationY?: number
  rotationZ?: number
  modelPath?: string
}

type ModelNodeOverride = {
  visible?: boolean
  color?: number | string
  opacity?: number
  position?: { x?: number; y?: number; z?: number }
  rotation?: { x?: number; y?: number; z?: number }
  scale?: { x?: number; y?: number; z?: number }
}

type ThreeEditorCamera = THREE.OrthographicCamera | THREE.PerspectiveCamera
type CameraProjection = 'orthographic' | 'perspective'

function roundTransformValue(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10000) / 10000
}

function sanitizePositive(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export class ThreeRenderer implements SceneRenderer {
  private renderer: THREE.WebGLRenderer | null = null
  private scene3d = new THREE.Scene()
  private camera: ThreeEditorCamera | null = null
  private cameraProjection: CameraProjection = 'orthographic'
  private viewportWidth = 1
  private viewportHeight = 1
  private editorCameraController: EditorCameraController | null = null
  private editorCameraSettings: EditorCameraSettings = { controlMode: 'orbit', projection: 'orthographic', moveSpeed: 280 }
  private grid: THREE.GridHelper | null = null
  private transformControls: TransformControls | null = null
  private transformControlsHelper: THREE.Object3D | null = null
  private debugOverlayGroup = new THREE.Group()
  private debugOverlayVisible = true
  private debugOverlayOptions: DebugOverlayOptions = { bounds: false, colliders: false, axes: true, lights: true, cameras: true }
  private playDebugEnabled = false
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private entityObjects = new Map<string, THREE.Object3D>()
  private selectedEntityIds: string[] = []
  private primarySelection = ''
  private primaryModelNodePath = ''
  private activeTool: EditorTool = 'select'
  private scene: Scene | null = null
  private isPlaying = false
  private isPaused = false
  private playScene: Scene | null = null
  private readonly scriptRuntime = new ScriptRuntime()
  private lastRuntimeTick = performance.now()
  private runtimeEntitySignature = ''
  private activeCameraEntityId = ''
  private isDragging = false
  private dragEntityId = ''
  private dragModelNodePath = ''
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  private dragOffset = new THREE.Vector3()
  private animationFrame = 0
  private renderSceneToken = 0
  private pendingTransformMutation = false
  private cameraPreviewSnapshot: { state: EditorCameraState; projection: CameraProjection } | null = null

  constructor(private readonly options: SceneRendererOptions) {}

  async init(scene: Scene | null) {
    this.options.container.style.position = this.options.container.style.position || 'relative'
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x0b0f16, 1)
    this.renderer.domElement.style.position = 'absolute'
    this.renderer.domElement.style.inset = '0'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.options.container.appendChild(this.renderer.domElement)
    this.camera = this.createDefaultOrthographicCamera()
    this.scene3d.background = new THREE.Color(0x0b0f16)
    this.scene3d.add(new THREE.HemisphereLight(0xddeeff, 0x202431, 0.85))
    this.grid = new THREE.GridHelper(1200, 24, 0x32506d, 0x1d2c3d)
    this.grid.rotation.x = Math.PI / 2
    this.scene3d.add(this.grid)
    this.debugOverlayGroup.name = 'UNU 3D Debug Overlay'
    this.scene3d.add(this.debugOverlayGroup)
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement)
    this.transformControls.enabled = false
    this.transformControls.setSpace('local')
    this.transformControls.setSize(0.85)
    this.transformControls.addEventListener('objectChange', this.handleTransformControlObjectChange)
    this.transformControls.addEventListener('dragging-changed', this.handleTransformControlDraggingChanged)
    this.transformControlsHelper = this.transformControls.getHelper()
    this.transformControlsHelper.visible = false
    this.scene3d.add(this.transformControlsHelper)
    this.installEditorCameraController()
    await this.loadProjectRuntimeScripts(scene || null)
    this.scriptRuntime.setErrorReporter(this.options.onScriptError || null)
    this.scriptRuntime.setConsoleReporter(this.options.onConsoleMessage || null)
    this.attachEvents()
    this.resize()
    await this.renderScene(scene || new Scene('empty', 'Empty'))
    this.animate()
  }

  async renderScene(scene: Scene) {
    const token = ++this.renderSceneToken
    this.scene = scene
    if (this.isPlaying) this.configureRuntimeCamera(scene)
    else this.configureEditorCamera()
    this.transformControls?.detach()
    if (this.transformControlsHelper) this.transformControlsHelper.visible = false
    this.clearEntityObjects()
    for (const entity of scene.entities) {
      if (token !== this.renderSceneToken) return
      const transform = entity.getComponent<TransformComponent>('Transform')
      if (!transform) continue
      const object = await this.createEntityObject(entity, transform)
      if (token !== this.renderSceneToken) {
        this.disposeObject(object)
        return
      }
      if (!object) continue
      object.userData.entityId = entity.id
      object.traverse((child) => { child.userData.entityId = entity.id })
      this.entityObjects.set(entity.id, object)
      this.scene3d.add(object)
    }
    this.rebuildDebugOverlay(scene)
    this.updateTransformControls()
    this.render()
  }

  setGridVisible(visible: boolean) {
    if (this.grid) this.grid.visible = visible
    this.render()
  }

  setPlayDebugEnabled(enabled = false) {
    this.playDebugEnabled = !!enabled
    this.rebuildDebugOverlay(this.isPlaying ? this.playScene : this.scene)
    this.render()
  }

  setDebugOverlayVisible(visible: boolean) {
    this.debugOverlayVisible = !!visible
    this.rebuildDebugOverlay(this.isPlaying ? this.playScene : this.scene)
    this.render()
  }

  setDebugOverlayOptions(options: DebugOverlayOptions) {
    this.debugOverlayOptions = { ...options }
    this.rebuildDebugOverlay(this.isPlaying ? this.playScene : this.scene)
    this.render()
  }

  async setRuntimeState(isPlaying = false, _isPaused = false, scene: Scene | null = null) {
    const wasPlaying = this.isPlaying
    this.isPlaying = isPlaying
    this.isPaused = _isPaused
    if (!isPlaying) {
      if (this.playScene) this.scriptRuntime.destroyScene(this.playScene)
      this.playScene = null
      this.runtimeEntitySignature = ''
      this.scriptRuntime.resetAll()
      if (scene) await this.renderScene(scene)
      else this.configureEditorCamera()
    } else {
      if (!this.playScene || !wasPlaying) {
        if (this.playScene) this.scriptRuntime.destroyScene(this.playScene)
        this.playScene = scene ? deserializeScene(serializeScene(scene)) : null
        if (this.playScene) {
          await this.loadProjectRuntimeScripts(this.playScene)
          this.scriptRuntime.initScene(this.playScene)
          this.scriptRuntime.startScene(this.playScene)
          this.scriptRuntime.enterScene(this.playScene)
          this.lastRuntimeTick = performance.now()
          this.runtimeEntitySignature = this.getRuntimeEntitySignature(this.playScene)
          await this.renderScene(this.playScene)
        }
      }
      if (this.playScene) this.configureRuntimeCamera(this.playScene)
    }
    this.updateTransformControls()
    this.render()
  }

  async hotReloadProjectRuntimeFiles() {
    await this.loadProjectRuntimeScripts(this.playScene || this.scene)
    if (this.playScene) this.scriptRuntime.reloadSceneScripts(this.playScene)
  }

  setSelections(entityIds: string[], primaryId?: string, modelNodePath?: string) {
    this.selectedEntityIds = [...entityIds]
    this.primarySelection = primaryId || entityIds[0] || ''
    this.primaryModelNodePath = modelNodePath || ''
    this.applySelectionMaterials()
    this.updateTransformControls()
    this.render()
  }

  setTool(tool: EditorTool) {
    this.activeTool = tool
    this.updateTransformControls()
    this.render()
  }

  setEditorCameraSettings(settings: Partial<EditorCameraSettings>) {
    this.editorCameraSettings = { ...this.editorCameraSettings, ...settings }
    this.configureEditorCamera()
    this.render()
  }

  setSelectedCameraFromEditorView(entityId: string) {
    if (this.isPlaying || !this.camera || !this.editorCameraController || !this.scene) return false
    const entity = this.scene.getEntityById(entityId)
    const transform = entity?.getComponent<TransformComponent>('Transform')
    const camera = entity?.getComponent<CameraComponent>('Camera')
    if (!entity || !transform || !camera) return false
    const state = this.editorCameraController.getState()
    transform.x = roundTransformValue(state.position.x)
    transform.y = roundTransformValue(-state.position.y)
    transform.z = roundTransformValue(state.position.z)
    transform.rotationX = roundTransformValue(this.camera.rotation.x)
    transform.rotationY = roundTransformValue(this.camera.rotation.y)
    transform.rotationZ = roundTransformValue(this.camera.rotation.z)
    transform.rotation = transform.rotationZ
    camera.targetX = roundTransformValue(state.target.x)
    camera.targetY = roundTransformValue(-state.target.y)
    camera.targetZ = roundTransformValue(state.target.z)
    camera.projection = this.camera instanceof THREE.PerspectiveCamera ? 'perspective' : 'orthographic'
    if (this.camera instanceof THREE.PerspectiveCamera) {
      camera.fov = roundTransformValue(this.camera.fov)
      camera.near = roundTransformValue(this.camera.near)
      camera.far = roundTransformValue(this.camera.far)
      camera.zoom = roundTransformValue(this.camera.zoom || 1)
    } else {
      camera.near = roundTransformValue(this.camera.near)
      camera.far = roundTransformValue(this.camera.far)
      camera.zoom = roundTransformValue(this.camera.zoom || 1)
    }
    this.rebuildDebugOverlay(this.scene)
    this.render()
    return true
  }

  previewCameraView(entityId: string) {
    if (this.isPlaying || !this.scene) return false
    const entity = this.scene.getEntityById(entityId)
    const transform = entity?.getComponent<TransformComponent>('Transform')
    const camera = entity?.getComponent<CameraComponent>('Camera')
    if (!entity || !transform || !camera) return false
    if (!this.editorCameraController) return false
    if (!this.cameraPreviewSnapshot) {
      this.cameraPreviewSnapshot = {
        state: this.editorCameraController.getState(),
        projection: this.cameraProjection
      }
    }
    const projection = camera.projection === 'perspective' ? 'perspective' : 'orthographic'
    if (!this.camera || this.cameraProjection !== projection) {
      this.camera = this.createCamera(projection)
      if (this.transformControls) this.transformControls.camera = this.camera
      this.editorCameraController.setCamera(this.camera)
    }
    this.applyCameraComponentToEditorCamera(camera)
    const position = new THREE.Vector3(
      Number(transform.x || 0),
      -Number(transform.y || 0),
      Number(transform.z || 720) || 720
    )
    const target = new THREE.Vector3(
      Number(camera.targetX || 0),
      -Number(camera.targetY || 0),
      Number(camera.targetZ || 0)
    )
    if (position.distanceToSquared(target) < 0.0001) target.set(position.x, position.y - 1, position.z)
    this.editorCameraController.setView(position, target)
    this.updateTransformControls()
    this.render()
    return true
  }

  exitCameraPreview() {
    if (!this.cameraPreviewSnapshot || !this.editorCameraController) return false
    const snapshot = this.cameraPreviewSnapshot
    this.cameraPreviewSnapshot = null
    if (!this.camera || this.cameraProjection !== snapshot.projection) {
      this.camera = this.createCamera(snapshot.projection)
      if (this.transformControls) this.transformControls.camera = this.camera
      this.editorCameraController.setCamera(this.camera)
    }
    this.editorCameraController.setState(snapshot.state)
    this.updateTransformControls()
    this.render()
    return true
  }

  zoomViewportByFactor(clientX: number, clientY: number, factor: number) {
    if (!this.camera || !Number.isFinite(factor) || factor <= 0) return
    if (this.camera instanceof THREE.OrthographicCamera) {
      const nextZoom = Math.max(0.2, Math.min(8, this.camera.zoom * factor))
      this.camera.zoom = nextZoom
    } else {
      const target = this.editorCameraController?.target || new THREE.Vector3()
      const direction = this.camera.position.clone().sub(target)
      direction.multiplyScalar(1 / factor)
      const nextDistance = Math.max(80, Math.min(6000, direction.length()))
      direction.setLength(nextDistance)
      this.camera.position.copy(target).add(direction)
    }
    this.camera.updateProjectionMatrix()
    void clientX
    void clientY
    this.render()
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame)
    this.detachEvents()
    this.clearEntityObjects()
    this.transformControls?.removeEventListener('objectChange', this.handleTransformControlObjectChange)
    this.transformControls?.removeEventListener('dragging-changed', this.handleTransformControlDraggingChanged)
    this.transformControls?.detach()
    this.transformControls?.dispose()
    this.editorCameraController?.dispose()
    if (this.transformControlsHelper) this.scene3d.remove(this.transformControlsHelper)
    this.clearDebugOverlay()
    this.scene3d.remove(this.debugOverlayGroup)
    this.renderer?.dispose()
    this.renderer?.domElement.remove()
    this.renderer = null
    this.camera = null
    this.transformControls = null
    this.transformControlsHelper = null
    this.editorCameraController = null
  }

  private createDefaultOrthographicCamera() {
    const camera = new THREE.OrthographicCamera(-400, 400, 240, -240, 0.1, 5000)
    camera.up.set(0, 0, 1)
    camera.position.set(480, 420, 720)
    camera.lookAt(0, 0, 0)
    camera.zoom = 1
    camera.updateProjectionMatrix()
    this.cameraProjection = 'orthographic'
    return camera
  }

  private createCamera(projection: CameraProjection) {
    if (projection === 'perspective') {
      const aspect = Math.max(0.01, this.viewportWidth / Math.max(1, this.viewportHeight))
      const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 5000)
      camera.up.set(0, 0, 1)
      camera.position.set(480, 420, 720)
      camera.lookAt(0, 0, 0)
      this.cameraProjection = 'perspective'
      return camera
    }
    return this.createDefaultOrthographicCamera()
  }

  private configureEditorCamera() {
    this.activeCameraEntityId = ''
    const projection = this.editorCameraSettings.projection
    if (!this.camera || this.cameraProjection !== projection) {
      this.camera = this.createCamera(projection)
      if (this.transformControls) this.transformControls.camera = this.camera
      if (this.editorCameraController) this.editorCameraController.setCamera(this.camera)
      else this.installEditorCameraController()
    }
    this.applyCameraProjectionDefaults(this.camera)
    this.editorCameraController?.setSettings(this.editorCameraSettings)
    this.editorCameraController?.reapply()
  }

  private applyCameraProjectionDefaults(camera: ThreeEditorCamera) {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = Math.max(0.01, this.viewportWidth / Math.max(1, this.viewportHeight))
    } else {
      this.updateOrthographicFrustum(camera)
    }
    camera.updateProjectionMatrix()
  }

  private applyCameraComponentToEditorCamera(cameraComponent: CameraComponent) {
    if (!this.camera) return
    this.camera.near = sanitizePositive(cameraComponent.near, 0.1)
    this.camera.far = Math.max(this.camera.near + 1, sanitizePositive(cameraComponent.far, 5000))
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.fov = Math.max(1, Math.min(160, Number(cameraComponent.fov || 50)))
      this.camera.aspect = Math.max(0.01, this.viewportWidth / Math.max(1, this.viewportHeight))
      this.camera.zoom = Math.max(0.1, Number(cameraComponent.zoom || 1))
    } else {
      this.updateOrthographicFrustum(this.camera)
      this.camera.zoom = Math.max(0.1, Number(cameraComponent.zoom || 1))
    }
    this.camera.updateProjectionMatrix()
  }

  private findActiveSceneCamera(scene: Scene) {
    for (const entity of scene.entities) {
      const camera = entity.getComponent<CameraComponent>('Camera')
      const transform = entity.getComponent<TransformComponent>('Transform')
      if (camera?.enabled && transform) return { entityId: entity.id, camera, transform }
    }
    return null
  }

  private configureRuntimeCamera(scene: Scene) {
    const activeCamera = this.findActiveSceneCamera(scene)
    if (!activeCamera) {
      this.configureEditorCamera()
      return
    }
    this.activeCameraEntityId = activeCamera.entityId
    const projection = activeCamera.camera.projection === 'perspective' ? 'perspective' : 'orthographic'
    if (!this.camera || this.cameraProjection !== projection) {
      this.camera = this.createCamera(projection)
      if (this.transformControls) this.transformControls.camera = this.camera
    }
    const camera = this.camera
    camera.near = sanitizePositive(activeCamera.camera.near, 0.1)
    camera.far = Math.max(camera.near + 1, sanitizePositive(activeCamera.camera.far, 5000))
    camera.position.set(
      Number(activeCamera.transform.x || 0),
      -Number(activeCamera.transform.y || 0),
      Number(activeCamera.transform.z || 720) || 720
    )
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = Math.max(1, Math.min(160, Number(activeCamera.camera.fov || 50)))
      camera.aspect = Math.max(0.01, this.viewportWidth / Math.max(1, this.viewportHeight))
      camera.zoom = Math.max(0.1, Number(activeCamera.camera.zoom || 1))
    } else {
      this.updateOrthographicFrustum(camera)
      camera.zoom = Math.max(0.1, Number(activeCamera.camera.zoom || 1))
    }
    camera.up.set(0, 0, 1)
    camera.lookAt(
      Number(activeCamera.camera.targetX || 0),
      -Number(activeCamera.camera.targetY || 0),
      Number(activeCamera.camera.targetZ || 0)
    )
    camera.updateProjectionMatrix()
  }

  private installEditorCameraController() {
    if (!this.camera || !this.renderer) return
    this.editorCameraController?.dispose()
    this.editorCameraController = new EditorCameraController(this.camera, this.renderer.domElement, () => this.render())
    this.editorCameraController.setSettings(this.editorCameraSettings)
  }

  private async createEntityObject(entity: Scene['entities'][number], transform: TransformComponent) {
    const sprite = entity.getComponent<SpriteComponent>('Sprite')
    const collider = entity.getComponent<ColliderComponent>('Collider')
    const camera = entity.getComponent<CameraComponent>('Camera')
    const three = entity.getComponent<CustomComponent>('ThreeObject')?.data as ThreeObjectConfig | undefined
    const rawKind = String(three?.kind || (sprite ? 'box' : '')).toLowerCase()
    const kind = three?.modelPath && !rawKind.endsWith('light') ? 'model' : rawKind
    const z = Number(transform.z ?? three?.z ?? 0)
    const lightColor = sprite?.tint || 0xffffff
    const lightIntensity = Number(three?.intensity ?? 1.3)
    if (kind === 'ambientlight') {
      return new THREE.AmbientLight(lightColor, lightIntensity)
    }
    if (kind === 'pointlight') {
      const light = new THREE.PointLight(lightColor, lightIntensity, 1200)
      light.position.set(transform.x, -transform.y, z || 240)
      return light
    }
    if (kind === 'directionallight') {
      const light = new THREE.DirectionalLight(lightColor, lightIntensity)
      light.position.set(transform.x, -transform.y, z || 420)
      light.target.position.set(0, 0, 0)
      this.scene3d.add(light.target)
      return light
    }
    if (this.isPlaying && camera) return null
    if (sprite?.visible === false) return null
    const width = Math.max(1, Number(sprite?.width || collider?.width || 80))
    const height = Math.max(1, Number(sprite?.height || collider?.height || 80))
    const depth = Math.max(1, Number(three?.depth ?? Math.min(width, height)))
    const material = await this.createThreeMaterial(sprite, three)
    const position = new THREE.Vector3(transform.x + Number(sprite?.offsetX || 0), -transform.y - Number(sprite?.offsetY || 0), z || depth / 2)
    const rotation = new THREE.Euler(
      Number(transform.rotationX ?? three?.rotationX ?? 0),
      Number(transform.rotationY ?? three?.rotationY ?? 0),
      Number(transform.rotationZ ?? three?.rotationZ ?? transform.rotation ?? 0)
    )
    const scale = new THREE.Vector3(transform.scaleX || 1, transform.scaleY || 1, transform.scaleZ || 1)

    if (kind === 'model' && three?.modelPath) {
      const loaded = await loadGltfModel(three.modelPath).catch((error) => {
        console.warn('[UNU][three] failed to load model', three.modelPath, error)
        return null
      })
      if (loaded) {
        const group = new THREE.Group()
        group.name = `Model: ${three.modelPath}`
        loaded.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (mesh.isMesh) {
            mesh.castShadow = true
            mesh.receiveShadow = true
          }
        })
        this.centerAndFitModel(loaded, Math.max(width, height, depth))
        await this.applyThreeMaterialOverrides(loaded, sprite, three)
        this.applyModelNodeOverrides(loaded, three)
        group.add(loaded)
        group.position.copy(position)
        group.rotation.copy(rotation)
        group.scale.copy(scale)
        return group
      }
    }

    const geometry = kind === 'plane'
      ? new THREE.PlaneGeometry(width, height)
      : new THREE.BoxGeometry(width, height, depth)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    mesh.rotation.copy(rotation)
    mesh.scale.copy(scale)
    return mesh
  }

  private async createThreeMaterial(sprite?: SpriteComponent, three?: ThreeObjectConfig) {
    const opacity = Math.max(0, Math.min(1, Number(three?.opacity ?? sprite?.alpha ?? 1)))
    const material = new THREE.MeshStandardMaterial({
      color: this.resolveThreeColor(three?.color, sprite?.tint || 0xffffff),
      transparent: opacity < 1,
      opacity,
      metalness: Math.max(0, Math.min(1, Number(three?.metalness ?? 0.02))),
      roughness: Math.max(0, Math.min(1, Number(three?.roughness ?? 0.65))),
      side: THREE.DoubleSide
    })
    if (three?.texturePath) {
      material.map = await loadThreeTexture(three.texturePath).catch(() => null)
    }
    if (three?.normalMapPath) {
      material.normalMap = await loadThreeTexture(three.normalMapPath, { normalMap: true }).catch(() => null)
    }
    material.needsUpdate = true
    return material
  }

  private async applyThreeMaterialOverrides(object: THREE.Object3D, sprite?: SpriteComponent, three?: ThreeObjectConfig) {
    const hasColorOverride = three?.color !== undefined && three?.color !== null && String(three.color).trim() !== ''
    const hasOpacityOverride = three?.opacity !== undefined && three?.opacity !== null
    const color = this.resolveThreeColor(three?.color, sprite?.tint || 0xffffff)
    const opacity = Math.max(0, Math.min(1, Number(three?.opacity ?? 1)))
    const map = three?.texturePath ? await loadThreeTexture(three.texturePath).catch(() => null) : null
    const normalMap = three?.normalMapPath ? await loadThreeTexture(three.normalMapPath, { normalMap: true }).catch(() => null) : null
    object.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const nextMaterials = materials.map((material) => {
        const standard = material instanceof THREE.MeshStandardMaterial
          ? material.clone()
          : new THREE.MeshStandardMaterial({ map: (material as THREE.MeshBasicMaterial | undefined)?.map || null })
        if (hasColorOverride) standard.color.setHex(color)
        standard.metalness = Math.max(0, Math.min(1, Number(three?.metalness ?? standard.metalness ?? 0.02)))
        standard.roughness = Math.max(0, Math.min(1, Number(three?.roughness ?? standard.roughness ?? 0.65)))
        if (hasOpacityOverride) {
          standard.opacity = opacity
          standard.transparent = opacity < 1
        }
        if (map) standard.map = map
        if (normalMap) standard.normalMap = normalMap
        standard.needsUpdate = true
        return standard
      })
      mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0]
    })
  }

  private applyModelNodeOverrides(object: THREE.Object3D, three?: ThreeObjectConfig) {
    const overrides = three?.modelNodeOverrides || {}
    object.traverse((child) => {
      const path = String(child.userData.modelNodePath || '')
      if (!path) return
      const override = overrides[path]
      if (!override) return
      if (typeof override.visible === 'boolean') child.visible = override.visible
      if (override.position) {
        child.position.set(
          Number.isFinite(Number(override.position.x)) ? Number(override.position.x) : child.position.x,
          Number.isFinite(Number(override.position.y)) ? Number(override.position.y) : child.position.y,
          Number.isFinite(Number(override.position.z)) ? Number(override.position.z) : child.position.z
        )
      }
      if (override.rotation) {
        child.rotation.set(
          Number.isFinite(Number(override.rotation.x)) ? Number(override.rotation.x) : child.rotation.x,
          Number.isFinite(Number(override.rotation.y)) ? Number(override.rotation.y) : child.rotation.y,
          Number.isFinite(Number(override.rotation.z)) ? Number(override.rotation.z) : child.rotation.z
        )
      }
      if (override.scale) {
        child.scale.set(
          Number.isFinite(Number(override.scale.x)) ? Number(override.scale.x) : child.scale.x,
          Number.isFinite(Number(override.scale.y)) ? Number(override.scale.y) : child.scale.y,
          Number.isFinite(Number(override.scale.z)) ? Number(override.scale.z) : child.scale.z
        )
      }
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        const standard = material as THREE.MeshStandardMaterial
        if (override.color !== undefined && standard.color) {
          standard.color.setHex(this.resolveThreeColor(override.color, standard.color.getHex()))
        }
        if (typeof override.opacity === 'number' && Number.isFinite(override.opacity)) {
          standard.opacity = Math.max(0, Math.min(1, override.opacity))
          standard.transparent = standard.opacity < 1
        }
        standard.needsUpdate = true
      }
    })
  }

  private centerAndFitModel(object: THREE.Object3D, targetSize: number) {
    const box = new THREE.Box3().setFromObject(object)
    if (box.isEmpty()) return
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const largest = Math.max(size.x, size.y, size.z, 1)
    object.position.sub(center)
    object.scale.multiplyScalar(Math.max(0.001, targetSize / largest))
  }

  private resolveThreeColor(value: unknown, fallback: number) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(0xffffff, Math.round(value)))
    if (typeof value === 'string') {
      const normalized = value.trim().replace(/^#/, '0x')
      const parsed = Number(normalized)
      if (Number.isFinite(parsed)) return Math.max(0, Math.min(0xffffff, Math.round(parsed)))
    }
    return Math.max(0, Math.min(0xffffff, Math.round(Number(fallback) || 0xffffff)))
  }

  private applySelectionMaterials() {
    for (const [entityId, object] of this.entityObjects.entries()) {
      const selected = this.selectedEntityIds.includes(entityId)
      object.traverse((child) => {
        const mesh = child as THREE.Mesh
        const materials = Array.isArray(mesh.material) ? mesh.material : (mesh.material ? [mesh.material] : [])
        if (!materials.length) return
        const modelNodeSelected = selected && this.primaryModelNodePath && child.userData.modelNodePath === this.primaryModelNodePath
        const color = modelNodeSelected ? 0x615000 : selected ? (entityId === this.primarySelection ? 0x442800 : 0x003044) : 0x000000
        for (const material of materials) {
          const standard = material as THREE.MeshStandardMaterial
          if (!standard.emissive) continue
          standard.emissive.setHex(color)
        }
      })
    }
  }

  private updateTransformControls() {
    const controls = this.transformControls
    if (!controls) return
    const canUseGizmo = !this.isPlaying && (this.activeTool === 'move' || this.activeTool === 'rotate' || this.activeTool === 'scale')
    const object = canUseGizmo && this.primarySelection ? this.getTransformControlTarget(this.primarySelection, this.primaryModelNodePath) : null
    if (!object || !this.isObjectAttachedToScene(object)) {
      controls.detach()
      if (this.transformControlsHelper) this.transformControlsHelper.visible = false
      controls.enabled = false
      return
    }
    controls.attach(object)
    if (this.transformControlsHelper) this.transformControlsHelper.visible = true
    controls.enabled = true
    controls.setMode(this.activeTool === 'rotate' ? 'rotate' : this.activeTool === 'scale' ? 'scale' : 'translate')
    controls.setSpace(this.activeTool === 'move' ? 'world' : 'local')
  }

  private getTransformControlTarget(entityId: string, modelNodePath = '') {
    const object = this.entityObjects.get(entityId) || null
    if (!object || !modelNodePath) return object
    let target: THREE.Object3D | null = null
    object.traverse((child) => {
      if (!target && child.userData.modelNodePath === modelNodePath) target = child
    })
    return target || object
  }

  private saveModelNodeTransform(entity: Scene['entities'][number], modelNodePath: string, object: THREE.Object3D) {
    const three = entity.getComponent<CustomComponent>('ThreeObject')?.data as ThreeObjectConfig | undefined
    if (!three) return
    three.modelNodeOverrides = three.modelNodeOverrides || {}
    const override = three.modelNodeOverrides[modelNodePath] || {}
    three.modelNodeOverrides[modelNodePath] = {
      ...override,
      position: {
        x: roundTransformValue(object.position.x),
        y: roundTransformValue(object.position.y),
        z: roundTransformValue(object.position.z)
      },
      rotation: {
        x: roundTransformValue(object.rotation.x),
        y: roundTransformValue(object.rotation.y),
        z: roundTransformValue(object.rotation.z)
      },
      scale: {
        x: roundTransformValue(object.scale.x),
        y: roundTransformValue(object.scale.y),
        z: roundTransformValue(object.scale.z)
      }
    }
  }

  private readonly handleTransformControlDraggingChanged = (event: { value: unknown }) => {
    const dragging = Boolean(event.value)
    this.isDragging = dragging
    if (!dragging) {
      this.dragEntityId = ''
      this.dragModelNodePath = ''
      this.flushPendingTransformMutation()
    }
  }

  private readonly handleTransformControlObjectChange = () => {
    const object = this.transformControls?.object
    if (!object) return
    const entityId = String(object.userData.entityId || '')
    const entity = this.scene?.getEntityById(entityId)
    const modelNodePath = String(object.userData.modelNodePath || '')
    if (entity && modelNodePath) {
      this.saveModelNodeTransform(entity, modelNodePath, object)
      this.pendingTransformMutation = true
      this.rebuildDebugOverlay(this.scene)
      this.render()
      return
    }
    const transform = entity?.getComponent<TransformComponent>('Transform')
    if (!transform) return
    const sprite = entity?.getComponent<SpriteComponent>('Sprite')
    transform.x = roundTransformValue(object.position.x - Number(sprite?.offsetX || 0))
    transform.y = roundTransformValue(-(object.position.y + Number(sprite?.offsetY || 0)))
    transform.z = roundTransformValue(object.position.z)
    transform.scaleX = roundTransformValue(object.scale.x)
    transform.scaleY = roundTransformValue(object.scale.y)
    transform.scaleZ = roundTransformValue(object.scale.z)
    transform.rotationX = roundTransformValue(object.rotation.x)
    transform.rotationY = roundTransformValue(object.rotation.y)
    transform.rotationZ = roundTransformValue(object.rotation.z)
    transform.rotation = transform.rotationZ
    this.pendingTransformMutation = true
    this.rebuildDebugOverlay(this.scene)
    this.render()
  }

  private flushPendingTransformMutation() {
    if (!this.pendingTransformMutation) return
    this.pendingTransformMutation = false
    this.options.onSceneMutated?.()
  }

  private clearEntityObjects() {
    this.clearDebugOverlay()
    for (const object of this.entityObjects.values()) {
      this.scene3d.remove(object)
      this.disposeObject(object)
    }
    this.entityObjects.clear()
  }

  private rebuildDebugOverlay(scene: Scene | null) {
    this.clearDebugOverlay()
    if (!scene || !this.shouldShowDebugOverlay()) return
    for (const entity of scene.entities) {
      if (entity.debugFrameVisible === false) continue
      const object = this.entityObjects.get(entity.id)
      const transform = entity.getComponent<TransformComponent>('Transform')
      if (!transform) continue
      if (object) {
        if (this.debugOverlayOptions.bounds) this.addEntityBoundsHelper(object, entity.id)
        if (this.debugOverlayOptions.axes) this.addEntityAxesHelper(object)
        if (this.debugOverlayOptions.lights) this.addLightHelper(object)
      }
      if (this.debugOverlayOptions.colliders) this.addColliderHelper(entity, transform)
      if (this.debugOverlayOptions.cameras) this.addCameraFrustumHelper(entity, transform)
    }
  }

  private shouldShowDebugOverlay() {
    return this.debugOverlayVisible && (!this.isPlaying || this.playDebugEnabled)
  }

  private clearDebugOverlay() {
    for (const child of [...this.debugOverlayGroup.children]) {
      this.debugOverlayGroup.remove(child)
      this.disposeObject(child)
    }
  }

  private addEntityBoundsHelper(object: THREE.Object3D, entityId: string) {
    const helper = new THREE.BoxHelper(object, entityId === this.primarySelection ? 0xffcc33 : 0x56b6c2)
    helper.userData.debugHelper = true
    this.debugOverlayGroup.add(helper)
  }

  private addEntityAxesHelper(object: THREE.Object3D) {
    const axes = new THREE.AxesHelper(64)
    axes.position.copy(object.position)
    axes.rotation.copy(object.rotation)
    axes.scale.copy(object.scale)
    axes.userData.debugHelper = true
    this.debugOverlayGroup.add(axes)
  }

  private addColliderHelper(entity: Scene['entities'][number], transform: TransformComponent) {
    const collider = entity.getComponent<ColliderComponent>('Collider')
    if (!collider || collider.showDebugFrame === false) return
    const three = entity.getComponent<CustomComponent>('ThreeObject')?.data as ThreeObjectConfig | undefined
    const depth = Math.max(1, Number(collider.depth ?? three?.depth ?? 80))
    const radius = Math.max(0.1, Number(collider.radius || Math.min(collider.width, collider.height, depth) / 2))
    const capsuleHeight = Math.max(radius * 2, Number(collider.capsuleHeight || collider.height || radius * 2))
    const geometry = collider.shape === 'sphere'
      ? new THREE.SphereGeometry(radius, 24, 12)
      : collider.shape === 'capsule'
        ? new THREE.CapsuleGeometry(radius, Math.max(0.1, capsuleHeight - radius * 2), 8, 16)
        : collider.shape === 'circle'
          ? new THREE.SphereGeometry(Math.max(1, collider.width) / 2, 24, 12)
          : new THREE.BoxGeometry(Math.max(1, collider.width), Math.max(1, collider.height), depth)
    const edges = new THREE.EdgesGeometry(geometry)
    geometry.dispose()
    const material = new THREE.LineBasicMaterial({ color: collider.isTrigger ? 0xff9f43 : 0x83e377, transparent: true, opacity: 0.9 })
    const helper = new THREE.LineSegments(edges, material)
    helper.position.set(
      Number(transform.x || 0) + Number(collider.offsetX || 0),
      -Number(transform.y || 0) - Number(collider.offsetY || 0),
      (Number(transform.z ?? three?.z ?? 0) || depth / 2) + Number(collider.offsetZ || 0)
    )
    helper.rotation.set(
      Number(transform.rotationX ?? three?.rotationX ?? 0),
      Number(transform.rotationY ?? three?.rotationY ?? 0),
      Number(transform.rotationZ ?? three?.rotationZ ?? transform.rotation ?? 0)
    )
    helper.scale.set(transform.scaleX || 1, transform.scaleY || 1, transform.scaleZ || 1)
    helper.userData.debugHelper = true
    this.debugOverlayGroup.add(helper)
  }

  private addLightHelper(object: THREE.Object3D) {
    let helper: THREE.Object3D | null = null
    if (object instanceof THREE.PointLight) helper = new THREE.PointLightHelper(object, 32, 0xffdd66)
    else if (object instanceof THREE.DirectionalLight) helper = new THREE.DirectionalLightHelper(object, 72, 0xffdd66)
    else if (object instanceof THREE.SpotLight) helper = new THREE.SpotLightHelper(object, 0xffdd66)
    if (!helper) return
    helper.userData.debugHelper = true
    this.debugOverlayGroup.add(helper)
  }

  private addCameraFrustumHelper(entity: Scene['entities'][number], transform: TransformComponent) {
    const cameraComponent = entity.getComponent<CameraComponent>('Camera')
    if (!cameraComponent) return
    const projection = cameraComponent.projection === 'perspective' ? 'perspective' : 'orthographic'
    const aspect = Math.max(0.01, this.viewportWidth / Math.max(1, this.viewportHeight))
    const near = sanitizePositive(cameraComponent.near, 0.1)
    const far = Math.max(near + 1, sanitizePositive(cameraComponent.far, 5000))
    const displayFar = Math.max(120, Math.min(far, 900))
    const displayNear = Math.max(12, Math.min(displayFar * 0.18, near))
    const position = new THREE.Vector3(
      finiteNumber(transform.x),
      -finiteNumber(transform.y),
      finiteNumber(transform.z, 720) || 720
    )
    const target = new THREE.Vector3(
      finiteNumber(cameraComponent.targetX),
      -finiteNumber(cameraComponent.targetY),
      finiteNumber(cameraComponent.targetZ)
    )
    if (position.distanceToSquared(target) < 0.0001) target.set(position.x, position.y - 1, position.z)

    const helper = new THREE.Group()
    helper.name = `Camera Frustum: ${entity.name || entity.id}`
    helper.position.copy(position)
    helper.up.set(0, 0, 1)
    helper.lookAt(target)
    helper.updateMatrixWorld(true)

    const frustumColor = 0xffcc33
    const bodyColor = 0xffffff
    const targetColor = 0xff7a90

    if (projection === 'perspective') {
      const camera = new THREE.PerspectiveCamera(
        Math.max(1, Math.min(160, finiteNumber(cameraComponent.fov, 50))),
        aspect,
        displayNear,
        displayFar
      )
      helper.add(this.createCameraFrustumLinesFromCamera(camera, frustumColor))
    } else {
      const zoom = Math.max(0.1, finiteNumber(cameraComponent.zoom, 1))
      const viewHeight = Math.min(720 / zoom, 420)
      const viewWidth = viewHeight * aspect
      const camera = new THREE.OrthographicCamera(
        -viewWidth / 2,
        viewWidth / 2,
        viewHeight / 2,
        -viewHeight / 2,
        displayNear,
        displayFar
      )
      helper.add(this.createCameraFrustumLinesFromCamera(camera, frustumColor))
    }

    helper.add(this.createCameraBodyLines(bodyColor))
    helper.add(this.createCameraTargetLine(helper.worldToLocal(target.clone()), targetColor))
    helper.userData.debugHelper = true
    this.debugOverlayGroup.add(helper)
  }

  private createCameraFrustumLinesFromCamera(camera: ThreeEditorCamera, color: number) {
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)
    const corner = (x: number, y: number, z: number) => {
      const point = new THREE.Vector3(x, y, z).unproject(camera)
      point.z *= -1
      return point
    }
    const nearCorners = [
      corner(-1, -1, -1),
      corner(1, -1, -1),
      corner(1, 1, -1),
      corner(-1, 1, -1)
    ]
    const farCorners = [
      corner(-1, -1, 1),
      corner(1, -1, 1),
      corner(1, 1, 1),
      corner(-1, 1, 1)
    ]
    const points: THREE.Vector3[] = []
    for (let index = 0; index < 4; index += 1) {
      points.push(nearCorners[index], nearCorners[(index + 1) % 4])
      points.push(farCorners[index], farCorners[(index + 1) % 4])
      points.push(nearCorners[index], farCorners[index])
    }
    points.push(new THREE.Vector3(0, 0, 0), farCorners[0])
    points.push(new THREE.Vector3(0, 0, 0), farCorners[1])
    points.push(new THREE.Vector3(0, 0, 0), farCorners[2])
    points.push(new THREE.Vector3(0, 0, 0), farCorners[3])
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
    const lines = new THREE.LineSegments(geometry, material)
    lines.userData.debugHelper = true
    return lines
  }

  private createCameraBodyLines(color: number) {
    const width = 42
    const height = 28
    const depth = 28
    const box = new THREE.BoxGeometry(width, height, depth)
    const geometry = new THREE.EdgesGeometry(box)
    box.dispose()
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })
    const lines = new THREE.LineSegments(geometry, material)
    lines.position.z = -depth / 2
    lines.userData.debugHelper = true
    return lines
  }

  private createCameraTargetLine(localTarget: THREE.Vector3, color: number) {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), localTarget])
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 })
    const line = new THREE.LineSegments(geometry, material)
    line.userData.debugHelper = true
    return line
  }

  private isObjectAttachedToScene(object: THREE.Object3D) {
    let cursor: THREE.Object3D | null = object
    while (cursor) {
      if (cursor === this.scene3d) return true
      cursor = cursor.parent
    }
    return false
  }

  private disposeObject(object: THREE.Object3D | null) {
    if (!object) return
    object.traverse((child) => {
      const mesh = child as THREE.Mesh
      mesh.geometry?.dispose?.()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((item) => item.dispose())
      else material?.dispose?.()
    })
  }

  private attachEvents() {
    const canvas = this.renderer?.domElement
    canvas?.addEventListener('pointerdown', this.handlePointerDown)
    canvas?.addEventListener('pointermove', this.handlePointerMove)
    canvas?.addEventListener('pointerup', this.handlePointerUp)
    canvas?.addEventListener('pointercancel', this.handlePointerUp)
    window.addEventListener('resize', this.handleResize)
  }

  private detachEvents() {
    const canvas = this.renderer?.domElement
    canvas?.removeEventListener('pointerdown', this.handlePointerDown)
    canvas?.removeEventListener('pointermove', this.handlePointerMove)
    canvas?.removeEventListener('pointerup', this.handlePointerUp)
    canvas?.removeEventListener('pointercancel', this.handlePointerUp)
    window.removeEventListener('resize', this.handleResize)
  }

  private readonly handleResize = () => {
    this.resize()
    this.render()
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (event.button === 1) return
    if (this.isPlaying) return
    if (this.transformControls?.dragging) return
    const hit = this.pick(event)
    if (!hit) return
    const entityId = this.getObjectUserData(hit.object, 'entityId')
    if (!entityId) return
    const modelNodePath = this.getObjectUserData(hit.object, 'modelNodePath')
    this.options.onEntitySelected?.(entityId, modelNodePath ? { modelNodePath } : undefined)
    if (this.transformControls?.enabled && entityId === this.primarySelection) return
    if (this.activeTool === 'move') {
      this.isDragging = true
      this.dragEntityId = entityId
      this.dragModelNodePath = modelNodePath
      this.pendingTransformMutation = false
      this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), hit.point)
      this.dragOffset.copy(hit.object.position).sub(hit.point)
      this.renderer?.domElement.setPointerCapture(event.pointerId)
    }
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (this.isPlaying) return
    if (this.transformControls?.dragging) return
    if (!this.isDragging || !this.dragEntityId || !this.camera) return
    const object = this.getTransformControlTarget(this.dragEntityId, this.dragModelNodePath)
    const entity = this.scene?.getEntityById(this.dragEntityId)
    const transform = entity?.getComponent<TransformComponent>('Transform')
    if (!object || !entity || !transform) return
    this.updatePointer(event)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const point = new THREE.Vector3()
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, point)) return
    point.add(this.dragOffset)
    object.position.x = point.x
    object.position.y = point.y
    if (this.dragModelNodePath) {
      this.saveModelNodeTransform(entity, this.dragModelNodePath, object)
      this.pendingTransformMutation = true
      this.rebuildDebugOverlay(this.scene)
      this.render()
      return
    }
    transform.x = roundTransformValue(point.x)
    transform.y = roundTransformValue(-point.y)
    this.pendingTransformMutation = true
    this.rebuildDebugOverlay(this.scene)
    this.render()
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    this.isDragging = false
    this.dragEntityId = ''
    this.dragModelNodePath = ''
    this.flushPendingTransformMutation()
    this.renderer?.domElement.releasePointerCapture(event.pointerId)
  }

  private pick(event: PointerEvent) {
    if (!this.camera) return null
    this.updatePointer(event)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const objects = Array.from(this.entityObjects.values())
    const hits = this.raycaster.intersectObjects(objects, true)
    return hits[0] || null
  }

  private updatePointer(event: PointerEvent) {
    const rect = this.renderer?.domElement.getBoundingClientRect()
    if (!rect) return
    this.pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
    this.pointer.y = -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1)
  }

  private getObjectUserData(object: THREE.Object3D, key: string) {
    let cursor: THREE.Object3D | null = object
    while (cursor) {
      const value = cursor.userData[key]
      if (value !== undefined && value !== null && String(value).trim()) return String(value)
      cursor = cursor.parent
    }
    return ''
  }

  private resize() {
    if (!this.renderer || !this.camera) return
    const width = Math.max(1, this.options.container.clientWidth)
    const height = Math.max(1, this.options.container.clientHeight)
    this.viewportWidth = width
    this.viewportHeight = height
    this.renderer.setSize(width, height, false)
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height
    } else {
      this.updateOrthographicFrustum(this.camera)
    }
    this.camera.updateProjectionMatrix()
  }

  private updateOrthographicFrustum(camera: THREE.OrthographicCamera) {
    const aspect = Math.max(0.01, this.viewportWidth / Math.max(1, this.viewportHeight))
    const viewHeight = 720
    const viewWidth = viewHeight * aspect
    camera.left = -viewWidth / 2
    camera.right = viewWidth / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
  }

  private animate = () => {
    this.animationFrame = requestAnimationFrame(this.animate)
    this.updateRuntime()
    if (!this.isPlaying) this.editorCameraController?.update()
    this.render()
  }

  private updateRuntime() {
    if (!this.isPlaying || !this.playScene) return
    const now = performance.now()
    const delta = Math.min(0.05, Math.max(0, (now - this.lastRuntimeTick) / 1000))
    this.lastRuntimeTick = now
    if (this.isPaused || delta <= 0) {
      if (this.isPaused) this.scriptRuntime.updatePausedScene(this.playScene)
      return
    }
    this.scriptRuntime.setSelectedEntityId(this.primarySelection)
    this.scriptRuntime.updateScene(this.playScene, delta, undefined, false)
    this.configureRuntimeCamera(this.playScene)
    const signature = this.getRuntimeEntitySignature(this.playScene)
    if (signature !== this.runtimeEntitySignature) {
      this.runtimeEntitySignature = signature
      void this.renderScene(this.playScene)
    } else {
      this.syncEntityObjectTransforms(this.playScene)
    }
    this.options.onRuntimeSceneUpdated?.(this.playScene)
  }

  private syncEntityObjectTransforms(scene: Scene) {
    for (const entity of scene.entities) {
      const object = this.entityObjects.get(entity.id)
      const transform = entity.getComponent<TransformComponent>('Transform')
      const sprite = entity.getComponent<SpriteComponent>('Sprite')
      const three = entity.getComponent<CustomComponent>('ThreeObject')?.data as ThreeObjectConfig | undefined
      if (!object || !transform) continue
      const depth = Math.max(1, Number(three?.depth ?? sprite?.width ?? 80))
      object.position.set(
        transform.x + Number(sprite?.offsetX || 0),
        -transform.y - Number(sprite?.offsetY || 0),
        Number(transform.z ?? three?.z ?? 0) || depth / 2
      )
      object.rotation.set(
        Number(transform.rotationX ?? three?.rotationX ?? 0),
        Number(transform.rotationY ?? three?.rotationY ?? 0),
        Number(transform.rotationZ ?? three?.rotationZ ?? transform.rotation ?? 0)
      )
      object.scale.set(transform.scaleX || 1, transform.scaleY || 1, transform.scaleZ || 1)
    }
    this.rebuildDebugOverlay(scene)
  }

  private getRuntimeEntitySignature(scene: Scene) {
    return scene.entities.map((entity) => entity.id).join('|')
  }

  private async loadProjectRuntimeScripts(scene: Scene | null) {
    const project = useProjectStore()
    const assets = useAssetStore()
    const defaultPath = 'assets/scripts/ScriptRuntime.ts'
    if (!window.unu?.readTextAsset || !project.rootPath || project.isMemoryProject) {
      this.scriptRuntime.setProjectRuntimeSources([{ path: defaultPath, content: '' }])
      return
    }
    const paths = new Set<string>([defaultPath])
    for (const node of assets.flat) {
      if (node.type === 'script' && /^assets\/scripts\/.+\.(js|ts|mjs)$/i.test(node.path)) paths.add(node.path)
    }
    for (const entity of scene?.entities || []) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const path = String(script?.scriptPath || '').trim()
      if (path.startsWith('assets/')) paths.add(path)
    }
    const files = []
    for (const path of paths) {
      const result = await window.unu.readTextAsset({ projectRoot: project.rootPath, relativePath: path }).catch(() => null)
      if (result?.content !== undefined) files.push({ path, content: result.content })
    }
    this.scriptRuntime.setProjectRuntimeSources(files.length ? files : [{ path: defaultPath, content: '' }])
  }

  private render() {
    if (!this.renderer || !this.camera) return
    this.renderer.render(this.scene3d, this.camera)
  }
}
