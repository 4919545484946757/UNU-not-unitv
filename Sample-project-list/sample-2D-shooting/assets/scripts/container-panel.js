const DEFAULT_BAG_ITEMS = [
  '药水', '钥匙', '矿石', '火把', '苹果', '短剑',
  '布料', '木材', '护符', '', '', '',
  '', '', '', '', '', '',
  '弓', '炸弹', '卷轴', '面包', '宝石', '回城石'
]

const DEFAULT_CHEST_ITEMS = [
  '铁矿', '木材', '金币', '绷带', '', '',
  '', '蓝宝石', '', '', '火药', '',
  '', '', '', '苹果', '', '',
  '皮革', '', '', '', '钥匙', '',
  '', '', '卷轴', '', '', '短剑'
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
    if (state.open && ctx.api.input.wasActionPressed('inventory')) {
      closePanel(ctx, state)
    }
  },

  onPausedUpdate(ctx) {
    const state = ensurePanelState(ctx)
    if (state.open && ctx.api.input.wasActionPressed('inventory')) {
      closePanel(ctx, state)
    }
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
      ctx.api.log(`[Container] ${state.activeChestId || 'chest'} changed`)
    }
  }
}

function ensurePanelState(ctx) {
  const state = ctx.api.getState(ctx.entity)
  if (!Array.isArray(state.bagItems)) state.bagItems = DEFAULT_BAG_ITEMS.slice()
  if (!Array.isArray(state.chestItems)) state.chestItems = DEFAULT_CHEST_ITEMS.slice()
  if (typeof state.activeChestId !== 'string') state.activeChestId = ''
  return state
}

function applyIncomingState(state, payload) {
  if (Array.isArray(payload.bagItems)) {
    state.bagItems = normalizeItems(payload.bagItems, 24)
  }
  if (Array.isArray(payload.chestItems)) {
    state.chestItems = normalizeItems(payload.chestItems, 30)
  }
}

function normalizeItems(items, count) {
  const next = items.map((item) => String(item || '')).slice(0, count)
  while (next.length < count) next.push('')
  return next
}

function sendSnapshot(ctx, state) {
  ctx.api.ui.postMessage({
    type: 'container-state',
    chestId: state.activeChestId || '',
    chestName: state.activeChestName || 'Chest',
    chestItems: normalizeItems(state.chestItems || [], 30),
    bagItems: normalizeItems(state.bagItems || [], 24)
  })
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
  chestState.containerItems = normalizeItems(state.chestItems || [], 30)
}
