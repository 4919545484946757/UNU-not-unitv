export type InputActionMap = Record<string, string[]>

const defaultActionMap: InputActionMap = {
  move_left: ['KeyA', 'ArrowLeft'],
  move_right: ['KeyD', 'ArrowRight'],
  move_up: ['KeyW', 'ArrowUp'],
  move_down: ['KeyS', 'ArrowDown'],
  jump: ['Space'],
  fire: ['KeyJ', 'Mouse0'],
  interact: ['Mouse2']
}

export class InputState {
  private readonly keys = new Set<string>()
  private readonly keysPressedThisFrame = new Set<string>()
  private readonly keysReleasedThisFrame = new Set<string>()
  private readonly mouseButtons = new Set<number>()
  private readonly mousePressedThisFrame = new Set<number>()
  private readonly mouseReleasedThisFrame = new Set<number>()
  private mouseX = 0
  private mouseY = 0
  private viewportLeft = 0
  private viewportTop = 0
  private worldOffsetX = 0
  private worldOffsetY = 0
  private worldScale = 1
  private readonly actionMap: InputActionMap
  private attached = false

  constructor(actionMap: InputActionMap = defaultActionMap) {
    this.actionMap = actionMap
  }

  attach() {
    if (this.attached) return
    this.attached = true
    window.addEventListener('keydown', this.handleKeyDown, { passive: true })
    window.addEventListener('keyup', this.handleKeyUp, { passive: true })
    window.addEventListener('blur', this.handleBlur, { passive: true })
    window.addEventListener('mousedown', this.handleMouseDown, { passive: true })
    window.addEventListener('mouseup', this.handleMouseUp, { passive: true })
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true })
    window.addEventListener('contextmenu', this.handleContextMenu)
  }

  detach() {
    if (!this.attached) return
    this.attached = false
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.handleBlur)
    window.removeEventListener('mousedown', this.handleMouseDown)
    window.removeEventListener('mouseup', this.handleMouseUp)
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('contextmenu', this.handleContextMenu)
    this.keys.clear()
    this.mouseButtons.clear()
    this.mousePressedThisFrame.clear()
  }

  isKeyDown(code: string) {
    return this.keys.has(code)
  }

  isMouseDown(button = 0) {
    return this.mouseButtons.has(button)
  }

  wasMousePressed(button = 0) {
    return this.mousePressedThisFrame.has(button)
  }

  isActionDown(action: string) {
    const bindings = this.actionMap[action]
    if (!bindings?.length) return false
    return bindings.some((binding) => {
      if (binding.startsWith('Mouse')) {
        const button = Number(binding.replace('Mouse', ''))
        return this.isMouseDown(Number.isFinite(button) ? button : 0)
      }
      return this.isKeyDown(binding)
    })
  }

  wasActionPressed(action: string) {
    const bindings = this.actionMap[action]
    if (!bindings?.length) return false
    return bindings.some((binding) => {
      if (binding.startsWith('Mouse')) {
        const button = Number(binding.replace('Mouse', ''))
        return this.wasMousePressed(Number.isFinite(button) ? button : 0)
      }
      return this.keysPressedThisFrame.has(binding)
    })
  }

  wasActionReleased(action: string) {
    const bindings = this.actionMap[action]
    if (!bindings?.length) return false
    return bindings.some((binding) => {
      if (binding.startsWith('Mouse')) {
        const button = Number(binding.replace('Mouse', ''))
        return this.mouseReleasedThisFrame.has(Number.isFinite(button) ? button : 0)
      }
      return this.keysReleasedThisFrame.has(binding)
    })
  }

  getAxis(axis: 'horizontal' | 'vertical') {
    if (axis === 'horizontal') {
      const left = this.isActionDown('move_left') ? 1 : 0
      const right = this.isActionDown('move_right') ? 1 : 0
      return right - left
    }
    const up = this.isActionDown('move_up') ? 1 : 0
    const down = this.isActionDown('move_down') ? 1 : 0
    return down - up
  }

  getMoveVector(normalized = true) {
    const x = this.getAxis('horizontal')
    const y = this.getAxis('vertical')
    if (!normalized) return { x, y }
    const length = Math.hypot(x, y)
    if (length <= 0) return { x: 0, y: 0 }
    return { x: x / length, y: y / length }
  }

  getMousePosition() {
    const localX = this.mouseX - this.viewportLeft
    const localY = this.mouseY - this.viewportTop
    const scale = Math.max(0.0001, this.worldScale)
    return {
      x: (localX - this.worldOffsetX) / scale,
      y: (localY - this.worldOffsetY) / scale
    }
  }

  setViewportTransform(payload: {
    viewportLeft: number
    viewportTop: number
    worldOffsetX: number
    worldOffsetY: number
    worldScale: number
  }) {
    this.viewportLeft = Number.isFinite(payload.viewportLeft) ? payload.viewportLeft : 0
    this.viewportTop = Number.isFinite(payload.viewportTop) ? payload.viewportTop : 0
    this.worldOffsetX = Number.isFinite(payload.worldOffsetX) ? payload.worldOffsetX : 0
    this.worldOffsetY = Number.isFinite(payload.worldOffsetY) ? payload.worldOffsetY : 0
    this.worldScale = Number.isFinite(payload.worldScale) && payload.worldScale > 0 ? payload.worldScale : 1
  }

  endFrame() {
    this.keysPressedThisFrame.clear()
    this.keysReleasedThisFrame.clear()
    this.mousePressedThisFrame.clear()
    this.mouseReleasedThisFrame.clear()
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.keys.has(event.code)) {
      this.keysPressedThisFrame.add(event.code)
    }
    this.keys.add(event.code)
  }

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    if (this.keys.has(event.code)) {
      this.keysReleasedThisFrame.add(event.code)
    }
    this.keys.delete(event.code)
  }

  private readonly handleBlur = () => {
    this.keys.clear()
    this.keysPressedThisFrame.clear()
    this.keysReleasedThisFrame.clear()
    this.mouseButtons.clear()
    this.mousePressedThisFrame.clear()
    this.mouseReleasedThisFrame.clear()
  }

  private readonly handleMouseDown = (event: MouseEvent) => {
    this.mousePressedThisFrame.add(event.button)
    this.mouseButtons.add(event.button)
  }

  private readonly handleMouseUp = (event: MouseEvent) => {
    if (this.mouseButtons.has(event.button)) {
      this.mouseReleasedThisFrame.add(event.button)
    }
    this.mouseButtons.delete(event.button)
  }

  private readonly handleMouseMove = (event: MouseEvent) => {
    this.mouseX = event.clientX
    this.mouseY = event.clientY
  }

  private readonly handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }
}
