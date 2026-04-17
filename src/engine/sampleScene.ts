import { AnimationComponent } from './components/AnimationComponent'
import { CameraComponent } from './components/CameraComponent'
import { ColliderComponent } from './components/ColliderComponent'
import { ScriptComponent } from './components/ScriptComponent'
import { SpriteComponent } from './components/SpriteComponent'
import { TransformComponent } from './components/TransformComponent'
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
    // 鍐呯疆 patrol 杩愯涓?  },
  onDestroy(ctx) {}
}`
    )
  )

  const enemy = new Entity('enemy_001', 'Enemy')
  enemy.addComponent(new TransformComponent(420, 320, 1, 1))
  enemy.addComponent(new SpriteComponent('', 80, 80, true, 1, 0xeb5757))
  enemy.addComponent(new ColliderComponent('rect', 80, 80))
  enemy.addComponent(
    new ScriptComponent(
      'builtin://spin',
      `export default {
  onUpdate(ctx) {
    // 鍐呯疆 spin 杩愯涓?  }
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

  scene.addEntity(player)
  scene.addEntity(enemy)
  scene.addEntity(item)
  scene.addEntity(fx)
  scene.addEntity(camera)
  return scene
}

