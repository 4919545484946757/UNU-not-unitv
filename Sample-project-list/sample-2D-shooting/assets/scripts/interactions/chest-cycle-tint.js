const parseConfig = (ctx) => {
  try {
    const raw = String(ctx.entity.getComponent('Script')?.sourceCode || '').trim()
    if (!raw.startsWith('{')) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    ctx.api.warn(`[${ctx.entity.id}] chest config parse failed`, error?.message || error)
    return {}
  }
}

const parseColor = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  if (/^#?[0-9a-f]{6}$/i.test(text)) return Number.parseInt(text.replace('#', ''), 16)
  if (/^0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(2), 16)
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

export default {
  onInteract(ctx) {
    const sprite = ctx.entity.getComponent('Sprite')
    if (!sprite) return

    const config = parseConfig(ctx)
    const interactable = ctx.entity.getComponent('Interactable')
    const rawColors = Array.isArray(config.colors)
      ? config.colors
      : Array.isArray(config.values)
        ? config.values
        : Array.isArray(interactable?.tintCycle)
          ? interactable.tintCycle
          : []
    const colors = rawColors.map(parseColor).filter((item) => item !== null)
    if (!colors.length) return

    const state = ctx.api.getState(ctx.entity)
    const nextIndex = (Number(state.__chestTintIndex ?? -1) + 1 + colors.length) % colors.length
    state.__chestTintIndex = nextIndex
    sprite.tint = Math.max(0, Math.round(colors[nextIndex]))
    ctx.api.log(`[${ctx.entity.id}] chest tint -> 0x${sprite.tint.toString(16).padStart(6, '0')}`)
  }
}
