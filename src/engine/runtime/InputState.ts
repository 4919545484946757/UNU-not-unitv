export type InputActionMap = Record<string, string[]>

const defaultActionMap: InputActionMap = {
  move_left: ['KeyA', 'ArrowLeft'],
  move_right: ['KeyD', 'ArrowRight'],
  move_up: ['KeyW', 'ArrowUp'],
  move_down: ['KeyS', 'ArrowDown'],
  jump: ['Space'],
  fire: ['KeyJ', 'Mouse0']
}

export class InputState {
  private readonly keys = new Set<string>()
  private readonly mouseButtons = new Set<number>()
  private mouseX = 0
  private mouseY = 0
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
    this.keys.clear()
    this.mouseButtons.clear()
  }

  isKeyDown(code: string) {
    return this.keys.has(code)
  }

  isMouseDown(button = 0) {
    return this.mouseButtons.has(button)
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

  getMousePosition() {
    return { x: this.mouseX, y: this.mouseY }
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code)
  }

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code)
  }

  private readonly handleBlur = () => {
    this.keys.clear()
    this.mouseButtons.clear()
  }

  private readonly handleMouseDown = (event: MouseEvent) => {
    this.mouseButtons.add(event.button)
  }

  private readonly handleMouseUp = (event: MouseEvent) => {
    this.mouseButtons.delete(event.button)
  }

  private readonly handleMouseMove = (event: MouseEvent) => {
    this.mouseX = event.clientX
    this.mouseY = event.clientY
  }
}

