import { AnimationComponent } from './components/AnimationComponent'
import { BackgroundComponent } from './components/BackgroundComponent'
import { CameraComponent } from './components/CameraComponent'
import { ColliderComponent } from './components/ColliderComponent'
import { InteractableComponent } from './components/InteractableComponent'
import { ScriptComponent } from './components/ScriptComponent'
import { SpriteComponent } from './components/SpriteComponent'
import { TilemapComponent } from './components/TilemapComponent'
import { TransformComponent } from './components/TransformComponent'
import { UIComponent } from './components/UIComponent'
import { Entity } from './core/Entity'
import { Scene } from './core/Scene'

const playerIdleFrames = [
  'assets/images/pixel/player/idle/idle_01.png',
  'assets/images/pixel/player/idle/idle_02.png',
  'assets/images/pixel/player/idle/idle_03.png',
  'assets/images/pixel/player/idle/idle_04.png'
]
const playerRunFrames = [
  'assets/images/pixel/player/run/run_01.png',
  'assets/images/pixel/player/run/run_02.png',
  'assets/images/pixel/player/run/run_03.png',
  'assets/images/pixel/player/run/run_04.png',
  'assets/images/pixel/player/run/run_05.png',
  'assets/images/pixel/player/run/run_06.png'
]
const playerAttackFrames = [
  'assets/images/pixel/player/forward/forward_01.png',
  'assets/images/pixel/player/forward/forward_02.png',
  'assets/images/pixel/player/forward/forward_03.png',
  'assets/images/pixel/player/forward/forward_04.png',
  'assets/images/pixel/player/forward/forward_05.png',
  'assets/images/pixel/player/forward/forward_06.png'
]
const enemyFrames = [
  'assets/images/pixel/enemy/tube_01.png',
  'assets/images/pixel/enemy/tube_02.png',
  'assets/images/pixel/enemy/tube_03.png',
  'assets/images/pixel/enemy/tube_04.png'
]
const torchFxFrames = [
  'assets/images/pixel/enemy/tube_01.png',
  'assets/images/pixel/enemy/tube_02.png',
  'assets/images/pixel/enemy/tube_03.png'
]
const backgroundImagePath = 'assets/images/pixel/background/background-img.png'
const facilityBackgroundImagePath = 'assets/images/pixel/background/background-facility.png'

