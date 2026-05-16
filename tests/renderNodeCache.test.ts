import { describe, expect, it, vi } from 'vitest'
import { RenderNodeCache } from '../src/engine/renderer/RenderNodeCache'

describe('RenderNodeCache', () => {
  it('reuses the same node when key and signature are unchanged', () => {
    const cache = new RenderNodeCache<{ id: string }>()
    const node = { id: 'player-node' }

    cache.set('Player', 'transform:0,0|sprite:idle', node)

    expect(cache.get('Player', 'transform:0,0|sprite:idle')).toBe(node)
  })

  it('invalidates lookup when the render signature changes', () => {
    const cache = new RenderNodeCache<{ id: string }>()
    cache.set('Player', 'frame:idle_01', { id: 'idle-node' })

    expect(cache.get('Player', 'frame:walk_01')).toBeNull()
  })

  it('prunes inactive nodes and calls the destroy hook', () => {
    const cache = new RenderNodeCache<{ id: string }>()
    const destroy = vi.fn()
    cache.set('Player', 'a', { id: 'player' })
    cache.set('Enemy', 'b', { id: 'enemy' })

    cache.prune(new Set(['Player']), destroy)

    expect(cache.size).toBe(1)
    expect(cache.get('Player')).toEqual({ id: 'player' })
    expect(cache.get('Enemy')).toBeNull()
    expect(destroy).toHaveBeenCalledWith({ id: 'enemy' })
  })
})
