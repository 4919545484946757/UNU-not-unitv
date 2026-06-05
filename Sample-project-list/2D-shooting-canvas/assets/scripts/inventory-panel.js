const NS = 'sample-2D-shooting'
const itemId = (name) => `${NS}:${name}`

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
  [itemId('auto_rifle')]: { displayName: '自动步枪', type: 'weapon', fireMode: 'auto', magazineSize: 30 },
  [itemId('precision_rifle')]: { displayName: '精确步枪', type: 'weapon', fireMode: 'semi', magazineSize: 15 },
  [itemId('sniper_rifle')]: { displayName: '狙击步枪', type: 'weapon', fireMode: 'semi', magazineSize: 5 },
  [itemId('shotgun')]: { displayName: '霰弹枪', type: 'weapon', fireMode: 'semi', magazineSize: 7 },
  [itemId('access_card')]: { displayName: '门禁卡', type: 'tool' },
  [itemId('debug_spawn_enemy')]: { displayName: '调试-生成敌人', type: 'debugTool' },
  [itemId('debug_teleport')]: { displayName: '调试-传送', type: 'debugTool' }
}

const DEFAULT_BAG_ITEMS = [
  itemId('bandage'), itemId('bandage'), itemId('medkit'), itemId('heavy_helmet'), itemId('heavy_chest'), itemId('heavy_leggings'),
  itemId('heavy_boots'), itemId('debug_crown'), itemId('scp_500'), itemId('debug_teleport'), '', '',
  itemId('light_helmet'), itemId('light_chest'), itemId('light_leggings'), itemId('light_boots'), itemId('access_card'), itemId('debug_spawn_enemy'),
  itemId('auto_rifle'), itemId('precision_rifle'), itemId('sniper_rifle'), itemId('shotgun'), itemId('medkit'), itemId('scp_500')
]

const DEFAULT_EQUIPMENT = {
  helmet: itemId('light_helmet'),
  chest: itemId('light_chest'),
  leggings: itemId('light_leggings'),
  boots: itemId('light_boots')
}
const EQUIPMENT_LABELS = { helmet: '头盔', chest: '胸甲', leggings: '护腿', boots: '靴子' }

export default {
  onInit(ctx) {
    const ui = ctx.entity.getComponent('UI')
    if (ui) ui.enabled = false
    const state = ensureInventoryState(ctx)
    state.open = false
    updateHeldHud(ctx, state)
  },

  onUpdate(ctx) {
    updateInventory(ctx)
  },

  onPausedUpdate(ctx) {
    updateInventory(ctx)
  },

  onUiClick(ctx) {
    selectHotbarFromUiPointer(ctx)
  },

  onHtmlMessage(ctx) {
    const ui = ctx.entity.getComponent('UI')
    const state = ensureInventoryState(ctx)
    const type = String(ctx.event?.messageType || '')
    const payload = ctx.event?.payload || {}

    if (type === 'ready') {
      sendInventorySnapshot(ctx, state)
      return
    }

    if (type === 'close') {
      state.open = false
      if (ui) ui.enabled = false
      return
    }

    if (type === 'select-hotbar') {
      state.selectedHotbar = clampHotbar(payload.index)
      applyIncomingInventoryState(state, payload)
      sendInventorySnapshot(ctx, state)
      updateHeldHud(ctx, state)
      ctx.api.log(`[Inventory] hotbar ${state.selectedHotbar}: ${getHeldItemName(state)}`)
      return
    }

    if (type === 'inventory-changed') {
      applyIncomingInventoryState(state, payload)
      sendInventorySnapshot(ctx, state)
      updateHeldHud(ctx, state)
      ctx.api.log('[Inventory] inventory changed')
      return
    }

    if (type === 'use-item') {
      applyIncomingInventoryState(state, payload)
      const slotIndex = Number.isFinite(Number(payload.index)) ? Number(payload.index) : 17 + clampHotbar(state.selectedHotbar)
      useItemFromSlot(ctx, state, slotIndex)
      sendInventorySnapshot(ctx, state)
      updateHeldHud(ctx, state)
      return
    }

    if (type === 'select-slot') {
      ctx.api.log(`[Inventory] selected slot ${payload.slotId || payload.index || ''}`)
    }
  }
}

