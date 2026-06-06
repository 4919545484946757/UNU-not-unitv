# UNU Engine Starter

中文 | [English](README.en-US.md)

UNU Engine Starter 是一个基于 `Vue 3 + Pinia + PixiJS 8 + Three.js + Electron` 的桌面/Android 游戏编辑器与运行时。项目目标不是只做一个编辑器壳子，而是形成“创建项目、编辑 2D/3D 场景、编写脚本、预览玩法、调试性能、导出 Web 游戏、打包 Windows / Android 应用”的完整闭环。

- 文档更新时间：`2026-06-07`
- 项目版本：`1.2.0`
- 当前定位：桌面端 2D/3D 游戏编辑器 + Android 编辑器 APK + 可导出 Pixi/Canvas/Three Web 游戏运行包
- 示例项目真源：`Sample-project-list/`

## 快速开始

```bash
npm install
npm run dev
```

启动后会先进入项目启动器。可以选择历史项目、打开示例项目、新建项目，或回到启动器切换项目。`npm run dev` 会同时启动 Vite、Electron main/preload watch 构建和 Electron 应用。

## 1.2.0 Release 日志

1.2.0 版本重点引入 Three.js 3D 项目能力、原生 Canvas 项目导出适配、HTMLoverlayer UI 能力增强，以及 3D 编辑/渲染性能优化。

### 3D 项目与 Three.js 渲染

- 新建项目支持选择 2D Pixi、2D 原生 Canvas、3D Three.js 项目类型。
- 编辑器会按 2D / 3D 项目区分创建菜单、Inspector、Scene View 工具和模块布局，减少 2D/3D 功能混杂。
- 3D 实体支持 `ThreeObject`、模型、材质、灯光、相机、3D 碰撞体和可选物理后端配置。
- 支持导入与预览 `.glb`、`.gltf` 模型及贴图资源，场景树可按模型层级显示并默认折叠。
- 支持嵌套模型节点选择、子节点独立编辑、材质颜色/贴图/金属度/粗糙度/不透明度/法线贴图覆盖。
- 支持 glTF 动画片段读取、编辑态/运行态播放、动画状态绑定、循环与速度控制。
- 3D 脚本 API 支持播放态移动 3D 对象并查询 3D 变换。

### 3D 编辑视角、相机与调试

- 编辑态使用独立 Editor Camera，不再绑定场景主摄像机；播放态再使用运行时相机。
- 支持透视/正交相机、FOV、near/far、环绕、平移、缩放、鼠标滚轮缩放和模拟玩家参与式飞行视角。
- 支持 `X/Y/Z` 轴向视图切换；`Ctrl/Meta/Alt + X/Y/Z` 不再误触发视角切换。
- Camera 组件支持“读取当前编辑视角”和“预览该相机视角”。
- 3D 场景视图支持移动/旋转/缩放 TransformControls，修复模型节点未在场景图中导致的附着错误。
- 新增 3D 调试覆盖层，可显示/隐藏边界、碰撞体、局部坐标轴、灯光辅助和相机视锥；相机视锥方向与黄色线框已修正。
- 3D Inspector 属性编辑、TransformControls 拖拽和 `Ctrl+Z/Y` 非结构性撤销/重做会局部刷新实体，避免无关物体重建。

### 环境光、世界球与 EXR/HDR

- 支持方向光、点光源、聚光灯、环境光、环境贴图光照和世界环境球。
- 支持 `.exr` 贴图导入、识别、绑定和 Three.js 加载。
- Electron 桌面端新增 `unu-asset://` 本地资源协议，超大 EXR 不再通过 base64 `data:` 读取，避免超过 2GiB 文件触发崩溃或日志刷屏。
- EXR 不走浏览器原生图片预览，不会被误用于 Sprite / 精灵图集。
- 世界环境球支持跟随相机、按相机 far 动态限制半径，避免缩放后超出渲染范围。
- 世界球支持 Yaw/Pitch/Roll、亮度、透明度、UV Offset/Repeat 等参数。

### Canvas、HTMLoverlayer 与 Web 导出

