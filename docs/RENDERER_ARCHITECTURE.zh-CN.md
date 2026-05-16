# Renderer 架构拆分

[English](RENDERER_ARCHITECTURE.en-US.md) | 中文

更新时间：`2026-05-16`

## 当前状态

渲染器已进入拆分过渡阶段：

- `PixiRenderer.ts`：轻量对外门面，保持旧导入路径兼容。
- `PixiRendererCore.ts`：当前主实现，后续继续拆分为更小系统。
- `utils/markdown.ts`：Markdown 文本解析、HTML 转换和 HTML sanitize。
- `utils/color.ts`：颜色混合和 CSS 颜色格式化。
- `utils/uiMetrics.ts`：UI 尺寸类型。
- `RenderNodeCache.ts`：渲染节点缓存容器，并有 smoke test 覆盖。

## 后续拆分方向

- `PixiAppHost`：Pixi Application 创建、销毁、resize、canvas 挂载。
- `TextureLoader`：纹理和 data URL 缓存。
- `SceneRenderSystem`：backdrop/world/ui/overlay 绘制。
- `ViewportCameraController`：平移、缩放和 camera follow。
- `GizmoController`：选择框、移动、缩放、旋转。
- `RuntimePreviewController`：播放态 scene copy、tick 和 scene switch。
- `HtmlUiOverlay`：DOM UI 的创建、布局和事件。

## 验证

- `PixiRenderer.ts` 已降为门面文件。
- `tests/renderNodeCache.test.ts` 固定同 key/同 signature 复用、signature 变化失效、inactive node prune 行为。
