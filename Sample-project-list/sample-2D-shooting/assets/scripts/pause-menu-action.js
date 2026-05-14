const MENU_PREFIX = 'PauseMenu_'
const COMMON = ['Backdrop', 'Title']
const MAIN = ['Continue', 'Reset', 'Settings', 'Exit']
const SETTINGS = ['SettingsTitle', 'Difficulty', 'VolumeText', 'VolumeSlider', 'Hotkeys', 'Done']
const HOTKEYS = ['HotkeysTitle', 'HotkeysInfo', 'Done']

function parseConfig(ctx) {
  const script = ctx.entity.getComponent('Script')
  try {
    return JSON.parse(script?.sourceCode || '{}')
  } catch {
    return {}
  }
}

function manager(ctx) {
  return ctx.scene.entities.find((entity) => entity.name === 'PauseMenu_Manager') || null
}

function managerState(ctx) {
  const target = manager(ctx)
  return target ? ctx.api.getState(target) : {}
}

function findUi(ctx, suffix) {
  return ctx.scene.entities.find((entity) => entity.name === `${MENU_PREFIX}${suffix}`)?.getComponent('UI') || null
}

function setUi(ctx, suffix, enabled) {
  const ui = findUi(ctx, suffix)
  if (ui) ui.enabled = enabled
}

function refreshLabels(ctx) {
  const state = managerState(ctx)
  const difficulty = findUi(ctx, 'Difficulty')
  const volume = findUi(ctx, 'VolumeText')
  const volumeSlider = findUi(ctx, 'VolumeSlider')
  if (difficulty) difficulty.text = `游戏难度：${state.difficulty === 'hard' ? '困难' : '普通'}`
  if (volume) volume.text = `游戏音量：${Math.round(Number(state.volume ?? ctx.api.audio.getMasterVolume()) * 100)}%`
  if (volumeSlider) volumeSlider.sliderValue = Number(state.volume ?? ctx.api.audio.getMasterVolume())
}

function showPage(ctx, page) {
  const state = managerState(ctx)
  state.visible = true
  state.page = page
  for (const suffix of [...COMMON, ...MAIN, ...SETTINGS, ...HOTKEYS]) setUi(ctx, suffix, false)
  for (const suffix of COMMON) setUi(ctx, suffix, true)
  for (const suffix of page === 'settings' ? SETTINGS : page === 'hotkeys' ? HOTKEYS : MAIN) setUi(ctx, suffix, true)
  refreshLabels(ctx)
}

function hideMenu(ctx) {
  const state = managerState(ctx)
  state.visible = false
  state.page = 'main'
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
    if (action === 'done') {
      const state = managerState(ctx)
      showPage(ctx, state.page === 'hotkeys' ? 'settings' : 'main')
    }
  }
}
