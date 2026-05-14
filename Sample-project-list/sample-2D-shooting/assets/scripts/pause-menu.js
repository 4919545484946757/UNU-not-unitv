const MENU_PREFIX = 'PauseMenu_'
const COMMON = ['Backdrop', 'Title']
const MAIN = ['Continue', 'Reset', 'Settings', 'Exit']
const SETTINGS = ['SettingsTitle', 'Difficulty', 'VolumeText', 'VolumeSlider', 'Hotkeys', 'Done']
const HOTKEY_BUTTON_SUFFIXES = ['KeyMoveLeft', 'KeyMoveRight', 'KeyMoveUp', 'KeyMoveDown', 'KeyJump', 'KeySprint', 'KeyFire', 'KeyInteract', 'KeyMenu']
const HOTKEYS = ['HotkeysTitle', 'HotkeysInfo', ...HOTKEY_BUTTON_SUFFIXES, 'ResetHotkeys', 'Done']

function readConfigFromEntity(entity) {
  const script = entity?.getComponent('Script')
  try {
    return JSON.parse(script?.sourceCode || '{}')
  } catch {
    return {}
  }
}

function readConfig(ctx) {
  return readConfigFromEntity(ctx.entity)
}

function findUi(scene, suffix) {
  return scene.entities.find((entity) => entity.name === `${MENU_PREFIX}${suffix}`)?.getComponent('UI') || null
}

function findEntity(scene, suffix) {
  return scene.entities.find((entity) => entity.name === `${MENU_PREFIX}${suffix}`) || null
}

function setUi(scene, suffix, enabled) {
  const ui = findUi(scene, suffix)
  if (ui) ui.enabled = enabled
}

function getHotkeyBindings(scene) {
  return HOTKEY_BUTTON_SUFFIXES
    .map((suffix) => {
      const entity = findEntity(scene, suffix)
      const config = readConfigFromEntity(entity)
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

function getMenuState(ctx) {
  const state = ctx.api.getState(ctx.entity)
  if (!state.page) state.page = 'main'
  if (typeof state.visible !== 'boolean') state.visible = false
  if (!state.difficulty) state.difficulty = 'normal'
  if (!Number.isFinite(state.volume)) state.volume = ctx.api.audio.getMasterVolume()
  if (!Number.isFinite(state.captureIgnoreFrames)) state.captureIgnoreFrames = 0
  return state
}

function refreshHotkeyLabels(ctx) {
  const state = getMenuState(ctx)
  for (const [suffix, action, label] of getHotkeyBindings(ctx.scene)) {
    const ui = findUi(ctx.scene, suffix)
    if (!ui) continue
    const bindings = ctx.api.input.getActionBindings?.(action) || []
    const text = bindings.length ? bindings.map(formatBinding).join(' / ') : '未绑定'
    ui.text = state.waitingAction === action ? `${label}: 等待输入...` : `${label}: ${text}`
    ui.backgroundColor = state.waitingAction === action ? 0x9a6330 : 0x34528a
  }
}

function refreshLabels(ctx) {
  const state = getMenuState(ctx)
  const difficulty = findUi(ctx.scene, 'Difficulty')
  const volume = findUi(ctx.scene, 'VolumeText')
  const volumeSlider = findUi(ctx.scene, 'VolumeSlider')
  if (difficulty) difficulty.text = `游戏难度：${state.difficulty === 'hard' ? '困难' : '普通'}`
  if (volume) volume.text = `游戏音量：${Math.round(Number(state.volume ?? 1) * 100)}%`
  if (volumeSlider) volumeSlider.sliderValue = Number(state.volume ?? 1)
  refreshHotkeyLabels(ctx)
}

function setMenuVisible(ctx, visible, page = 'main') {
  const state = getMenuState(ctx)
  state.visible = visible
  state.page = page
  if (!visible) state.waitingAction = ''
  for (const suffix of [...COMMON, ...MAIN, ...SETTINGS, ...HOTKEYS]) setUi(ctx.scene, suffix, false)
  if (!visible) return
  setUi(ctx.scene, 'Backdrop', true)
  setUi(ctx.scene, 'Title', page === 'main')
  const pageItems = page === 'settings' ? SETTINGS : page === 'hotkeys' ? ['HotkeysTitle', 'HotkeysInfo', ...getHotkeyBindings(ctx.scene).map((item) => item[0]), 'ResetHotkeys', 'Done'] : MAIN
  for (const suffix of pageItems) setUi(ctx.scene, suffix, true)
  refreshLabels(ctx)
}

function updateCapture(ctx) {
  const state = getMenuState(ctx)
  if (!state.waitingAction) return false
  if (state.captureIgnoreFrames > 0) {
    state.captureIgnoreFrames -= 1
    return true
  }
  const pressed = ctx.api.input.getPressedBindings?.() || []
  const binding = pressed.find(Boolean)
  if (!binding) return true
  ctx.api.input.setActionBindings?.(String(state.waitingAction), [binding])
  ctx.api.log(`[Input] ${state.waitingAction} -> ${binding}`)
  state.waitingAction = ''
  refreshHotkeyLabels(ctx)
  return true
}

function updatePauseMenu(ctx) {
  if (updateCapture(ctx)) return
  if (!ctx.api.input.wasActionPressed('menu')) return
  const state = getMenuState(ctx)
  if (!state.visible) {
    setMenuVisible(ctx, true, 'main')
    ctx.api.pauseGame()
    return
  }
  if (state.page === 'settings' || state.page === 'hotkeys') {
    setMenuVisible(ctx, true, 'main')
    return
  }
  setMenuVisible(ctx, false, 'main')
  ctx.api.resumeGame()
}

export default {
  onStart(ctx) {
    const config = readConfig(ctx)
    const state = getMenuState(ctx)
    state.difficulty = config.defaultDifficulty === 'hard' ? 'hard' : 'normal'
    state.volume = Number.isFinite(config.defaultVolume) ? Math.max(0, Math.min(1, Number(config.defaultVolume))) : 1
    ctx.api.audio.setMasterVolume(state.volume)
    setMenuVisible(ctx, false, 'main')
  },
  onUpdate: updatePauseMenu,
  onPausedUpdate: updatePauseMenu
}

