const NS = 'sample-2D-shooting'
const itemId = (name) => `${NS}:${name}`

const ITEM_DEFS = {
  [itemId('bandage')]: { displayName: '绷带', type: 'consumable', heal: 20 },
  [itemId('medkit')]: { displayName: '医疗包', type: 'consumable', heal: 55 },
  [itemId('scp_500')]: { displayName: 'SCP-500', type: 'consumable', heal: 'full' },
  [itemId('light_helmet')]: { displayName: '轻型头盔', type: 'equipment', equipSlot: 'helmet' },
  [itemId('light_chest')]: { displayName: '轻型胸甲', type: 'equipment', equipSlot: 'chest' },
  [itemId('light_leggings')]: { displayName: '轻型腿甲', type: 'equipment', equipSlot: 'leggings' },
  [itemId('light_boots')]: { displayName: '轻型靴', type: 'equipment', equipSlot: 'boots' },
  [itemId('heavy_helmet')]: { displayName: '重型头盔', type: 'equipment', equipSlot: 'helmet' },
  [itemId('heavy_chest')]: { displayName: '重型胸甲', type: 'equipment', equipSlot: 'chest' },
  [itemId('heavy_leggings')]: { displayName: '重型腿甲', type: 'equipment', equipSlot: 'leggings' },
  [itemId('heavy_boots')]: { displayName: '重型靴', type: 'equipment', equipSlot: 'boots' },
  [itemId('debug_crown')]: { displayName: '调试-王冠', type: 'equipment', equipSlot: 'helmet' },
  [itemId('auto_rifle')]: { displayName: '自动步枪', type: 'weapon' },
  [itemId('precision_rifle')]: { displayName: '精确步枪', type: 'weapon' },
  [itemId('sniper_rifle')]: { displayName: '狙击步枪', type: 'weapon' },
  [itemId('shotgun')]: { displayName: '霰弹枪', type: 'weapon' },
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

const DEFAULT_CHEST_ITEMS = [
  itemId('bandage'), itemId('medkit'), itemId('heavy_helmet'), itemId('heavy_chest'), itemId('heavy_leggings'), itemId('heavy_boots'),
  '', itemId('bandage'), '', '', itemId('scp_500'), itemId('debug_crown'),
  '', '', '', itemId('bandage'), '', '',
  itemId('auto_rifle'), itemId('precision_rifle'), itemId('sniper_rifle'), itemId('shotgun'), itemId('medkit'), '',
  itemId('access_card'), itemId('debug_spawn_enemy'), itemId('debug_teleport'), '', '', ''
]

export default {
  onInit(ctx) {
    const ui = ctx.entity.getComponent('UI')
    if (ui) ui.enabled = false
    const state = ensurePanelState(ctx)
    state.open = false
  },

  onUpdate(ctx) {
    const state = ensurePanelState(ctx)
    if (state.open && ctx.api.input.wasActionPressed('inventory')) closePanel(ctx, state)
  },

  onPausedUpdate(ctx) {
    const state = ensurePanelState(ctx)
    if (state.open && ctx.api.input.wasActionPressed('inventory')) closePanel(ctx, state)
  },

  onHtmlMessage(ctx) {
    const state = ensurePanelState(ctx)
    const type = String(ctx.event?.messageType || '')
    const payload = ctx.event?.payload || {}

    if (type === 'ready') {
      sendSnapshot(ctx, state)
      return
    }

    if (type === 'close') {
      closePanel(ctx, state)
      return
    }

    if (type === 'container-changed') {
      applyIncomingState(state, payload)
      writeActiveChestState(ctx, state)
      sendSnapshot(ctx, state)
      syncInventoryPanelState(ctx, state)
      updateHotbarPreview(ctx, state)
      ctx.api.log(`[Container] ${state.activeChestId || 'chest'} changed`)
    }
  }
}

function ensurePanelState(ctx) {
  const state = ctx.api.getState(ctx.entity)
  if (!Array.isArray(state.bagItems)) state.bagItems = DEFAULT_BAG_ITEMS.slice()
  else state.bagItems = normalizeItems(state.bagItems, 24)
  const player = getPlayer(ctx)
  if (player) {
    const playerState = ctx.api.getState(player)
    if (!Array.isArray(playerState.inventoryItems)) playerState.inventoryItems = state.bagItems.slice()
    else state.bagItems = normalizeItems(playerState.inventoryItems, 24)
  }
  if (!Array.isArray(state.chestItems)) state.chestItems = DEFAULT_CHEST_ITEMS.slice()
  else state.chestItems = normalizeItems(state.chestItems, 30)
  if (typeof state.activeChestId !== 'string') state.activeChestId = ''
  return state
}

function applyIncomingState(state, payload) {
  if (Array.isArray(payload.bagItems)) state.bagItems = normalizeItems(payload.bagItems, 24)
  if (Array.isArray(payload.chestItems)) state.chestItems = normalizeItems(payload.chestItems, 30)
}

function normalizeItems(items, count) {
  const next = Array.isArray(items) ? items.map((item) => normalizeItemId(item)).slice(0, count) : []
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

function sendSnapshot(ctx, state) {
  writePlayerInventory(ctx, state)
  ctx.api.ui.postMessage({
    type: 'container-state',
    chestId: state.activeChestId || '',
    chestName: state.activeChestName || 'Chest',
    chestItems: normalizeItems(state.chestItems || [], 30),
    bagItems: normalizeItems(state.bagItems || [], 24),
    itemDefs: ITEM_DEFS
  })
}

function syncInventoryPanelState(ctx, state) {
  const panel = ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML')
  if (!panel) return
  const panelState = ctx.api.getState(panel)
  panelState.items = normalizeItems(state.bagItems || [], 24)
  if (!Number.isFinite(Number(panelState.selectedHotbar))) panelState.selectedHotbar = 1
}

function updateHotbarPreview(ctx, state) {
  const hotbar = ctx.scene.getEntityById('ui_hotbar_preview') || ctx.api.findEntityByName('HotbarPreview')
  const ui = hotbar?.getComponent('UI')
  if (!ui) return
  const panel = ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML')
  const panelState = panel ? ctx.api.getState(panel) : {}
  const selected = Math.max(1, Math.min(6, Math.round(Number(panelState.selectedHotbar) || 1)))
  const items = normalizeItems(state.bagItems || [], 24)
  const parts = []
  for (let index = 1; index <= 6; index += 1) {
    const item = String(items[17 + index] || '').trim()
    const name = item ? ITEM_DEFS[item]?.displayName || item : '空'
    parts.push(`${index === selected ? '▶' : ' '}[${index}] ${name}`)
  }
  ui.text = parts.join('   ')
}

function closePanel(ctx, state) {
  state.open = false
  const ui = ctx.entity.getComponent('UI')
  if (ui) ui.enabled = false
}

function writeActiveChestState(ctx, state) {
  const chest = state.activeChestId ? ctx.scene.getEntityById(state.activeChestId) : null
  if (!chest) return
  const chestState = ctx.api.getState(chest)
  chestState.inventoryItems = normalizeItems(state.chestItems || [], 30)
}

function writePlayerInventory(ctx, state) {
  const player = getPlayer(ctx)
  if (!player) return
  const playerState = ctx.api.getState(player)
  playerState.inventoryItems = normalizeItems(state.bagItems || [], 24)
}

function getPlayer(ctx) {
  return ctx.scene.getEntityById('player_001') || ctx.api.findEntityByName('Player')
}
