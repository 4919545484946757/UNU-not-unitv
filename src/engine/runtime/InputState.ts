import * as ts from 'typescript'

export type InputActionMap = Record<string, string[]>

type MobileControlButton = {
  label?: string
  key?: string
  mouse?: number
  className?: string
}

type MobileControlConfig = {
  enabled?: boolean
  left?: MobileControlButton[]
  right?: MobileControlButton[]
}

type InputRuntimeHooks = {
  actionMap?: InputActionMap
  mobileControls?: MobileControlConfig
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
  interact: ['Mouse2'],
  menu: ['Escape']
}

export class InputState {
  private readonly keys = new Set<string>()
  private readonly keysPressedThisFrame = new Set<string>()
  private readonly keysReleasedThisFrame = new Set<string>()
  private readonly mouseButtons = new Set<number>()
  private readonly mousePressedThisFrame = new Set<number>()
  private readonly mouseReleasedThisFrame = new Set<number>()
  private readonly virtualKeys = new Set<string>()
  private readonly virtualKeysPressedThisFrame = new Set<string>()
  private readonly virtualKeysReleasedThisFrame = new Set<string>()
  private readonly virtualMouseButtons = new Set<number>()
  private readonly virtualMousePressedThisFrame = new Set<number>()
  private readonly virtualMouseReleasedThisFrame = new Set<number>()
  private mouseX = 0
  private mouseY = 0
  private touchStartedThisFrame = false
  private touchEndedThisFrame = false
  private touchActive = false
  private touchIdentifier: number | null = null
  private lastTouchAt = 0
  private primaryPointerConsumedThisFrame = false
  private primaryPointerConsumedUntilRelease = false
  private mobileControlsRoot: HTMLDivElement | null = null
  private viewportLeft = 0
  private viewportTop = 0
  private worldOffsetX = 0
  private worldOffsetY = 0
  private worldScale = 1
  private readonly actionMap: InputActionMap
  private projectActionMap: InputActionMap | null = null
  private userActionMap: InputActionMap | null = null
  private projectHooks: InputRuntimeHooks = {}
  private mobileControlsConfig: MobileControlConfig | null = null
  private storageKey = ''
  private attached = false

  constructor(actionMap: InputActionMap = defaultActionMap) {
    this.actionMap = actionMap
  }

  setProjectRuntimeSource(sourceCode: string | null, scriptPath = 'assets/scripts/InputState.ts') {
    const loaded = parseProjectInputRuntime(sourceCode, scriptPath)
    this.projectHooks = loaded
    this.projectActionMap = loaded.actionMap && typeof loaded.actionMap === 'object' ? loaded.actionMap : null
    this.mobileControlsConfig = normalizeMobileControls(loaded.mobileControls)
    this.unmountMobileControls()
  }

  setStorageKey(storageKey: string) {
    this.storageKey = String(storageKey || '').trim()
    this.loadUserActionMap()
  }

  getActionMap() {
    const merged: InputActionMap = {}
    for (const [action, bindings] of Object.entries(this.actionMap)) merged[action] = [...bindings]
    for (const [action, bindings] of Object.entries(this.projectActionMap || {})) merged[action] = [...bindings]
    for (const [action, bindings] of Object.entries(this.userActionMap || {})) merged[action] = [...bindings]
    return merged
  }

  getActionBindings(action: string) {
    return [...(this.resolveActionBindings(action) || [])]
  }

  setActionBindings(action: string, bindings: string[]) {
    const normalizedAction = String(action || '').trim()
    if (!normalizedAction) return
    const normalizedBindings = Array.from(new Set(
      bindings.map((binding) => String(binding || '').trim()).filter(Boolean)
    ))
    this.userActionMap = {
      ...(this.userActionMap || {}),
      [normalizedAction]: normalizedBindings
    }
    this.saveUserActionMap()
  }

  resetActionBindings(action?: string) {
    const normalizedAction = String(action || '').trim()
    if (!normalizedAction) {
      this.userActionMap = null
      this.saveUserActionMap()
      return
    }
    const next = { ...(this.userActionMap || {}) }
    delete next[normalizedAction]
    this.userActionMap = Object.keys(next).length ? next : null
    this.saveUserActionMap()
  }

