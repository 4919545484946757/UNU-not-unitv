# Runtime 架构拆分

[English](RUNTIME_ARCHITECTURE.en-US.md) | 中文

更新时间：`2026-05-16`

## 目标

Phase 4 的目标是让通用运行时和示例玩法解耦。通用运行时只负责脚本生命周期、项目脚本加载、上下文 API、碰撞/触发器分发、场景命令队列等引擎能力；`sample-2D-shooting`、`Snake` 等项目的具体玩法逻辑应放在各自项目目录的脚本中。

## 当前拆分

- `ScriptRuntime.ts`：对外入口门面，保持旧导入路径兼容。
- `ScriptRuntimeCore.ts`：运行时协调层，负责生命周期、场景更新、hook 调用、碰撞事件分发和 ctx API 组装。
- `ProjectModuleLoader.ts`：统一 TS/JS 转译、执行和编译错误定位。
- `RuntimeCommandQueue.ts`：集中管理 `switchScene`、`pause/resume/reset/exit` 等运行时命令。
- `EntityFactory.ts`：暂存 bullet/enemy 等示例实体构造逻辑，后续可继续下沉到项目脚本或可配置 Prefab。

## 项目脚本

`Sample-project-list/sample-2D-shooting/assets/scripts/ScriptRuntime.ts` 已承载核心玩法脚本注册：

- `assets/scripts/player-input.js`
- `assets/scripts/bullet-projectile.js`
- `assets/scripts/enemy-chase-respawn.js`
- `custom://interaction`

这些脚本由项目资源树驱动，可以在编辑器脚本面板或独立窗口中编辑，并通过热重载进入预览运行。

## 安全说明

当前 `ProjectModuleLoader` 使用 `new Function` 执行本地项目脚本。现阶段它被视为“可信本地项目代码”，适合编辑器原型和本地开发。后续更稳的方案是把脚本执行迁移到隔离 Worker、独立 renderer 或受限 VM，并通过白名单能力对象注入 `ctx.api`。

## 测试

- `tests/runtime.test.ts` 覆盖 hook 调用、控制台输出、运行时错误定位和项目脚本编译错误定位。
- `npm run typecheck` 保证 TypeScript/Vue 类型护栏。
- `npm run test` 保证基础运行时、序列化、路径重写和缓存行为。
