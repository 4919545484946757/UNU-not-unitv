# UI 面板拆分

[English](UI_PANEL_ARCHITECTURE.en-US.md) | 中文

更新时间：`2026-05-16`

## 目标

Phase 5 的目标是把大型面板从“所有逻辑塞进一个 SFC”逐步拆成小组件与 composable。这样可以降低回归风险，让 Inspector、脚本编辑器和 Timeline 的功能更容易测试、维护和复用。

## 当前进展

- `InspectorPanel.vue`
  - 已抽出 `ScriptInspector.vue`。
  - 已抽出 `TransformInspector.vue`。
  - 已抽出 `SpriteInspector.vue`。
  - 已抽出 `ColliderInspector.vue`。
  - 已抽出 `BackgroundInspector.vue`。
  - 已抽出 `AudioInspector.vue`。
  - 已抽出 `CameraInspector.vue`。
  - 已新增 `componentFieldSchema.ts`，由 schema 管理 Inspector 字段更新，减少 `Record<string, number>` 等强转。
- `ScriptEditorPanel.vue`
  - 已抽出 `FindReplaceBar.vue`。
  - 已抽出 `useSyntaxHighlight.ts`，让右侧编辑器和后续独立窗口编辑器共享高亮逻辑。
- `TimelinePanel.vue`
  - 已抽出 `FrameList.vue`。

## 后续顺序

1. 继续拆 Inspector：`AnimationInspector`、`TilemapInspector`、`UiInspector`，并把重复的 Inspector 子组件样式沉淀成共享样式。
2. 继续拆脚本编辑器：`CodeEditorSurface`、`useExternalCodeEditorSync`。
3. 继续拆 Timeline：`StateMachineEditor`、`AnimationAssetActions`。
4. 将 Inspector schema 扩展为可渲染字段定义，让表单字段最终能由 schema 驱动 UI。

## 验证

- `npm run typecheck`
- `npm run test`
- `npm run build`
