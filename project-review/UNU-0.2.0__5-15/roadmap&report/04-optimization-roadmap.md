# 04. 降低项目复杂度的优化路线

## 总体策略

不要一上来“大拆大改”。这个项目已经有很多功能交织在一起，最稳的路线是：

1. 先补护栏，让重构有回归信号。
2. 再立边界，让新代码有地方放。
3. 然后拆巨型文件，每次只拆一个职责。
4. 最后清资源和样例，避免路径/导出被误伤。

## Phase 0：建立护栏

目标：让项目能被机器持续检查。

- 在 `package.json` 增加 `typecheck: vue-tsc --noEmit`。
- 先修复现有类型错误，尤其是 Pinia reactive class 实例导致的 `Scene` 类型不兼容。
- 补最小测试栈，建议 `vitest` + `happy-dom/jsdom`：
  - `sceneSerializer` round-trip。
  - `prefabSerializer` round-trip。
  - 资源路径 normalize/rewrite。
  - `ScriptRuntime` hook 调用与错误定位。
  - `InputState` action map merge。
- 加几个 fixture：
  - 最小 scene。
  - 含 Prefab 的 scene。
  - 含 Tilemap/Animation/UI/Script 的 scene。
- 明确构建产物策略：`dist/`、`dist-electron/` 是否入库；建议最终都不入库。

验收标准：

- `npm run typecheck` 通过。
- 基础单测通过。
- 新增/移动资源时有测试覆盖路径引用更新。

## Phase 1：封装边界

目标：把 IPC、路径、项目模式从业务代码里抽出来。

- 新增 `src/services/unuClient.ts`，集中封装 `window.unu`：
  - 统一可用性检查。
  - 统一错误消息。
  - 统一返回类型。
- 新增 `src/constants/project.ts`：
  - `SAMPLE_PROJECT_ROOT`
  - `DEFAULT_SCENE_NAME`
  - `RUNTIME_SCRIPT_PATHS`
  - `ProjectMode`
- 新增 `src/utils/path.ts`：
  - `normalizeAssetPath`
  - `joinAssetPath`
  - `isInsideProjectPath`
  - `getFileName`
- 将 `assets.ts` 中直接 IPC 调用迁移到 service，再让 store 调 service。
- 将 `PixiRenderer` 中的 `useProjectStore/useAssetStore/useSceneStore` 改为构造参数或回调接口。

验收标准：

- `rg "window\\.unu" src` 数量明显下降，理想上只剩 `unuClient.ts` 和少数启动点。
- `src/engine/**` 不再直接 import `src/stores/**`。

## Phase 2：整理领域模型与 Scene Store

目标：解决类型系统与状态管理的核心矛盾。

可选方案：

- 方案 A：Pinia 只存 plain DTO，业务层临时 hydrate 成 `Scene/Entity/Component` 类。
- 方案 B：继续用类实例，但对 `Scene` 等对象使用 `markRaw/shallowRef`，避免 Vue 深度代理。

建议优先方案 A，长期更稳：

- 定义 `SceneData`、`EntityData`、`ComponentData`。
- `sceneSerializer` 改成 DTO 输入输出。
- `SceneOperations` 提供纯函数：
  - add/remove/duplicate entity。
  - move layer。
  - update component field。
  - folder operations。
- `scene.ts` 只负责状态、历史、调用 operation、发状态消息。

验收标准：

- 不再因 `Scene.syncZIndices` private 方法触发类型错误。
- `scene.ts` 行数降到 700 行以内。
- Scene 操作可以脱离 Vue 做单测。

## Phase 3：拆 `PixiRenderer`

目标：让渲染、编辑交互、运行态协调分开。

建议拆分：

- `PixiAppHost`：创建/销毁 Pixi Application、resize、canvas 挂载。
- `SceneRenderSystem`：根据 Scene 绘制 backdrop/world/ui/overlay。
- `TextureLoader`：纹理和 data URL 缓存。
- `RenderNodeCache`：sprite/tilemap/ui/html UI 节点缓存。
- `ViewportCameraController`：平移、缩放、camera follow。
- `GizmoController`：选择框、移动、缩放。
- `RuntimePreviewController`：播放态 scene copy、runtime tick、scene switch。
- `HtmlUiOverlay`：DOM UI 的创建、布局和事件。

拆分顺序：

