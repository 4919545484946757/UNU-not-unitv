const GRID = {
  columns: 24,
  rows: 18,
  cell: 24,
  originX: -276,
  originY: -204
}

const COLORS = {
  head: 0xf8ff7a,
  body: 0x43e66f,
  tail: 0x22b455,
  food: 0xff5577,
  hidden: 0x000000
}

function gridToWorld(cell) {
  return {
    x: GRID.originX + cell.x * GRID.cell,
    y: GRID.originY + cell.y * GRID.cell
  }
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y
}

function opposite(a, b) {
  return a.x + b.x === 0 && a.y + b.y === 0
}

function getEntities(ctx, prefix) {
  return ctx.scene.entities
    .filter((entity) => entity.id.startsWith(prefix))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function getEntity(ctx, id) {
  return ctx.scene.entities.find((entity) => entity.id === id) || null
}

function setText(entity, text) {
  const ui = entity && entity.getComponent('UI')
  if (ui) ui.text = text
}

function setSprite(entity, visible, tint) {
  const sprite = entity && entity.getComponent('Sprite')
  if (!sprite) return
  sprite.visible = visible
  sprite.tint = tint
  sprite.alpha = visible ? 1 : 0
}

function setPosition(entity, cell) {
  const transform = entity && entity.getComponent('Transform')
  if (!transform) return
  const world = gridToWorld(cell)
  transform.x = world.x
  transform.y = world.y
}

function randomFood(snake) {
  const blocked = new Set(snake.map((cell) => `${cell.x},${cell.y}`))
  const free = []
  for (let y = 0; y < GRID.rows; y += 1) {
    for (let x = 0; x < GRID.columns; x += 1) {
      const key = `${x},${y}`
      if (!blocked.has(key)) free.push({ x, y })
    }
  }
  if (!free.length) return { x: 0, y: 0 }
  return free[Math.floor(Math.random() * free.length)]
}

function resetGame(ctx, state) {
  state.started = true
  state.paused = false
  state.gameOver = false
  state.score = 0
  state.best = Math.max(Number(state.best || 0), 0)
  state.timer = 0
  state.interval = 0.115
  state.dir = { x: 1, y: 0 }
  state.nextDir = { x: 1, y: 0 }
  state.snake = [
    { x: 8, y: 9 },
    { x: 7, y: 9 },
    { x: 6, y: 9 },
    { x: 5, y: 9 }
  ]
  state.food = randomFood(state.snake)
  render(ctx, state)
  ctx.api.log('[Snake] restart')
}

function updateDirection(ctx, state) {
  const input = ctx.api.input
  let requested = null
  if (input.wasActionPressed('move_up') || input.isActionDown('move_up')) requested = { x: 0, y: -1 }
  else if (input.wasActionPressed('move_down') || input.isActionDown('move_down')) requested = { x: 0, y: 1 }
  else if (input.wasActionPressed('move_left') || input.isActionDown('move_left')) requested = { x: -1, y: 0 }
  else if (input.wasActionPressed('move_right') || input.isActionDown('move_right')) requested = { x: 1, y: 0 }
  if (requested && !opposite(requested, state.dir)) state.nextDir = requested
}

function step(ctx, state) {
  state.dir = state.nextDir
  const head = state.snake[0]
  const next = { x: head.x + state.dir.x, y: head.y + state.dir.y }
  const hitWall = next.x < 0 || next.x >= GRID.columns || next.y < 0 || next.y >= GRID.rows
  const hitSelf = state.snake.some((cell) => sameCell(cell, next))
  if (hitWall || hitSelf) {
    state.gameOver = true
    state.best = Math.max(Number(state.best || 0), Number(state.score || 0))
    ctx.api.warn(`[Snake] game over. score=${state.score}`)
    render(ctx, state)
    return
  }

  state.snake.unshift(next)
  if (sameCell(next, state.food)) {
    state.score += 1
    state.best = Math.max(Number(state.best || 0), Number(state.score || 0))
    state.food = randomFood(state.snake)
    state.interval = Math.max(0.055, 0.115 - state.score * 0.0025)
    ctx.api.log(`[Snake] ate food. score=${state.score}`)
  } else {
    state.snake.pop()
  }
  render(ctx, state)
}

function render(ctx, state) {
  const segments = getEntities(ctx, 'snake_segment_')
  for (let index = 0; index < segments.length; index += 1) {
    const entity = segments[index]
    const cell = state.snake[index]
    if (!cell) {
      setSprite(entity, false, COLORS.hidden)
      continue
    }
    setPosition(entity, cell)
    setSprite(entity, true, index === 0 ? COLORS.head : (index === state.snake.length - 1 ? COLORS.tail : COLORS.body))
  }

  const food = getEntity(ctx, 'snake_food')
  setPosition(food, state.food)
  setSprite(food, true, COLORS.food)

  const score = getEntity(ctx, 'ui_score')
  const status = getEntity(ctx, 'ui_status')
  setText(score, `Score: ${state.score}    Best: ${state.best}`)
  if (state.gameOver) setText(status, 'Game Over - Press R / Enter to Restart')
  else if (state.paused) setText(status, 'Paused - Space / P to Resume')
  else setText(status, 'WASD / Arrow Keys: Move    Space/P: Pause    R: Restart')
}

export default {
  onStart(ctx) {
    const state = ctx.api.getState(ctx.entity)
    resetGame(ctx, state)
  },

  onUpdate(ctx) {
    const state = ctx.api.getState(ctx.entity)
    if (!state.started) resetGame(ctx, state)

    if (ctx.api.input.wasActionPressed('restart')) {
      resetGame(ctx, state)
      return
    }

    if (ctx.api.input.wasActionPressed('pause') && !state.gameOver) {
      state.paused = !state.paused
      render(ctx, state)
      return
    }

    if (state.paused || state.gameOver) return
    updateDirection(ctx, state)
    state.timer += ctx.api.delta
    while (state.timer >= state.interval) {
      state.timer -= state.interval
      step(ctx, state)
    }
  }
}
