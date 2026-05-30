const MENU_PREFIX = 'PauseMenu_'
const COMMON = ['Backdrop', 'Title']
const MAIN = ['Continue', 'Reset', 'Settings', 'Exit']
const SETTINGS = ['SettingsTitle', 'Difficulty', 'VolumeText', 'VolumeSlider', 'Hotkeys', 'Done']
const HOTKEY_BUTTON_SUFFIXES = ['KeyMoveLeft', 'KeyMoveRight', 'KeyMoveUp', 'KeyMoveDown', 'KeyJump', 'KeySprint', 'KeyFire', 'KeyInteract', 'KeyMenu']
const HOTKEYS = ['HotkeysTitle', 'HotkeysInfo', ...HOTKEY_BUTTON_SUFFIXES, 'ResetHotkeys', 'Done']
const MENU_LAYOUTS = {
  main: {
    Backdrop: { y: 0, width: 300, height: 300, fontSize: 14 },
    Title: { y: -108, width: 250, height: 32, fontSize: 24 },
    Continue: { y: -54, width: 220, height: 34, fontSize: 16 },
    Reset: { y: -12, width: 220, height: 34, fontSize: 16 },
    Settings: { y: 30, width: 220, height: 34, fontSize: 16 },
    Exit: { y: 72, width: 220, height: 34, fontSize: 16 }
  },
  settings: {
    Backdrop: { y: 0, width: 320, height: 330, fontSize: 14 },
    SettingsTitle: { y: -118, width: 260, height: 30, fontSize: 22 },
    Difficulty: { y: -72, width: 230, height: 32, fontSize: 15 },
    VolumeText: { y: -34, width: 230, height: 28, fontSize: 14 },
    VolumeSlider: { y: 0, width: 240, height: 28, fontSize: 14 },
    Hotkeys: { y: 42, width: 230, height: 32, fontSize: 15 },
    Done: { y: 86, width: 230, height: 32, fontSize: 15 }
  },
  hotkeys: {
    Backdrop: { y: 0, width: 390, height: 315, fontSize: 12 },
    HotkeysTitle: { y: -130, width: 270, height: 24, fontSize: 18 },
    HotkeysInfo: { y: -104, width: 340, height: 22, fontSize: 10 },
    KeyMoveLeft: { x: -88, y: -72 },
    KeyMoveRight: { x: 88, y: -72 },
    KeyMoveUp: { x: -88, y: -46 },
    KeyMoveDown: { x: 88, y: -46 },
    KeyJump: { x: -88, y: -20 },
    KeySprint: { x: 88, y: -20 },
    KeyFire: { x: -88, y: 6 },
    KeyInteract: { x: 88, y: 6 },
    KeyMenu: { x: 0, y: 32 },
    ResetHotkeys: { x: -78, y: 82, width: 150, height: 26, fontSize: 11 },
    Done: { x: 78, y: 82, width: 150, height: 26, fontSize: 12 }
  }
}
const HOTKEY_BUTTON_LAYOUT = { width: 165, height: 22, fontSize: 11 }

function parseConfigFromEntity(entity) {
  const script = entity?.getComponent('Script')
  try {
    return JSON.parse(script?.sourceCode || '{}')
  } catch {
    return {}
  }
}

function parseConfig(ctx) {
  return parseConfigFromEntity(ctx.entity)
}

function manager(ctx) {
  return ctx.scene.entities.find((entity) => entity.name === 'PauseMenu_Manager') || null
}

function managerState(ctx) {
  const target = manager(ctx)
  return target ? ctx.api.getState(target) : {}
}

function findEntity(ctx, suffix) {
  return ctx.scene.entities.find((entity) => entity.name === `${MENU_PREFIX}${suffix}`) || null
}

function findUi(ctx, suffix) {
  return findEntity(ctx, suffix)?.getComponent('UI') || null
}

function setUi(ctx, suffix, enabled) {
  const ui = findUi(ctx, suffix)
  if (ui) ui.enabled = enabled
}

function applyMenuLayout(ctx, page) {
  const layout = MENU_LAYOUTS[page] || MENU_LAYOUTS.main
  for (const suffix of [...COMMON, ...MAIN, ...SETTINGS, ...HOTKEYS]) {
    const entity = findEntity(ctx, suffix)
    const transform = entity?.getTransform?.()
    const ui = entity?.getComponent?.('UI')
    const patch = layout[suffix] || (page === 'hotkeys' && HOTKEY_BUTTON_SUFFIXES.includes(suffix) ? HOTKEY_BUTTON_LAYOUT : null)
    if (!transform || !ui || !patch) continue
    transform.x = Number(patch.x ?? 0)
    transform.y = Number(patch.y ?? transform.y)
    transform.positionMode = 'viewport'
    transform.viewportHorizontal = 'center'
    transform.viewportVertical = 'middle'
    if (patch.width !== undefined) ui.width = patch.width
    if (patch.height !== undefined) ui.height = patch.height
    if (patch.fontSize !== undefined) ui.fontSize = patch.fontSize
    ui.autoWidth = false
    ui.autoHeight = false
    ui.minWidth = 1
    ui.minHeight = 1
  }
}

