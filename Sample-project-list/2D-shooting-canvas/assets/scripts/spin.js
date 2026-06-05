export default {
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    transform.rotation += 1.5 * ctx.api.delta
  }
}