export function createDemoScene() {
  const scene = new Scene('scene_main', 'MainScene')

  const background = new Entity('background_main_001', 'Background')
  background.addComponent(new TransformComponent(180, 40, 1, 1, 0, 0.5, 0.5, -100000))
  background.addComponent(new SpriteComponent(backgroundImagePath, 1539, 1022, true, 1, 0xffffff, false))
  background.addComponent(new BackgroundComponent(true, true, 'cover'))
  background.addComponent(new CameraComponent(false, 1, '', 0.18, 0, 0, false))

  const player = new Entity('player_001', 'Player')
  // 放在 LevelTilemap 的非碰撞区域（上半区域）避免开局卡在碰撞格里。
  player.addComponent(new TransformComponent(180, 40, 1, 1))
  player.addComponent(new SpriteComponent(playerIdleFrames[0], 96, 96, true, 1, 0xffffff))
  // 玩家碰撞箱：半高，并向下偏移 20（相对实体中心）。
  player.addComponent(new ColliderComponent('rect', 60, 40, 0, 20, false))
  player.addComponent(
    new AnimationComponent(
      true,
      true,
      10,
      true,
      0,
      0,
      [...playerIdleFrames],
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
          { name: 'Idle', framePaths: [...playerIdleFrames], frameDurations: [1, 1, 1, 1], loop: true },
          { name: 'Run', framePaths: [...playerRunFrames], frameDurations: [1, 1, 1, 1, 1, 1], loop: true },
          { name: 'Attack', framePaths: [...playerAttackFrames], frameDurations: [1, 1, 1, 1, 1, 1], loop: false }
        ],
        transitions: [
          { from: 'Idle', to: 'Run', condition: 'ifMoving' },
          { from: 'Run', to: 'Idle', condition: 'ifNotMoving' },
          { from: 'Idle', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Run', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Attack', to: 'Run', condition: 'ifMoving', minNormalizedTime: 0.6, exitTime: true },
          { from: 'Attack', to: 'Idle', condition: 'ifNotMoving', minNormalizedTime: 0.6, exitTime: true }
        ]
      }
    )
  )
  player.addComponent(
    new ScriptComponent(
      'assets/scripts/player-input.js',
      `{
  "moveSpeed": 140,
  "sprintSpeed": 280,
  "runAnimationMultiplierWhenSprint": 2,
  "shootAction": "fire",
  "fireCooldown": 0,
  "bullet": {
    "speed": 420,
    "life": 2,
    "maxDistance": 560,
    "width": 20,
    "height": 8,
    "tint": 15922687
  }
}`
    )
  )

  const enemy = new Entity('enemy_001', 'Enemy')
  enemy.addComponent(new TransformComponent(420, 320, 1, 1))
  enemy.addComponent(new SpriteComponent(enemyFrames[0], 80, 80, true, 1, 0xffffff))
  enemy.addComponent(new ColliderComponent('rect', 40, 80))
  enemy.addComponent(
    new AnimationComponent(true, true, 8, true, 0, 0, [...enemyFrames], [1, 1, 1, 1])
  )
  enemy.addComponent(
    new ScriptComponent(
      'assets/scripts/enemy-chase-respawn.js',
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
  item.addComponent(new SpriteComponent('assets/images/pixel/tilemap/texture_2.png', 72, 72, true, 1, 0xffffff))
  item.addComponent(new ColliderComponent('rect', 72, 72))
  item.addComponent(
    new ScriptComponent(
      'custom://interaction',
      `{
  "onInteract": [
    {
      "type": "cycleTint",
      "target": "self",
      "values": [16777215, 16763072, 9293460, 7979007, 16748431]
    }
  ]
}`
    )
  )
  item.addComponent(
    new InteractableComponent(
      true,
      220,
      'scripted',
      '',
      [],
      []
    )
  )

  const fx = new Entity('fx_001', 'TorchFX')
  fx.addComponent(new TransformComponent(760, 320, 1, 1))
  fx.addComponent(new SpriteComponent('', 64, 64, true, 0.95, 0xffc857))
  fx.addComponent(new ColliderComponent('rect', 64, 64))
  fx.addComponent(new AnimationComponent(true, true, 6, true, 0, 0, [...torchFxFrames], [1, 1, 2], 'assets/animations/TorchFX.anim.json'))

  const camera = new Entity('camera_main', 'MainCamera')
  camera.addComponent(new TransformComponent(180, 40, 1, 1))
  camera.addComponent(new CameraComponent(true, 1, player.id, 1, 0, 0, false))

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
        4,4,4,4,4,4,4,4,4,4,4,4,
        4,1,1,2,1,1,1,1,2,1,1,4,
        1,1,1,2,1,1,1,1,2,1,1,1,
        1,1,1,2,1,1,1,1,2,1,1,1,
        1,1,1,2,1,1,1,1,2,1,1,1,
        1,1,1,2,1,1,1,1,2,1,1,1,
        4,1,1,2,1,1,1,1,2,1,1,4,
        4,4,4,4,4,4,4,4,4,4,4,4
      ],
      [
        1,1,1,1,1,1,1,1,1,1,1,1,
        1,0,0,0,0,0,0,0,0,0,0,1,
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,
        1,0,0,0,0,0,0,0,0,0,0,1,
        1,1,1,1,1,1,1,1,1,1,1,1
      ],
      true,
      { 1: 'assets/images/pixel/tilemap/texture_1.png', 2: 'assets/images/pixel/tilemap/texture_2.png', 4: 'assets/images/pixel/tilemap/texture_4.png' }
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

  const doorToSecond = new Entity('door_to_second_001', 'DoorToSecond')
  doorToSecond.addComponent(new TransformComponent(295, 68, 1, 1))
  doorToSecond.addComponent(new SpriteComponent('assets/images/pixel/props/door.png', 110, 180, true, 0.95, 0xffffff))
  doorToSecond.addComponent(new ColliderComponent('rect', 110, 180))
  doorToSecond.addComponent(new InteractableComponent(true, 180, 'switchScene', 'SecondScene'))

  scene.addEntity(background)
  scene.addEntity(tilemap)
  scene.addEntity(player)
  scene.addEntity(enemy)
  scene.addEntity(item)
  scene.addEntity(fx)
  scene.addEntity(camera)
  scene.addEntity(hudTitle)
  scene.addEntity(hudButton)
  scene.addEntity(doorToSecond)
  return scene
}

