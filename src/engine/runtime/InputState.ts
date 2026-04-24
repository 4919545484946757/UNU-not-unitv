import * as ts from 'typescript'

export type InputActionMap = Record<string, string[]>

type InputRuntimeHooks = {
  actionMap?: InputActionMap
  isActionDown?: (ctx: {
    action: string
    defaultValue: boolean
    isKeyDown: (code: string) => boolean
    isMouseDown: (button?: number) => boolean
    wasMousePressed: (button?: number) => boolean
    wasActionPressed: (action: string) => boolean
    wasActionReleased: (action: string) => boolean
    getAxis: (axis: 'horizontal' | 'vertical') => number
    getMoveVector: (normalized?: boolean) => { x: number; y: number }
  }) => boolean
  wasActionPressed?: (ctx: {
    action: string
    defaultValue: boolean
    isKeyDown: (code: string) => boolean
    isMouseDown: (button?: number) => boolean
    wasMousePressed: (button?: number) => boolean
    wasActionReleased: (action: string) => boolean
    getAxis: (axis: 'horizontal' | 'vertical') => number
    getMoveVector: (normalized?: boolean) => { x: number; y: number }
  }) => boolean
  wasActionReleased?: (ctx: {
    action: string
    defaultValue: boolean
    isKeyDown: (code: string) => boolean
    isMouseDown: (button?: number) => boolean
    wasMousePressed: (button?: number) => boolean
    wasActionPressed: (action: string) => boolean
    getAxis: (axis: 'horizontal' | 'vertical') => number
    getMoveVector: (normalized?: boolean) => { x: number; y: number }
  }) => boolean
  getAxis?: (ctx: {
    axis: 'horizontal' | 'vertical'
    defaultValue: number
    isActionDown: (action: string) => boolean
    wasActionPressed: (action: string) => boolean
    wasActionReleased: (action: string) => boolean
    getMoveVector: (normalized?: boolean) => { x: number; y: number }
  }) => number
  getMoveVector?: (ctx: {
    normalized: boolean
    defaultValue: { x: number; y: number }
    getAxis: (axis: 'horizontal' | 'vertical') => number
    isActionDown: (action: string) => boolean
    wasActionPressed: (action: string) => boolean
    wasActionReleased: (action: string) => boolean
  }) => { x: number; y: number }
}

