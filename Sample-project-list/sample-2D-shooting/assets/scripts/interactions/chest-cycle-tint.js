const NS = 'sample-2D-shooting'
const itemId = (name) => `${NS}:${name}`

const ITEM_DEFS = {
  [itemId('bandage')]: { displayName: '绷带' },
  [itemId('medkit')]: { displayName: '医疗包' },
  [itemId('scp_500')]: { displayName: 'SCP-500' },
  [itemId('light_helmet')]: { displayName: '轻型头盔' },
  [itemId('light_chest')]: { displayName: '轻型胸甲' },
  [itemId('light_leggings')]: { displayName: '轻型腿甲' },
  [itemId('light_boots')]: { displayName: '轻型靴' },
  [itemId('heavy_helmet')]: { displayName: '重型头盔' },
  [itemId('heavy_chest')]: { displayName: '重型胸甲' },
  [itemId('heavy_leggings')]: { displayName: '重型腿甲' },
  [itemId('heavy_boots')]: { displayName: '重型靴' },
  [itemId('debug_crown')]: { displayName: '调试-王冠' },
  [itemId('auto_rifle')]: { displayName: '自动步枪' },
  [itemId('precision_rifle')]: { displayName: '精确步枪' },
  [itemId('sniper_rifle')]: { displayName: '狙击步枪' },
  [itemId('shotgun')]: { displayName: '霰弹枪' },
  [itemId('access_card')]: { displayName: '门禁卡' },
  [itemId('debug_spawn_enemy')]: { displayName: '调试-生成敌人' },
  [itemId('debug_teleport')]: { displayName: '调试-传送' }
}

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
    if (isPlayerDebugToolInteract(ctx)) return
    openContainerPanel(ctx)
    cycleChestTint(ctx)
  }
}

function isPlayerDebugToolInteract(ctx) {
  const player = ctx.scene.getEntityById('player_001') || ctx.api.findEntityByName('Player')
  if (!player) return false
  return ctx.api.getState(player).__suppressInteractAtTime === ctx.api.time
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
  if (!Array.isArray(chestState.inventoryItems)) chestState.inventoryItems = defaultChestItems(ctx.entity.id)
  if (!Array.isArray(panelState.bagItems)) panelState.bagItems = defaultBagItems()
  panelState.open = true
  panelState.activeChestId = ctx.entity.id
  panelState.activeChestName = ctx.entity.name || ctx.entity.id
  panelState.chestItems = normalizeItems(chestState.inventoryItems, 30)
  ui.enabled = true
  ctx.api.ui.postMessage({
    type: 'container-state',
    chestId: panelState.activeChestId,
    chestName: panelState.activeChestName,
    chestItems: panelState.chestItems,
    bagItems: normalizeItems(panelState.bagItems, 24),
    itemDefs: ITEM_DEFS
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

function defaultChestItems(seed) {
  const sets = [
    [itemId('bandage'), itemId('medkit'), itemId('heavy_helmet'), itemId('heavy_chest'), itemId('heavy_leggings'), itemId('heavy_boots'), '', itemId('bandage'), '', '', itemId('scp_500'), itemId('debug_crown'), '', '', '', itemId('bandage'), '', '', itemId('auto_rifle'), itemId('precision_rifle'), itemId('sniper_rifle'), itemId('shotgun'), itemId('medkit'), '', itemId('access_card'), itemId('debug_spawn_enemy'), itemId('debug_teleport'), '', '', ''],
    [itemId('bandage'), '', itemId('light_helmet'), itemId('light_chest'), itemId('light_leggings'), itemId('light_boots'), '', '', '', '', '', '', itemId('medkit'), '', '', '', '', '', itemId('auto_rifle'), '', '', '', itemId('scp_500'), itemId('shotgun'), '', '', '', '', '', ''],
    ['', itemId('bandage'), '', '', itemId('medkit'), '', itemId('heavy_chest'), '', '', '', itemId('heavy_boots'), '', '', '', '', itemId('bandage'), '', '', itemId('sniper_rifle'), '', itemId('debug_crown'), itemId('precision_rifle'), '', itemId('shotgun'), itemId('scp_500'), '', '', '', '', '']
  ]
  const index = Math.abs(String(seed || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % sets.length
  return sets[index].slice()
}

function defaultBagItems() {
  return [
    itemId('bandage'), itemId('bandage'), itemId('medkit'), itemId('heavy_helmet'), itemId('heavy_chest'), itemId('heavy_leggings'),
    itemId('heavy_boots'), itemId('debug_crown'), itemId('scp_500'), itemId('debug_teleport'), '', '',
    itemId('light_helmet'), itemId('light_chest'), itemId('light_leggings'), itemId('light_boots'), itemId('access_card'), itemId('debug_spawn_enemy'),
    itemId('auto_rifle'), itemId('precision_rifle'), itemId('sniper_rifle'), itemId('shotgun'), itemId('medkit'), itemId('scp_500')
  ]
}