  getPressedBindings() {
    return [
      ...Array.from(this.keysPressedThisFrame),
      ...Array.from(this.virtualKeysPressedThisFrame),
      ...Array.from(this.mousePressedThisFrame).map((button) => `Mouse${button}`),
      ...Array.from(this.virtualMousePressedThisFrame).map((button) => `Mouse${button}`)
    ]
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
    window.addEventListener('touchstart', this.handleTouchStart, { passive: false })
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    window.addEventListener('touchend', this.handleTouchEnd, { passive: false })
    window.addEventListener('touchcancel', this.handleTouchEnd, { passive: false })
    window.addEventListener('contextmenu', this.handleContextMenu)
    this.mountMobileControls()
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
    window.removeEventListener('touchstart', this.handleTouchStart)
    window.removeEventListener('touchmove', this.handleTouchMove)
    window.removeEventListener('touchend', this.handleTouchEnd)
    window.removeEventListener('touchcancel', this.handleTouchEnd)
    window.removeEventListener('contextmenu', this.handleContextMenu)
    this.unmountMobileControls()
    this.keys.clear()
    this.virtualKeys.clear()
    this.mouseButtons.clear()
    this.virtualMouseButtons.clear()
    this.mousePressedThisFrame.clear()
    this.virtualMousePressedThisFrame.clear()
  }

  isKeyDown(code: string) {
    return this.keys.has(code) || this.virtualKeys.has(code)
  }

  isMouseDown(button = 0) {
    if (this.primaryPointerConsumedUntilRelease && button === 0) return false
    return this.mouseButtons.has(button) || this.virtualMouseButtons.has(button)
  }

  wasMousePressed(button = 0) {
    if ((this.primaryPointerConsumedThisFrame || this.primaryPointerConsumedUntilRelease) && button === 0) return false
    return this.mousePressedThisFrame.has(button) || this.virtualMousePressedThisFrame.has(button)
  }

  wasTouchPressed() {
    return this.touchStartedThisFrame
  }

  wasTouchReleased() {
    return this.touchEndedThisFrame
  }

  isTouchActive() {
    return this.touchActive
  }

  isAndroidDevice() {
    return isAndroidRuntime()
  }

  consumePrimaryPointerPress() {
    this.primaryPointerConsumedThisFrame = true
    this.primaryPointerConsumedUntilRelease = true
    this.mousePressedThisFrame.delete(0)
  }

