import { describe, expect, it } from 'vitest'
import {
  normalizeRelativeAssetPath,
  rewriteMovedAssetReference,
  rewriteMovedAssetReferences
} from '../src/engine/assets/pathReferences'

describe('asset path references', () => {
  it('normalizes relative asset paths', () => {
    expect(normalizeRelativeAssetPath('\\assets\\images\\player.png')).toBe('assets/images/player.png')
    expect(normalizeRelativeAssetPath(' assets//images / player.png ')).toBe('assets/images/player.png')
  })

  it('rewrites exact file references', () => {
    expect(rewriteMovedAssetReference('assets/images/player.png', 'assets/images/player.png', 'assets/sprites/player.png', false))
      .toBe('assets/sprites/player.png')
    expect(rewriteMovedAssetReference('assets/images/enemy.png', 'assets/images/player.png', 'assets/sprites/player.png', false))
      .toBe('assets/images/enemy.png')
  })

  it('rewrites nested directory references in scene-like JSON', () => {
    const sceneLike = {
      sprite: { texturePath: 'assets/images/player/idle.png' },
      frames: ['assets/images/player/run.png', 'assets/images/enemy/tube.png']
    }

    expect(rewriteMovedAssetReferences(sceneLike, 'assets/images/player', 'assets/images/hero', true)).toBe(true)
    expect(sceneLike).toEqual({
      sprite: { texturePath: 'assets/images/hero/idle.png' },
      frames: ['assets/images/hero/run.png', 'assets/images/enemy/tube.png']
    })
  })
})
