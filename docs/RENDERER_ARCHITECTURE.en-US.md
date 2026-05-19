# Renderer Architecture Split

[中文](RENDERER_ARCHITECTURE.zh-CN.md) | English

Updated: `2026-05-19`  
Version: `0.5.0`

`PixiRendererCore.ts` supports edit mode, play mode, HTML UI, caches, Tilemaps, debug overlays, Gizmos, multi-select, and runtime scene switching. Future split targets are `PixiAppHost`, `TextureLoader`, `RenderNodeCache`, `ViewportCameraController`, `GizmoController`, `SceneRenderSystem`, `RuntimePreviewController`, and `HtmlUiOverlay`.