1. 先抽纯工具：颜色、Markdown、HTML sanitize、UI metrics。
2. 再抽资源加载和缓存。
3. 再抽 camera/gizmo。
4. 最后抽 runtime preview。

验收标准：

- `PixiRenderer.ts` 降到 600 行以内。
- renderer 不直接调用 Pinia store。
- 同一 scene 连续 render 的缓存行为有 smoke test 或 Playwright 手动验证记录。

## Phase 4：拆 `ScriptRuntime`

目标：通用运行时和样例玩法解耦。

建议拆分：

- `ProjectModuleLoader`：统一 TS/JS transpile、执行、错误定位。
- `ScriptRegistry`：builtin/project script 合并和 path alias。
- `ScriptContextFactory`：生成 `ctx.api`。
- `CollisionSystem`：碰撞 pair、enter/stay/exit。
- `EntityFactory`：bullet/enemy 等样例 entity 构造先迁出 runtime。
- `RuntimeCommandQueue`：scene switch、pause/resume/reset/exit。

关键动作：

- 把 `builtin://player-input`、`enemy-chase-respawn`、`bullet-projectile` 等迁到 `Sample-project-list` 项目脚本。
- Runtime 保留少量真正通用的能力，例如 hook 生命周期、碰撞分发、ctx API。
- 给 `new Function` 增加明确的安全说明和未来 sandbox 方案。

验收标准：

- `ScriptRuntime.ts` 降到 800 行以内。
- 样例玩法逻辑不再出现在通用 runtime。
- 项目脚本编译错误有稳定测试。

## Phase 5：拆 UI 面板

目标：让面板从“所有逻辑塞一个 SFC”变成小组件 + composable。

优先拆：

- `InspectorPanel.vue`
  - `TransformInspector`
  - `SpriteInspector`
  - `ColliderInspector`
  - `AnimationInspector`
  - `ScriptInspector`
  - `TilemapInspector`
  - `UiInspector`
  - `AudioInspector`
- `ScriptEditorPanel.vue`
  - `CodeEditorSurface`
  - `FindReplaceBar`
  - `useSyntaxHighlight`
  - `useExternalCodeEditorSync`
- `TimelinePanel.vue`
  - `FrameList`
  - `StateMachineEditor`
  - `AnimationAssetActions`

验收标准：

- 单个 SFC 尽量小于 500 行。
- 表单字段更新不再靠大量 `Record<string, number>` 强转。
- 组件 schema 能驱动 Inspector 字段。

## Phase 6：样例与资源治理

目标：减少重复资产，统一样例工程来源。

- 将 `Sample-project-list/` 定义为样例工程唯一真源。
- 每个样例工程提供 `project.json` 和 manifest。
- `assets-for-sample/` 只保留原始素材或删除，不能和 sample 工程双写。
- `public/assets/` 由脚本生成，或只保留导出 runtime 真正需要的公共资源。
- `sample-project` 字符串哨兵替换为 project mode。
- 修正大小写问题：`Sample-project-list/Snake` -> `Sample-project-list/snake`。

验收标准：

- 重复媒体 hash 组大幅减少。
- 新样例只需新增一个目录和 manifest，不需要改多处硬编码。

## Phase 7：打包与导出清理

目标：让开发、构建、发布流程可重复。

- Electron dev 使用 watch 构建 main/preload，避免依赖已追踪的 `dist-electron`。
- `dist-electron/` 加入 `.gitignore` 并从 Git 里移除追踪。
- `electron-builder` 配置拆出独立文件，例如 `electron-builder.json` 或 `builder.config.ts`。
- 导出逻辑从 `electron/main.ts` 移到 `electron/services/exportGame.ts`。
- 为导出产物生成稳定 report，并在测试中校验关键文件存在。

验收标准：

- fresh clone 后 `npm install && npm run dev` 能启动。
- `npm run build` 不依赖仓库中的旧构建产物。
- 导出 Web 游戏的启动脚本和资源复制可测试。

## 推荐执行顺序

1. 修 typecheck。
2. 封装 `window.unu`。
3. 修 `sampleCatalog` 大小写和路径常量。
4. 拆 `electron/main.ts` 的 IPC 注册与 service。
5. 处理 `Scene`/Pinia 类型模型。
6. 拆 `PixiRenderer` 的纯工具和资源缓存。
7. 拆 `ScriptRuntime` 的 module loader 和 collision。
8. 拆 `InspectorPanel`。
9. 清理重复资源和构建产物追踪。

