const MENU_PREFIX = 'PauseMenu_'
const COMMON = ['Backdrop', 'Title']
const MAIN = ['Continue', 'Reset', 'Settings', 'Exit']
const SETTINGS = ['SettingsTitle', 'Difficulty', 'VolumeText', 'VolumeSlider', 'Hotkeys', 'Done']
const HOTKEYS = ['HotkeysTitle', 'HotkeysInfo', 'Done']

function readConfig(ctx) {
  const script = ctx.entity.getComponent('Script')
  try {
    return JSON.parse(script?.sourceCode || '{}')
  } catch {
    return {}
  }
}

function findUi(scene, suffix) {
  return scene.entities.find((entity) => entity.name === `${MENU_PREFIX}${suffix}`)?.getComponent('UI') || null
}

function setUi(scene, suffix, enabled) {
  const ui = findUi(scene, suffix)
  if (ui) ui.enabled = enabled
}

function getMenuState(ctx) {
  const state = ctx.api.getState(ctx.entity)
  if (!state.page) state.page = 'main'
  if (typeof state.visible !== 'boolean') state.visible = false
  if (!state.difficulty) state.difficulty = 'normal'
  if (!Number.isFinite(state.volume)) state.volume = ctx.api.audio.getMasterVolume()
  return state
}

function refreshLabels(ctx) {
  const state = getMenuState(ctx)
  const difficulty = findUi(ctx.scene, 'Difficulty')
  const volume = findUi(ctx.scene, 'VolumeText')
  const volumeSlider = findUi(ctx.scene, 'VolumeSlider')
  if (difficulty) difficulty.text = `游戏难度：${state.difficulty === 'hard' ? '困难' : '普通'}`
  if (volume) volume.text = `游戏音量：${Math.round(Number(state.volume ?? 1) * 100)}%`
  if (volumeSlider) volumeSlider.sliderValue = Number(state.volume ?? 1)
}

function setMenuVisible(ctx, visible, page = 'main') {
  const state = getMenuState(ctx)
  state.visible = visible
  state.page = page
  for (const suffix of [...COMMON, ...MAIN, ...SETTINGS, ...HOTKEYS]) setUi(ctx.scene, suffix, false)
  if (!visible) return
  for (const suffix of COMMON) setUi(ctx.scene, suffix, true)
  const pageItems = page === 'settings' ? SETTINGS : page === 'hotkeys' ? HOTKEYS : MAIN
  for (const suffix of pageItems) setUi(ctx.scene, suffix, true)
  refreshLabels(ctx)
}

function updatePauseMenu(ctx) {
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
