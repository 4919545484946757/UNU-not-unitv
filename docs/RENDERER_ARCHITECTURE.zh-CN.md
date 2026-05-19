# Renderer 架构拆分记录

[English](RENDERER_ARCHITECTURE.en-US.md) | 中文

更新时间：`2026-05-19`  
适用版本：`0.5.0`

`PixiRendererCore.ts` 支撑编辑态、播放态、HTML UI、缓存、Tilemap、调试层、Gizmo、多选和运行态场景切换。后续继续拆分 `PixiAppHost`、`TextureLoader`、`RenderNodeCache`、`ViewportCameraController`、`GizmoController`、`SceneRenderSystem`、`RuntimePreviewController`、`HtmlUiOverlay`。