- 新建项目可选择原生 Canvas 渲染方式，并移植 `sample-2D-shooting` Canvas 示例。
- 原生 Canvas 项目修复 Tilemap 材质色差/偏移、背景跟随、UI 点击、背包/容器 HTML-in-canvas 交互、无贴图材质颜色/透明度等问题。
- HTML-in-canvas 名称恢复为 `HTMLoverlayer`，UI 组件支持背景颜色/贴图、透明背景、RGBA/HEXA/HSL 颜色选择和调试属性。
- Web 游戏导出支持 Pixi、原生 Canvas、Three.js 3D 项目，并同步项目脚本、资源、物理后端配置和运行时。

### Android 与打包

- Android 编辑器窗口弹窗（Script、Tilemap、图集等）在小屏幕上自动滚动，平板等大屏设备不再强制旋转。
- Android 显示选项中专注播放模式默认打开。
- Windows / Android 打包会从 `Sample-project-list/` 当前真源同步示例项目，避免旧缓存污染。

### 打包产物

- Windows 安装包：`release-fixed/UNU Engine Setup 1.2.0.exe`
- Windows 便携版：`release-fixed/UNU Engine 1.2.0.exe`
- Android 游戏 Debug APK：`release-fixed/UNU Engine 1.2.0-debug.apk`
- Android 编辑器 Debug APK：`release-fixed/UNU Engine Editor 1.2.0-debug.apk`

## 1.1 Release 日志

1.1 版本重点补齐 Android 编辑器可用性，并修复示例项目路径污染、移动端窗口布局和示例玩法中的 UI/贴图问题。

### Android 编辑器

- 新增 Android 编辑器 APK 入口修正：`android:editor:apk` 构建会进入编辑器启动界面，不再直接进入游戏。
- 新建项目会在用户选择的 Android 目录下生成基础项目文件，并打开独立空白工程，不再跳转或绑定到示例游戏。
- 打开本地项目、历史项目、资源扫描和图片预览的路径兜底已收紧，避免本地工程误读内置示例项目资源。
- 起始界面、Script 独立窗口、Tilemap 编辑窗口默认竖屏；主编辑器、Scene View 和其余界面默认横屏。
- Script 独立窗口和 Tilemap 编辑窗口在小屏手机上会贴合安全区域显示，不再只贴左上角或保留异常边距。
- 精灵图集编辑器已接入 Android 编辑器内嵌窗口，可在 APK 内打开、切分、保存并应用图集/动画帧。
- Scene View 支持手机端双指缩放；Tilemap 编辑窗口支持单指拖动平移、长按拖动框选和双指缩放。

### 示例与运行时

- 修复打开背包后任务缩略图、玩家、Enemy 等动画贴图可能丢帧闪烁的问题。
- 背包角色预览支持玩家向右移动时的翻转显示。
- 大蘑菇图集动画统一删除各状态片段的最后一帧，并同步所有场景内大蘑菇实体的状态机帧段。
- 大蘑菇移动朝向按素材默认朝右处理：向右移动保持原贴图方向，向左移动时水平翻转贴图。
- 大蘑菇运行时图集引用改为 ASCII 资源路径，避免打包到 APK/WebView/Web 导出后中文图集文件名导致贴图加载失败。
- 同步示例项目多个场景中的背包、容器、热栏、暂停菜单等 UI 尺寸，修复 SecondScene UI 显示不一致。
- 优化手机小屏下暂停菜单与按键绑定菜单的尺寸和按钮排版。
- 霰弹枪逐发上弹时支持在弹仓仍有子弹的情况下中断上弹并直接开火。
- 示例项目已接入背景音乐、开枪音效和换弹音效；MainScene 与 SecondScene 均支持枪械射击/换弹音效。
- 修复音频 `data:`/`blob:` 媒体资源被 CSP 拦截的问题，并为播放状态下的 BGM/音效增加自动播放失败后的用户手势重试。
- Web 游戏导出补齐媒体 CSP 兜底；Android 编辑器 APK 会内置纯游戏运行时，导出的 Web 包不再只是一份项目资源包。
- Windows / Android 打包会从 `Sample-project-list/` 和同步后的 `public/android-game` 取当前示例项目，避免发布产物夹带旧版示例缓存。
- 1.1.2 起会自动刷新 Windows AppData 中的内置示例缓存，并在 Android 版本变化时清理旧内置示例 overlay；启动器新增“清理应用数据”入口，可主动清除 AppData / Android 本地存储缓存。

