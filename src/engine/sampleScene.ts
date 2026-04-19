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

export function createDemoScene() {
  const scene = new Scene('scene_main', 'MainScene')

  const player = new Entity('player_001', 'Player')
  player.addComponent(new TransformComponent(220, 220, 1, 1))
  player.addComponent(new SpriteComponent('', 90, 90, true, 1, 0x56ccf2))
  player.addComponent(new ColliderComponent('rect', 90, 90))
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
  camera.addComponent(new TransformComponent(220, 220, 1, 1))
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

