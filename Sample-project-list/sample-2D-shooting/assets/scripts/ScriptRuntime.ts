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

const resolveEnemyMatcher = (cfg) => {
  const fromConfig = cfg && typeof cfg.enemyMatch === 'object' ? cfg.enemyMatch : null
  if (fromConfig) return fromConfig
  return {
    scriptPath: 'assets/scripts/enemy-chase-respawn.js',
    namePrefix: 'Enemy'
  }
}

const ITEM_NS = 'sample-2D-shooting'
const itemId = (name) => `${ITEM_NS}:${name}`
const ITEM_DEFS = {
  [itemId('bandage')]: { displayName: '绷带', type: 'consumable', heal: 20 },
  [itemId('medkit')]: { displayName: '医疗包', type: 'consumable', heal: 55 },
  [itemId('scp_500')]: { displayName: 'SCP-500', type: 'consumable', heal: 'full' },
  [itemId('light_helmet')]: { displayName: '轻型头盔', type: 'equipment', equipSlot: 'helmet', percentReduction: 0.05, moveSpeedMultiplier: 0.98 },
  [itemId('light_chest')]: { displayName: '轻型胸甲', type: 'equipment', equipSlot: 'chest', percentReduction: 0.07, moveSpeedMultiplier: 0.97 },
  [itemId('light_leggings')]: { displayName: '轻型腿甲', type: 'equipment', equipSlot: 'leggings', percentReduction: 0.05, moveSpeedMultiplier: 0.98 },
  [itemId('light_boots')]: { displayName: '轻型靴', type: 'equipment', equipSlot: 'boots', percentReduction: 0.03, moveSpeedMultiplier: 0.99 },
  [itemId('heavy_helmet')]: { displayName: '重型头盔', type: 'equipment', equipSlot: 'helmet', flatReduction: 2, moveSpeedMultiplier: 0.93 },
  [itemId('heavy_chest')]: { displayName: '重型胸甲', type: 'equipment', equipSlot: 'chest', flatReduction: 4, moveSpeedMultiplier: 0.88 },
  [itemId('heavy_leggings')]: { displayName: '重型腿甲', type: 'equipment', equipSlot: 'leggings', flatReduction: 3, moveSpeedMultiplier: 0.9 },
  [itemId('heavy_boots')]: { displayName: '重型靴', type: 'equipment', equipSlot: 'boots', flatReduction: 2, moveSpeedMultiplier: 0.92 },
  [itemId('debug_crown')]: { displayName: '调试-王冠', type: 'equipment', equipSlot: 'helmet', immuneDamage: true, moveSpeedMultiplier: 1 },
  [itemId('auto_rifle')]: { displayName: '自动步枪', type: 'weapon', fireMode: 'auto', magazineSize: 30, reserveAmmo: 180, fireInterval: 0.08, reloadTime: 1.55, bulletSpeed: 980, spread: 0.025, pellets: 1, damage: 18 },
  [itemId('precision_rifle')]: { displayName: '精确步枪', type: 'weapon', fireMode: 'semi', magazineSize: 15, reserveAmmo: 90, fireInterval: 0.22, reloadTime: 1.65, bulletSpeed: 1180, spread: 0.01, maxSpread: 0.085, spreadPerRapidShot: 0.018, focusResetTime: 0.55, accurateShots: 2, pellets: 1, damage: 34 },
  [itemId('sniper_rifle')]: { displayName: '狙击步枪', type: 'weapon', fireMode: 'semi', magazineSize: 5, reserveAmmo: 25, fireInterval: 0.95, reloadTime: 2.35, bulletSpeed: 1500, spread: 0, pellets: 1, damage: 95 },
  [itemId('shotgun')]: { displayName: '霰弹枪', type: 'weapon', fireMode: 'semi', magazineSize: 7, reserveAmmo: 42, fireInterval: 0.34, reloadMode: 'shell', shellReloadInterval: 0.42, bulletSpeed: 840, spread: 0.18, pellets: 7, damage: 12 },
  [itemId('access_card')]: { displayName: '门禁卡', type: 'tool', doorAccess: true },
  [itemId('debug_spawn_enemy')]: { displayName: '调试-生成敌人', type: 'debugTool' },
  [itemId('debug_teleport')]: { displayName: '调试-传送', type: 'debugTool' }
}

const defaultPlayerEquipment = () => ({
  helmet: itemId('light_helmet'),
  chest: itemId('light_chest'),
  leggings: itemId('light_leggings'),
  boots: itemId('light_boots')
})

const normalizeInventoryItems = (items, count) => {
  const next = Array.isArray(items) ? items.map((item) => String(item || '').trim()).slice(0, count) : []
  while (next.length < count) next.push('')
  return next
}