### 打包产物

- Windows 安装包：`release-fixed/UNU Engine Setup 1.1.2.exe`
- Windows 便携版：`release-fixed/UNU Engine 1.1.2.exe`
- Android 编辑器 Debug APK：`release-fixed/UNU Engine Editor 1.1.2-debug.apk`

## 文档导航

| 文档 | 中文 | English |
| --- | --- | --- |
| 新手教程 | [BEGINNER_TUTORIAL.zh-CN.md](docs/BEGINNER_TUTORIAL.zh-CN.md) | [BEGINNER_TUTORIAL.en-US.md](docs/BEGINNER_TUTORIAL.en-US.md) |
| Console 命令 | [CONSOLE_COMMANDS.zh-CN.md](docs/CONSOLE_COMMANDS.zh-CN.md) | [CONSOLE_COMMANDS.en-US.md](docs/CONSOLE_COMMANDS.en-US.md) |
| 脚本 API | [SCRIPT_API.zh-CN.md](docs/SCRIPT_API.zh-CN.md) | [SCRIPT_API.en-US.md](docs/SCRIPT_API.en-US.md) |
| Web 导出 | [EXPORT_WEB.zh-CN.md](docs/EXPORT_WEB.zh-CN.md) | [EXPORT_WEB.en-US.md](docs/EXPORT_WEB.en-US.md) |
| Android APK | [ANDROID_APK.zh-CN.md](docs/ANDROID_APK.zh-CN.md) | [ANDROID_APK.en-US.md](docs/ANDROID_APK.en-US.md) |
| 架构与领域模型 | [ARCHITECTURE.zh-CN.md](docs/ARCHITECTURE.zh-CN.md) | [ARCHITECTURE.en-US.md](docs/ARCHITECTURE.en-US.md) |
| 渲染器拆分 | [RENDERER_ARCHITECTURE.zh-CN.md](docs/RENDERER_ARCHITECTURE.zh-CN.md) | [RENDERER_ARCHITECTURE.en-US.md](docs/RENDERER_ARCHITECTURE.en-US.md) |
| Runtime 架构 | [RUNTIME_ARCHITECTURE.zh-CN.md](docs/RUNTIME_ARCHITECTURE.zh-CN.md) | [RUNTIME_ARCHITECTURE.en-US.md](docs/RUNTIME_ARCHITECTURE.en-US.md) |
| UI 面板架构 | [UI_PANEL_ARCHITECTURE.zh-CN.md](docs/UI_PANEL_ARCHITECTURE.zh-CN.md) | [UI_PANEL_ARCHITECTURE.en-US.md](docs/UI_PANEL_ARCHITECTURE.en-US.md) |
| 样例与资源治理 | [SAMPLE_GOVERNANCE.zh-CN.md](docs/SAMPLE_GOVERNANCE.zh-CN.md) | [SAMPLE_GOVERNANCE.en-US.md](docs/SAMPLE_GOVERNANCE.en-US.md) |
| 优化计划 | [OPTIMIZATION_PLAN.zh-CN.md](docs/OPTIMIZATION_PLAN.zh-CN.md) | [OPTIMIZATION_PLAN.en-US.md](docs/OPTIMIZATION_PLAN.en-US.md) |
| 路线图 | [ROADMAP.zh-CN.md](docs/ROADMAP.zh-CN.md) | [ROADMAP.en-US.md](docs/ROADMAP.en-US.md) |

## 功能概览

### 项目与启动器

