# UNU Engine Starter

中文 | [English](README.en-US.md)

UNU Engine Starter 是一个基于 `Vue 3 + Pinia + PixiJS 8 + Electron` 的桌面 2D 游戏编辑器与运行时示例工程。它的目标不是只做一个演示壳子，而是逐步形成一个可以真正支撑 2D 游戏开发的轻量引擎：项目管理、场景编辑、资源管理、组件系统、脚本运行时、动画状态机、Tilemap、UI、音频、打包与 Web 导出都在同一套工作流里闭环。

- 文档更新时间：`2026-05-15`
- 项目版本：`0.2.0`
- 当前定位：桌面端 2D 游戏编辑器 + 可导出 Web 游戏运行包

## 文档导航

- [新手教程](docs/BEGINNER_TUTORIAL.zh-CN.md) / [English](docs/BEGINNER_TUTORIAL.en-US.md)
- [Console 命令文档](docs/CONSOLE_COMMANDS.zh-CN.md) / [English](docs/CONSOLE_COMMANDS.en-US.md)
- [脚本 API 提示文档](docs/SCRIPT_API.zh-CN.md) / [English](docs/SCRIPT_API.en-US.md)
- [???????](docs/ARCHITECTURE.zh-CN.md) / [English](docs/ARCHITECTURE.en-US.md)
- [路线图](docs/ROADMAP.zh-CN.md) / [English](docs/ROADMAP.en-US.md)
- [小优化计划](docs/OPTIMIZATION_PLAN.zh-CN.md) / [English](docs/OPTIMIZATION_PLAN.en-US.md)

## 当前核心能力

### 项目与启动器

- 启动后先进入 Launcher 初始界面。
- 支持打开历史项目、本地项目、示例项目。
- 支持新建项目，并在指定目录下创建同名项目文件夹。
- 支持重命名、删除项目。
- 示例项目列表已独立出来，当前包含 `2D Action Demo`（由 `Sample-project-list/sample-2D-shooting` 提供）和 `Snake`（`Sample-project-list/Snake`）。
- 打开项目时会自动扫描和修复场景列表、资源路径与缺失的项目运行时脚本。
- 示例项目在打包版中会从 `resources/Sample-project-list` 复制到用户数据目录，避免直接修改安装目录内资源。

### 编辑器工作流

- 场景树：实体选择、复制、删除、重命名、修改 ID、新建实体。
- Scene 文件树结构支持类文件夹：可选中、单击展开/折叠、新建、删除、重命名、复制/粘贴、实体/类拖拽移动。
- 类文件夹支持嵌套并保存到场景文件，脚本可通过 `ctx.api.findEntitiesByClass('Gameplay/Actors')` 检索该类及子类实体。
- 示例项目 `sample-2D-shooting` 与 `Snake` 已整理场景文件树层级，便于学习项目结构。
- 资源树：刷新、导入图片、导入音频、折叠、打开所在目录、打开文本文件、预览图片。
- 资源树支持文件/文件夹新建、重命名、复制、删除、拖拽移动，并支持 `Ctrl/Cmd + Z` / `Ctrl/Cmd + Y` 撤回和恢复文件操作。
- 资源重命名或移动后会自动同步场景、Prefab、动画、图集等 JSON 资源引用。
- Inspector：编辑 Transform、Sprite、Collider、Animation、Script、Camera、Background、Interactable、Audio、UI、Tilemap 等组件。
- 中央 Scene View：编辑视图、播放预览、暂停、继续、停止。
- 顶部工具栏：按类别组织项目、场景、实体、工具、播放和导出操作。
- 状态提示已集成到 Console，可通过日志过滤控制显示类别。
- Console 提供 `Log` 和 `Performance` 两个页签，性能页支持默认关闭的详细阶段采样。
- 非播放态支持视图平移工具，播放态禁用缩放/位移等编辑工具，避免误改场景。