export function createSecondScene() {
  const scene = new Scene('scene_second', 'SecondScene')

  const background = new Entity('background_second_001', 'Background')
  background.addComponent(new TransformComponent(-120, 20, 1, 1, 0, 0.5, 0.5, -100000))
  background.addComponent(new SpriteComponent(facilityBackgroundImagePath, 1539, 1022, true, 1, 0xffffff, false))
  background.addComponent(new BackgroundComponent(true, true, 'cover'))
  background.addComponent(new CameraComponent(false, 1, '', 0.18, 0, 0, false))

  const player = new Entity('player_002', 'Player')
  player.addComponent(new TransformComponent(-120, 20, 1, 1))
  player.addComponent(new SpriteComponent(playerIdleFrames[0], 96, 96, true, 1, 0xffffff))
  // 玩家碰撞箱：半高，并向下偏移 20（相对实体中心）。
  player.addComponent(new ColliderComponent('rect', 100, 50, 0, 20, false))
  player.addComponent(
    new ScriptComponent(
      'assets/scripts/player-input.js',
      `{
  "moveSpeed": 140,
  "sprintSpeed": 280,
  "runAnimationMultiplierWhenSprint": 2,
  "shootAction": "fire",
  "fireCooldown": 0,
  "bullet": {
    "speed": 420,
    "life": 2,
    "maxDistance": 560,
    "width": 20,
    "height": 8,
    "tint": 15922687
  }
}`
    )
  )
  player.addComponent(
    new AnimationComponent(
      true,
      true,
      10,
      true,
      0,
      0,
      [...playerIdleFrames],
      [1, 1, 1, 1],
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
          { name: 'Idle', framePaths: [...playerIdleFrames], frameDurations: [1, 1, 1, 1], loop: true },
          { name: 'Run', framePaths: [...playerRunFrames], frameDurations: [1, 1, 1, 1, 1, 1], loop: true },
          { name: 'Attack', framePaths: [...playerAttackFrames], frameDurations: [1, 1, 1, 1, 1, 1], loop: false }
        ],
        transitions: [
          { from: 'Idle', to: 'Run', condition: 'ifMoving' },
          { from: 'Run', to: 'Idle', condition: 'ifNotMoving' },
          { from: 'Idle', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Run', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Attack', to: 'Run', condition: 'ifMoving', minNormalizedTime: 0.6, exitTime: true },
          { from: 'Attack', to: 'Idle', condition: 'ifNotMoving', minNormalizedTime: 0.6, exitTime: true }
        ]
      }
    )
  )

  const tilemap = new Entity('tilemap_002', 'LevelTilemap')
  tilemap.addComponent(new TransformComponent(-300, -120, 1, 1))
  tilemap.addComponent(
    new TilemapComponent(
      true,
      14,
      8,
      48,
      48,
      [
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        2,2,2,2,2,2,2,2,2,2,2,2,2,2
      ],
      [
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1
      ],
      true,
      { 1: 'assets/images/pixel/tilemap/texture_1.png', 2: 'assets/images/pixel/tilemap/texture_2.png', 4: 'assets/images/pixel/tilemap/texture_4.png' }
    )
  )

  const doorBack = new Entity('door_to_main_001', 'DoorToMain')
  doorBack.addComponent(new TransformComponent(-220, 20, 1, 1))
  doorBack.addComponent(new SpriteComponent('assets/images/pixel/props/door.png', 110, 180, true, 0.95, 0xe8f3ff))
  doorBack.addComponent(new ColliderComponent('rect', 110, 180))
  doorBack.addComponent(new InteractableComponent(true, 180, 'switchScene', 'MainScene'))

  const camera = new Entity('camera_second', 'MainCamera')
  camera.addComponent(new TransformComponent(-120, 20, 1, 1))
  camera.addComponent(new CameraComponent(true, 1, player.id, 1, 0, 0, false))

  scene.addEntity(background)
  scene.addEntity(tilemap)
  scene.addEntity(player)
  scene.addEntity(doorBack)
  scene.addEntity(camera)
  return scene
}

export function createSampleSceneByName(name: string) {
  if (name === 'MainScene') return createDemoScene()
  if (name === 'SecondScene') return createSecondScene()
  return null
}