- 启动器支持历史项目、示例项目、新建项目、重命名、删除，以及从编辑器返回开始界面。
- 新建项目会在选定目录下创建同名项目文件夹，避免把工程文件直接散落在父目录里。
- 另存为项目会复制场景、脚本、贴图、音频、HTML UI、物品注册表、Prefab 等资源，并自动修复旧路径引用。
- 项目打开时会自动检测场景列表、资源引用和缺失路径，尽量修复另存为、重命名、移动目录带来的路径问题。

### 场景编辑

- 支持多场景项目、场景列表弹窗、场景重命名、复制、删除和编辑态切换。
- 支持场景切换运行时、Loading 层、场景状态保留/重置、Player 出入口与出生点绑定。
- Scene 树支持实体列表视图和多层级文件树视图。
- 场景文件树中的类文件夹支持嵌套、展开折叠、新建、删除、重命名、复制/粘贴、拖拽移动和引用同步。
- 脚本可通过 `findEntitiesByFolder` / `findEntitiesByClass` 按嵌套类路径检索实体。

### Scene View 与编辑工具

- 支持选择、Shift 多选、批量移动、批量缩放、角度制旋转、复制/删除、增减图层和拖动实体树层级。
- 非播放态支持鼠标中键平移 Scene View，滚轮缩放画面。
- Android 编辑器内 Scene View 支持双指缩放，适配手机横屏编辑。
- 播放态会禁用编辑工具选中框，改用运行态交互高亮、调试层和专用输入逻辑。
- 播放按钮旁提供调试播放开关，可显示碰撞箱、实体边界框、Tilemap 网格、实体名称和交互提示。
- 3D 项目使用独立 Editor Camera，支持轨道视角、飞行视角、透视/正交切换、FOV/裁剪面和 X/Y/Z 轴向视图。
- 3D 项目支持 TransformControls 移动、旋转、缩放模型与模型子节点；常见属性编辑会局部刷新实体，减少无关物体重建。

### Inspector 与组件系统

- Inspector 支持组件折叠、默认排序、添加/删除自定义组件、未激活组件视觉占位和动态宽度布局。
- 常用组件包括 Transform、Sprite、Collider、Camera、Background、Audio、UI、Inventory、Script、自定义组件等。
- 实体可以配置贴图偏移、颜色、碰撞箱相对位置、碰撞层、Trigger、UI 对齐和百分比宽高。
- Inventory 模块支持图形化物品列表，并可在超出范围时滚动浏览。
- 3D Inspector 支持 ThreeObject、3D 材质、模型路径、模型动画、环境光、世界球、灯光、相机、3D 碰撞体和物理刚体属性。

### Tilemap 与资源管理

- Tilemap 支持 CSV 文本编辑和独立图形化编辑窗口。
- 图形化 Tilemap 编辑器支持滚轮/双指缩放、中键或单指拖动平移、多选、Shift 划选、手机长按框选、批量赋值、Tile 值材质预览和快速绑定。
- 资源树支持图片预览、文件夹打开、双击/右键打开文本或图片、拖拽移动文件、复制/粘贴、删除、重命名、新建文件/文件夹。
- 文件操作支持 `Ctrl+Z` / `Ctrl+Y` 撤回与恢复，资源重命名会自动同步引用。
- 素材箱支持当前目录面包屑切换、图片预览和 JS/JSON/HTML 等文本资源显示。
- 资源类型支持 `model` 与 `.glb/.gltf/.bin` 依赖资源；图片贴图额外支持 `.exr`，EXR 可用于 3D 环境和材质但不走浏览器原生图片预览。

### 脚本系统

- 每个项目拥有独立的 `ScriptRuntime.ts`、`InputState.ts`、`AudioRuntime.ts` 等项目运行脚本入口。
- 支持项目级共享脚本和场景级可选脚本，示例中 SecondScene 具有独立重力/平台跳跃逻辑。
- 支持脚本热重载、编译错误定位到资源树文件和行号、右侧编辑器和独立窗口编辑器。
- 脚本编辑器支持代码高亮、`Ctrl+F` 查找替换、未保存文件实心点标识、切换文件保留未保存内容。
- 运行时提供生命周期 hook，包括 `onInit`、`onStart`、`onEnterScene`、`onExitScene`、`onUpdate`、`onPausedUpdate`、`onInteract`、`onUiClick`、`onHtmlMessage`、`onCollisionEnter/Stay/Exit`、`onTriggerEnter/Stay/Exit`、`onDestroy`。
- 详细 API 请看 [脚本 API 文档](docs/SCRIPT_API.zh-CN.md)。