### 运行时与游戏功能

- 播放预览支持中途暂停和继续。
- 播放态和编辑态选择逻辑分离。
- 播放态默认隐藏碰撞箱、边界框、Tilemap 网格、实体名称、交互提示文本等调试信息。
- 播放按钮旁提供调试播放开关，启用后显示调试信息。
- 输入系统支持键盘、鼠标、动作映射、编辑器改键窗口和项目脚本内改键。
- 示例中 Player 支持：
  - `W/A/S/D` 八方向移动，斜向移动会归一化速度。
  - 按住 `Shift` 疾跑，速度切换为 `280`。
  - 疾跑时行走动画以 2 倍速播放。
  - 鼠标左键射击，子弹沿 Player 到鼠标点击位置的射线方向飞行。
  - 子弹超过 Player 一定距离后自动销毁。
- Enemy 示例逻辑已迁移到项目内脚本，不再写死在通用编辑器运行时里。
- Enemy 可追踪 Player，碰到子弹后销毁并随机位置重生。
- 碰撞检测支持 `isBlockedRect`，Enemy 和 Player 使用统一阻挡逻辑。
- 交互系统支持右键点击可交互实体，并按交互距离判断是否触发。
- Door 示例通过脚本切换场景。
- Chest 示例通过脚本循环切换材质颜色。`Snake` 示例提供经典贪吃蛇玩法、Esc 菜单、游戏结束菜单、难度切换和重置快捷键。

### 项目内脚本运行时

UNU 当前已经从“编辑器内置固定玩法逻辑”转向“每个项目独立拥有运行时脚本”的模式：

- 每个项目可以拥有自己的 `assets/scripts/ScriptRuntime.ts`。
- 每个项目可以拥有自己的 `assets/scripts/InputState.ts`。
- 每个项目可以拥有自己的 `assets/scripts/AudioRuntime.ts`。
- 示例项目的 Player、Enemy、Bullet、Door、Chest、背景切换等玩法逻辑由项目资源树内脚本驱动。
- 脚本编辑器支持打开、编辑和保存 `.ts`、`.js`、`.json`、`.anim.json` 等文本资源。
- 脚本编辑器支持代码高亮、横向滚动、查找/替换和独立窗口编辑。`Ctrl/Cmd + S` 保存后会触发项目脚本热重载。

### Console 与性能监测

- Console `Log` 页签支持日志、错误、状态信息和调试命令输入。
- 常用调试命令包括 `help`、`fps`、`play`、`pause`、`stop`、`debug`、`entities`、`select`、`inspect`、`get`、`set`、`tp`、`remove`。
- Console `Performance` 页签显示 FPS、实体数量和可选详细性能指标。
- 详细性能采样默认关闭，打开后显示 Frame Time、Render、Script、Collision、Animation、Audio Sync、Camera 等阶段耗时。
- 项目脚本可以通过 `ctx.api.log`、`ctx.api.warn`、`ctx.api.error` 输出到 Console。

### 组件系统

当前内置组件包括：

- `Transform`：位置、旋转、缩放、尺寸等基础变换。
- `Sprite`：图片、颜色、锚点、翻转、像素风采样。
- `Collider`：碰撞箱，支持相对偏移和尺寸设置。
- `Animation`：帧动画、状态机、状态切换条件、exit time。
- `Script`：绑定项目内脚本逻辑。
- `Camera`：跟随实体、缩放、边界。
- `Background`：背景图片、跟随相机、脚本切换。
- `Interactable`：交互距离、交互动作、提示框。
- `Audio`：音频播放与运行时控制基础。
- `UI`：文本、按钮、Slider、Markdown、HTML Overlay、父子层级和内容自适应尺寸。
- `Tilemap`：瓦片层、碰撞层、数值到材质映射。

### Tilemap

