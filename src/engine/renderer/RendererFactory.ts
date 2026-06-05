import { Canvas2DRenderer } from './Canvas2DRenderer'
import { PixiRenderer } from './PixiRenderer'
import type { SceneRenderer, SceneRendererFactoryOptions } from './RendererTypes'

export function createSceneRenderer(options: SceneRendererFactoryOptions): SceneRenderer {
  if (options.backend === 'canvas2d') {
    return new Canvas2DRenderer(options)
  }
  return new PixiRenderer(options)
}
