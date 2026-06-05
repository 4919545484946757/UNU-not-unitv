export default {
  onInit(ctx) {
    const state = ctx.api.getState(ctx.entity)
    state.dir = 1
    state.startX = ctx.entity.getTransform()?.x ?? 0
  },
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    const state = ctx.api.getState(ctx.entity)
    const startX = Number(state.startX ?? transform.x)
    let dir = Number(state.dir ?? 1)
    transform.x += dir * 80 * ctx.api.delta
    if (transform.x > startX + 100) dir = -1
    if (transform.x < startX - 100) dir = 1
    state.dir = dir
  }
}
