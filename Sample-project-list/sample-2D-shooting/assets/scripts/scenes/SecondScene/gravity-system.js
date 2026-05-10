const parseConfig = (ctx) => {
  try {
    const raw = String(ctx.entity.getComponent('Script')?.sourceCode || '').trim()
    if (!raw.startsWith('{')) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const getColliderBox = (entity) => {
  const transform = entity.getTransform()
  const collider = entity.getComponent('Collider')
  if (!transform || !collider) return null
  return {
    transform,
    collider,
    halfWidth: Math.max(2, Math.abs(transform.scaleX || 1) * Number(collider.width ?? 32) / 2),
    halfHeight: Math.max(2, Math.abs(transform.scaleY || 1) * Number(collider.height ?? 32) / 2),
    offsetX: Number(collider.offsetX ?? 0),
    offsetY: Number(collider.offsetY ?? 0)
  }
}

const isGravityTarget = (entity, whitelist) => {
  const name = String(entity.name || '')
  return whitelist.some((item) => name === item || name.startsWith(`${item}_`) || name.startsWith(item))
}

const moveVerticalSafely = (ctx, entity, dy) => {
  const box = getColliderBox(entity)
  if (!box || !dy) return { moved: false, blocked: false }

  const { transform, halfWidth, halfHeight, offsetX, offsetY } = box
  const direction = Math.sign(dy)
  let remaining = Math.abs(dy)
  let moved = false
  let blocked = false
  const maxStep = 4

  while (remaining > 0) {
    const step = Math.min(maxStep, remaining) * direction
    const nextY = transform.y + step
    if (ctx.api.isBlockedRect(transform.x + offsetX, nextY + offsetY, halfWidth, halfHeight)) {
      blocked = true
      break
    }
    transform.y = nextY
    remaining -= Math.abs(step)
    moved = true
  }

  return { moved, blocked }
}

const isGrounded = (ctx, entity) => {
  const box = getColliderBox(entity)
  if (!box) return false
  const { transform, halfWidth, halfHeight, offsetX, offsetY } = box
  return ctx.api.isBlockedRect(transform.x + offsetX, transform.y + offsetY + 2, halfWidth, halfHeight)
}

export default {
  onUpdate(ctx) {
    const cfg = parseConfig(ctx)
    const whitelist = Array.isArray(cfg.whitelist) && cfg.whitelist.length ? cfg.whitelist.map(String) : ['Player', 'Enemy']
    const gravity = Number(cfg.gravity ?? 1600)
    const maxFallSpeed = Number(cfg.maxFallSpeed ?? 760)

    for (const entity of ctx.scene.entities) {
      if (entity === ctx.entity || !isGravityTarget(entity, whitelist)) continue
      if (!entity.getTransform() || !entity.getComponent('Collider')) continue

      const state = ctx.api.getState(entity)
      const grounded = isGrounded(ctx, entity)
      state.__platformerGrounded = grounded
      if (grounded && Number(state.__platformerVy || 0) > 0) state.__platformerVy = 0

      state.__platformerVy = Math.min(maxFallSpeed, Number(state.__platformerVy || 0) + gravity * ctx.api.delta)
      const result = moveVerticalSafely(ctx, entity, Number(state.__platformerVy || 0) * ctx.api.delta)
      if (result.blocked) {
        if (Number(state.__platformerVy || 0) > 0) state.__platformerGrounded = true
        state.__platformerVy = 0
      } else if (result.moved) {
        state.__platformerGrounded = false
      }
    }
  }
}
