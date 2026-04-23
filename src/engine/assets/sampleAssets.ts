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
          { id: 'assets/images/chest.png', name: 'chest.png', type: 'image', path: 'assets/images/chest.png' },
          {
            id: 'assets/images/pixel',
            name: 'pixel',
            type: 'folder',
            path: 'assets/images/pixel',
            children: [
              {
                id: 'assets/images/pixel/player',
                name: 'player',
                type: 'folder',
                path: 'assets/images/pixel/player',
                children: [
                  {
                    id: 'assets/images/pixel/player/idle',
                    name: 'idle',
                    type: 'folder',
                    path: 'assets/images/pixel/player/idle',
                    children: [
                      { id: 'assets/images/pixel/player/idle/idle_01.png', name: 'idle_01.png', type: 'image', path: 'assets/images/pixel/player/idle/idle_01.png' },
                      { id: 'assets/images/pixel/player/idle/idle_02.png', name: 'idle_02.png', type: 'image', path: 'assets/images/pixel/player/idle/idle_02.png' },
                      { id: 'assets/images/pixel/player/idle/idle_03.png', name: 'idle_03.png', type: 'image', path: 'assets/images/pixel/player/idle/idle_03.png' },
                      { id: 'assets/images/pixel/player/idle/idle_04.png', name: 'idle_04.png', type: 'image', path: 'assets/images/pixel/player/idle/idle_04.png' }
                    ]
                  },
                  {
                    id: 'assets/images/pixel/player/run',
                    name: 'run',
                    type: 'folder',
                    path: 'assets/images/pixel/player/run',
                    children: [
                      { id: 'assets/images/pixel/player/run/run_01.png', name: 'run_01.png', type: 'image', path: 'assets/images/pixel/player/run/run_01.png' },
                      { id: 'assets/images/pixel/player/run/run_02.png', name: 'run_02.png', type: 'image', path: 'assets/images/pixel/player/run/run_02.png' },
                      { id: 'assets/images/pixel/player/run/run_03.png', name: 'run_03.png', type: 'image', path: 'assets/images/pixel/player/run/run_03.png' },
                      { id: 'assets/images/pixel/player/run/run_04.png', name: 'run_04.png', type: 'image', path: 'assets/images/pixel/player/run/run_04.png' },
                      { id: 'assets/images/pixel/player/run/run_05.png', name: 'run_05.png', type: 'image', path: 'assets/images/pixel/player/run/run_05.png' },
                      { id: 'assets/images/pixel/player/run/run_06.png', name: 'run_06.png', type: 'image', path: 'assets/images/pixel/player/run/run_06.png' }
                    ]
                  },
                  {
                    id: 'assets/images/pixel/player/forward',
                    name: 'forward',
                    type: 'folder',
                    path: 'assets/images/pixel/player/forward',
                    children: [
                      { id: 'assets/images/pixel/player/forward/forward_01.png', name: 'forward_01.png', type: 'image', path: 'assets/images/pixel/player/forward/forward_01.png' },
                      { id: 'assets/images/pixel/player/forward/forward_02.png', name: 'forward_02.png', type: 'image', path: 'assets/images/pixel/player/forward/forward_02.png' },
                      { id: 'assets/images/pixel/player/forward/forward_03.png', name: 'forward_03.png', type: 'image', path: 'assets/images/pixel/player/forward/forward_03.png' },
                      { id: 'assets/images/pixel/player/forward/forward_04.png', name: 'forward_04.png', type: 'image', path: 'assets/images/pixel/player/forward/forward_04.png' },
                      { id: 'assets/images/pixel/player/forward/forward_05.png', name: 'forward_05.png', type: 'image', path: 'assets/images/pixel/player/forward/forward_05.png' },
                      { id: 'assets/images/pixel/player/forward/forward_06.png', name: 'forward_06.png', type: 'image', path: 'assets/images/pixel/player/forward/forward_06.png' }
                    ]
                  }
                ]
              },
              {
                id: 'assets/images/pixel/enemy',
                name: 'enemy',
                type: 'folder',
                path: 'assets/images/pixel/enemy',
                children: [
                  { id: 'assets/images/pixel/enemy/tube_01.png', name: 'tube_01.png', type: 'image', path: 'assets/images/pixel/enemy/tube_01.png' },
                  { id: 'assets/images/pixel/enemy/tube_02.png', name: 'tube_02.png', type: 'image', path: 'assets/images/pixel/enemy/tube_02.png' },
                  { id: 'assets/images/pixel/enemy/tube_03.png', name: 'tube_03.png', type: 'image', path: 'assets/images/pixel/enemy/tube_03.png' },
                  { id: 'assets/images/pixel/enemy/tube_04.png', name: 'tube_04.png', type: 'image', path: 'assets/images/pixel/enemy/tube_04.png' }
                ]
              },
              {
                id: 'assets/images/pixel/props',
                name: 'props',
                type: 'folder',
                path: 'assets/images/pixel/props',
                children: [{ id: 'assets/images/pixel/props/door.png', name: 'door.png', type: 'image', path: 'assets/images/pixel/props/door.png' }]
              },
              {
                id: 'assets/images/pixel/background',
                name: 'background',
                type: 'folder',
                path: 'assets/images/pixel/background',
                children: [
                  {
                    id: 'assets/images/pixel/background/background-img.png',
                    name: 'background-img.png',
                    type: 'image',
                    path: 'assets/images/pixel/background/background-img.png'
                  },
                  {
                    id: 'assets/images/pixel/background/background-facility.png',
                    name: 'background-facility.png',
                    type: 'image',
                    path: 'assets/images/pixel/background/background-facility.png'
                  }
                ]
              },
              {
                id: 'assets/images/pixel/tilemap',
                name: 'tilemap',
                type: 'folder',
                path: 'assets/images/pixel/tilemap',
                children: [
                  { id: 'assets/images/pixel/tilemap/facility_tileset.png', name: 'facility_tileset.png', type: 'image', path: 'assets/images/pixel/tilemap/facility_tileset.png' },
                  { id: 'assets/images/pixel/tilemap/texture_1.png', name: 'texture_1.png', type: 'image', path: 'assets/images/pixel/tilemap/texture_1.png' },
                  { id: 'assets/images/pixel/tilemap/texture_2.png', name: 'texture_2.png', type: 'image', path: 'assets/images/pixel/tilemap/texture_2.png' },
                  { id: 'assets/images/pixel/tilemap/texture_4.png', name: 'texture_4.png', type: 'image', path: 'assets/images/pixel/tilemap/texture_4.png' }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'assets/scripts',
        name: 'scripts',
        type: 'folder',
        path: 'assets/scripts',
        children: [
          { id: 'assets/scripts/player-input.js', name: 'player-input.js', type: 'script', path: 'assets/scripts/player-input.js' },
          { id: 'assets/scripts/bullet-projectile.js', name: 'bullet-projectile.js', type: 'script', path: 'assets/scripts/bullet-projectile.js' },
          { id: 'assets/scripts/patrol.js', name: 'patrol.js', type: 'script', path: 'assets/scripts/patrol.js' },
          { id: 'assets/scripts/orbit-around-chest.js', name: 'orbit-around-chest.js', type: 'script', path: 'assets/scripts/orbit-around-chest.js' },
          { id: 'assets/scripts/spin.js', name: 'spin.js', type: 'script', path: 'assets/scripts/spin.js' },
          {
            id: 'assets/scripts/enemy-chase-respawn.js',
            name: 'enemy-chase-respawn.js',
            type: 'script',
            path: 'assets/scripts/enemy-chase-respawn.js'
          }
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
