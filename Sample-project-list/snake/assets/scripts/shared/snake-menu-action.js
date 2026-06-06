const MENU_NAMES = [
  'SnakeMenu_Backdrop',
  'SnakeMenu_Title',
  'SnakeMenu_Continue',
  'SnakeMenu_Restart',
  'SnakeMenu_Difficulty',
  'SnakeMenu_ResetHotkeys',
  'SnakeMenu_Exit'
]

function readConfig(ctx) {
  const script = ctx.entity.getComponent('Script')
  try {
    return JSON.parse(script?.sourceCode || '{}')
  } catch {
    return {}
  }
}

function controller(ctx) {
  return ctx.scene.entities.find((entity) => entity.name === 'SnakeGameController') || null
}

function setUi(entity, enabled) {
  const ui = entity && entity.getComponent('UI')
  if (ui) ui.enabled = enabled
}

function hideMenu(ctx) {
  for (const name of MENU_NAMES) {
    setUi(ctx.scene.entities.find((entity) => entity.name === name), false)
  }
  const target = controller(ctx)
  if (!target) return
  const state = ctx.api.getState(target)
  state.menuVisible = false
  state.paused = false
}

export default {
  onUiClick(ctx) {
    const action = String(readConfig(ctx).action || '')
    const target = controller(ctx)
    const state = target ? ctx.api.getState(target) : {}

    if (action === 'continue') {
      if (state.gameOver) return
      hideMenu(ctx)
      return
    }

    if (action === 'restart') {
      state.restartRequested = true
      return
    }

    if (action === 'difficulty') {
      state.difficultyChangeRequested = true
      state.menuVisible = true
      state.paused = true
      return
    }

    if (action === 'resetHotkeys') {
      ctx.api.input.resetActionBindings?.()
      ctx.api.log('[Snake] reset key bindings')
      state.menuVisible = true
      state.paused = true
      return
    }

    if (action === 'exit') {
      ctx.api.exitGame()
    }
  }
}
