# UNU Engine Starter

UNU Engine Starter 是一个基于 `Vue 3 + Pinia + Pixi.js + Electron` 的 2D 编辑器/运行时示例工程，提供项目资源管理、场景编辑、Prefab、动画时间轴、脚本运行与本地文件读写能力。

## 功能列表

- 项目管理
  - 新建项目目录并初始化标准结构（`assets/`、`scenes/`、`prefabs/` 等）
  - 打开已有项目、刷新项目资源树
- 场景编辑
  - 新建/打开/保存场景（`.scene.json`）
  - 新建实体、复制实体、删除实体、调整层级
  - 视口网格显示开关，选择/移动/缩放工具切换
- 资源管理
  - 导入图片到 `assets/images`
  - 资产树浏览与图片预览
  - 双击/选择资源后可创建或绑定 Sprite
- Inspector 属性编辑
  - Transform、Sprite、Collider、Animation 组件参数可视化编辑
  - 从当前选中图片快速应用到 Sprite 或动画帧
- Prefab 工作流
  - 将实体保存为 Prefab（`.prefab.json`）
  - 从 Prefab 文件实例化到当前场景
- Timeline 动画工作流
  - 维护帧序列、帧时长、事件轨道
  - 预览播放与播放头拖拽
  - 动画资源保存/打开（`.anim.json`）
  - 图集切片描述生成与绑定（`.atlas.json`）
- 运行时
  - Play/Stop 预览运行
  - 内置脚本注册：`builtin://player-input`、`builtin://patrol`、`builtin://spin`
  - 输入系统（键盘/鼠标 + 动作映射）
  - Camera 组件（缩放、跟随、边界约束）

## 技术栈

- 前端：Vue 3 + Pinia + TypeScript
- 渲染：Pixi.js
- 桌面端：Electron
- 构建：Vite

## 快速开始

### 1. 环境要求

- Node.js 18+（建议 Node.js 20）
- npm 9+

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发模式（Vite + Electron）

```bash
npm run dev
```

### 4. 生产构建

```bash
npm run build
```

### 5. 预览前端（非 Electron）

```bash
npm run preview
```

## 使用方法

### 基础流程

1. 启动后点击顶部工具栏 `新建项目` 或 `打开工程`。
2. 点击 `导入图片`，将素材导入到 `assets/images`。
3. 点击 `新建场景`，再点击 `新建实体`，或从资源快速创建 Sprite 实体。
4. 在右侧 `Inspector` 中调整 Transform/Sprite/Collider/Animation 参数。
5. 点击 `保存场景` 或 `另存场景`，输出到 `scenes/*.scene.json`。
6. 选中实体可 `保存 Prefab`，后续可 `实例化 Prefab` 复用。
7. 切换到 `Timeline` 可编辑动画帧、事件，并保存为 `.anim.json`。
8. 点击 `播放预览` 查看运行效果。

### 输入映射（默认）

- `move_left`：`A` / `Left`
- `move_right`：`D` / `Right`
- `move_up`：`W` / `Up`
- `move_down`：`S` / `Down`
- `fire`：`J` / 鼠标左键

脚本中可通过 `ctx.api.input` 读取输入状态（`isKeyDown`、`isActionDown`、`getAxis`、`getMousePosition`）。

### 常见操作建议

- 初次使用建议先执行：新建项目 -> 导入图片 -> 新建场景 -> 新建实体 -> 保存场景。
- 使用图集动画时，先在资源面板选中图集图片，再到 Timeline 里生成 `.atlas.json` 并绑定。
- 工程切换/新建场景前如存在未保存修改，会弹出确认提示，避免误覆盖。
- 删除实体会二次确认，降低误操作风险。
- 自动保存默认开启（20 秒）；仅对“已保存过路径”的场景生效。
- 关闭窗口或刷新页面前，如场景未保存会触发浏览器/Electron 原生离开确认。

### 快捷键（编辑器）

- `Ctrl/Cmd + S`：保存场景
- `Ctrl/Cmd + Shift + S`：场景另存
- `Ctrl/Cmd + Z`：撤销
- `Ctrl/Cmd + Shift + Z` 或 `Ctrl/Cmd + Y`：重做
- `Ctrl/Cmd + D`：复制当前实体
- `Delete / Backspace`：删除当前实体
- `Q / W / E`：切换选择/移动/缩放工具
- `P`：播放后在“暂停/继续”间切换
- `Ctrl/Cmd + Space`：停止预览

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
├─ vite.config.ts
├─ vite.electron.config.ts
└─ package.json
```

## 相关接口

### 1. 渲染进程桥接接口（`window.unu`）

由 `electron/preload.ts` 暴露，供前端调用：

- `createProject(): Promise<{ rootPath; name; created } | null>`
- `pickProjectFolder(): Promise<{ rootPath; name } | null>`
- `scanProject(projectRoot): Promise<{ rootPath; name; tree }>`
- `saveScene({ filePath?, content, suggestedName?, projectRoot? }): Promise<{ filePath; name } | null>`
- `openScene({ projectRoot? }): Promise<{ filePath; name; content } | null>`
- `readAssetDataUrl({ projectRoot, relativePath }): Promise<{ dataUrl } | null>`
- `importImages({ projectRoot }): Promise<{ imported: Array<{ fileName; relativePath }> } | null>`
- `savePrefab({ filePath?, content, suggestedName?, projectRoot? }): Promise<{ filePath; name } | null>`
- `openPrefab({ projectRoot? }): Promise<{ filePath; name; content } | null>`
- `saveTextAsset({ filePath?, content, suggestedName?, projectRoot?, subdir?, title?, filterName? }): Promise<{ filePath; name; relativePath? } | null>`
- `openTextAsset({ projectRoot?, defaultSubdir?, title?, extensions? }): Promise<{ filePath; name; relativePath?; content } | null>`
- `readTextAsset({ projectRoot, relativePath }): Promise<{ filePath; name; relativePath?; content } | null>`

类型声明见：`src/vite-env.d.ts`。

### 2. IPC 通道（主进程）

`electron/main.ts` 中处理的通道：

- `unu:create-project`
- `unu:pick-project-folder`
- `unu:scan-project`
- `unu:save-scene`
- `unu:open-scene`
- `unu:read-asset-data-url`
- `unu:import-images`
- `unu:save-prefab`
- `unu:open-prefab`
- `unu:save-text-asset`
- `unu:open-text-asset`
- `unu:read-text-asset`

### 3. 资源文件格式接口

- Scene：`format: "unu-scene"`，定义见 `src/engine/serialization/sceneSerializer.ts`
- Prefab：`format: "unu-prefab"`，定义见 `src/engine/prefabs/prefabSerializer.ts`
- Animation：`format: "unu-animation"`，定义见 `src/engine/animation/animationAsset.ts`
- Atlas：`format: "unu-atlas"`，定义见 `src/engine/animation/atlasAsset.ts`

### 4. 脚本生命周期接口

运行时接口见 `src/engine/runtime/ScriptRuntime.ts`：

- `onInit(ctx)`
- `onStart(ctx)`
- `onUpdate(ctx)`
- `onDestroy(ctx)`

`ctx.api` 提供：

- `delta`：当前帧增量时间
- `time`：累计运行时间
- `getState(entity)`：实体级脚本状态存取

## NPM 脚本

- `npm run dev`：同时启动 Vite 与 Electron 开发环境
- `npm run build`：构建前端与 Electron 主进程代码
- `npm run preview`：预览前端构建结果

## 迭代路线

分阶段能力建设计划见：

- `docs/ROADMAP.zh-CN.md`