function updateInventory(ctx) {
  const ui = ctx.entity.getComponent('UI')
  if (!ui) return
  const state = ensureInventoryState(ctx)

  for (let index = 1; index <= 6; index += 1) {
    if (ctx.api.input.wasActionPressed(`hotbar_${index}`)) {
      state.selectedHotbar = index
      sendInventorySnapshot(ctx, state)
      updateHeldHud(ctx, state)
      ctx.api.log(`[Inventory] hotbar ${index}: ${getHeldItemName(state)}`)
    }
  }

  if (ctx.api.input.wasActionPressed('use_item')) {
    useItemFromSlot(ctx, state, 17 + clampHotbar(state.selectedHotbar))
    sendInventorySnapshot(ctx, state)
    updateHeldHud(ctx, state)
  }

  if (ctx.api.input.wasActionPressed('inventory')) {
    state.open = !state.open
    ui.enabled = Boolean(state.open)
    if (ui.enabled) {
      closeContainerPanel(ctx)
      sendInventorySnapshot(ctx, state)
    }
  }

  if (ui.enabled) {
    const playerPreview = getPlayerPreview(ctx)
    if (playerPreview.texturePath && (
      playerPreview.texturePath !== state.lastPlayerTexture ||
      playerPreview.flipX !== state.lastPlayerFlipX
    )) {
      state.lastPlayerTexture = playerPreview.texturePath
      state.lastPlayerFlipX = playerPreview.flipX
      ctx.api.ui.postMessage({ type: 'set-player-preview', ...playerPreview })
    }
  }
}

function ensureInventoryState(ctx, owner = ctx.entity) {
  const state = ctx.api.getState(owner)
  if (!Array.isArray(state.items)) state.items = DEFAULT_BAG_ITEMS.slice()
  else state.items = normalizeItems(state.items, 24)
  const player = getPlayer(ctx)
  if (player) {
    const playerState = ctx.api.getState(player)
    const inventoryData = player.getComponent?.('Inventory')?.data
    if (!Array.isArray(playerState.inventoryItems)) playerState.inventoryItems = state.items.slice()
    else state.items = normalizeItems(playerState.inventoryItems, 24)
    if (!playerState.equipment || typeof playerState.equipment !== 'object') playerState.equipment = normalizeEquipment(inventoryData?.equipment || DEFAULT_EQUIPMENT)
    if (!state.equipment || typeof state.equipment !== 'object') state.equipment = normalizeEquipment(playerState.equipment)
  }
  if (!state.equipment || typeof state.equipment !== 'object') state.equipment = { ...DEFAULT_EQUIPMENT }
  state.equipment = normalizeEquipment(state.equipment)
  if (!Number.isFinite(Number(state.selectedHotbar))) state.selectedHotbar = 1
  state.selectedHotbar = clampHotbar(state.selectedHotbar)
  return state
}

function cycleNextHeldItem(ctx) {
  const panel = getInventoryPanel(ctx)
  if (!panel) return
  const state = ensureInventoryState(ctx, panel)
  const current = clampHotbar(state.selectedHotbar)
  let next = current
  for (let offset = 1; offset <= 6; offset += 1) {
    const candidate = ((current - 1 + offset) % 6) + 1
    if (normalizeItemId(state.items?.[17 + candidate])) {
      next = candidate
      break
    }
  }
  if (next === current) next = (current % 6) + 1
  state.selectedHotbar = next
  sendInventorySnapshot(ctx, state, panel)
  updateHeldHud(ctx, state)
  ctx.api.log(`[Inventory] hotbar ${next}: ${getHeldItemName(state)}`)
}

