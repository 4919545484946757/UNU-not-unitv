# Renderer Architecture Split

English | [中文](RENDERER_ARCHITECTURE.zh-CN.md)

Updated: `2026-05-16`

## Current State

The renderer is now in a transition split:

- `PixiRenderer.ts`: lightweight public facade for compatibility.
- `PixiRendererCore.ts`: current main implementation, to be split further.
- `utils/markdown.ts`: Markdown parsing, HTML conversion, and HTML sanitizing.
- `utils/color.ts`: color blending and CSS color formatting.
- `utils/uiMetrics.ts`: UI sizing types.
- `RenderNodeCache.ts`: render node cache container with smoke test coverage.

## Next Split Targets

- `PixiAppHost`: Pixi Application lifecycle, resize, and canvas mounting.
- `TextureLoader`: texture and data URL cache.
- `SceneRenderSystem`: backdrop/world/ui/overlay rendering.
- `ViewportCameraController`: pan, zoom, and camera follow.
- `GizmoController`: selection, move, scale, and rotation gizmos.
- `RuntimePreviewController`: play-mode scene copy, tick, and scene switching.
- `HtmlUiOverlay`: DOM UI creation, layout, and events.

## Verification

- `PixiRenderer.ts` is now a facade file.
- `tests/renderNodeCache.test.ts` covers same key/signature reuse, signature invalidation, and inactive node pruning.
