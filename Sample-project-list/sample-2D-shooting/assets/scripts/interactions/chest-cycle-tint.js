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
    openContainerPanel(ctx)
    cycleChestTint(ctx)
  }
}

function openContainerPanel(ctx) {
  const panel = ctx.scene.getEntityById('ui_container_panel') || ctx.api.findEntityByName('ContainerPanel_HTML')
  const ui = panel?.getComponent('UI')
  if (!panel || !ui) {
    ctx.api.warn(`[${ctx.entity.id}] container panel not found`)
    return
  }

  const inventory = ctx.scene.getEntityById('ui_inventory_panel') || ctx.api.findEntityByName('InventoryPanel_HTML')
  const inventoryUi = inventory?.getComponent('UI')
  if (inventoryUi) inventoryUi.enabled = false

  const panelState = ctx.api.getState(panel)
  const chestState = ctx.api.getState(ctx.entity)
  if (!Array.isArray(chestState.containerItems)) chestState.containerItems = defaultChestItems(ctx.entity.id)
  if (!Array.isArray(panelState.bagItems)) panelState.bagItems = defaultBagItems()
  panelState.open = true
  panelState.activeChestId = ctx.entity.id
  panelState.activeChestName = ctx.entity.name || ctx.entity.id
  panelState.chestItems = normalizeItems(chestState.containerItems, 30)
  ui.enabled = true
  ctx.api.ui.postMessage({
    type: 'container-state',
    chestId: panelState.activeChestId,
    chestName: panelState.activeChestName,
    chestItems: panelState.chestItems,
    bagItems: normalizeItems(panelState.bagItems, 24)
  }, panel)
  ctx.api.log(`[${ctx.entity.id}] open container`)
}

function cycleChestTint(ctx) {
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
}

function normalizeItems(items, count) {
  const next = Array.isArray(items) ? items.map((item) => String(item || '')).slice(0, count) : []
  while (next.length < count) next.push('')
  return next
}

function defaultChestItems(seed) {
  const sets = [
    ['铁矿', '木材', '金币', '绷带', '', '', '', '蓝宝石', '', '', '火药', '', '', '', '', '苹果', '', '', '皮革', '', '', '', '钥匙', '', '', '', '卷轴', '', '', '短剑'],
    ['草药', '', '银币', '', '火把', '', '布料', '', '', '苹果', '', '', '', '宝石', '', '', '', '面包', '', '', '铁矿', '', '', '', '', '护符', '', '', '', ''],
    ['箭矢', '炸弹', '', '', '药水', '', '', '', '木材', '', '', '皮革', '', '', '', '卷轴', '', '', '', '金币', '', '', '', '', '回城石', '', '', '', '', '']
  ]
  const index = Math.abs(String(seed || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % sets.length
  return sets[index].slice()
}

function defaultBagItems() {
  return [
    '药水', '钥匙', '矿石', '火把', '苹果', '短剑',
    '布料', '木材', '护符', '', '', '',
    '', '', '', '', '', '',
    '弓', '炸弹', '卷轴', '面包', '宝石', '回城石'
  ]
}
