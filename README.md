# UNU Engine Starter

中文 | [English](README.en-US.md)

UNU Engine Starter 是一个基于 `Vue 3 + Pinia + PixiJS 8 + Electron` 的桌面 2D 游戏编辑器与运行时。当前版本聚焦“能实际制作、预览、导出 2D 游戏”的闭环：项目启动器、场景编辑、资源管理、组件系统、脚本热重载、动画状态机、Tilemap、HTML UI、物品/背包、碰撞触发器、Console、性能面板、Prefab、Web 导出和 Windows 打包。

- 文档更新时间：`2026-05-19`
- 项目版本：`0.5.0`
- 当前定位：桌面端 2D 游戏编辑器 + 可导出 Web 游戏运行包

## 文档导航

- [新手教程](docs/BEGINNER_TUTORIAL.zh-CN.md) / [English](docs/BEGINNER_TUTORIAL.en-US.md)
- [Console 命令文档](docs/CONSOLE_COMMANDS.zh-CN.md) / [English](docs/CONSOLE_COMMANDS.en-US.md)
- [脚本 API 提示文档](docs/SCRIPT_API.zh-CN.md) / [English](docs/SCRIPT_API.en-US.md)
- [Web 导出能力说明](docs/EXPORT_WEB.zh-CN.md) / [English](docs/EXPORT_WEB.en-US.md)
- [架构与领域模型](docs/ARCHITECTURE.zh-CN.md) / [English](docs/ARCHITECTURE.en-US.md)
- [样例与资源治理](docs/SAMPLE_GOVERNANCE.zh-CN.md) / [English](docs/SAMPLE_GOVERNANCE.en-US.md)
- [路线图](docs/ROADMAP.zh-CN.md) / [English](docs/ROADMAP.en-US.md)

## 当前核心能力

- 启动器：历史项目、示例项目、新建项目窗口、重命名、删除、返回开始界面。
- 项目：新建项目写入同名文件夹，另存为会复制脚本、场景、贴图、音频、HTML UI、物品注册表并修复引用。
- 场景：多场景编辑、场景列表、场景状态保留/重置、Loading 层、出生点和出入口绑定。
- Scene 树：实体列表视图与多层级文件树视图，支持类文件夹嵌套、展开折叠、拖拽、复制/粘贴、删除、重命名、Shift 多选和批量操作。
- Scene View：选择、Shift 多选、移动、缩放、角度制旋转、中键平移、滚轮缩放、播放态调试层开关。
- Inspector：组件折叠、添加/删除自定义组件、Transform/Sprite/Collider/Camera/Background/Audio/UI/Inventory/Script 等组件编辑。
- Tilemap：CSV 与图形化子窗口编辑、滚轮缩放、中键拖动画布、多选、批量赋值、Tile 值到材质绑定。
- 脚本：项目级 ScriptRuntime/InputState/AudioRuntime，项目级共享脚本，场景级可选脚本，热重载，错误定位到资源树文件和行号。
- 运行时：生命周期 hook、碰撞/触发器、实体碰撞层与矩阵、输入映射、键位改键、音频运行时、性能采样开关。
- UI：Text、Markdown、Button、Slider、HTML/DOM Overlay、iframe 交互桥、自动尺寸、百分比宽高、菜单层级和按钮脚本绑定。
- 资源：资源树/素材箱、图片预览、文件夹打开、拖拽移动、复制/删除/重命名、引用自动同步、文件操作撤回/恢复。
- Prefab：实例同步源更新、Variant 可视化差异、嵌套 Prefab。
- Console：日志折叠、状态日志白名单、命令输入、性能页签、FPS/渲染/脚本/碰撞等阶段耗时。
- 示例：2D Action Demo 与 Snake Demo 均可播放，2D 示例包含背包/容器、物品、护甲、枪械、Enemy HP、场景切换与底部物品栏预览。
- 导出：Web 游戏导出会复制 assets/scenes/prefabs，生成 project.json、export-report.json 和本地 HTTP 启动脚本，打包版从 resources/dist 导出。

## 开发命令

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run assets:audit
npm run build
npm run dist:win:installer
```

`npm run dev` 会同时启动 Vite、Electron main/preload watch 构建和 Electron 应用；`dist/` 与 `dist-electron/` 是构建产物，不建议入库。

## Web 导出确认

0.5.0 已确认 Web 导出会包含当前更新内容：多场景、嵌套场景文件树数据、项目脚本、场景级脚本、HTML UI、物品注册表、物品脚本、音频、图片、Prefab 和导出报告。导出后请运行 `PLAY_GAME.bat`，不要直接双击 `index.html`。
