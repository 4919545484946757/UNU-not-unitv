const DEFAULT_BAG_ITEMS = [
  '药水', '钥匙', '矿石', '火把', '苹果', '短剑',
  '布料', '木材', '护符', '', '', '',
  '', '', '', '', '', '',
  '弓', '炸弹', '卷轴', '面包', '宝石', '回城石'
]

const DEFAULT_EQUIPMENT = {
  helmet: '侦察头盔',
  chest: '皮革胸甲',
  leggings: '轻型护腿',
  boots: '旅行者靴子'
}

const EQUIPMENT_LABELS = {
  helmet: '头盔',
  chest: '胸甲',
  leggings: '护腿',
  boots: '靴子'
}

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

  if (ctx.api.input.wasActionPressed('inventory')) {
    state.open = !state.open
    ui.enabled = Boolean(state.open)
    if (ui.enabled) {
      closeContainerPanel(ctx)
      sendInventorySnapshot(ctx, state)
    }
  }

  if (ui.enabled) {
    const playerTexture = getPlayerTexture(ctx)
    if (playerTexture && playerTexture !== state.lastPlayerTexture) {
      state.lastPlayerTexture = playerTexture
      ctx.api.ui.postMessage({ type: 'set-player-preview', texturePath: playerTexture })
    }
  }
}

function ensureInventoryState(ctx) {
  const state = ctx.api.getState(ctx.entity)
  if (!Array.isArray(state.items)) state.items = DEFAULT_BAG_ITEMS.slice()
  if (!state.equipment || typeof state.equipment !== 'object') state.equipment = { ...DEFAULT_EQUIPMENT }
  if (!Number.isFinite(Number(state.selectedHotbar))) state.selectedHotbar = 1
  state.selectedHotbar = clampHotbar(state.selectedHotbar)
  return state
}

function applyIncomingInventoryState(state, payload) {
  if (Array.isArray(payload.items)) {
    const nextItems = payload.items.map((item) => String(item || '')).slice(0, 24)
    while (nextItems.length < 24) nextItems.push('')
    state.items = nextItems
  }
  if (payload.equipment && typeof payload.equipment === 'object') {
    state.equipment = {
      helmet: String(payload.equipment.helmet || ''),
      chest: String(payload.equipment.chest || ''),
      leggings: String(payload.equipment.leggings || ''),
      boots: String(payload.equipment.boots || '')
    }
  }
  if (Number.isFinite(Number(payload.selectedHotbar))) state.selectedHotbar = clampHotbar(payload.selectedHotbar)
}

function sendInventorySnapshot(ctx, state) {
  ctx.api.ui.postMessage({
    type: 'inventory-state',
    selectedHotbar: clampHotbar(state.selectedHotbar),
    items: Array.isArray(state.items) ? state.items : DEFAULT_BAG_ITEMS.slice(),
    equipment: state.equipment || { ...DEFAULT_EQUIPMENT },
    equipmentLabels: EQUIPMENT_LABELS,
    playerTexture: getPlayerTexture(ctx)
  })
}

function updateHeldHud(ctx, state) {
  const hud = ctx.scene.getEntityById('ui_held_item_hud') || ctx.api.findEntityByName('HeldItemHUD')
  const ui = hud?.getComponent('UI')
  if (!ui) return
  ui.text = `手持：${getHeldItemName(state)}`
}

function getHeldItemName(state) {
  const index = clampHotbar(state.selectedHotbar)
  return String(state.items?.[17 + index] || '空手')
}

function getPlayerTexture(ctx) {
  const player = ctx.scene.getEntityById('player_001') || ctx.api.findEntityByName('Player')
  const sprite = player?.getComponent('Sprite')
  return String(sprite?.texturePath || '')
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
