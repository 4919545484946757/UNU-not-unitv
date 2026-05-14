const GRID_COLUMNS = 20
const GRID_ROWS = 20
const CELL_SIZE = 24
const BOARD_X = -240
const BOARD_Y = -240
const STEP_SECONDS = 0.12
const MAX_SEGMENTS = 323

const palette = {
  head: 0x9df15e,
  headLost: 0xff6b6b,
  bodyA: 0x48c774,
  bodyB: 0x2fa65a,
  food: 0xff4d79,
  hidden: 0xffffff
}

const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
}

const opposite = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
}

const getEntity = (ctx, id) => ctx.scene.getEntityById(id)
const getTransform = (ctx, id) => getEntity(ctx, id)?.getTransform()
const getSprite = (ctx, id) => getEntity(ctx, id)?.getComponent('Sprite')
const cellKey = (cell) => `${cell.x},${cell.y}`

const toWorld = (cell) => ({
  x: BOARD_X + cell.x * CELL_SIZE + CELL_SIZE / 2,
  y: BOARD_Y + cell.y * CELL_SIZE + CELL_SIZE / 2
})

const readDirectionInput = (input, currentQueued) => {
  if (input.wasActionPressed('move_up')) return 'up'
  if (input.wasActionPressed('move_down')) return 'down'
  if (input.wasActionPressed('move_left')) return 'left'
  if (input.wasActionPressed('move_right')) return 'right'

  if (input.isActionDown('move_up') && currentQueued !== 'up') return 'up'
  if (input.isActionDown('move_down') && currentQueued !== 'down') return 'down'
  if (input.isActionDown('move_left') && currentQueued !== 'left') return 'left'
  if (input.isActionDown('move_right') && currentQueued !== 'right') return 'right'
  return null
}

const randomFood = (snake) => {
  const occupied = new Set(snake.map(cellKey))
  const free = []
  for (let y = 1; y < GRID_ROWS - 1; y += 1) {
    for (let x = 1; x < GRID_COLUMNS - 1; x += 1) {
      const key = `${x},${y}`
      if (!occupied.has(key)) free.push({ x, y })
    }
  }
  if (!free.length) return null
  return free[Math.floor(Math.random() * free.length)]
}

const ensureGame = (ctx) => {
  const state = ctx.api.getState(ctx.entity)
  if (state.ready) return state

  state.ready = true
  state.best = Number(state.best ?? 0)
  resetGame(ctx, state)
  return state
}

const resetGame = (ctx, state) => {
  state.snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]
  state.direction = 'right'
  state.queuedDirection = 'right'
  state.food = randomFood(state.snake)
  state.score = 0
  state.timer = 0
  state.running = false
  state.paused = false
  state.gameOver = false
  state.won = false
  updateScene(ctx, state)
}

const updateUi = (ctx, state) => {
  const scoreUi = getEntity(ctx, 'ui_score')?.getComponent('UI')
  if (scoreUi) scoreUi.text = `Score ${state.score}    Best ${state.best}`

  const hintUi = getEntity(ctx, 'ui_hint')?.getComponent('UI')
  if (!hintUi) return

  if (state.won) {
    hintUi.text = 'Board cleared. R to restart.'
  } else if (state.gameOver) {
    hintUi.text = 'Game over. R to restart.'
  } else if (state.paused) {
    hintUi.text = 'Paused. P to resume.'
  } else if (!state.running) {
    hintUi.text = 'Space to start. WASD or arrows to steer.'
  } else {
    hintUi.text = 'WASD / arrows to steer. P pauses.'
  }
}

const updateScene = (ctx, state) => {
  const snake = state.snake || []
  const head = snake[0]
  const headTransform = getTransform(ctx, 'snake_head')
  const headSprite = getSprite(ctx, 'snake_head')
  if (headTransform && head) {
    const pos = toWorld(head)
    headTransform.x = pos.x
    headTransform.y = pos.y
  }
  if (headSprite) {
    headSprite.visible = !!head
    headSprite.tint = state.gameOver ? palette.headLost : palette.head
  }

  for (let i = 0; i < MAX_SEGMENTS; i += 1) {
    const transform = getTransform(ctx, `snake_body_${String(i).padStart(3, '0')}`)
    const sprite = getSprite(ctx, `snake_body_${String(i).padStart(3, '0')}`)
    const cell = snake[i + 1]
    if (!transform || !sprite) continue
    if (!cell) {
      sprite.visible = false
      sprite.tint = palette.hidden
      continue
    }
    const pos = toWorld(cell)
    transform.x = pos.x
    transform.y = pos.y
    sprite.visible = true
    sprite.tint = i % 2 === 0 ? palette.bodyA : palette.bodyB
  }

  const foodTransform = getTransform(ctx, 'food')
  const foodSprite = getSprite(ctx, 'food')
  if (foodTransform && state.food) {
    const pos = toWorld(state.food)
    foodTransform.x = pos.x
    foodTransform.y = pos.y
  }
  if (foodSprite) foodSprite.visible = !!state.food && !state.won

  updateUi(ctx, state)
}

const stepGame = (ctx, state) => {
  const direction = state.queuedDirection || state.direction
  state.direction = direction
  const vector = directions[direction]
  const snake = state.snake || []
  const head = snake[0]
  const next = { x: head.x + vector.x, y: head.y + vector.y }
  const ate = state.food && next.x === state.food.x && next.y === state.food.y
  const bodyToCheck = ate ? snake : snake.slice(0, -1)

  const hitWall = next.x <= 0 || next.x >= GRID_COLUMNS - 1 || next.y <= 0 || next.y >= GRID_ROWS - 1
  const hitSelf = bodyToCheck.some((cell) => cell.x === next.x && cell.y === next.y)
  if (hitWall || hitSelf) {
    state.running = false
    state.gameOver = true
    updateScene(ctx, state)
    return
  }

  state.snake = [next, ...snake]
  if (ate) {
    state.score += 1
    state.best = Math.max(Number(state.best || 0), state.score)
    if (state.snake.length >= Math.min(GRID_COLUMNS * GRID_ROWS, MAX_SEGMENTS + 1)) {
      state.running = false
      state.won = true
      state.food = null
    } else {
      state.food = randomFood(state.snake)
    }
  } else {
    state.snake.pop()
  }
  updateScene(ctx, state)
}

export default {
  scripts: {
    'assets/scripts/snake-game.js': {
      onStart(ctx) {
        ensureGame(ctx)
      },
      onUpdate(ctx) {
        const state = ensureGame(ctx)
        const requested = readDirectionInput(ctx.api.input, state.queuedDirection)
        if (requested && requested !== opposite[state.direction]) {
          state.queuedDirection = requested
          if (!state.running && !state.gameOver && !state.won) state.running = true
        }

        if (ctx.api.input.wasActionPressed('restart')) {
          resetGame(ctx, state)
          state.running = true
        }

        if (ctx.api.input.wasActionPressed('start')) {
          if (state.gameOver || state.won) resetGame(ctx, state)
          state.running = true
          state.paused = false
        }

        if (ctx.api.input.wasActionPressed('pause') && state.running) {
          state.paused = !state.paused
          updateScene(ctx, state)
        }

        if (!state.running || state.paused || state.gameOver || state.won) {
          updateUi(ctx, state)
          return
        }

        state.timer += ctx.api.delta
        while (state.timer >= STEP_SECONDS) {
          state.timer -= STEP_SECONDS
          stepGame(ctx, state)
          if (!state.running) break
        }
      }
    }
  }
}
