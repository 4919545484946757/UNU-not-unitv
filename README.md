# UNU Engine Starter

UNU Engine Starter 是一个基于 `Vue 3 + Pinia + Pixi.js + Electron` 的 2D 游戏编辑器与运行时示例工程。  
目标是提供“可直接上手、可持续扩展”的桌面端 2D 游戏开发基础。

- 文档更新时间：`2026-04-23`
- 项目版本：`0.1.0`

## 文档导航

- [引擎路线图](docs/ROADMAP.zh-CN.md)
- [新手教程](docs/BEGINNER_TUTORIAL.zh-CN.md)
- [小优化计划](docs/OPTIMIZATION_PLAN.zh-CN.md)

## 核心能力总览

### 1) 项目与启动流程

- 启动器界面（Launcher）：
  - 历史项目列表（打开、重命名、删除）
  - 示例项目列表（当前已提供 1 个可用示例）
  - 新建项目弹窗（项目名、目标目录可选输入）
- 新建项目逻辑：
  - 如果填写项目名与目录，则创建到 `目标目录/项目名/`
  - 如果留空，则使用默认项目名并在创建时选择目录
- 主窗口尺寸策略：
  - 启动器窗口较小
  - 进入编辑器后自动切换为更大的编辑窗口

### 2) 编辑器基础能力

- 场景编辑：新建、打开、保存、另存
- 实体编辑：新建（类型化）、复制、删除、图层调整
- 视图工具：选择、移动、缩放、平移
- 资源管理：
  - 资源树浏览与刷新
  - 导入图片到 `assets/images`
  - 导入音频到 `assets/audio`
  - 右键在系统文件管理器中打开目录/定位文件
- 文本资源编辑：脚本、动画、图集、JSON 等文本资源可打开与保存

### 3) 运行时与预览

- 中央预览支持：播放、暂停、继续、停止
- 播放态/编辑态分离：
  - 播放态默认隐藏调试信息
  - 可通过“调试播放”选项显示调试信息
- 工程切换时自动刷新预览：
  - 在编辑器内打开其他工程后，Scene View 会自动重载对应项目场景

### 4) 组件系统（当前内置）

- `Transform`
- `Sprite`
- `Collider`
- `Animation`（含状态机）
- `Script`
- `Camera`
- `Background`
- `Interactable`
- `Audio`
- `UI`
- `Tilemap`

### 5) Tilemap / Prefab / 动画

- Tilemap：
  - 图块层 + 碰撞层
  - 支持数值到材质映射
  - 提供图形化编辑子窗口
- Prefab：
  - 保存实体为 Prefab
  - 从磁盘实例化 Prefab
  - 支持 Variant 工作流
- 动画：
  - 支持 `.anim.json` 与 `.atlas.json` 编辑
  - 状态机支持 `Idle/Run/Attack` 等常见流转

### 6) 交互与脚本化玩法（示例）

- Player：
  - `W/A/S/D` 移动（斜向归一化）
  - 鼠标左键射击
  - `Shift` 冲刺（可配置速度）
- Enemy：
  - 追踪 Player
  - 与子弹碰撞后销毁并随机重生
- 可交互对象：
  - 鼠标右键与可交互实体交互
  - 可在脚本中定义交互逻辑（不限于切场景）
- 场景切换：
  - 示例含双场景门交互往返
- 背景系统：
  - 背景可跟随相机
  - 支持脚本切换背景贴图

## 快速开始

### 环境要求

- Node.js `18+`（建议 20+）
- npm `9+`

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

## 常用快捷键

- `Ctrl/Cmd + S`：保存场景
- `Ctrl/Cmd + Shift + S`：场景另存
- `Ctrl/Cmd + Z`：撤销
- `Ctrl/Cmd + Shift + Z` 或 `Ctrl/Cmd + Y`：重做
- `Ctrl/Cmd + D`：复制实体
- `Delete / Backspace`：删除实体
- `Q / W / E`：选择/移动/缩放工具
- `P`：播放态暂停/继续（未播放时开始播放）
- `Ctrl/Cmd + Space`：停止播放

## 目录结构

```txt
.
├─ electron/
│  ├─ main.ts
│  └─ preload.ts
├─ src/
│  ├─ components/
│  ├─ engine/
│  ├─ stores/
│  └─ main.ts
├─ docs/
│  ├─ ROADMAP.zh-CN.md
│  ├─ BEGINNER_TUTORIAL.zh-CN.md
│  └─ OPTIMIZATION_PLAN.zh-CN.md
├─ vite.config.ts
├─ vite.electron.config.ts
└─ package.json
```

## Electron 接口（`window.unu`）

类型定义见：`src/vite-env.d.ts`

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
- `openTilemapEditor(payload)`
- `submitTilemapEditorUpdate(payload)`
- `closeTilemapEditor()`
- `setMainWindowPreset(preset)`
- `onTilemapEditorInit(callback)`
- `onTilemapEditorApply(callback)`

## IPC 通道（主进程）

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
- `unu:open-tilemap-editor`
- `unu:tilemap-editor-update`
- `unu:close-tilemap-editor`
- `unu:set-main-window-preset`

## 当前已知限制

- 主包体积仍偏大（构建会提示 `>500KB`），后续会继续做拆包与按需加载。
- 仍有部分历史代码区域存在可继续整理的编码与注释问题（不影响主功能使用）。
- Tilemap 图形化编辑与动画状态机编辑仍可继续提升可视化细节与交互效率。