### 输入、碰撞、触发器与运行时

- 输入系统支持键盘、鼠标、动作映射、轴输入、移动向量归一化和游戏内改键。
- 碰撞系统支持实体-实体碰撞、Trigger 区域、Enter/Stay/Exit 生命周期、碰撞层与碰撞矩阵。
- Tilemap 碰撞可通过 `isBlockedAt` / `isBlockedRect` 在脚本中复用，避免 Player、Enemy 等移动逻辑穿模。
- Runtime 保留通用能力，样例玩法逻辑尽量放在项目资源脚本中，便于用户学习和修改。

### UI、HTML Overlay 与交互

- UI 支持 Text、Markdown、Button、Slider、HTML/DOM Overlay、iframe 页面和按钮脚本绑定。
- UI 支持自动尺寸、百分比宽高、相对视窗边缘布局、菜单层级、暂停菜单和游戏结束菜单。
- HTMLoverlayer 支持透明背景、动态尺寸、iframe 交互桥、游戏脚本消息通信、背景颜色/贴图和 RGBA/HEXA/HSL 颜色输入。
- 示例项目包含背包 UI、容器 UI、底部物品栏预览、当前手持物品显示、装备栏和角色预览；点击底部物品栏会消费本次左键输入，不会误触发射击。

### 物品、背包与示例玩法

- 新增物品数据类型，使用 `[项目名]:[物品英文名]` 作为命名空间。
- 项目可包含物品注册表和独立物品文件夹，每个物品可拥有属性和脚本。
- Player、Enemy、Chest 等实体都可以拥有 Inventory。
- 2D 示例包含药品、护甲、调试道具、门禁卡、自动步枪、精确步枪、狙击步枪、霰弹枪、弹药/换弹、Enemy HP 和掉落/容器交互。`调试-传送` 与 `调试-生成敌人` 现在作为手持道具通过左键触发，便于和射击武器保持一致的“当前手持物品使用”体验。

### 音频、Prefab、Console 与性能

- Audio 模块支持实体音频、一次性音效、分组音量、主音量、静音、播放/暂停/停止/seek、淡入淡出和脚本 API。
- Prefab 支持实例同步源更新、Variant 可视化差异和嵌套 Prefab。
- Console 支持命令输入、脚本日志、重复日志折叠、状态日志白名单和性能页签。
- 控制台命令包含 `help`、`fps`、`play/pause/resume/stop`、`debug`、`scene`、`entities`、`select`、`inspect`、`get/set`、`tp`、`give/take/inv`、`hp/heal/damage` 等。
- 详细命令请看 [Console 命令文档](docs/CONSOLE_COMMANDS.zh-CN.md)。

## 示例项目

| 示例 | 路径 | 内容 |
| --- | --- | --- |
| 2D Shooting | `Sample-project-list/sample-2D-shooting` | 多场景 2D 动作射击示例，包含 Player、Enemy、枪械、护甲、物品、背包、容器、门禁卡、HTML UI、场景切换和项目脚本。 |
| 2D Shooting Canvas | `Sample-project-list/2D-shooting-canvas` | 原生 Canvas 版本 2D 射击示例，用于验证 Canvas 渲染、Tilemap、背景、UI、HTMLoverlayer 背包/容器和道具交互。 |
| 3D | `Sample-project-list/3D` | Three.js 3D 示例，包含 3D 模型、灯光、相机、世界环境球、EXR/HDR 贴图、3D 调试覆盖层和基础 3D 编辑流程。 |
| Snake | `Sample-project-list/snake` | 贪吃蛇示例，包含网格移动、食物、分数、暂停/游戏结束菜单、难度调整和项目本地脚本。 |

