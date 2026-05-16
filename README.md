# UNU Engine Starter

中文 | [English](README.en-US.md)

UNU Engine Starter 是一个基于 `Vue 3 + Pinia + PixiJS 8 + Electron` 的桌面 2D 游戏编辑器与运行时示例工程。它覆盖项目启动器、场景编辑、资源管理、组件系统、项目级脚本、动画状态机、Tilemap、UI、音频、调试控制台、性能面板、Prefab、Web 导出和 Windows 打包等工作流。

- 文档更新时间：`2026-05-16`
- 项目版本：`0.2.0`
- 当前定位：桌面端 2D 游戏编辑器 + 可导出 Web 游戏运行包

## 文档导航

- [新手教程](docs/BEGINNER_TUTORIAL.zh-CN.md) / [English](docs/BEGINNER_TUTORIAL.en-US.md)
- [Console 命令文档](docs/CONSOLE_COMMANDS.zh-CN.md) / [English](docs/CONSOLE_COMMANDS.en-US.md)
- [脚本 API 提示文档](docs/SCRIPT_API.zh-CN.md) / [English](docs/SCRIPT_API.en-US.md)
- [架构与领域模型](docs/ARCHITECTURE.zh-CN.md) / [English](docs/ARCHITECTURE.en-US.md)
- [Renderer 架构拆分](docs/RENDERER_ARCHITECTURE.zh-CN.md) / [English](docs/RENDERER_ARCHITECTURE.en-US.md)
- [Runtime 架构拆分](docs/RUNTIME_ARCHITECTURE.zh-CN.md) / [English](docs/RUNTIME_ARCHITECTURE.en-US.md)
- [UI 面板拆分](docs/UI_PANEL_ARCHITECTURE.zh-CN.md) / [English](docs/UI_PANEL_ARCHITECTURE.en-US.md)
- [样例与资源治理](docs/SAMPLE_GOVERNANCE.zh-CN.md) / [English](docs/SAMPLE_GOVERNANCE.en-US.md)
- [路线图](docs/ROADMAP.zh-CN.md) / [English](docs/ROADMAP.en-US.md)
- [小优化计划](docs/OPTIMIZATION_PLAN.zh-CN.md) / [English](docs/OPTIMIZATION_PLAN.en-US.md)

## 当前核心能力

- Launcher：历史项目、示例项目、新建项目、重命名、删除、返回开始界面。
- 项目系统：新建项目会创建同名目录；另存为会复制脚本、贴图、场景、资源并自动修复引用路径。
- 场景系统：多场景编辑、场景切换、场景状态保留/重置、出生点和出入口绑定。
- Scene 树：实体列表视图和多层级文件树视图，支持类文件夹、嵌套、拖拽、复制/粘贴、删除、重命名和 Shift 多选。
- Inspector：组件编辑、碰撞箱相对偏移、贴图偏移、颜色、脚本配置、Tilemap 材质绑定。
- Scene View：选择、移动、缩放、角度制旋转、平移、缩放、播放态调试显示和多选批量操作。
- 脚本系统：项目级共享脚本、场景级可选脚本、热重载、错误定位、生命周期 hook、碰撞/触发器 hook、控制台输出。
- UI 系统：Text、Markdown、HTML/DOM Overlay、Button 脚本绑定、菜单层级、自动尺寸、暂停菜单和改键菜单示例。
- Runtime：输入映射、音频运行时、碰撞层/碰撞矩阵、Trigger、Loading 层、性能采样开关。
- 资源系统：资源树、素材箱、图片预览、文件夹打开、拖拽移动、复制/删除/重命名、引用自动同步、撤回/恢复。
- Prefab：实例同步源更新、Variant 可视化差异、Prefab 嵌套。
- 示例项目：`2D Action Demo` 使用 `Sample-project-list/sample-2D-shooting`，`Snake` 使用 `Sample-project-list/snake`。
- 导出与打包：支持 Web 游戏导出、Windows Electron 程序打包，并避免打包环境中的绝对路径资源丢失。

## 开发命令

```bash
npm install
npm run dev
npm run dev:electron
npm run start:electron
npm run typecheck
npm run test
npm run assets:audit
npm run build
```

`npm run dev` 会同时启动 Vite、Electron main/preload watch 构建和 Electron 应用；不再依赖仓库中预先提交的 `dist-electron/`。

## 质量护栏

- `npm run typecheck` 使用 `vue-tsc --noEmit`。
- `npm run test` 使用 `vitest`，覆盖 scene/prefab 序列化、资源路径重写、ScriptRuntime hook 与错误定位、InputState action map merge、RenderNodeCache smoke test。
- `npm run assets:audit` 检查样例与公共资源中的重复媒体 hash。
- 构建产物 `dist/`、`dist-electron/` 不建议入库，保持源码仓库轻量。
