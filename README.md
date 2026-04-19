# UNU Engine Starter

UNU Engine Starter 是一个基于 `Vue 3 + Pinia + Pixi.js + Electron` 的 2D 编辑器与运行时示例工程，目标是提供“可直接上手做原型”的桌面化 2D 游戏开发基础。

本文档面向当前主分支代码状态。

- 文档最后更新：`2026-04-19`
- 当前版本：`0.1.0`

## 当前能力概览

### 已完成（按路线图）

- 阶段 1：编辑体验与稳定性
  - 场景历史快照 + 撤销/重做
  - 全局快捷键（保存、撤销/重做、复制、删除、工具切换、播放控制）
  - 关键确认弹窗（删除实体、切换/关闭未保存场景）
  - 自动保存（默认 20 秒，仅对已有场景路径生效）
  - 顶部独立消息弹窗（可拖动/关闭）

- 阶段 2：运行时核心能力
  - Input 系统（键鼠 + 动作映射）
  - Camera 组件（跟随、缩放、边界）
  - Audio 组件（BGM/SFX/UI 分组、音量、自动播放）
  - UI 组件（Text/Button、屏幕锚点布局）

- 阶段 3：内容生产能力（已完成部分）
  - Tilemap（图块层 + 碰撞层）
  - Prefab 变体与嵌套（Prefab v2）

### 未完成（当前代码尚未交付）

- 动画状态机（Idle/Run/Attack）
- Timeline 关键帧属性轨（完整生产级版本）
- 阶段 4~6 的功能（2D 物理、脚本模块化加载、性能分析、资源管线、自动化测试等）

详情见 [docs/ROADMAP.zh-CN.md](docs/ROADMAP.zh-CN.md)。
- 小优化目标计划表：[docs/OPTIMIZATION_PLAN.zh-CN.md](docs/OPTIMIZATION_PLAN.zh-CN.md)
- 引擎新手教程：[docs/BEGINNER_TUTORIAL.zh-CN.md](docs/BEGINNER_TUTORIAL.zh-CN.md)

## 功能支持清单

### 1. 项目与资源

- 新建项目/打开项目/项目另存（含示例工程另存）
- 资源树浏览与刷新
- 导入图片到 `assets/images`
- 导入音频到 `assets/audio`
- 右键在文件管理器中打开目录/定位文件（Electron）
- 文本资产（脚本/动画/图集/场景/prefab）可在编辑器面板打开与保存

### 2. 场景与实体编辑

- 新建/打开/保存/另存场景（`.scene.json`）
- 新建实体、复制、删除、图层调整
- 视口中选择/移动/缩放实体
- 播放态支持暂停/继续/停止
- 播放过程中允许选中和部分编辑操作

### 3. 组件系统（当前内置）

- `Transform`
- `Sprite`
- `Collider`
- `Animation`
- `Script`
- `Camera`
- `Audio`
- `UI`
- `Tilemap`

### 4. Prefab（v2）

- 保存实体为 Prefab（支持树形子节点嵌套）
- 从磁盘实例化 Prefab
- 应用源 Prefab 更新到实例
- 保存为 Prefab 变体（Variant，记录 `variantOf`）

### 5. 动画与时间轴

- 打开/编辑/保存 `.anim.json`
- 打开/编辑/保存 `.atlas.json`
- 预览播放、帧时长与事件轨道编辑

### 6. 脚本与示例玩法

- 内置脚本注册：
  - `builtin://player-input`
  - `builtin://bullet-projectile`
  - `builtin://enemy-chase-respawn`
  - `builtin://orbit-around-chest`
  - `builtin://patrol`
  - `builtin://spin`
- 示例项目包含 Player/Enemy/Chest、追踪/射击/重生等演示逻辑

## 技术栈

- 前端：Vue 3 + Pinia + TypeScript
- 渲染：Pixi.js
- 桌面端：Electron
- 构建：Vite

## 快速开始

### 环境要求

- Node.js 18+（推荐 Node.js 20）
- npm 9+

### 安装依赖

```bash
npm install
```

### 开发模式（Vite + Electron）

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 仅预览前端

```bash
npm run preview
```

## 编辑器使用说明

### 推荐上手流程

1. `新建项目` 或 `打开工程`。
2. 导入图片/音频资源。
3. `新建场景`。
4. 新建实体，或从资源树/资源面板双击图片创建 Sprite。
5. 在 `Inspector` 编辑组件参数。
6. 保存场景到 `scenes/*.scene.json`。
7. 在 `Prefab` 面板保存可复用实体。
8. 点击播放预览，验证运行逻辑。

