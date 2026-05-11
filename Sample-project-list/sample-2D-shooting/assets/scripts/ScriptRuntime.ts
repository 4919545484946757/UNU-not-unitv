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
      onUpdate(ctx) {
        const transform = ctx.entity.getTransform()
        const collider = ctx.entity.getComponent('Collider')
        if (!transform) return
        const cfg = parseConfig(ctx)
        const moveSpeed = Number(cfg.moveSpeed ?? 140)
        const sprintSpeed = Number(cfg.sprintSpeed ?? 280)
        const speed = ctx.api.input.isActionDown('sprint') ? sprintSpeed : moveSpeed
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
        if (!hitEnemy) return
        ctx.api.removeEntity(ctx.entity)
        ctx.api.removeEntity(hitEnemy)
        const player = ctx.api.findEntityByName('Player')
        const playerTransform = player?.getTransform()
        const spawnedEnemy = ctx.api.spawnEnemyLike(hitEnemy, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: Number(cfg.respawnMinDistance ?? 160)
        })
        if (spawnedEnemy) ctx.api.log(`[${spawnedEnemy.id}] respawn`)
      }
    },
    'assets/scripts/enemy-chase-respawn.js': {
      onUpdate(ctx) {
        const player = ctx.api.findEntityByName('Player')
        if (!player) return
        const cfg = parseConfig(ctx)
        const chaseSpeed = Number(cfg.chaseSpeed ?? 120)
        ctx.api.moveTowards(ctx.entity, player, chaseSpeed, true)
      },
      onCollisionEnter(ctx) {
        const other = ctx.event?.other
        if (!other || other.name !== 'Player') return
        const cfg = parseConfig(ctx)
        ctx.api.removeEntity(ctx.entity)
        const playerTransform = other.getTransform()
        //ctx.api.spawnEnemyLike(ctx.entity, {
        //  avoidX: playerTransform?.x ?? 0,
        //  avoidY: playerTransform?.y ?? 0,
        //  minDistance: Number(cfg.respawnMinDistance ?? 160)
        //})
      }
    }
  }
}