`Sample-project-list/` 是样例工程唯一真源。新增样例时建议新增一个独立目录，并提供 `project.json` 与 `manifest.json`，避免在多处硬编码样例信息。

## 开发命令

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run assets:audit
npm run assets:sync-public
npm run build
npm run android:sync
npm run android:apk
npm run android:editor:apk
npm run dist:win
npm run dist:win:installer
```

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite、Electron main/preload watch 构建和 Electron 应用。 |
| `npm run typecheck` | 使用 `vue-tsc --noEmit` 做类型检查。 |
| `npm run test` | 运行 Vitest 基础测试。 |
| `npm run assets:audit` | 检查重复资源和资源治理问题。 |
| `npm run assets:sync-public` | 同步导出/runtime 所需公共资源。 |
| `npm run build` | 构建 Web 前端和 Electron main/preload。 |
| `npm run android:sync` | 构建 Android 游戏运行模式并同步到 Capacitor Android 工程。 |
| `npm run android:apk` | 生成 Android Debug APK，需要 JDK 17/21 与 Android SDK。 |
| `npm run android:editor:apk` | 生成 Android 编辑器 Debug APK，内置示例项目并启用移动端 `window.unu` 兼容桥。 |
| `npm run dist:win` | 生成 Windows 解压目录包。 |
| `npm run dist:win:installer` | 生成 Windows 安装包。 |

`dist/`、`dist-electron/`、`release/`、`release-fixed/` 等目录属于构建产物，不应作为源码手动维护。

## Web 导出

当前 Web 导出会复制项目所需的 scenes、assets、prefabs、HTML UI、项目脚本、场景级脚本、物品注册表、物品脚本、图片、音频、模型、EXR/HDR 贴图和导出 runtime，并生成 `project.json`、`export-report.json`、`PLAY_GAME.bat` 等文件。导出运行时会按项目渲染后端支持 Pixi、原生 Canvas 和 Three.js 3D 项目。

导出后的 Web 游戏请通过 `PLAY_GAME.bat` 或本地 HTTP 服务启动，不要直接双击 `index.html`。现代浏览器会限制 `file://` 下的脚本、样式和资源加载，直接打开可能出现 CORS 或资源缺失错误。

## Android APK

当前 Android 移植采用 `Capacitor + Android WebView`。`android:apk` 会直接进入游戏运行模式；`android:editor:apk` 会进入编辑器模式，并默认打包内置示例项目。编辑器模式已支持启动器、打开内置项目、新建/打开 Android 本地工作区、资源读取、场景/脚本保存、素材导入、Prefab、内嵌脚本/Tilemap/精灵图集编辑窗口、方向切换，以及通过 Capacitor Filesystem / Android Storage Access Framework 写入真实目录。Android 编辑器导出 Web 游戏时会一并写出内置游戏运行时，项目资源位于导出目录的 `android-game/` 下。

生成 Debug APK：

```bash
npm run android:apk
npm run android:editor:apk
```

APK 输出位置通常为 `android/app/build/outputs/apk/debug/app-debug.apk`。如果遇到 `Unsupported class file major version 69`，请将 Java 从 25 切换到 JDK 17 或 21。更多说明见 [Android APK 构建说明](docs/ANDROID_APK.zh-CN.md)。

1.2.0 版本发布包额外复制为 `release-fixed/UNU Engine 1.2.0-debug.apk` 和 `release-fixed/UNU Engine Editor 1.2.0-debug.apk`。

## 当前工程约定

- 资源路径应优先使用项目相对路径，避免写入本机绝对路径。
- 样例项目以 `Sample-project-list/` 为唯一真源。
- 项目玩法逻辑应尽量放入项目脚本，而不是通用引擎 runtime。
- Console 和 Script API 文档应随新增命令/API 同步更新。
- 复杂 UI 可以使用 HTML Overlay，但需要通过脚本桥与游戏逻辑通信，避免直接污染 Canvas 输入逻辑。