- 支持 Tiles CSV 与 Collision CSV。
- 支持 Tile 值到贴图材质的绑定。
- Inspector 中提供 Tile 值输入框和绑定选中图片功能。
- 支持 Electron 子窗口图形化编辑 Tilemap。
- 图形化编辑器支持：
  - 正方形紧凑格子。
  - 鼠标滚轮缩放。
  - 鼠标中键拖动画面。
  - 点击格子后直接键盘输入数字修改值。
  - 长按框选多选。
  - `Shift + 左键划过` 多选。
  - 多选后统一修改数值。
  - 右侧材质列表显示缩略图和快速绑定按钮。

### 动画系统

- 支持 `.anim.json` 动画资源。
- 支持状态机式动画切换。
- 支持 Idle、Run、Attack 等常见状态。
- 支持攻击状态结束后回到移动或待机状态，避免快速输入导致卡死。
- 支持移动方向驱动贴图翻转，例如 Player 向右移动时水平翻转。
- 示例中使用不同颜色/贴图表现 Player 状态。
- 像素风贴图使用 nearest sampling，减少模糊。

### Prefab

- 支持将实体保存为 Prefab。
- 支持从资源文件实例化 Prefab。
- 支持 Prefab Variant 保存。
- 支持将源 Prefab 更新同步到当前实例或全部同源实例。
- 支持 Variant / 实例差异可视化。
- 支持嵌套 Prefab 的源路径保留，便于父子 Prefab 独立同步。

### UI 系统

- 支持 UI Text、Button、Slider、HTML UI 实体创建。
- 支持多行文本渲染。
- Inspector 文本编辑框支持多行输入。
- 支持基础 Markdown 渲染。
- 支持 HTML-in-Canvas 的 DOM Overlay 实现，用于更复杂 UI 排版。
- 支持 UI 父子层级、相对视窗定位、内容自适应宽高和按钮脚本事件绑定。

### 资源与示例素材

- 示例项目已整理像素风贴图资源到项目 assets 目录。
- 支持图片资源双击或右键弹窗预览。
- 图片预览弹窗支持滚轮缩放、左键拖拽、鼠标中键拖拽、边缘调整大小。
- 背景图片支持完整覆盖视图、无拉伸跟随摄像机移动。
- 示例中主场景使用 `background-img.png`，切换到设施场景后使用 `background-facility.png`。

### 导出与打包

- 支持从编辑器导出 Web 游戏。
- 导出的 Web 游戏会复制项目资源、场景、Prefab 和前端运行时代码。
- 导出目录会包含：
  - `index.html`
  - `assets/`
  - `scenes/`
  - `prefabs/`
  - `project.json`
  - `PLAY_GAME.bat`
  - `PLAY_GAME.ps1`
  - `EXPORT_README.md`
  - `export-report.json`
- 不能直接用 `file://` 打开导出的 `index.html`，请使用生成的 `PLAY_GAME.bat` 启动本地 HTTP 服务。
- Windows 打包支持：
  - NSIS 安装包。
  - Portable 便携版。
  - `win-unpacked` 解压目录。
- 打包配置已处理：
  - 应用图标写入主程序 exe。
  - 安装器图标和卸载器图标。
  - `dist` 额外释放到 `resources/dist`，供打包版 Web 导出复制使用。
  - 示例项目和素材作为 `extraResources` 随应用分发。

## 快速开始

### 环境要求

- Node.js `18+`，建议 `20+`
- npm `9+`
- Windows 桌面端开发建议使用 PowerShell

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建前端与 Electron 主进程

```bash
npm run build
```

### 打包 Windows 解压版

```bash
npm run dist:win
```

### 打包 Windows 安装包与便携版

```bash
npm run dist:win:installer
```

打包产物默认输出到 `release-fixed/`。

## 常用快捷键