const defaultActionMap: InputActionMap = {
  move_left: ['KeyA', 'ArrowLeft'],
  move_right: ['KeyD', 'ArrowRight'],
  move_up: ['KeyW', 'ArrowUp'],
  move_down: ['KeyS', 'ArrowDown'],
  sprint: ['ShiftLeft', 'ShiftRight'],
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
  private projectActionMap: InputActionMap | null = null
  private projectHooks: InputRuntimeHooks = {}
  private attached = false

  constructor(actionMap: InputActionMap = defaultActionMap) {
    this.actionMap = actionMap
  }

  setProjectRuntimeSource(sourceCode: string | null, scriptPath = 'assets/scripts/InputState.ts') {
    const loaded = parseProjectInputRuntime(sourceCode, scriptPath)
    this.projectHooks = loaded
    this.projectActionMap = loaded.actionMap && typeof loaded.actionMap === 'object' ? loaded.actionMap : null
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
    const defaultValue = this.resolveActionDownDefault(action)
    if (typeof this.projectHooks.isActionDown === 'function') {
      try {
        return Boolean(this.projectHooks.isActionDown({
          action,
          defaultValue,
          isKeyDown: (code) => this.isKeyDown(code),
          isMouseDown: (button) => this.isMouseDown(button),
          wasMousePressed: (button) => this.wasMousePressed(button),
          wasActionPressed: (name) => this.resolveActionPressedDefault(name),
          wasActionReleased: (name) => this.resolveActionReleasedDefault(name),
          getAxis: (axis) => this.getAxis(axis),
          getMoveVector: (normalized = true) => this.getMoveVector(normalized)
        }))
      } catch (error) {
        console.warn('[UNU][input] isActionDown override failed:', error)
      }
    }
    return defaultValue
  }

  wasActionPressed(action: string) {
    const defaultValue = this.resolveActionPressedDefault(action)
    if (typeof this.projectHooks.wasActionPressed === 'function') {
      try {
        return Boolean(this.projectHooks.wasActionPressed({
          action,
          defaultValue,
          isKeyDown: (code) => this.isKeyDown(code),
          isMouseDown: (button) => this.isMouseDown(button),
          wasMousePressed: (button) => this.wasMousePressed(button),
          wasActionReleased: (name) => this.resolveActionReleasedDefault(name),
          getAxis: (axis) => this.getAxis(axis),
          getMoveVector: (normalized = true) => this.getMoveVector(normalized)
        }))
      } catch (error) {
        console.warn('[UNU][input] wasActionPressed override failed:', error)
      }
    }
    return defaultValue
  }

  wasActionReleased(action: string) {
    const defaultValue = this.resolveActionReleasedDefault(action)
    if (typeof this.projectHooks.wasActionReleased === 'function') {
      try {
        return Boolean(this.projectHooks.wasActionReleased({
          action,
          defaultValue,
          isKeyDown: (code) => this.isKeyDown(code),
          isMouseDown: (button) => this.isMouseDown(button),
          wasMousePressed: (button) => this.wasMousePressed(button),
          wasActionPressed: (name) => this.resolveActionPressedDefault(name),
          getAxis: (axis) => this.getAxis(axis),
          getMoveVector: (normalized = true) => this.getMoveVector(normalized)
        }))
      } catch (error) {
        console.warn('[UNU][input] wasActionReleased override failed:', error)
      }
    }
    return defaultValue
  }

  getAxis(axis: 'horizontal' | 'vertical') {
    const defaultValue = this.resolveAxisDefault(axis)
    if (typeof this.projectHooks.getAxis === 'function') {
      try {
        const resolved = Number(this.projectHooks.getAxis({
          axis,
          defaultValue,
          isActionDown: (action) => this.resolveActionDownDefault(action),
          wasActionPressed: (action) => this.resolveActionPressedDefault(action),
          wasActionReleased: (action) => this.resolveActionReleasedDefault(action),
          getMoveVector: (normalized = true) => this.resolveMoveVectorDefault(normalized)
        }))
        if (Number.isFinite(resolved)) return resolved
      } catch (error) {
        console.warn('[UNU][input] getAxis override failed:', error)
      }
    }
    return defaultValue
  }

  getMoveVector(normalized = true) {
    const defaultValue = this.resolveMoveVectorDefault(normalized)
    if (typeof this.projectHooks.getMoveVector === 'function') {
      try {
        const resolved = this.projectHooks.getMoveVector({
          normalized,
          defaultValue,
          getAxis: (axis) => this.resolveAxisDefault(axis),
          isActionDown: (action) => this.resolveActionDownDefault(action),
          wasActionPressed: (action) => this.resolveActionPressedDefault(action),
          wasActionReleased: (action) => this.resolveActionReleasedDefault(action)
        })
        if (resolved && Number.isFinite(resolved.x) && Number.isFinite(resolved.y)) {
          return { x: resolved.x, y: resolved.y }
        }
      } catch (error) {
        console.warn('[UNU][input] getMoveVector override failed:', error)
      }
    }
    return defaultValue
  }

  private resolveActionDownDefault(action: string) {
    const bindings = this.resolveActionBindings(action)
    if (!bindings?.length) return false
    return bindings.some((binding) => {
      if (binding.startsWith('Mouse')) {
        const button = Number(binding.replace('Mouse', ''))
        return this.isMouseDown(Number.isFinite(button) ? button : 0)
      }
      return this.isKeyDown(binding)
    })
  }

  private resolveActionPressedDefault(action: string) {
    const bindings = this.resolveActionBindings(action)
    if (!bindings?.length) return false
    return bindings.some((binding) => {
      if (binding.startsWith('Mouse')) {
        const button = Number(binding.replace('Mouse', ''))
        return this.wasMousePressed(Number.isFinite(button) ? button : 0)
      }
      return this.keysPressedThisFrame.has(binding)
    })
  }

  private resolveActionReleasedDefault(action: string) {
    const bindings = this.resolveActionBindings(action)
    if (!bindings?.length) return false
    return bindings.some((binding) => {
      if (binding.startsWith('Mouse')) {
        const button = Number(binding.replace('Mouse', ''))
        return this.mouseReleasedThisFrame.has(Number.isFinite(button) ? button : 0)
      }
      return this.keysReleasedThisFrame.has(binding)
    })
  }

  private resolveAxisDefault(axis: 'horizontal' | 'vertical') {
    if (axis === 'horizontal') {
      const left = this.resolveActionDownDefault('move_left') ? 1 : 0
      const right = this.resolveActionDownDefault('move_right') ? 1 : 0
      return right - left
    }
    const up = this.resolveActionDownDefault('move_up') ? 1 : 0
    const down = this.resolveActionDownDefault('move_down') ? 1 : 0
    return down - up
  }

  private resolveMoveVectorDefault(normalized = true) {
    const x = this.resolveAxisDefault('horizontal')
    const y = this.resolveAxisDefault('vertical')
    if (!normalized) return { x, y }
    const length = Math.hypot(x, y)
    if (length <= 0) return { x: 0, y: 0 }
    return { x: x / length, y: y / length }
  }

  private resolveActionBindings(action: string) {
    const projectBindings = this.projectActionMap?.[action]
    if (Array.isArray(projectBindings) && projectBindings.length) return projectBindings
    return this.actionMap[action]
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

function normalizeInputActionMap(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const result: InputActionMap = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(raw)) continue
    const bindings = raw
      .map((item) => String(item || '').trim())
      .filter(Boolean)
    if (bindings.length) result[key] = bindings
  }
  return result
}

function parseProjectInputRuntime(sourceCode: string | null, scriptPath: string) {
  const raw = String(sourceCode || '').trim()
  if (!raw) return {} as InputRuntimeHooks
  try {
    const transpiled = ts.transpileModule(raw, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.Preserve
      },
      fileName: scriptPath || 'InputState.ts'
    })
    const exportsBag: Record<string, unknown> = {}
    const moduleBag: { exports: Record<string, unknown> } = { exports: exportsBag }
    const evaluator = new Function('module', 'exports', transpiled.outputText)
    evaluator(moduleBag, exportsBag)
    const loaded = ((moduleBag.exports && (moduleBag.exports.default as unknown)) || moduleBag.exports) as Record<string, unknown> | null
    if (!loaded || typeof loaded !== 'object') return {} as InputRuntimeHooks
    const hooks = loaded as InputRuntimeHooks
    const actionMap = normalizeInputActionMap(loaded.actionMap)
    if (actionMap) hooks.actionMap = actionMap
    return hooks
  } catch (error) {
    console.warn('[UNU][input] failed to parse project InputState.ts:', error)
    return {} as InputRuntimeHooks
  }
}
