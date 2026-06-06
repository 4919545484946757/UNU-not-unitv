import * as THREE from 'three'

export type EditorCameraControlMode = 'orbit' | 'fly'
export type EditorCameraProjection = 'orthographic' | 'perspective'
export type EditorCameraSettings = {
  controlMode: EditorCameraControlMode
  projection: EditorCameraProjection
  moveSpeed: number
}

export type EditorCameraState = {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  yaw: number
  pitch: number
  distance: number
  moveSpeed: number
  controlMode: EditorCameraControlMode
}

type DragMode = 'none' | 'orbit' | 'pan' | 'dolly' | 'look'

const MIN_PITCH = -Math.PI / 2 + 0.04
const MAX_PITCH = Math.PI / 2 - 0.04
const MIN_DISTANCE = 32
const MAX_DISTANCE = 8000
const DEFAULT_DISTANCE = 960

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeAngle(value: number) {
  let next = value
  while (next > Math.PI) next -= Math.PI * 2
  while (next < -Math.PI) next += Math.PI * 2
  return next
}

export class EditorCameraController {
  readonly target = new THREE.Vector3(0, 0, 0)
  readonly position = new THREE.Vector3(480, 420, 720)
  yaw = Math.atan2(this.position.y - this.target.y, this.position.x - this.target.x)
  pitch = Math.asin((this.position.z - this.target.z) / DEFAULT_DISTANCE)
  distance = DEFAULT_DISTANCE
  moveSpeed = 280
  controlMode: EditorCameraControlMode = 'orbit'

  private camera: THREE.Camera
  private domElement: HTMLElement
  private dragging = false
  private dragMode: DragMode = 'none'
  private lastPointerX = 0
  private lastPointerY = 0
  private readonly pressedKeys = new Set<string>()
  private axisSigns = { x: 1, y: 1, z: 1 }
  private lastTime = performance.now()
  private disposed = false

  constructor(camera: THREE.Camera, domElement: HTMLElement, private readonly onChange: () => void) {
    this.camera = camera
    this.domElement = domElement
    this.syncFromCamera()
    this.attach()
  }

  setCamera(camera: THREE.Camera) {
    this.camera = camera
    this.applyToCamera()
  }

  reapply() {
    this.applyToCamera()
  }

  setSettings(settings: Partial<EditorCameraSettings>) {
    if (settings.controlMode) this.controlMode = settings.controlMode
    if (Number.isFinite(settings.moveSpeed)) this.moveSpeed = clamp(Number(settings.moveSpeed), 1, 5000)
  }

  getState(): EditorCameraState {
    return {
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      target: { x: this.target.x, y: this.target.y, z: this.target.z },
      yaw: this.yaw,
      pitch: this.pitch,
      distance: this.distance,
      moveSpeed: this.moveSpeed,
      controlMode: this.controlMode
    }
  }

  setState(state: EditorCameraState) {
    this.position.set(state.position.x, state.position.y, state.position.z)
    this.target.set(state.target.x, state.target.y, state.target.z)
    this.yaw = normalizeAngle(state.yaw)
    this.pitch = clamp(state.pitch, MIN_PITCH, MAX_PITCH)
    this.distance = clamp(state.distance, MIN_DISTANCE, MAX_DISTANCE)
    this.moveSpeed = clamp(state.moveSpeed, 1, 5000)
    this.controlMode = state.controlMode
    this.applyToCamera()
  }

  setView(position: THREE.Vector3, target: THREE.Vector3) {
    this.position.copy(position)
    this.target.copy(target)
    const offset = this.position.clone().sub(this.target)
    this.distance = clamp(offset.length() || DEFAULT_DISTANCE, MIN_DISTANCE, MAX_DISTANCE)
    this.yaw = Math.atan2(offset.y, offset.x)
    this.pitch = clamp(Math.asin(offset.z / this.distance), MIN_PITCH, MAX_PITCH)
    this.applyToCamera()
  }