function getHotkeyBindings(ctx) {
  return HOTKEY_BUTTON_SUFFIXES
    .map((suffix) => {
      const entity = findEntity(ctx, suffix)
      const config = parseConfigFromEntity(entity)
      const target = String(config.target || '').trim()
      if (!entity || !target) return null
      return [suffix, target, String(config.label || target)]
    })
    .filter(Boolean)
}

function formatBinding(binding) {
  const labels = {
    Mouse0: '鼠标左键',
    Mouse1: '鼠标中键',
    Mouse2: '鼠标右键',
    ShiftLeft: '左 Shift',
    ShiftRight: '右 Shift',
    Space: '空格',
    Escape: 'Esc'
  }
  if (labels[binding]) return labels[binding]
  return String(binding || '').replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '方向键')
}

function refreshHotkeyLabels(ctx) {
  const state = managerState(ctx)
  for (const [suffix, action, label] of getHotkeyBindings(ctx)) {
    const ui = findUi(ctx, suffix)
    if (!ui) continue
    const bindings = ctx.api.input.getActionBindings?.(action) || []
    const text = bindings.length ? bindings.map(formatBinding).join(' / ') : '未绑定'
    ui.text = state.waitingAction === action ? `${label}: 等待输入...` : `${label}: ${text}`
    ui.backgroundColor = state.waitingAction === action ? 0x9a6330 : 0x34528a
  }
}

function refreshLabels(ctx) {
  const state = managerState(ctx)
  const difficulty = findUi(ctx, 'Difficulty')
  const volume = findUi(ctx, 'VolumeText')
  const volumeSlider = findUi(ctx, 'VolumeSlider')
  if (difficulty) difficulty.text = `游戏难度：${state.difficulty === 'hard' ? '困难' : '普通'}`
  if (volume) volume.text = `游戏音量：${Math.round(Number(state.volume ?? ctx.api.audio.getMasterVolume()) * 100)}%`
  if (volumeSlider) volumeSlider.sliderValue = Number(state.volume ?? ctx.api.audio.getMasterVolume())
  refreshHotkeyLabels(ctx)
}

function showPage(ctx, page) {
  const state = managerState(ctx)
  state.visible = true
  state.page = page
  if (page !== 'hotkeys') state.waitingAction = ''
  for (const suffix of [...COMMON, ...MAIN, ...SETTINGS, ...HOTKEYS]) setUi(ctx, suffix, false)
  applyMenuLayout(ctx, page)
  setUi(ctx, 'Backdrop', true)
  setUi(ctx, 'Title', page === 'main')
  const pageItems = page === 'settings' ? SETTINGS : page === 'hotkeys' ? ['HotkeysTitle', 'HotkeysInfo', ...getHotkeyBindings(ctx).map((item) => item[0]), 'ResetHotkeys', 'Done'] : MAIN
  for (const suffix of pageItems) setUi(ctx, suffix, true)
  refreshLabels(ctx)
}

function hideMenu(ctx) {
  const state = managerState(ctx)
  state.visible = false
  state.page = 'main'
  state.waitingAction = ''
  for (const suffix of [...COMMON, ...MAIN, ...SETTINGS, ...HOTKEYS]) setUi(ctx, suffix, false)
}

export default {
  onUiClick(ctx) {
    const config = parseConfig(ctx)
    const action = String(config.action || '')
    if (action === 'continue') {
      hideMenu(ctx)
      ctx.api.resumeGame()
      return
    }
    if (action === 'reset') {
      ctx.api.resetGame()
      return
    }
    if (action === 'settings') {
      showPage(ctx, 'settings')
      return
    }
    if (action === 'exit') {
      ctx.api.exitGame()
      return
    }
    if (action === 'difficulty') {
      const state = managerState(ctx)
      state.difficulty = state.difficulty === 'hard' ? 'normal' : 'hard'
      ctx.api.log(`[Pause Menu] difficulty = ${state.difficulty}`)
      refreshLabels(ctx)
      return
    }
    if (action === 'volume') {
      const state = managerState(ctx)
      const value = ctx.event?.type === 'uiClick' ? Number(ctx.event.ui?.sliderValue) : Number.NaN
      const next = Math.max(0, Math.min(1, Number.isFinite(value) ? value : Number(state.volume ?? ctx.api.audio.getMasterVolume())))
      state.volume = next
      ctx.api.audio.setMasterVolume(next)
      refreshLabels(ctx)
      return
    }
    if (action === 'hotkeys') {
      showPage(ctx, 'hotkeys')
      return
    }
    if (action === 'bindKey') {
      const state = managerState(ctx)
      state.page = 'hotkeys'
      state.waitingAction = String(config.target || '')
      state.captureIgnoreFrames = 2
      refreshHotkeyLabels(ctx)
      return
    }
    if (action === 'resetHotkeys') {
      const state = managerState(ctx)
      state.waitingAction = ''
      ctx.api.input.resetActionBindings?.()
      ctx.api.log('[Input] reset key bindings')
      showPage(ctx, 'hotkeys')
      return
    }
    if (action === 'done') {
      const state = managerState(ctx)
      state.waitingAction = ''
      showPage(ctx, state.page === 'hotkeys' ? 'settings' : 'main')
    }
  }
}