  setMobileControlsVisible(visible: boolean) {
    if (visible && !this.mobileControlsRoot) this.mountMobileControls()
    if (!this.mobileControlsRoot) return
    this.mobileControlsRoot.style.display = visible ? 'flex' : 'none'
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
      return this.keysPressedThisFrame.has(binding) || this.virtualKeysPressedThisFrame.has(binding)
    })
  }

  private resolveActionReleasedDefault(action: string) {
    const bindings = this.resolveActionBindings(action)
    if (!bindings?.length) return false
    return bindings.some((binding) => {
      if (binding.startsWith('Mouse')) {
        const button = Number(binding.replace('Mouse', ''))
        const resolvedButton = Number.isFinite(button) ? button : 0
        return this.mouseReleasedThisFrame.has(resolvedButton) || this.virtualMouseReleasedThisFrame.has(resolvedButton)
      }
      return this.keysReleasedThisFrame.has(binding) || this.virtualKeysReleasedThisFrame.has(binding)
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
    const userBindings = this.userActionMap?.[action]
    if (Array.isArray(userBindings) && userBindings.length) return userBindings
    const projectBindings = this.projectActionMap?.[action]
    if (Array.isArray(projectBindings) && projectBindings.length) return projectBindings
    return this.actionMap[action]
  }

  private loadUserActionMap() {
    if (!this.storageKey || typeof localStorage === 'undefined') {
      this.userActionMap = null
      return
    }
    try {
      const raw = localStorage.getItem(this.storageKey)
      this.userActionMap = normalizeInputActionMap(raw ? JSON.parse(raw) : null)
    } catch {
      this.userActionMap = null
    }
  }

  private saveUserActionMap() {
    if (!this.storageKey || typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.userActionMap || {}))
    } catch {
      // Ignore storage failures; the runtime mapping still applies for this session.
    }
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
    this.virtualKeysPressedThisFrame.clear()
    this.virtualKeysReleasedThisFrame.clear()
    this.virtualMousePressedThisFrame.clear()
    this.virtualMouseReleasedThisFrame.clear()
    this.touchStartedThisFrame = false
    this.touchEndedThisFrame = false
    this.primaryPointerConsumedThisFrame = false
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
    this.virtualKeys.clear()
    this.virtualKeysPressedThisFrame.clear()
    this.virtualKeysReleasedThisFrame.clear()
    this.mouseButtons.clear()
    this.mousePressedThisFrame.clear()
    this.mouseReleasedThisFrame.clear()
    this.virtualMouseButtons.clear()
    this.virtualMousePressedThisFrame.clear()
    this.virtualMouseReleasedThisFrame.clear()
    this.touchActive = false
    this.touchIdentifier = null
    this.primaryPointerConsumedThisFrame = false
    this.primaryPointerConsumedUntilRelease = false
  }

  private readonly handleMouseDown = (event: MouseEvent) => {
    if (isHtmlUiEvent(event)) return
    if (this.shouldIgnoreSyntheticMouse()) return
    this.mouseX = event.clientX
    this.mouseY = event.clientY
    this.mousePressedThisFrame.add(event.button)
    this.mouseButtons.add(event.button)
  }

  private readonly handleMouseUp = (event: MouseEvent) => {
    if (this.shouldIgnoreSyntheticMouse()) return
    if (isHtmlUiEvent(event)) {
      this.mouseButtons.delete(event.button)
      return
    }
    this.mouseX = event.clientX
    this.mouseY = event.clientY
    if (this.mouseButtons.has(event.button)) {
      this.mouseReleasedThisFrame.add(event.button)
    }
    this.mouseButtons.delete(event.button)
  }

  private readonly handleMouseMove = (event: MouseEvent) => {
    if (isHtmlUiEvent(event)) return
    if (this.shouldIgnoreSyntheticMouse()) return
    this.mouseX = event.clientX
    this.mouseY = event.clientY
  }

  private readonly handleContextMenu = (event: MouseEvent) => {
    if (isHtmlUiEvent(event)) return
    event.preventDefault()
  }

  private readonly handleTouchStart = (event: TouchEvent) => {
    if (isHtmlUiEvent(event) || isMobileControlEvent(event)) return
    if (!isCanvasEvent(event)) return
    const touch = event.changedTouches[0]
    if (!touch) return
    event.preventDefault()
    this.lastTouchAt = Date.now()
    this.touchIdentifier = touch.identifier
    this.touchActive = true
    this.touchStartedThisFrame = true
    this.mouseX = touch.clientX
    this.mouseY = touch.clientY
    if (!this.mouseButtons.has(0)) this.mousePressedThisFrame.add(0)
    this.mouseButtons.add(0)
  }

  private readonly handleTouchMove = (event: TouchEvent) => {
    if (isHtmlUiEvent(event) || isMobileControlEvent(event)) return
    if (!isCanvasEvent(event)) return
    const touch = this.findTrackedTouch(event)
    if (!touch) return
    event.preventDefault()
    this.lastTouchAt = Date.now()
    this.mouseX = touch.clientX
    this.mouseY = touch.clientY
  }

  private readonly handleTouchEnd = (event: TouchEvent) => {
    if (isHtmlUiEvent(event) || isMobileControlEvent(event)) return
    if (!isCanvasEvent(event)) return
    const touch = this.findTrackedTouch(event)
    if (!touch && this.touchIdentifier !== null) return
    event.preventDefault()
    this.lastTouchAt = Date.now()
    if (touch) {
      this.mouseX = touch.clientX
      this.mouseY = touch.clientY
    }
    if (this.mouseButtons.has(0)) this.mouseReleasedThisFrame.add(0)
    this.mouseButtons.delete(0)
    this.touchActive = false
    this.touchEndedThisFrame = true
    this.touchIdentifier = null
    this.primaryPointerConsumedUntilRelease = false
  }

  private findTrackedTouch(event: TouchEvent) {
    if (this.touchIdentifier === null) return event.changedTouches[0] ?? null
    for (let index = 0; index < event.changedTouches.length; index += 1) {
      const touch = event.changedTouches[index]
      if (touch.identifier === this.touchIdentifier) return touch
    }
    return null
  }

  private shouldIgnoreSyntheticMouse() {
    return this.lastTouchAt > 0 && Date.now() - this.lastTouchAt < 650
  }

  private pressVirtualKey(code: string) {
    if (!this.virtualKeys.has(code)) this.virtualKeysPressedThisFrame.add(code)
    this.virtualKeys.add(code)
  }

  private releaseVirtualKey(code: string) {
    if (this.virtualKeys.has(code)) this.virtualKeysReleasedThisFrame.add(code)
    this.virtualKeys.delete(code)
  }

  private pressVirtualMouse(button: number) {
    if (!this.virtualMouseButtons.has(button)) this.virtualMousePressedThisFrame.add(button)
    this.virtualMouseButtons.add(button)
  }

  private releaseVirtualMouse(button: number) {
    if (this.virtualMouseButtons.has(button)) this.virtualMouseReleasedThisFrame.add(button)
    this.virtualMouseButtons.delete(button)
  }

  private mountMobileControls() {
    if (!isAndroidRuntime() || typeof document === 'undefined' || this.mobileControlsRoot) return
    const config = this.mobileControlsConfig
    if (!config?.enabled) return
    const root = document.createElement('div')
    root.className = 'unu-mobile-controls'
    root.style.display = 'none'
    root.appendChild(createMobileControlPad('left', config.left || []))
    root.appendChild(createMobileControlPad('right', config.right || []))
    root.addEventListener('touchstart', this.handleMobileControlPress, { passive: false })
    root.addEventListener('touchend', this.handleMobileControlRelease, { passive: false })
    root.addEventListener('touchcancel', this.handleMobileControlRelease, { passive: false })
    root.addEventListener('mousedown', this.handleMobileControlPress)
    root.addEventListener('mouseup', this.handleMobileControlRelease)
    root.addEventListener('mouseleave', this.handleMobileControlRelease)
    document.body.appendChild(root)
    this.mobileControlsRoot = root
  }

  private unmountMobileControls() {
    const root = this.mobileControlsRoot
    if (!root) return
    root.remove()
    this.mobileControlsRoot = null
  }

  private readonly handleMobileControlPress = (event: Event) => {
    const button = findMobileControlButton(event)
    if (!button) return
    event.preventDefault()
    const key = button.dataset.key || ''
    const mouse = Number(button.dataset.mouse)
    if (key) this.pressVirtualKey(key)
    if (Number.isFinite(mouse)) this.pressVirtualMouse(mouse)
  }

  private readonly handleMobileControlRelease = (event: Event) => {
    const button = findMobileControlButton(event)
    event.preventDefault()
    if (!button) {
      this.releaseAllVirtualControls()
      return
    }
    const key = button.dataset.key || ''
    const mouse = Number(button.dataset.mouse)
    if (key) this.releaseVirtualKey(key)
    if (Number.isFinite(mouse)) this.releaseVirtualMouse(mouse)
  }

  private releaseAllVirtualControls() {
    for (const key of this.virtualKeys) this.virtualKeysReleasedThisFrame.add(key)
    for (const button of this.virtualMouseButtons) this.virtualMouseReleasedThisFrame.add(button)
    this.virtualKeys.clear()
    this.virtualMouseButtons.clear()
  }
}