  update() {
    if (this.disposed || this.controlMode !== 'fly') return
    const now = performance.now()
    const delta = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000))
    this.lastTime = now
    if (delta <= 0) return

    const input = this.getMovementInput()
    if (input.lengthSq() <= 0) return
    const speedMultiplier = this.pressedKeys.has('ControlLeft') || this.pressedKeys.has('ControlRight') ? 3 : this.pressedKeys.has('AltLeft') || this.pressedKeys.has('AltRight') ? 0.28 : 1
    const amount = this.moveSpeed * speedMultiplier * delta
    const movement = input.normalize().multiplyScalar(amount)
    this.position.add(movement)
    this.target.add(movement)
    this.applyToCamera()
  }

  dispose() {
    this.disposed = true
    this.detach()
    this.pressedKeys.clear()
  }

  private attach() {
    this.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.domElement.addEventListener('wheel', this.handleWheel, { passive: false })
    window.addEventListener('pointermove', this.handlePointerMove)
    window.addEventListener('pointerup', this.handlePointerUp)
    window.addEventListener('pointercancel', this.handlePointerUp)
    window.addEventListener('keydown', this.handleKeyDown, true)
    window.addEventListener('keyup', this.handleKeyUp, true)
    window.addEventListener('blur', this.handleBlur)
  }

  private detach() {
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    this.domElement.removeEventListener('wheel', this.handleWheel)
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('pointerup', this.handlePointerUp)
    window.removeEventListener('pointercancel', this.handlePointerUp)
    window.removeEventListener('keydown', this.handleKeyDown, true)
    window.removeEventListener('keyup', this.handleKeyUp, true)
    window.removeEventListener('blur', this.handleBlur)
  }

  private syncFromCamera() {
    this.camera.up.set(0, 0, 1)
    this.position.copy(this.camera.position)
    const offset = this.position.clone().sub(this.target)
    this.distance = clamp(offset.length() || DEFAULT_DISTANCE, MIN_DISTANCE, MAX_DISTANCE)
    this.yaw = Math.atan2(offset.y, offset.x)
    this.pitch = clamp(Math.asin(offset.z / this.distance), MIN_PITCH, MAX_PITCH)
    this.applyToCamera(false)
  }

  private applyOrbitPosition() {
    const cosPitch = Math.cos(this.pitch)
    this.position.set(
      this.target.x + Math.cos(this.yaw) * cosPitch * this.distance,
      this.target.y + Math.sin(this.yaw) * cosPitch * this.distance,
      this.target.z + Math.sin(this.pitch) * this.distance
    )
  }

  private applyToCamera(emit = true) {
    this.camera.up.set(0, 0, 1)
    this.camera.position.copy(this.position)
    this.camera.lookAt(this.target)
    if ('updateProjectionMatrix' in this.camera) {
      ;(this.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera).updateProjectionMatrix()
    }
    if (emit) this.onChange()
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 1) return
    event.preventDefault()
    this.dragging = true
    this.lastPointerX = event.clientX
    this.lastPointerY = event.clientY
    this.dragMode = this.resolveDragMode(event)
    this.domElement.setPointerCapture?.(event.pointerId)
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (!this.dragging) return
    event.preventDefault()
    const dx = event.clientX - this.lastPointerX
    const dy = event.clientY - this.lastPointerY
    this.lastPointerX = event.clientX
    this.lastPointerY = event.clientY

    if (this.dragMode === 'pan') this.pan(dx, dy)
    else if (this.dragMode === 'dolly') this.dolly(dy)
    else if (this.dragMode === 'orbit') this.orbit(dx, dy)
    else if (this.dragMode === 'look') this.look(dx, dy)
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    if (!this.dragging) return
    this.dragging = false
    this.dragMode = 'none'
    this.domElement.releasePointerCapture?.(event.pointerId)
  }

  private resolveDragMode(event: PointerEvent): DragMode {
    if (this.controlMode === 'fly') return event.ctrlKey ? 'orbit' : 'look'
    if (event.shiftKey) return 'pan'
    if (event.ctrlKey) return 'dolly'
    return 'orbit'
  }

  private orbit(dx: number, dy: number) {
    this.yaw = normalizeAngle(this.yaw - dx * 0.006)
    this.pitch = clamp(this.pitch + dy * 0.006, MIN_PITCH, MAX_PITCH)
    this.applyOrbitPosition()
    this.applyToCamera()
  }

  private look(dx: number, dy: number) {
    this.yaw = normalizeAngle(this.yaw - dx * 0.004)
    this.pitch = clamp(this.pitch + dy * 0.004, MIN_PITCH, MAX_PITCH)
    this.target.copy(this.position).add(this.forwardVector().multiplyScalar(this.distance))
    this.applyToCamera()
  }

  private pan(dx: number, dy: number) {
    const scale = Math.max(0.1, this.distance / 720)
    const right = this.rightVector().multiplyScalar(-dx * scale)
    const up = this.upVector().multiplyScalar(dy * scale)
    this.position.add(right).add(up)
    this.target.add(right).add(up)
    this.applyToCamera()
  }

  private dolly(dy: number) {
    const factor = Math.exp(dy * 0.006)
    this.distance = clamp(this.distance * factor, MIN_DISTANCE, MAX_DISTANCE)
    this.applyOrbitPosition()
    this.applyToCamera()
  }

  private readonly handleWheel = (event: WheelEvent) => {
    event.preventDefault()
    const factor = Math.exp(event.deltaY * 0.0012)
    this.distance = clamp(this.distance * factor, MIN_DISTANCE, MAX_DISTANCE)
    this.applyOrbitPosition()
    this.applyToCamera()
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.shouldIgnoreKeyboard(event)) return
    this.pressedKeys.add(event.code)
    if (event.code === 'KeyX' || event.code === 'KeyY' || event.code === 'KeyZ') {
      event.preventDefault()
      this.snapAxis(event.code === 'KeyX' ? 'x' : event.code === 'KeyY' ? 'y' : 'z')
    }
  }

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.code)
  }

  private readonly handleBlur = () => {
    this.pressedKeys.clear()
    this.dragging = false
    this.dragMode = 'none'
  }

  private shouldIgnoreKeyboard(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null
    const tag = target?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return true
    if (event.ctrlKey || event.metaKey) return true
    return false
  }

  private snapAxis(axis: 'x' | 'y' | 'z') {
    const sign = this.axisSigns[axis]
    this.axisSigns[axis] = -sign
    const offset = new THREE.Vector3(
      axis === 'x' ? sign * this.distance : 0,
      axis === 'y' ? sign * this.distance : 0,
      axis === 'z' ? sign * this.distance : 0
    )
    this.position.copy(this.target).add(offset)
    if (axis === 'z') this.camera.up.set(0, sign > 0 ? 1 : -1, 0)
    else this.camera.up.set(0, 0, 1)
    const nextOffset = this.position.clone().sub(this.target)
    this.yaw = Math.atan2(nextOffset.y, nextOffset.x)
    this.pitch = clamp(Math.asin(nextOffset.z / Math.max(MIN_DISTANCE, nextOffset.length())), MIN_PITCH, MAX_PITCH)
    this.applyToCamera()
  }

  private getMovementInput() {
    const movement = new THREE.Vector3()
    const forward = this.forwardVector()
    forward.z = 0
    if (forward.lengthSq() > 0) forward.normalize()
    const right = this.rightVector()
    right.z = 0
    if (right.lengthSq() > 0) right.normalize()
    if (this.pressedKeys.has('KeyW')) movement.add(forward)
    if (this.pressedKeys.has('KeyS')) movement.sub(forward)
    if (this.pressedKeys.has('KeyD')) movement.add(right)
    if (this.pressedKeys.has('KeyA')) movement.sub(right)
    if (this.pressedKeys.has('Space')) movement.z += 1
    if (this.pressedKeys.has('ShiftLeft') || this.pressedKeys.has('ShiftRight')) movement.z -= 1
    return movement
  }

  private forwardVector() {
    return new THREE.Vector3(
      -Math.cos(this.yaw) * Math.cos(this.pitch),
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      -Math.sin(this.pitch)
    ).normalize()
  }

  private rightVector() {
    return this.forwardVector().cross(new THREE.Vector3(0, 0, 1)).normalize()
  }

  private upVector() {
    return this.rightVector().cross(this.forwardVector()).normalize()
  }
}
