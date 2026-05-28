const parseConfig = (ctx) => {
  return parseEntityScriptConfig(ctx.entity)
}

const parseEntityScriptConfig = (entity) => {
  try {
    const raw = String(entity?.getComponent('Script')?.sourceCode || '').trim()
    if (!raw.startsWith('{')) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const readNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const ARMOR_SPEED = {
  'sample-2D-shooting:light_helmet': 0.98,
  'sample-2D-shooting:light_chest': 0.97,
  'sample-2D-shooting:light_leggings': 0.98,
  'sample-2D-shooting:light_boots': 0.99,
  'sample-2D-shooting:heavy_helmet': 0.93,
  'sample-2D-shooting:heavy_chest': 0.88,
  'sample-2D-shooting:heavy_leggings': 0.9,
  'sample-2D-shooting:heavy_boots': 0.92,
  'sample-2D-shooting:debug_crown': 1
}

const getArmorMoveMultiplier = (ctx, entity) => {
  const state = ctx.api.getState(entity)
  const equipment = state.equipment && typeof state.equipment === 'object' ? state.equipment : {}
  return Object.values(equipment).reduce((speed, item) => {
    const multiplier = ARMOR_SPEED[String(item || '')] ?? 1
    return speed * Math.max(0.25, Number(multiplier) || 1)
  }, 1)
}

const NS = 'sample-2D-shooting'
const itemId = (name) => `${NS}:${name}`
const WEAPONS = {
  [itemId('auto_rifle')]: { displayName: '自动步枪', fireMode: 'auto', magazineSize: 30, reserveAmmo: 180, fireInterval: 0.08, reloadTime: 1.55, bulletSpeed: 980, spread: 0.025, pellets: 1, damage: 18 },
  [itemId('precision_rifle')]: { displayName: '精确步枪', fireMode: 'semi', magazineSize: 15, reserveAmmo: 90, fireInterval: 0.22, reloadTime: 1.65, bulletSpeed: 1180, spread: 0.01, maxSpread: 0.085, spreadPerRapidShot: 0.018, focusResetTime: 0.55, accurateShots: 2, pellets: 1, damage: 34 },
  [itemId('sniper_rifle')]: { displayName: '狙击步枪', fireMode: 'semi', magazineSize: 5, reserveAmmo: 25, fireInterval: 0.95, reloadTime: 2.35, bulletSpeed: 1500, spread: 0, pellets: 1, damage: 95 },
  [itemId('shotgun')]: { displayName: '霰弹枪', fireMode: 'semi', magazineSize: 7, reserveAmmo: 42, fireInterval: 0.34, reloadMode: 'shell', shellReloadInterval: 0.42, bulletSpeed: 840, spread: 0.18, pellets: 7, damage: 12 }
}

const defaultInventory = () => [
  itemId('bandage'), itemId('bandage'), itemId('medkit'), itemId('heavy_helmet'), itemId('heavy_chest'), itemId('heavy_leggings'),
  itemId('heavy_boots'), itemId('debug_crown'), itemId('scp_500'), '', '', '',
  itemId('light_helmet'), itemId('light_chest'), itemId('light_leggings'), itemId('light_boots'), '', '',
  itemId('auto_rifle'), itemId('precision_rifle'), itemId('sniper_rifle'), itemId('shotgun'), itemId('medkit'), itemId('scp_500')
]

const normalizeInventory = (items) => {
  const next = Array.isArray(items) ? items.map((item) => String(item || '').trim()).slice(0, 24) : []
  while (next.length < 24) next.push('')
  return next
}

const selectedHotbar = (ctx) => {
  const panel = ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML')
  const panelState = panel ? ctx.api.getState(panel) : {}
  const player = ctx.scene.getEntityById('player_001') || ctx.api.findEntityByName('Player')
  const playerState = player ? ctx.api.getState(player) : {}
  return clampHotbar(panelState.selectedHotbar ?? playerState.selectedHotbar ?? 1)
}

const clampHotbar = (value) => Math.max(1, Math.min(6, Math.round(Number(value) || 1)))

const syncHotbarSelectionFromInput = (ctx, entity) => {
  const state = ctx.api.getState(entity)
  let changed = false
  for (let index = 1; index <= 6; index += 1) {
    if (ctx.api.input.wasActionPressed(`hotbar_${index}`)) {
      state.selectedHotbar = index
      changed = true
      break
    }
  }
  const panel = ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML')
  const panelState = panel ? ctx.api.getState(panel) : null
  const panelHotbar = Number(panelState?.selectedHotbar)
  const playerHotbar = Number(state.selectedHotbar)
  state.selectedHotbar = clampHotbar(changed
    ? playerHotbar
    : Number.isFinite(panelHotbar)
      ? panelHotbar
      : playerHotbar)
  if (panel) {
    panelState.selectedHotbar = state.selectedHotbar
    if (Array.isArray(state.inventoryItems)) panelState.items = normalizeInventory(state.inventoryItems)
  }
}

const heldWeapon = (ctx, entity) => {
  const state = ctx.api.getState(entity)
  if (!Array.isArray(state.inventoryItems)) state.inventoryItems = defaultInventory()
  state.inventoryItems = normalizeInventory(state.inventoryItems)
  const item = state.inventoryItems[17 + selectedHotbar(ctx)]
  return WEAPONS[item] ? { id: item, config: WEAPONS[item] } : null
}

const weaponState = (ctx, entity, id, config) => {
  const state = ctx.api.getState(entity)
  if (!state.weaponAmmo || typeof state.weaponAmmo !== 'object') state.weaponAmmo = {}
  if (!state.weaponAmmo[id]) {
    state.weaponAmmo[id] = { magazine: config.magazineSize, reserve: config.reserveAmmo, cooldown: 0, reloadTimer: 0, reloading: false, rapidShots: 0, focusTimer: 0 }
  }
  return state.weaponAmmo[id]
}

const updateReload = (ctx, config, ammo) => {
  ammo.cooldown = Math.max(0, Number(ammo.cooldown || 0) - ctx.api.delta)
  ammo.focusTimer = Math.max(0, Number(ammo.focusTimer || 0) - ctx.api.delta)
  if (ammo.focusTimer <= 0) ammo.rapidShots = 0
  if (!ammo.reloading) return
  ammo.reloadTimer = Number(ammo.reloadTimer || 0) - ctx.api.delta
  if (ammo.reloadTimer > 0) return
  if (config.reloadMode === 'shell') {
    if (ammo.magazine < config.magazineSize && ammo.reserve > 0) {
      ammo.magazine += 1
      ammo.reserve -= 1
      ammo.reloadTimer = ammo.magazine < config.magazineSize && ammo.reserve > 0 ? Number(config.shellReloadInterval || 0.42) : 0
      ammo.reloading = ammo.reloadTimer > 0
    } else ammo.reloading = false
    return
  }
  const loaded = Math.min(config.magazineSize - ammo.magazine, ammo.reserve)
  ammo.magazine += loaded
  ammo.reserve -= loaded
  ammo.reloading = false
}

const startReload = (ctx, config, ammo) => {
  if (ammo.reloading || ammo.reserve <= 0 || ammo.magazine >= config.magazineSize) return
  ammo.reloading = true
  ammo.reloadTimer = config.reloadMode === 'shell' ? Number(config.shellReloadInterval || 0.42) : Number(config.reloadTime || 1.5)
  ctx.api.log(`[Weapon] ${config.displayName} reload`)
}

const fireHeldWeapon = (ctx, entity) => {
  const held = heldWeapon(ctx, entity)
  if (!held) return
  const { id, config } = held
  const ammo = weaponState(ctx, entity, id, config)
  updateReload(ctx, config, ammo)
  if (ctx.api.input.wasActionPressed('reload')) startReload(ctx, config, ammo)
  const pressed = config.fireMode === 'auto' ? ctx.api.input.isActionDown('fire') : ctx.api.input.wasActionPressed('fire')
  if (!pressed) return
  if (ammo.reloading) {
    if (config.reloadMode !== 'shell' || ammo.magazine <= 0 || ammo.cooldown > 0) return
    ammo.reloading = false
    ammo.reloadTimer = 0
    ctx.api.log(`[Weapon] ${config.displayName} reload interrupted`)
  }
  if (ammo.cooldown > 0) return
  if (ammo.magazine <= 0) {
    startReload(ctx, config, ammo)
    return
  }
  ammo.magazine -= 1
  ammo.cooldown = Number(config.fireInterval || 0.2)
  if (config.fireMode === 'semi') {
    ammo.rapidShots = Number(ammo.rapidShots || 0) + 1
    ammo.focusTimer = Number(config.focusResetTime || 0.55)
  }
  const transform = entity.getTransform()
  const mouse = ctx.api.input.getMousePosition()
  const baseAngle = Math.atan2(mouse.y - (transform?.y || 0), mouse.x - (transform?.x || 0))
  const pellets = Math.max(1, Math.round(Number(config.pellets || 1)))
  for (let index = 0; index < pellets; index += 1) {
    const fan = pellets > 1 ? ((index / (pellets - 1)) - 0.5) * Number(config.spread || 0) : 0
    let spread = Number(config.spread || 0)
    if (id === itemId('precision_rifle')) {
      spread = Number(ammo.rapidShots || 0) <= Number(config.accurateShots || 2)
        ? 0
        : Math.min(Number(config.maxSpread || 0.08), Number(config.spread || 0) + (Number(ammo.rapidShots || 0) - Number(config.accurateShots || 2)) * Number(config.spreadPerRapidShot || 0.018))
    }
    const random = (Math.random() * 2 - 1) * (pellets > 1 ? Number(config.spread || 0) * 0.18 : spread)
    const angle = baseAngle + fan + random
    ctx.api.spawnBullet(entity, {
      targetX: (transform?.x || 0) + Math.cos(angle) * 1000,
      targetY: (transform?.y || 0) + Math.sin(angle) * 1000,
      speed: Number(config.bulletSpeed || 900),
      life: 1.8,
      maxDistance: 1100,
      width: id === itemId('sniper_rifle') ? 26 : 18,
      height: 6,
      tint: 15922687,
      damage: Number(config.damage || 10)
    })
  }
}

const findGravityConfig = (ctx) => {
  for (const entity of ctx.scene.entities) {
    const script = entity.getComponent('Script')
    if (!script) continue
    const path = String(script.scriptPath || '')
    if (path.endsWith('/gravity-system.js') || path.endsWith('\\gravity-system.js') || entity.name === 'SecondSceneGravitySystem') {
      return parseEntityScriptConfig(entity)
    }
  }
  return {}
}

const resolveJumpGravity = (ctx, cfg) => {
  const gravityCfg = findGravityConfig(ctx)
  return readNumber(
    cfg.jumpGravity ?? cfg.jumpAcceleration ?? cfg.gravity,
    readNumber(gravityCfg.gravity, 1600)
  )
}

const resolveJumpSpeed = (ctx, cfg) => {
  const explicitJumpSpeed = Number(cfg.jumpSpeed)
  if (Number.isFinite(explicitJumpSpeed) && explicitJumpSpeed > 0 && cfg.jumpHeight === undefined) return explicitJumpSpeed
  const gravity = Math.max(1, resolveJumpGravity(ctx, cfg))
  const jumpHeight = Math.max(1, readNumber(cfg.jumpHeight, 98))
  return Math.sqrt(2 * gravity * jumpHeight)
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
    const jumpSpeed = resolveJumpSpeed(ctx, cfg)
    const speed = (ctx.api.input.isActionDown('sprint') ? sprintSpeed : moveSpeed) * getArmorMoveMultiplier(ctx, ctx.entity)
    const jumpGravity = resolveJumpGravity(ctx, cfg)
    state.__platformerGravityOverride = jumpGravity
    state.__platformerGravityScale = readNumber(cfg.gravityScale ?? cfg.jumpGravityScale, 1)

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

    syncHotbarSelectionFromInput(ctx, ctx.entity)
    fireHeldWeapon(ctx, ctx.entity)
  }
}