function createMobileControlPad(side: 'left' | 'right', buttons: MobileControlButton[]) {
  const pad = document.createElement('div')
  pad.className = `unu-mobile-pad unu-mobile-pad-${side}`
  for (const item of buttons) {
    const button = document.createElement('button')
    const className = String(item.className || '').trim()
    if (className) button.classList.add(className)
    button.textContent = String(item.label || item.key || (Number.isFinite(item.mouse) ? `Mouse${item.mouse}` : ''))
    if (item.key) button.dataset.key = String(item.key)
    if (Number.isFinite(item.mouse)) button.dataset.mouse = String(item.mouse)
    pad.appendChild(button)
  }
  return pad
}

function normalizeMobileControls(value: unknown): MobileControlConfig | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as MobileControlConfig
  const left = normalizeMobileControlButtons(raw.left)
  const right = normalizeMobileControlButtons(raw.right)
  return {
    enabled: raw.enabled !== false && (left.length > 0 || right.length > 0),
    left,
    right
  }
}

function normalizeMobileControlButtons(value: unknown): MobileControlButton[] {
  if (!Array.isArray(value)) return [] as MobileControlButton[]
  const buttons: MobileControlButton[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const raw = item as MobileControlButton
    const key = String(raw.key || '').trim()
    const mouse = Number(raw.mouse)
    if (!key && !Number.isFinite(mouse)) continue
    buttons.push({
      label: String(raw.label || key || `Mouse${mouse}`),
      key,
      mouse: Number.isFinite(mouse) ? mouse : undefined,
      className: String(raw.className || '').trim()
    })
  }
  return buttons
}

function isHtmlUiEvent(event: Event) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  return path.some((target) => {
    if (!(target instanceof HTMLElement)) return false
    return target.classList.contains('unu-html-ui-layer') ||
      target.classList.contains('unu-html-ui-node') ||
      target.classList.contains('unu-html-ui-frame')
  })
}

function isMobileControlEvent(event: Event) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  return path.some((target) => target instanceof HTMLElement && target.classList.contains('unu-mobile-controls'))
}

function isCanvasEvent(event: Event) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  return path.some((target) => target instanceof HTMLCanvasElement)
}

function findMobileControlButton(event: Event) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  return path.find((target): target is HTMLButtonElement =>
    target instanceof HTMLButtonElement && target.closest('.unu-mobile-controls') !== null
  ) ?? null
}

function isAndroidRuntime() {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('unu-android-editor')) return true
  const env = import.meta.env as Record<string, unknown>
  return env.VITE_UNU_ANDROID === 'true' || env.VITE_UNU_ANDROID === '1' ||
    env.VITE_UNU_ANDROID_EDITOR === 'true' || env.VITE_UNU_ANDROID_EDITOR === '1'
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
  const raw = sanitizeProjectInputRuntimeSource(String(sourceCode || '').trim())
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

function sanitizeProjectInputRuntimeSource(source: string) {
  // Users sometimes paste config copied through JSON/Markdown layers where
  // single-quoted strings become doubled, e.g. ''KeyA''. Repair that narrow
  // case so a typo does not disable the entire input runtime.
  return source.replace(/''([^'\n\r]+)''/g, "'$1'")
}