function selectHotbarFromUiPointer(ctx) {
  const panel = getInventoryPanel(ctx)
  if (!panel) return
  const state = ensureInventoryState(ctx, panel)
  const pointer = ctx.event?.pointer || {}
  const width = Math.max(1, Number(pointer.width || 0))
  const localX = Number(pointer.localX)
  if (!Number.isFinite(localX) || width <= 1) {
    cycleNextHeldItem(ctx)
    return
  }
  const hitWidth = resolveHotbarTextHitWidth(ctx, state, width)
  const ratio = Math.max(0, Math.min(0.999999, (localX + hitWidth / 2) / hitWidth))
  const next = Math.max(1, Math.min(6, Math.floor(ratio * 6) + 1))
  state.selectedHotbar = next
  sendInventorySnapshot(ctx, state, panel)
  updateHeldHud(ctx, state)
  ctx.api.log(`[Inventory] hotbar ${next}: ${getHeldItemName(state)}`)
}

function resolveHotbarTextHitWidth(ctx, state, fullWidth) {
  const ui = ctx.event?.ui || ctx.entity.getComponent?.('UI') || {}
  const fontSize = Math.max(10, Number(ui.fontSize || 15))
  const text = buildHotbarPreviewText(state)
  const ascii = (text.match(/[\x00-\x7f]/g) || []).length
  const nonAscii = Math.max(0, text.length - ascii)
  const estimatedTextWidth = Math.ceil(ascii * fontSize * 0.58 + nonAscii * fontSize * 0.95)
  const paddingX = Math.max(0, Number(ui.paddingX || 0)) * 2
  return Math.max(1, Math.min(fullWidth, estimatedTextWidth + paddingX))
}

function applyIncomingInventoryState(state, payload) {
  if (Array.isArray(payload.items)) state.items = normalizeItems(payload.items, 24)
  if (payload.equipment && typeof payload.equipment === 'object') {
    state.equipment = normalizeEquipment(payload.equipment)
  }
  if (Number.isFinite(Number(payload.selectedHotbar))) state.selectedHotbar = clampHotbar(payload.selectedHotbar)
}

function normalizeEquipment(equipment = {}) {
  return {
    helmet: normalizeItemId(equipment.helmet),
    chest: normalizeItemId(equipment.chest),
    leggings: normalizeItemId(equipment.leggings),
    boots: normalizeItemId(equipment.boots)
  }
}

function normalizeItems(items, count) {
  const next = items.map((item) => normalizeItemId(item)).slice(0, count)
  while (next.length < count) next.push('')
  return next
}

function normalizeItemId(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.includes(':')) return raw
  const legacy = Object.entries(ITEM_DEFS).find(([, item]) => item.displayName === raw)
  return legacy?.[0] || itemId(raw)
}

function sendInventorySnapshot(ctx, state, target = ctx.entity) {
  syncPlayerInventory(ctx, state)
  const playerPreview = getPlayerPreview(ctx)
  ctx.api.ui.postMessage({
    type: 'inventory-state',
    selectedHotbar: clampHotbar(state.selectedHotbar),
    items: normalizeItems(Array.isArray(state.items) ? state.items : DEFAULT_BAG_ITEMS, 24),
    itemDefs: ITEM_DEFS,
    equipment: state.equipment || { ...DEFAULT_EQUIPMENT },
    equipmentLabels: EQUIPMENT_LABELS,
    playerTexture: playerPreview.texturePath,
    playerFlipX: playerPreview.flipX
  }, target)
}

