const parseConfig = (ctx) => {
  try {
    const raw = String(ctx.entity.getComponent('Script')?.sourceCode || '').trim()
    if (!raw.startsWith('{')) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    ctx.api.warn(`[${ctx.entity.id}] door config parse failed`, error?.message || error)
    return {}
  }
}

const NS = 'sample-2D-shooting'
const ACCESS_CARD = `${NS}:access_card`

export default {
  onInteract(ctx) {
    if (isPlayerDebugToolInteract(ctx)) return
    const config = parseConfig(ctx)
    const interactable = ctx.entity.getComponent('Interactable')
    if (isLockedDoor(config, interactable) && !playerHasAccessCard(ctx)) {
      ctx.api.warn(`[${ctx.entity.id}] locked: access card required`)
      return
    }
    const scene = String(config.scene || config.targetScene || interactable?.targetScene || '').trim()
    if (!scene) {
      ctx.api.warn(`[${ctx.entity.id}] door has no target scene`)
      return
    }

    ctx.api.switchScene(scene, {
      targetSpawnId: String(config.targetSpawnId || interactable?.targetSpawnId || '').trim(),
      sceneStateMode: config.sceneStateMode === 'reset' || interactable?.sceneStateMode === 'reset' ? 'reset' : 'preserve'
    })
    ctx.api.log(`[${ctx.entity.id}] switch scene -> ${scene}`)
  }
}

function isPlayerDebugToolInteract(ctx) {
  const player = ctx.scene.getEntityById('player_001') || ctx.api.findEntityByName('Player')
  if (!player) return false
  return ctx.api.getState(player).__suppressInteractAtTime === ctx.api.time
}

function isLockedDoor(config, interactable) {
  if (config.locked === false || config.requiresAccessCard === false) return false
  if (config.locked === true || config.requiresAccessCard === true) return true
  return Boolean(interactable?.locked || interactable?.requiresAccessCard)
}

function playerHasAccessCard(ctx) {
  const player = ctx.scene.getEntityById('player_001') || ctx.api.findEntityByName('Player')
  if (!player) return false
  const state = ctx.api.getState(player)
  const inventory = Array.isArray(state.inventoryItems) ? state.inventoryItems : []
  const componentItems = player.getComponent('Inventory')?.data?.items
  const equipment = state.equipment && typeof state.equipment === 'object' ? Object.values(state.equipment) : []
  const all = [...inventory, ...(Array.isArray(componentItems) ? componentItems : []), ...equipment]
  return all.map((item) => String(item || '').trim()).includes(ACCESS_CARD)
}