const defaultPlayerInventory = () => normalizeInventoryItems([
  itemId('bandage'), itemId('bandage'), itemId('medkit'), itemId('heavy_helmet'), itemId('heavy_chest'), itemId('heavy_leggings'),
  itemId('heavy_boots'), itemId('debug_crown'), itemId('scp_500'), itemId('debug_teleport'), '', '',
  itemId('light_helmet'), itemId('light_chest'), itemId('light_leggings'), itemId('light_boots'), itemId('access_card'), itemId('debug_spawn_enemy'),
  itemId('auto_rifle'), itemId('precision_rifle'), itemId('sniper_rifle'), itemId('shotgun'), itemId('medkit'), itemId('scp_500')
], 24)

const defaultEnemyInventory = (seed) => {
  const sets = [
    [itemId('bandage'), '', '', '', '', ''],
    ['', itemId('bandage'), '', '', '', ''],
    ['', '', itemId('medkit'), '', '', '']
  ]
  const index = Math.abs(String(seed || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % sets.length
  return normalizeInventoryItems(sets[index], 12)
}

const isEntityDeathPending = (ctx, entity) => Boolean(ctx.api.getState(entity).__deathPending)
const ensureEnemyHealth = (ctx, entity, options = {}) => ensureHealth(ctx, entity, { max: Number(options.max ?? 50) })

const ensureEntityInventory = (ctx, entity, options = {}) => {
  const state = ctx.api.getState(entity)
  const count = Math.max(1, Number(options.count ?? 24))
  const defaults = Array.isArray(options.defaults) ? options.defaults : []
  if (!Array.isArray(state.inventoryItems)) state.inventoryItems = normalizeInventoryItems(defaults, count)
  else state.inventoryItems = normalizeInventoryItems(state.inventoryItems, count)
  return state.inventoryItems
}

const normalizeEquipment = (equipment = {}) => ({
  helmet: String(equipment.helmet || ''),
  chest: String(equipment.chest || ''),
  leggings: String(equipment.leggings || ''),
  boots: String(equipment.boots || '')
})

const ensurePlayerEquipment = (ctx, player) => {
  const playerState = ctx.api.getState(player)
  const inventoryData = player.getComponent?.('Inventory')?.data
  const panel = ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML')
  const panelState = panel ? ctx.api.getState(panel) : null
  if (!playerState.equipment || typeof playerState.equipment !== 'object') {
    playerState.equipment = normalizeEquipment(panelState?.equipment || inventoryData?.equipment || defaultPlayerEquipment())
  }
  if (panelState) {
    if (!panelState.equipment || typeof panelState.equipment !== 'object') panelState.equipment = normalizeEquipment(playerState.equipment)
    else playerState.equipment = normalizeEquipment(panelState.equipment)
  }
  if (inventoryData && typeof inventoryData === 'object') inventoryData.equipment = normalizeEquipment(playerState.equipment)
  return normalizeEquipment(playerState.equipment)
}

const getEquippedArmorDefs = (ctx, player) => {
  const equipment = ensurePlayerEquipment(ctx, player)
  return Object.values(equipment).map((item) => ITEM_DEFS[item]).filter((item) => item && item.type === 'equipment')
}

const getArmorMoveMultiplier = (ctx, player) => {
  return getEquippedArmorDefs(ctx, player).reduce((value, item) => {
    const multiplier = Number(item.moveSpeedMultiplier ?? 1)
    return value * (Number.isFinite(multiplier) ? Math.max(0.25, multiplier) : 1)
  }, 1)
}

const applyArmorDamageReduction = (ctx, player, amount) => {
  const raw = Math.max(0, Number(amount || 0))
  const armor = getEquippedArmorDefs(ctx, player)
  if (armor.some((item) => item.immuneDamage)) return 0
  const flatReduction = armor.reduce((sum, item) => sum + Math.max(0, Number(item.flatReduction || 0)), 0)
  const percentReduction = armor.reduce((sum, item) => sum + Math.max(0, Number(item.percentReduction || 0)), 0)
  return Math.max(0, (raw - flatReduction) * Math.max(0, 1 - Math.min(0.95, percentReduction)))
}

const getSelectedHotbarIndex = (ctx) => {
  const panel = ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML')
  const panelState = panel ? ctx.api.getState(panel) : {}
  const player = ctx.scene.getEntityById('player_001') || ctx.api.findEntityByName('Player')
  const playerState = player ? ctx.api.getState(player) : {}
  return clampHotbar(panelState.selectedHotbar ?? playerState.selectedHotbar ?? 1)
}

const getHeldSlotIndex = (ctx) => 17 + getSelectedHotbarIndex(ctx)

const getHeldItemId = (ctx, player) => {
  const inventory = ensureEntityInventory(ctx, player, { count: 24, defaults: defaultPlayerInventory() })
  return String(inventory[getHeldSlotIndex(ctx)] || '').trim()
}

const clampHotbar = (value) => Math.max(1, Math.min(6, Math.round(Number(value) || 1)))

const getInventoryPanel = (ctx) => ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML')

const syncInventoryPanelFromPlayer = (ctx, player, options = {}) => {
  const panel = getInventoryPanel(ctx)
  const playerState = ctx.api.getState(player)
  const inventory = ensureEntityInventory(ctx, player, { count: 24, defaults: defaultPlayerInventory() })
  const panelState = panel ? ctx.api.getState(panel) : null
  const panelHotbar = Number(panelState?.selectedHotbar)
  const playerHotbar = Number(playerState.selectedHotbar)
  playerState.selectedHotbar = clampHotbar(
    options.preferPlayerHotbar
      ? playerHotbar
      : Number.isFinite(panelHotbar)
        ? panelHotbar
        : playerHotbar
  )
  if (panel) {
    panelState.selectedHotbar = playerState.selectedHotbar
    panelState.items = normalizeInventoryItems(inventory, 24)
    if (playerState.equipment && typeof playerState.equipment === 'object') {
      panelState.equipment = normalizeEquipment(playerState.equipment)
    }
  }
  return { inventory, selectedHotbar: playerState.selectedHotbar }
}

const syncHotbarSelectionFromInput = (ctx, player) => {
  const playerState = ctx.api.getState(player)
  let changed = false
  for (let index = 1; index <= 6; index += 1) {
    if (ctx.api.input.wasActionPressed(`hotbar_${index}`)) {
      playerState.selectedHotbar = index
      changed = true
      break
    }
  }
  const synced = syncInventoryPanelFromPlayer(ctx, player, { preferPlayerHotbar: changed })
  if (changed) {
    const item = String(synced.inventory[17 + synced.selectedHotbar] || '').trim()
    const name = item ? ITEM_DEFS[item]?.displayName || item : '空手'
    ctx.api.log(`[Inventory] hotbar ${synced.selectedHotbar}: ${name}`)
  }
  return changed
}

const getWeaponState = (ctx, player, weaponId) => {
  const playerState = ctx.api.getState(player)
  if (!playerState.weaponAmmo || typeof playerState.weaponAmmo !== 'object') playerState.weaponAmmo = {}
  const weapon = ITEM_DEFS[weaponId]
  if (!playerState.weaponAmmo[weaponId]) {
    playerState.weaponAmmo[weaponId] = {
      magazine: Math.max(0, Number(weapon?.magazineSize || 0)),
      reserve: Math.max(0, Number(weapon?.reserveAmmo || 0)),
      cooldown: 0,
      reloadTimer: 0,
      reloading: false,
      rapidShots: 0,
      focusTimer: 0
    }
  }
  return playerState.weaponAmmo[weaponId]
}

const randomSpread = (range) => (Math.random() * 2 - 1) * Math.max(0, Number(range || 0))

const startReload = (ctx, player, weaponId, weapon, ammo) => {
  if (!weapon || ammo.reloading || ammo.magazine >= weapon.magazineSize || ammo.reserve <= 0) return
  ammo.reloading = true
  ammo.reloadTimer = weapon.reloadMode === 'shell'
    ? Number(weapon.shellReloadInterval || 0.42)
    : Number(weapon.reloadTime || 1.5)
  ctx.api.log(`[Weapon] ${weapon.displayName} reload`)
}

const updateWeaponReload = (ctx, player, weaponId, weapon, ammo) => {
  ammo.cooldown = Math.max(0, Number(ammo.cooldown || 0) - ctx.api.delta)
  ammo.focusTimer = Math.max(0, Number(ammo.focusTimer || 0) - ctx.api.delta)
  if (ammo.focusTimer <= 0) ammo.rapidShots = 0
  if (!ammo.reloading) return
  ammo.reloadTimer = Number(ammo.reloadTimer || 0) - ctx.api.delta
  if (ammo.reloadTimer > 0) return
  if (weapon.reloadMode === 'shell') {
    if (ammo.magazine < weapon.magazineSize && ammo.reserve > 0) {
      ammo.magazine += 1
      ammo.reserve -= 1
      if (ammo.magazine < weapon.magazineSize && ammo.reserve > 0) {
        ammo.reloadTimer = Number(weapon.shellReloadInterval || 0.42)
      } else {
        ammo.reloading = false
      }
    } else {
      ammo.reloading = false
    }
    return
  }
  const need = Math.max(0, weapon.magazineSize - ammo.magazine)
  const loaded = Math.min(need, ammo.reserve)
  ammo.magazine += loaded
  ammo.reserve -= loaded
  ammo.reloading = false
}

const fireWeapon = (ctx, player, weaponId, weapon, ammo) => {
  const auto = weapon.fireMode === 'auto'
  const firePressed = auto ? ctx.api.input.isActionDown('fire') : ctx.api.input.wasActionPressed('fire')
  if (!firePressed) return false
  if (ammo.reloading) {
    if (weapon.reloadMode !== 'shell' || ammo.magazine <= 0 || ammo.cooldown > 0) return false
    ammo.reloading = false
    ammo.reloadTimer = 0
    ctx.api.log(`[Weapon] ${weapon.displayName} reload interrupted`)
  }
  if (ammo.cooldown > 0) return false
  if (ammo.magazine <= 0) {
    startReload(ctx, player, weaponId, weapon, ammo)
    return false
  }
  ammo.magazine -= 1
  ammo.cooldown = Number(weapon.fireInterval || 0.2)
  if (weapon.fireMode === 'semi') {
    ammo.rapidShots = Number(ammo.rapidShots || 0) + 1
    ammo.focusTimer = Number(weapon.focusResetTime || 0.55)
  }
  const mouse = ctx.api.input.getMousePosition()
  const transform = player.getTransform()
  const baseAngle = Math.atan2(mouse.y - (transform?.y || 0), mouse.x - (transform?.x || 0))
  const pellets = Math.max(1, Math.round(Number(weapon.pellets || 1)))
  for (let index = 0; index < pellets; index += 1) {
    const fan = pellets > 1 ? ((index / (pellets - 1)) - 0.5) * Number(weapon.spread || 0) : 0
    let spread = Number(weapon.spread || 0)
    if (weaponId === itemId('precision_rifle')) {
      spread = Number(ammo.rapidShots || 0) <= Number(weapon.accurateShots || 2)
        ? 0
        : Math.min(Number(weapon.maxSpread || 0.08), Number(weapon.spread || 0) + (Number(ammo.rapidShots || 0) - Number(weapon.accurateShots || 2)) * Number(weapon.spreadPerRapidShot || 0.018))
    }
    const angle = baseAngle + fan + randomSpread(pellets > 1 ? Number(weapon.spread || 0) * 0.18 : spread)
    ctx.api.spawnBullet(player, {
      targetX: (transform?.x || 0) + Math.cos(angle) * 1000,
      targetY: (transform?.y || 0) + Math.sin(angle) * 1000,
      speed: Number(weapon.bulletSpeed || 900),
      life: Number(weapon.bulletLife || 1.8),
      maxDistance: Number(weapon.maxDistance || 1100),
      width: Number(weapon.bulletWidth || (weaponId === itemId('sniper_rifle') ? 26 : 18)),
      height: Number(weapon.bulletHeight || 6),
      tint: Number(weapon.tint || 15922687),
      damage: Number(weapon.damage || 10)
    })
  }
  return true
}

const updateWeaponSystem = (ctx, player) => {
  const weaponId = getHeldItemId(ctx, player)
  const weapon = ITEM_DEFS[weaponId]
  if (!weapon || weapon.type !== 'weapon') return null
  const ammo = getWeaponState(ctx, player, weaponId)
  updateWeaponReload(ctx, player, weaponId, weapon, ammo)
  if (ctx.api.input.wasActionPressed('reload')) startReload(ctx, player, weaponId, weapon, ammo)
  fireWeapon(ctx, player, weaponId, weapon, ammo)
  return { weaponId, weapon, ammo }
}

const updateDebugToolSystem = (ctx, player) => {
  const item = getHeldItemId(ctx, player)
  if (item !== itemId('debug_spawn_enemy') && item !== itemId('debug_teleport')) return false
  if (!ctx.api.input.wasActionPressed('fire')) return false
  ctx.api.input.consumePrimaryPointerPress?.()
  ctx.api.getState(player).__suppressInteractAtTime = ctx.api.time
  const pointer = ctx.api.input.getMousePosition()
  if (item === itemId('debug_teleport')) {
    const transform = player.getTransform()
    if (!transform) return true
    transform.x = pointer.x
    transform.y = pointer.y
    ctx.api.log('[Debug Item] teleport Player')
    return true
  }
  const template = ctx.api.findEntitiesByFolder('Gameplay/Actors/Enemies', true)
    .find((entity) => entity.name === 'Enemy' || entity.name.startsWith('Enemy'))
  if (!template) {
    ctx.api.warn('[Debug Item] no enemy template found')
    return true
  }
  const spawned = ctx.api.spawnEnemyLike(template, {
    x: pointer.x,
    y: pointer.y,
    minDistance: 0
  })
  if (spawned) {
    ensureEntityInventory(ctx, spawned, { count: 12, defaults: defaultEnemyInventory(spawned.id) })
    ensureEnemyHealth(ctx, spawned)
    ctx.api.log(`[Debug Item] spawn enemy at ${Math.round(pointer.x)}, ${Math.round(pointer.y)}`)
  }
  return true
}

const getHealthComponentData = (entity) => {
  const health = entity?.getComponent?.('Health')
  if (!health) return null
  if (!health.data || typeof health.data !== 'object') health.data = {}
  return health.data
}

const ensureHealth = (ctx, entity, options = {}) => {
  const state = ctx.api.getState(entity)
  const data = getHealthComponentData(entity)
  const maxHealth = Math.max(1, Number(data?.max ?? options.max ?? state.maxHealth ?? 100))
  if (!Number.isFinite(Number(state.maxHealth))) state.maxHealth = maxHealth
  else state.maxHealth = Math.max(1, Number(state.maxHealth))
  if (!Number.isFinite(Number(state.health))) state.health = Number(data?.current ?? state.maxHealth)
  state.health = Math.max(0, Math.min(Number(state.maxHealth), Number(state.health)))
  if (data) {
    data.max = Number(state.maxHealth)
    data.current = Number(state.health)
  }
  return state
}

const setHealth = (ctx, entity, value) => {
  const state = ensureHealth(ctx, entity)
  state.health = Math.max(0, Math.min(Number(state.maxHealth), Number(value)))
  const data = getHealthComponentData(entity)
  if (data) {
    data.max = Number(state.maxHealth)
    data.current = Number(state.health)
  }
  return state
}

const healEntity = (ctx, entity, amount) => {
  const state = ensureHealth(ctx, entity)
  const next = amount === 'full' ? Number(state.maxHealth) : Number(state.health) + Number(amount || 0)
  return setHealth(ctx, entity, next)
}

const damageEntity = (ctx, entity, amount) => {
  const state = ensureHealth(ctx, entity)
  const next = Number(state.health) - Math.max(0, Number(amount || 0))
  return setHealth(ctx, entity, next)
}

const useInventoryItem = (ctx, entity, slotIndex) => {
  const inventory = ensureEntityInventory(ctx, entity, { count: 24, defaults: defaultPlayerInventory() })
  const index = Math.max(0, Math.min(inventory.length - 1, Number(slotIndex) || 0))
  const item = String(inventory[index] || '').trim()
  if (!item) return false
  const def = ITEM_DEFS[item]
  if (!def || def.type !== 'consumable') {
    ctx.api.log(`[Inventory] ${item} cannot be used`)
    return false
  }
  const before = ensureHealth(ctx, entity).health
  const health = healEntity(ctx, entity, def.heal)
  inventory[index] = ''
  syncInventoryPanelFromPlayer(ctx, entity)
  ctx.api.log(`[Inventory] used ${def.displayName}: HP ${Math.round(before)} -> ${Math.round(health.health)}`)
  return true
}

const updatePlayerHud = (ctx, player) => {
  const hud = ctx.scene.getEntityById('ui_held_item_hud') || ctx.api.findEntityByName('HeldItemHUD')
  const ui = hud?.getComponent('UI')
  const playerState = ensureHealth(ctx, player)
  const panel = ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML')
  const panelState = panel ? ctx.api.getState(panel) : {}
  const inventory = ensureEntityInventory(ctx, player, { count: 24, defaults: defaultPlayerInventory() })
  const hotbar = Math.max(1, Math.min(6, Math.round(Number(panelState.selectedHotbar) || 1)))
  const item = inventory[17 + hotbar] || ''
  const itemName = item ? ITEM_DEFS[item]?.displayName || item : '空手'
  const weapon = ITEM_DEFS[item]
  const ammo = weapon?.type === 'weapon' ? getWeaponState(ctx, player, item) : null
  const ammoText = ammo ? `\n弹药: ${ammo.magazine}/${ammo.reserve}${ammo.reloading ? ' 换弹中' : ''}` : ''
  if (ui) ui.text = `HP: ${Math.round(playerState.health)}/${Math.round(playerState.maxHealth)}\n手持: ${itemName}${ammoText}`
  updateHotbarPreview(ctx, inventory, hotbar)
}

const updateHotbarPreview = (ctx, inventory, selectedHotbar) => {
  const hotbarEntity = ctx.scene.getEntityById('ui_hotbar_preview') || ctx.api.findEntityByName('HotbarPreview')
  const ui = hotbarEntity?.getComponent('UI')
  if (!ui) return
  const hotbar = Math.max(1, Math.min(6, Math.round(Number(selectedHotbar) || 1)))
  const parts = []
  for (let index = 1; index <= 6; index += 1) {
    const item = String(inventory?.[17 + index] || '').trim()
    const name = item ? ITEM_DEFS[item]?.displayName || item : '空'
    parts.push(`${index === hotbar ? '▶' : ' '}[${index}] ${name}`)
  }
  ui.text = parts.join('   ')
}

const parseInteractionDefinition = (ctx) => {
  try {
    const raw = String(ctx.entity.getComponent('Script')?.sourceCode || '').trim()
    if (!raw.startsWith('{') && !raw.startsWith('[')) return {}
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return { onInteract: parsed }
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    ctx.api.warn(`[${ctx.entity.id}] interaction JSON parse failed`, error?.message || error)
    return {}
  }
}

const parseInteractionNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  if (/^0x[0-9a-f]+$/i.test(text)) {
    const parsed = Number.parseInt(text.slice(2), 16)
    return Number.isFinite(parsed) ? parsed : null
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeInteractionActions = (input) => {
  if (!Array.isArray(input)) return []
  return input.filter((item) => item && typeof item === 'object')
}

const resolveInteractionTarget = (ctx, rawTarget) => {
  const target = String(rawTarget || 'self').trim()
  if (!target || target === 'self') return ctx.entity
  if (target === 'selected') return ctx.api.getSelectedEntity()
  if (target.startsWith('id:')) return ctx.scene.getEntityById(target.slice(3).trim()) || null
  return ctx.scene.entities.find((entity) => entity.name === target) || null
}

const runInteractionActions = (ctx, actions) => {
  for (const action of normalizeInteractionActions(actions)) {
    runInteractionAction(ctx, action)
  }
}

const runInteractionAction = (ctx, action) => {
  const type = String(action.type || '').trim()
  if (!type) return

  if (type === 'sequence') {
    runInteractionActions(ctx, action.actions)
    return
  }

  if (type === 'randomOne') {
    const actions = normalizeInteractionActions(action.actions)
    if (!actions.length) return
    runInteractionAction(ctx, actions[Math.floor(Math.random() * actions.length)])
    return
  }

  const target = resolveInteractionTarget(ctx, action.target)
  if (!target) return

  if (type === 'switchScene') {
    const scene = String(action.scene || '').trim()
    if (scene) {
      ctx.api.switchScene(scene, {
        targetSpawnId: String(action.targetSpawnId || '').trim(),
        sceneStateMode: action.sceneStateMode === 'reset' ? 'reset' : 'preserve'
      })
    }
    return
  }

  if (type === 'setBackgroundTexture') {
    const path = String(action.path || '').trim()
    if (path) ctx.api.setBackgroundTexture(path)
    return
  }

  if (type === 'cycleBackgroundTexture') {
    const paths = (action.values || []).map((item) => String(item || '').trim()).filter(Boolean)
    ctx.api.cycleBackgroundTexture(paths)
    return
  }

  if (type === 'setTexture') {
    const sprite = target.getComponent('Sprite')
    const path = String(action.path || '').trim()
    if (sprite && path) sprite.texturePath = path
    return
  }

  if (type === 'cycleTexture') {
    const sprite = target.getComponent('Sprite')
    const cycle = (action.values || []).map((item) => String(item || '').trim()).filter(Boolean)
    if (!sprite || !cycle.length) return
    const state = ctx.api.getState(target)
    const key = `__project_interaction_texture_${target.id}`
    const nextIndex = (Number(state[key] ?? -1) + 1 + cycle.length) % cycle.length
    state[key] = nextIndex
    sprite.texturePath = cycle[nextIndex]
    return
  }

  if (type === 'setTint') {
    const sprite = target.getComponent('Sprite')
    const parsed = parseInteractionNumber(action.value)
    if (sprite && parsed !== null) sprite.tint = Math.max(0, Math.round(parsed))
    return
  }

  if (type === 'cycleTint') {
    const sprite = target.getComponent('Sprite')
    const cycle = (action.values || []).map(parseInteractionNumber).filter((item) => item !== null)
    if (!sprite || !cycle.length) return
    const state = ctx.api.getState(target)
    const key = `__project_interaction_tint_${target.id}`
    const nextIndex = (Number(state[key] ?? -1) + 1 + cycle.length) % cycle.length
    state[key] = nextIndex
    sprite.tint = Math.max(0, Math.round(cycle[nextIndex]))
    return
  }

  if (type === 'toggleVisible') {
    const sprite = target.getComponent('Sprite')
    if (sprite) sprite.visible = !sprite.visible
    return
  }

  if (type === 'setInteractDistance') {
    const interactable = target.getComponent('Interactable')
    const parsed = parseInteractionNumber(action.value)
    if (interactable && parsed !== null) interactable.interactDistance = Math.max(0, parsed)
    return
  }

  if (type === 'removeEntity') {
    ctx.api.removeEntity(target)
  }
}

const runComponentInteraction = (ctx) => {
  const interactable = ctx.entity.getComponent('Interactable')
  if (!interactable || interactable.actionType === 'none' || interactable.actionType === 'scripted') return

  if (interactable.actionType === 'switchScene') {
    if (interactable.targetScene) {
      ctx.api.switchScene(interactable.targetScene, {
        targetSpawnId: interactable.targetSpawnId || '',
        sceneStateMode: interactable.sceneStateMode === 'reset' ? 'reset' : 'preserve'
      })
    }
    return
  }

  if (interactable.actionType === 'cycleTexture') {
    runInteractionAction(ctx, {
      type: 'cycleTexture',
      target: 'self',
      values: interactable.textureCycle || []
    })
    return
  }

  if (interactable.actionType === 'cycleTint') {
    runInteractionAction(ctx, {
      type: 'cycleTint',
      target: 'self',
      values: interactable.tintCycle || []
    })
  }
}

export default {
  scripts: {
    'custom://interaction': {
      onInteract(ctx) {
        runComponentInteraction(ctx)
        const definition = parseInteractionDefinition(ctx)
        runInteractionActions(ctx, definition.onInteract || definition.actions || [])
      }
    },
    'assets/scripts/player-input.js': {
      onInit(ctx) {
        ensureEntityInventory(ctx, ctx.entity, { count: 24, defaults: defaultPlayerInventory() })
        ensurePlayerEquipment(ctx, ctx.entity)
        ensureHealth(ctx, ctx.entity, { max: 100 })
        updatePlayerHud(ctx, ctx.entity)
      },
      onUpdate(ctx) {
        const transform = ctx.entity.getTransform()
        const collider = ctx.entity.getComponent('Collider')
        if (!transform) return
        ensureHealth(ctx, ctx.entity, { max: 100 })
        const cfg = parseConfig(ctx)
        const moveSpeed = Number(cfg.moveSpeed ?? 140)
        const sprintSpeed = Number(cfg.sprintSpeed ?? 280)
        const speed = (ctx.api.input.isActionDown('sprint') ? sprintSpeed : moveSpeed) * getArmorMoveMultiplier(ctx, ctx.entity)
        const move = ctx.api.input.getMoveVector(true)
        const state = ctx.api.getState(ctx.entity)
        if (!Number.isFinite(state.__baseScaleX)) {
          state.__baseScaleX = Math.max(0.001, Math.abs(transform.scaleX || 1))
        }
        if (move.x > 1e-4) {
          transform.scaleX = -Math.abs(state.__baseScaleX || 1)
        } else if (move.x < -1e-4) {
          transform.scaleX = Math.abs(state.__baseScaleX || 1)
        }

        if (move.x || move.y) {
          const nextX = transform.x + move.x * speed * ctx.api.delta
          const nextY = transform.y + move.y * speed * ctx.api.delta
          const halfWidth = Math.max(2, Number(collider?.width ?? 36) / 2)
          const halfHeight = Math.max(2, Number(collider?.height ?? 36) / 2)
          const offsetX = Number(collider?.offsetX ?? 0)
          const offsetY = Number(collider?.offsetY ?? 0)
          if (!ctx.api.isBlockedRect(nextX + offsetX, transform.y + offsetY, halfWidth, halfHeight)) transform.x = nextX
          if (!ctx.api.isBlockedRect(transform.x + offsetX, nextY + offsetY, halfWidth, halfHeight)) transform.y = nextY
        }

        syncHotbarSelectionFromInput(ctx, ctx.entity)
        if (ctx.api.input.wasActionPressed('use_item')) {
          useInventoryItem(ctx, ctx.entity, getHeldSlotIndex(ctx))
        }
        if (!updateDebugToolSystem(ctx, ctx.entity)) updateWeaponSystem(ctx, ctx.entity)
        updatePlayerHud(ctx, ctx.entity)
      }
    },
    'assets/scripts/bullet-projectile.js': {
      onInit(ctx) {
        const state = ctx.api.getState(ctx.entity)
        const cfg = parseConfig(ctx)
        const transform = ctx.entity.getTransform()
        const speed = Number(cfg.speed ?? 420)
        const angle = transform?.rotation ?? 0
        state.vx = Math.cos(angle) * speed
        state.vy = Math.sin(angle) * speed
        state.life = Number(cfg.life ?? 2)
        state.originX = transform?.x ?? 0
        state.originY = transform?.y ?? 0
        state.maxDistance = Number(cfg.maxDistance ?? 560)
      },
      onUpdate(ctx) {
        const transform = ctx.entity.getTransform()
        if (!transform) return
        const state = ctx.api.getState(ctx.entity)
        const cfg = parseConfig(ctx)
        transform.x += Number(state.vx || 0) * ctx.api.delta
        transform.y += Number(state.vy || 0) * ctx.api.delta
        state.life = Number(state.life || 0) - ctx.api.delta

        const distance = Math.hypot(transform.x - Number(state.originX || 0), transform.y - Number(state.originY || 0))
        if (distance >= Number(state.maxDistance || 560) || Number(state.life || 0) <= 0) {
          ctx.api.removeEntity(ctx.entity)
          return
        }

        const hitEnemy = ctx.api.findEnemyOverlap(ctx.entity, resolveEnemyMatcher(cfg))
        if (!hitEnemy || isEntityDeathPending(ctx, hitEnemy)) {
          if (hitEnemy) ctx.api.removeEntity(ctx.entity)
          return
        }
        const damage = Math.max(0, Number(cfg.damage ?? 18))
        const enemyHealth = damageEntity(ctx, hitEnemy, damage)
        ctx.api.removeEntity(ctx.entity)
        if (enemyHealth.health > 0) {
          ctx.api.log(`[${hitEnemy.id}] hit -${Math.round(damage)} HP (${Math.round(enemyHealth.health)}/${Math.round(enemyHealth.maxHealth)})`)
          return
        }
        ctx.api.getState(hitEnemy).__deathPending = true
        const enemyLoot = ensureEntityInventory(ctx, hitEnemy, { count: 12, defaults: defaultEnemyInventory(hitEnemy.id) }).filter(Boolean)
        ctx.api.removeEntity(hitEnemy)
        const player = ctx.api.findEntityByName('Player')
        if (player && enemyLoot.length) {
          const playerInventory = ensureEntityInventory(ctx, player, { count: 24, defaults: defaultPlayerInventory() })
          for (const item of enemyLoot) {
            const slot = playerInventory.findIndex((entry) => !entry)
            if (slot < 0) break
            playerInventory[slot] = item
          }
          ctx.api.log(`[${hitEnemy.id}] loot -> Player: ${enemyLoot.join(', ')}`)
        }
        const playerTransform = player?.getTransform()
        const spawnedEnemy = ctx.api.spawnEnemyLike(hitEnemy, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: Number(cfg.respawnMinDistance ?? 160)
        })
        if (spawnedEnemy) {
          ensureEntityInventory(ctx, spawnedEnemy, { count: 12, defaults: defaultEnemyInventory(spawnedEnemy.id) })
          ensureEnemyHealth(ctx, spawnedEnemy, { max: Number(cfg.enemyHealth ?? 50) })
          ctx.api.log(`[${spawnedEnemy.id}] respawn`)
        }
      }
    },
    'assets/scripts/enemy-chase-respawn.js': {
      onInit(ctx) {
        ensureEntityInventory(ctx, ctx.entity, { count: 12, defaults: defaultEnemyInventory(ctx.entity.id) })
        const cfg = parseConfig(ctx)
        ensureEnemyHealth(ctx, ctx.entity, { max: Number(cfg.maxHealth ?? 50) })
      },
      onUpdate(ctx) {
        const player = ctx.api.findEntityByName('Player')
        if (!player) return
        const cfg = parseConfig(ctx)
        const chaseSpeed = Number(cfg.chaseSpeed ?? 120)
        ctx.api.moveTowards(ctx.entity, player, chaseSpeed, true)
      },
      onCollisionEnter(ctx) {
        applyEnemyContactDamage(ctx)
      },
      onCollisionStay(ctx) {
        applyEnemyContactDamage(ctx)
      }
    }
  }
}

function applyEnemyContactDamage(ctx) {
        const other = ctx.event?.other
        if (!other || other.name !== 'Player') return
        const cfg = parseConfig(ctx)
        const enemyState = ctx.api.getState(ctx.entity)
        const now = Number(enemyState.__contactDamageClock || 0) + Math.max(0, Number(ctx.api.delta || 0))
        const interval = Math.max(0.2, Number(cfg.contactDamageInterval ?? 0.9))
        if (now < interval) {
          enemyState.__contactDamageClock = now
          return
        }
        enemyState.__contactDamageClock = 0
        const damage = Math.max(0, Number(cfg.contactDamage ?? 10))
        const finalDamage = applyArmorDamageReduction(ctx, other, damage)
        const health = damageEntity(ctx, other, finalDamage)
        updatePlayerHud(ctx, other)
        ctx.api.log(`[${ctx.entity.id}] hit Player -${Math.round(finalDamage)} HP (${Math.round(health.health)}/${Math.round(health.maxHealth)})`)
}
