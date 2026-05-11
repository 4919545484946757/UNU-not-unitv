const parseConfig = (ctx) => {
  try {
    const raw = String(ctx.entity.getComponent('Script')?.sourceCode || '').trim()
    if (!raw.startsWith('{')) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    ctx.api.warn(`[${ctx.entity.id}] door config parse failed`, error?.message || error)
    return {}
  }
}

export default {
  onInteract(ctx) {
    const config = parseConfig(ctx)
    const interactable = ctx.entity.getComponent('Interactable')
    const scene = String(config.scene || config.targetScene || interactable?.targetScene || '').trim()
    if (!scene) {
      ctx.api.warn(`[${ctx.entity.id}] door has no target scene`)
      return
    }

    ctx.api.switchScene(scene, {
      targetSpawnId: String(config.targetSpawnId || interactable?.targetSpawnId || '').trim(),
      sceneStateMode: config.sceneStateMode === 'reset' || interactable?.sceneStateMode === 'reset' ? 'reset' : 'preserve'
    })
    ctx.api.log(`[${ctx.entity.id}] switch scene -> ${scene}`)
  }
}