- `Ctrl/Cmd + S`：保存当前场景。
- `Ctrl/Cmd + Shift + S`：另存当前场景。
- `Ctrl/Cmd + Z`：撤销。
- `Ctrl/Cmd + Shift + Z` 或 `Ctrl/Cmd + Y`：重做。
- `Ctrl/Cmd + D`：复制实体。
- `Delete / Backspace`：删除实体。
- `Q / W / E`：选择、移动、缩放工具。
- `P`：播放、暂停或继续。
- `Ctrl/Cmd + Space`：停止播放。
- `W/A/S/D`：示例项目中控制 Player 移动。
- `Shift`：示例项目中 Player 疾跑。
- 鼠标左键：示例项目中射击。
- 鼠标右键：示例项目中与可交互实体交互。

## 目录结构

```txt
.
|-- electron/
|   |-- main.ts
|   `-- preload.ts
|-- src/
|   |-- components/
|   |-- engine/
|   |-- stores/
|   `-- main.ts
|-- docs/
|   |-- BEGINNER_TUTORIAL.zh-CN.md
|   |-- BEGINNER_TUTORIAL.en-US.md
|   |-- OPTIMIZATION_PLAN.zh-CN.md
|   |-- OPTIMIZATION_PLAN.en-US.md
|   |-- ROADMAP.zh-CN.md
|   `-- ROADMAP.en-US.md
|-- Sample-project-list/
|   |-- sample-2D-shooting/
|   `-- Snake/
|-- sample-project/
|-- assets-for-sample/
|-- scripts/
|   `-- afterPackIcon.cjs
|-- vite.config.ts
|-- vite.electron.config.ts
`-- package.json
```

## Electron API

类型定义见 `src/vite-env.d.ts`，渲染进程通过 `window.unu` 调用：

- `createProject(payload?)`
- `pickDirectory(payload?)`
- `saveProjectAs(payload)`
- `pickProjectFolder()`
- `scanProject(projectRoot)`
- `saveScene(payload)`
- `openScene(payload)`
- `readAssetDataUrl(payload)`
- `importImages(payload)`
- `importAudios(payload)`
- `savePrefab(payload)`
- `openPrefab(payload)`
- `saveTextAsset(payload)`
- `openTextAsset(payload)`
- `readTextAsset(payload)`
- `renameProject(payload)`
- `deleteProject(payload)`
- `revealInFolder(payload)`
- `exportGame(payload)`
- `openTilemapEditor(payload)`
- `submitTilemapEditorUpdate(payload)`
- `closeTilemapEditor()`
- `setMainWindowPreset(preset)`
- `onTilemapEditorInit(callback)`
- `onTilemapEditorApply(callback)`

## 主要 IPC 通道

- `unu:create-project`
- `unu:create-project-v2`
- `unu:pick-directory`
- `unu:save-project-as`
- `unu:pick-project-folder`
- `unu:scan-project`
- `unu:save-scene`
- `unu:open-scene`
- `unu:read-asset-data-url`
- `unu:import-images`
- `unu:import-audios`
- `unu:save-prefab`
- `unu:open-prefab`
- `unu:save-text-asset`
- `unu:open-text-asset`
- `unu:read-text-asset`
- `unu:rename-project`
- `unu:delete-project`
- `unu:reveal-in-folder`
- `unu:export-game`
- `unu:open-tilemap-editor`
- `unu:tilemap-editor-update`
- `unu:close-tilemap-editor`
- `unu:set-main-window-preset`

## 当前已知限制

- 前端主 chunk 仍然偏大，构建会提示超过 500KB，后续需要继续拆包。
- 脚本系统已支持项目内独立运行时、热重载和错误定位，但还没有完整断点调试和完善的类型提示体验。
- 动画状态机已有可视预览，但还不是完整节点连线式编辑器。
- Tilemap 图形化编辑器已经可用，大地图性能仍可继续优化。
- Web 导出当前面向静态资源和本地 HTTP 预览，后续可加入 ZIP、itch.io、GitHub Pages 等目标模板。






