import { AnimationComponent } from './components/AnimationComponent'
import { CameraComponent } from './components/CameraComponent'
import { ColliderComponent } from './components/ColliderComponent'
import { ScriptComponent } from './components/ScriptComponent'
import { SpriteComponent } from './components/SpriteComponent'
import { TilemapComponent } from './components/TilemapComponent'
import { TransformComponent } from './components/TransformComponent'
import { UIComponent } from './components/UIComponent'
import { Entity } from './core/Entity'
import { Scene } from './core/Scene'

function createStateTexture(color: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect x="4" y="4" width="88" height="88" rx="14" ry="14" fill="${color}" stroke="#f5f8ff" stroke-width="4"/>
  <text x="48" y="56" text-anchor="middle" font-size="26" font-family="Arial, sans-serif" fill="#0b1020">${label}</text>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const playerIdleTexture = createStateTexture('#5ab6ff', 'I')
const playerRunTextureA = createStateTexture('#57d88c', 'R')
const playerRunTextureB = createStateTexture('#38c1d9', 'R')
const playerAttackTexture = createStateTexture('#ff6b6b', 'A')

export function createDemoScene() {
  const scene = new Scene('scene_main', 'MainScene')

  const player = new Entity('player_001', 'Player')
  // 放在 LevelTilemap 的非碰撞区域（上半区域）避免开局卡在碰撞格里。
  player.addComponent(new TransformComponent(180, 40, 1, 1))
  player.addComponent(new SpriteComponent(playerIdleTexture, 90, 90, true, 1, 0xffffff))
  player.addComponent(new ColliderComponent('rect', 100, 100, 0, 0, false))
  player.addComponent(
    new AnimationComponent(
      true,
      true,
      8,
      true,
      0,
      0,
      [playerIdleTexture],
      [1],
      '',
      '',
      null,
      [],
      { positionX: [], positionY: [], rotation: [] },
      {
        enabled: true,
        initialState: 'Idle',
        currentState: 'Idle',
        clips: [
          { name: 'Idle', framePaths: [playerIdleTexture], frameDurations: [1], loop: true },
          { name: 'Run', framePaths: [playerRunTextureA, playerRunTextureB], frameDurations: [1, 1], loop: true },
          { name: 'Attack', framePaths: [playerAttackTexture], frameDurations: [1], loop: false }
        ],
        transitions: [
          { from: 'Idle', to: 'Run', condition: 'ifMoving' },
          { from: 'Run', to: 'Idle', condition: 'ifNotMoving' },
          { from: 'Idle', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Run', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Attack', to: 'Run', condition: 'ifActionUp', action: 'fire', minNormalizedTime: 0.6 }
        ]
      }
    )
  )
  player.addComponent(
    new ScriptComponent(
      'builtin://player-input',
      `export default {
  onInit(ctx) {},
  onStart(ctx) {},
  onUpdate(ctx) {
    const move = ctx.api.input.getMoveVector(true)
    // WASD / 方向键控制移动，斜向移动会自动归一化（例如 W + D 保持同速）
  },
  onDestroy(ctx) {}
}`
    )
  )

  const enemy = new Entity('enemy_001', 'Enemy')
  enemy.addComponent(new TransformComponent(420, 320, 1, 1))
  enemy.addComponent(new SpriteComponent('assets/images/enemy.png', 80, 80, true, 1, 0xffffff))
  enemy.addComponent(new ColliderComponent('rect', 80, 80))
  enemy.addComponent(
    new ScriptComponent(
      'builtin://enemy-chase-respawn',
      `export default {
  onUpdate(ctx) {
    const enemy = ctx.entity
    const player = ctx.api.findEntityByName('Player')
    if (!player) return
    // 1. 敌人持续追踪玩家
    // 2. 接触玩家后删除自身
    // 3. 在随机位置生成新的 Enemy
  }
}`
    )
  )

  const item = new Entity('item_001', 'Chest')
  item.addComponent(new TransformComponent(620, 180, 1, 1))
  item.addComponent(new SpriteComponent('', 72, 72, true, 1, 0xf2c94c))
  item.addComponent(new ColliderComponent('rect', 72, 72))

  const fx = new Entity('fx_001', 'TorchFX')
  fx.addComponent(new TransformComponent(760, 320, 1, 1))
  fx.addComponent(new SpriteComponent('', 64, 64, true, 0.95, 0xffc857))
  fx.addComponent(new ColliderComponent('rect', 64, 64))
  fx.addComponent(new AnimationComponent(true, true, 6, true, 0, 0, [
    'assets/images/player.png',
    'assets/images/enemy.png',
    'assets/images/chest.png'
  ], [1, 1, 2], 'assets/animations/TorchFX.anim.json'))

  const camera = new Entity('camera_main', 'MainCamera')
  camera.addComponent(new TransformComponent(180, 40, 1, 1))
  camera.addComponent(new CameraComponent(true, 1, player.id, 0.16, 0, 0, false))

  const tilemap = new Entity('tilemap_001', 'LevelTilemap')
  tilemap.addComponent(new TransformComponent(-260, -120, 1, 1))
  tilemap.addComponent(
    new TilemapComponent(
      true,
      12,
      8,
      48,
      48,
      [
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1,
        2,2,2,2,2,2,2,2,2,2,2,2
      ],
      [
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1
      ],
      true
    )
  )

  const hudTitle = new Entity('ui_title_001', 'UI_Title')
  hudTitle.addComponent(new TransformComponent(0, 24, 1, 1))
  hudTitle.addComponent(
    new UIComponent(true, 'text', 'UNU Demo Stage', 24, 0xe7f3ff, 260, 40, 0x2b3242, 0.5, 0, false)
  )

  const hudButton = new Entity('ui_btn_001', 'UI_Button')
  hudButton.addComponent(new TransformComponent(-110, -36, 1, 1))
  hudButton.addComponent(
    new UIComponent(true, 'button', 'Click Me', 18, 0xffffff, 160, 44, 0x34528a, 1, 1, true)
  )

  scene.addEntity(tilemap)
  scene.addEntity(player)
  scene.addEntity(enemy)
  scene.addEntity(item)
  scene.addEntity(fx)
  scene.addEntity(camera)
  scene.addEntity(hudTitle)
  scene.addEntity(hudButton)
  return scene
}