### Tilemap 基础流程

1. 工具栏或场景树点击 `新建 Tilemap`。
2. 在 Inspector 的 Tilemap 区设置行列与格子尺寸。
3. 编辑 `tiles` 与 `collision`（CSV 文本，每行一行）。
4. 勾选 `showCollision` 可在视口叠加碰撞可视化。
5. 脚本中使用 `ctx.api.isBlockedAt(x, y)` 做阻挡判定。

### Prefab 变体与嵌套流程

1. 选中实体，点击 `保存当前实体为 Prefab`。
2. 如需变体：点击 `保存当前实体为 Prefab 变体`。
3. 点击 `从文件实例化 Prefab` 放入场景。
4. 选中实例后可点击 `应用源 Prefab 更新到实例`。

## 输入映射（默认）

- `move_left`：`A` / `Left`
- `move_right`：`D` / `Right`
- `move_up`：`W` / `Up`
- `move_down`：`S` / `Down`
- `fire`：`J` / 鼠标左键

## 快捷键（编辑器）

- `Ctrl/Cmd + S`：保存场景
- `Ctrl/Cmd + Shift + S`：场景另存
- `Ctrl/Cmd + Z`：撤销
- `Ctrl/Cmd + Shift + Z` 或 `Ctrl/Cmd + Y`：重做
- `Ctrl/Cmd + D`：复制实体
- `Delete / Backspace`：删除实体
- `Q / W / E`：选择/移动/缩放工具
- `P`：播放态下暂停/继续（未播放则开始播放）
- `Ctrl/Cmd + Space`：停止播放

## 目录结构

```txt
.
├─ electron/                 # Electron 主进程与预加载桥接
│  ├─ main.ts
│  └─ preload.ts
├─ src/
│  ├─ components/            # 编辑器 UI（工具栏、面板、视口等）
│  ├─ engine/                # 引擎核心、组件、序列化、动画、运行时
│  ├─ stores/                # Pinia 状态管理
│  └─ main.ts
├─ docs/
│  └─ ROADMAP.zh-CN.md
├─ vite.config.ts
├─ vite.electron.config.ts
└─ package.json
```

## 接口说明（当前实现）

### 1. 渲染进程桥接接口（`window.unu`）

由 `electron/preload.ts` 暴露：

- `createProject()`
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
- `revealInFolder(payload)`

类型声明见 [src/vite-env.d.ts](src/vite-env.d.ts)。

### 2. IPC 通道（主进程）

- `unu:create-project`
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
- `unu:reveal-in-folder`

### 3. 资源文件格式

- Scene：`format: "unu-scene"`（`version: 1`）
- Prefab：`format: "unu-prefab"`（`version: 2`，支持嵌套与 `variantOf`）
- Animation：`format: "unu-animation"`
- Atlas：`format: "unu-atlas"`

### 4. 脚本生命周期与 API

生命周期：

- `onInit(ctx)`
- `onStart(ctx)`
- `onUpdate(ctx)`
- `onDestroy(ctx)`

`ctx.api` 当前提供：

- `delta`
- `time`
- `getState(entity)`
- `input`：`isKeyDown` / `isMouseDown` / `wasMousePressed` / `isActionDown` / `getAxis` / `getMoveVector` / `getMousePosition`
- `audio`：`playOneShot` / `playEntity` / `stopEntity` / `setMasterVolume` / `setGroupVolume` / `getMasterVolume` / `getGroupVolume`
- `findEntityByName(name)`
- `removeEntity(entity)`
- `spawnEntity(entity)`
- `isBlockedAt(x, y)`（Tilemap 碰撞查询）

## NPM 脚本

- `npm run dev`：并行启动 Vite + Electron
- `npm run dev:electron`：仅启动 Electron（依赖 5173）
- `npm run build`：构建前端与 Electron 主进程
- `npm run preview`：预览前端构建结果

## 已知限制（当前版本）

- 动画状态机尚未接入。
- Prefab 变体当前为“全量保存 + 记录基线路径”，尚未实现字段级差量覆盖 UI。
- Tilemap 编辑当前为 CSV 文本输入，尚未提供笔刷式绘制工具。
- 构建会提示主包体积偏大（>500KB），尚未进行细粒度拆包优化。