function useItemFromSlot(ctx, state, index) {
  const slot = Math.max(0, Math.min(23, Number(index) || 0))
  const item = normalizeItemId(state.items?.[slot])
  const def = item ? ITEM_DEFS[item] : null
  if (!def || def.type !== 'consumable') {
    ctx.api.log('[Inventory] 当前格子没有可使用药品')
    return false
  }
  const player = getPlayer(ctx)
  if (!player) return false
  const playerState = ctx.api.getState(player)
  const maxHealth = Math.max(1, Number(playerState.maxHealth || 100))
  const before = Math.max(0, Math.min(maxHealth, Number(playerState.health ?? maxHealth)))
  const next = def.heal === 'full' ? maxHealth : Math.min(maxHealth, before + Number(def.heal || 0))
  playerState.maxHealth = maxHealth
  playerState.health = next
  const health = player.getComponent('Health')
  if (health?.data) {
    health.data.max = maxHealth
    health.data.current = next
  }
  state.items[slot] = ''
  syncPlayerInventory(ctx, state)
  ctx.api.log(`[Inventory] 使用${def.displayName}: HP ${Math.round(before)} -> ${Math.round(next)}`)
  return true
}

function updateHeldHud(ctx, state) {
  const hud = ctx.scene.getEntityById('ui_held_item_hud') || ctx.api.findEntityByName('HeldItemHUD')
  const ui = hud?.getComponent('UI')
  const player = getPlayer(ctx)
  const playerState = player ? ctx.api.getState(player) : { health: 100, maxHealth: 100 }
  const health = Math.round(Number(playerState.health ?? playerState.maxHealth ?? 100))
  const maxHealth = Math.round(Number(playerState.maxHealth ?? 100))
  if (ui) ui.text = `HP: ${health}/${maxHealth}\n手持: ${getHeldItemName(state)}`
  updateHotbarPreview(ctx, state)
}

function updateHotbarPreview(ctx, state) {
  const hotbar = ctx.scene.getEntityById('ui_hotbar_preview') || ctx.api.findEntityByName('HotbarPreview')
  const ui = hotbar?.getComponent('UI')
  if (!ui) return
  ui.text = buildHotbarPreviewText(state)
}

function buildHotbarPreviewText(state) {
  const selected = clampHotbar(state.selectedHotbar)
  const parts = []
  for (let index = 1; index <= 6; index += 1) {
    const name = getItemDisplayName(state.items?.[17 + index]) || '空'
    parts.push(`${index === selected ? '▶' : ' '}[${index}] ${name}`)
  }
  return parts.join('   ')
}

function syncPlayerInventory(ctx, state) {
  const player = getPlayer(ctx)
  if (!player) return
  const playerState = ctx.api.getState(player)
  playerState.inventoryItems = normalizeItems(state.items || [], 24)
  playerState.equipment = normalizeEquipment(state.equipment || DEFAULT_EQUIPMENT)
  playerState.selectedHotbar = clampHotbar(state.selectedHotbar)
  const inventoryData = player.getComponent?.('Inventory')?.data
  if (inventoryData && typeof inventoryData === 'object') inventoryData.equipment = normalizeEquipment(playerState.equipment)
}

function getPlayer(ctx) {
  return ctx.scene.getEntityById('player_001') || ctx.api.findEntityByName('Player')
}

function getHeldItemName(state) {
  const index = clampHotbar(state.selectedHotbar)
  return getItemDisplayName(state.items?.[17 + index]) || '空手'
}

function getItemDisplayName(id) {
  const normalized = normalizeItemId(id)
  return normalized ? ITEM_DEFS[normalized]?.displayName || normalized : ''
}

function getPlayerTexture(ctx) {
  return getPlayerPreview(ctx).texturePath
}

function getPlayerPreview(ctx) {
  const player = getPlayer(ctx)
  const sprite = player?.getComponent('Sprite')
  const transform = player?.getTransform?.()
  return {
    texturePath: String(sprite?.texturePath || ''),
    flipX: Number(transform?.scaleX || 1) < 0
  }
}

function clampHotbar(value) {
  return Math.max(1, Math.min(6, Math.round(Number(value) || 1)))
}

function closeContainerPanel(ctx) {
  const panel = ctx.scene.getEntityById('ui_container_panel') || ctx.api.findEntityByName('ContainerPanel_HTML')
  const ui = panel?.getComponent('UI')
  if (ui) ui.enabled = false
  if (panel) ctx.api.getState(panel).open = false
}

function getInventoryPanel(ctx) {
  return ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML') || ctx.entity
}
