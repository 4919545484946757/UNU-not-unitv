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
    halfWidth: Math.max(2, Math.abs(transform.scaleX || 1) * Number(collider.width ?? 32) / 2),
    halfHeight: Math.max(2, Math.abs(transform.scaleY || 1) * Number(collider.height ?? 32) / 2),
    offsetX: Number(collider.offsetX ?? 0),
    offsetY: Number(collider.offsetY ?? 0)
  }
}

const isGrounded = (ctx, entity) => {
  const box = getColliderBox(entity)
  if (!box) return false
  const { transform, halfWidth, halfHeight, offsetX, offsetY } = box
  return ctx.api.isBlockedRect(transform.x + offsetX, transform.y + offsetY + 2, halfWidth, halfHeight)
}

const moveHorizontalSafely = (ctx, entity, dx) => {
  const box = getColliderBox(entity)
  if (!box || !dx) return

  const { transform, halfWidth, halfHeight, offsetX, offsetY } = box
  const direction = Math.sign(dx)
  let remaining = Math.abs(dx)
  const maxStep = 4

  while (remaining > 0) {
    const step = Math.min(maxStep, remaining) * direction
    const nextX = transform.x + step
    if (ctx.api.isBlockedRect(nextX + offsetX, transform.y + offsetY, halfWidth, halfHeight)) break
    transform.x = nextX
    remaining -= Math.abs(step)
  }
}

export default {
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return

    const cfg = parseConfig(ctx)
    const state = ctx.api.getState(ctx.entity)
    const moveSpeed = Number(cfg.moveSpeed ?? 190)
    const sprintSpeed = Number(cfg.sprintSpeed ?? 280)
    const jumpSpeed = Number(cfg.jumpSpeed ?? 560)
    const speed = ctx.api.input.isActionDown('sprint') ? sprintSpeed : moveSpeed

    const left = ctx.api.input.isKeyDown('KeyA') || ctx.api.input.isActionDown('move_left')
    const right = ctx.api.input.isKeyDown('KeyD') || ctx.api.input.isActionDown('move_right')
    const horizontal = (right ? 1 : 0) - (left ? 1 : 0)

    if (!Number.isFinite(state.__baseScaleX)) {
      state.__baseScaleX = Math.max(0.001, Math.abs(transform.scaleX || 1))
    }
    if (horizontal > 0) transform.scaleX = -Math.abs(state.__baseScaleX || 1)
    else if (horizontal < 0) transform.scaleX = Math.abs(state.__baseScaleX || 1)

    moveHorizontalSafely(ctx, ctx.entity, horizontal * speed * ctx.api.delta)

    const grounded = Boolean(state.__platformerGrounded) || isGrounded(ctx, ctx.entity)
    const jumpPressed =
      ctx.api.input.wasActionPressed('jump') ||
      ctx.api.input.wasActionPressed('move_up') ||
      ctx.api.input.wasActionPressed('ui_accept')

    if (grounded && jumpPressed) {
      state.__platformerVy = -jumpSpeed
      state.__platformerGrounded = false
    }

    if (!ctx.api.input.wasActionPressed(String(cfg.shootAction || 'fire'))) return
    const mouse = ctx.api.input.getMousePosition()
    ctx.api.spawnBullet(ctx.entity, {
      targetX: mouse.x,
      targetY: mouse.y,
      speed: Number(cfg.bullet?.speed ?? 420),
      life: Number(cfg.bullet?.life ?? 2),
      maxDistance: Number(cfg.bullet?.maxDistance ?? 560),
      width: Number(cfg.bullet?.width ?? 20),
      height: Number(cfg.bullet?.height ?? 8),
      tint: Number(cfg.bullet?.tint ?? 15922687)
    })
  }
}
