# UNU 架构说明：领域模型、Scene Store 与可测试操作层

[English](ARCHITECTURE.en-US.md)

更新时间：`2026-05-16`

## 当前目标

UNU 正在把场景编辑核心从“Pinia 直接持有可变 class 实例并承载大量业务逻辑”逐步迁移到更稳定的领域模型：

- `SceneData`、`EntityData`、`ComponentData` 作为可序列化 DTO。
- `sceneSerializer` 提供 DTO 读写能力，同时保留 `sceneToData` / `hydrateScene` / `serializeScene` / `deserializeScene` 兼容运行时 class 实例。
- `SceneOperations` 提供可脱离 Vue/Pinia 单测的纯函数操作。
- `scene.ts` 保持为轻量 Pinia store，负责状态、历史、状态消息和调用外部操作。

## 2026-05-16 进展

- `sceneActions.ts` 继续拆分为：
  - `sceneCatalogActions.ts`：场景集合、当前场景、场景文件绑定、DTO 镜像同步。
  - `sceneHistoryActions.ts`：历史、撤回/恢复、自动保存。
  - `sceneFolderActions.ts`：场景文件树中的类文件夹创建、重命名、移动、复制、删除。
  - `sceneEntityActions.ts`：实体创建、复制、删除、图层移动、实体 JSON 应用和示例场景切换。
  - `sceneActionUtils.ts`：Prefab 树、场景文件夹、脚本路径、组件修复等工具函数。
- `scene.ts` state 新增 `sceneDataList` 与 `currentSceneData`，作为从 `Scene` 实例迁移到 `SceneData` 的同步镜像。
- 新增 `syncSceneDataState()` 和 `replaceScenesFromData()`，当前用于双写/迁移桥，后续可以逐步让 UI 和操作层读取 DTO。
- 新增 `tests/sceneStoreData.test.ts`，固定 `bootstrap` 和实体新增后的 DTO 镜像同步行为。

## 为什么优先 DTO

Vue/Pinia 会对 state 进行响应式代理。把 `Scene`、`Entity`、`Component` class 实例直接放进 store 时，TypeScript 容易把它们推断成“被 unwrap 的普通对象”，从而出现 private 方法、private 字段、实例方法兼容性问题。

DTO 方案的优势：

- 状态天然可序列化，便于保存、历史记录、撤回/恢复、导出。
- 编辑操作可以是纯函数，更容易单测和回归检查。
- Pinia 不再需要理解复杂 class 实例。
- 运行时仍可在边界处 `hydrate` 成 class 实例供 Pixi/ScriptRuntime 使用。

## 关键文件

- `src/engine/scene/sceneData.ts`：定义 `SceneData`、`EntityData`、`ComponentData`。
- `src/engine/scene/sceneOperations.ts`：提供新增/删除/复制实体、图层移动、组件字段更新、场景文件夹操作等纯函数。
- `src/engine/serialization/sceneSerializer.ts`：提供 DTO 序列化与 class hydrate 边界。
- `src/stores/scene.ts`：轻量 Pinia store。
- `src/stores/sceneActions.ts`：组合入口，以及脚本同步、场景保存/打开、Prefab、运行时场景等剩余编辑器集成 action。

## 构建产物策略

`dist/` 和 `dist-electron/` 是构建产物，不应入库。

```bash
npm run build
```

发布或安装包构建继续使用：

```bash
npm run dist:win:installer
```

## 机器检查

```bash
npm run typecheck
npm run test
npm run build
```

当前基础测试覆盖：

- `sceneSerializer` round-trip。
- `prefabSerializer` round-trip。
- 资源路径 normalize/rewrite。
- `ScriptRuntime` hook 调用与错误定位。
- `InputState` action map merge。
- `SceneOperations` 脱离 Vue/Pinia 的纯函数操作。
- Scene Store 的 `SceneData` 镜像同步。

## 后续迁移方向

1. 让 Inspector/SceneTree 等编辑面板逐步读取 `currentSceneData`。
2. 将实体/文件夹/图层操作改为调用 `SceneOperations` 修改 DTO。
3. Renderer/Runtime 入口按需调用 `hydrateScene(sceneData)`。
4. 删除对 class 实例字段公开化的临时兼容需求。
5. 继续把 `sceneActions.ts` 拆成 `sceneEntityActions`、`sceneFolderActions`、`scenePrefabActions`、`scenePersistenceActions` 等模块。
