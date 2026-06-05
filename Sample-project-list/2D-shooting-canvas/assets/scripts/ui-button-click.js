export default {
  onUiClick(ctx) {
    const ui = ctx.event?.type === 'uiClick' ? ctx.event.ui : null
    const state = ctx.api.getState(ctx.entity)
    state.clickCount = Number(state.clickCount || 0) + 1
    ctx.api.log(`[UI Button] ${ctx.entity.name} clicked ${state.clickCount} time(s)`)
    if (ui) {
      ui.text = `Clicked ${state.clickCount}`
      ui.backgroundColor = state.clickCount % 2 === 0 ? 0x34528a : 0x4d8a34
    }
  }
}
