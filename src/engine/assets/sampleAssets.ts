import { AssetDatabase } from './AssetDatabase'
import type { AssetNode } from './types'

export const sampleAssetRoots: AssetNode[] = [
  {
    id: 'assets',
    name: 'assets',
    type: 'folder',
    path: 'assets',
    children: [
      {
        id: 'assets/images',
        name: 'images',
        type: 'folder',
        path: 'assets/images',
        children: [
          { id: 'assets/images/player.png', name: 'player.png', type: 'image', path: 'assets/images/player.png' },
          { id: 'assets/images/enemy.png', name: 'enemy.png', type: 'image', path: 'assets/images/enemy.png' },
          { id: 'assets/images/chest.png', name: 'chest.png', type: 'image', path: 'assets/images/chest.png' }
        ]
      },
      {
        id: 'assets/scripts',
        name: 'scripts',
        type: 'folder',
        path: 'assets/scripts',
        children: [
          { id: 'assets/scripts/patrol.js', name: 'patrol.js', type: 'script', path: 'assets/scripts/patrol.js' },
          { id: 'assets/scripts/spin.js', name: 'spin.js', type: 'script', path: 'assets/scripts/spin.js' }
        ]
      },
      {
        id: 'assets/animations',
        name: 'animations',
        type: 'folder',
        path: 'assets/animations',
        children: [
          { id: 'assets/animations/TorchFX.anim.json', name: 'TorchFX.anim.json', type: 'animation', path: 'assets/animations/TorchFX.anim.json' },
          { id: 'assets/animations/TorchSheet.atlas.json', name: 'TorchSheet.atlas.json', type: 'atlas', path: 'assets/animations/TorchSheet.atlas.json' }
        ]
      },
      {
        id: 'assets/audio',
        name: 'audio',
        type: 'folder',
        path: 'assets/audio',
        children: [{ id: 'assets/audio/bgm.mp3', name: 'bgm.mp3', type: 'audio', path: 'assets/audio/bgm.mp3' }]
      }
    ]
  },
  {
    id: 'scenes',
    name: 'scenes',
    type: 'folder',
    path: 'scenes',
    children: [{ id: 'scenes/Main.scene.json', name: 'Main.scene.json', type: 'scene', path: 'scenes/Main.scene.json' }]
  },
  {
    id: 'prefabs',
    name: 'prefabs',
    type: 'folder',
    path: 'prefabs',
    children: [{ id: 'prefabs/Enemy.prefab.json', name: 'Enemy.prefab.json', type: 'prefab', path: 'prefabs/Enemy.prefab.json' }]
  }
]

export function createSampleAssetDatabase() {
  return new AssetDatabase(sampleAssetRoots)
}
