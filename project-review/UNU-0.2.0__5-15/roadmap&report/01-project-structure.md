# 01. 项目文件结构

## 根目录概览

```txt
.
├─ src/                       # Vue 渲染进程、编辑器 UI、引擎核心、Pinia 状态
├─ electron/                  # Electron 主进程与 preload IPC 桥
├─ docs/                      # 中英文用户文档、路线图、API 文档
├─ public/                    # Vite public 静态资源，主要是样例像素素材
├─ sample-project/            # 旧/默认样例工程目录
├─ Sample-project-list/       # 可从 Launcher 打开的样例工程列表
├─ assets-for-sample/         # 样例工程原始素材/种子素材
├─ scripts/                   # 打包后处理脚本
├─ dist/                      # 前端构建产物，本地存在，已被 .gitignore 忽略
├─ dist-electron/             # Electron 构建产物，当前被 Git 追踪
├─ package.json               # npm 脚本、依赖、electron-builder 配置
├─ vite.config.ts             # 渲染进程 Vite 配置
├─ vite.electron.config.ts    # Electron main/preload 构建配置
└─ tsconfig.json              # TypeScript strict 配置
```

## 体量分布

| 目录 | 文件数 | 大小 | 判断 |
|---|---:|---:|---|
| `node_modules/` | 14,677 | 745.24 MB | 依赖目录，正常不入库 |
| `src/` | 66 | 0.81 MB | 核心源码 |
| `Sample-project-list/` | 62 | 3.71 MB | 新样例工程集合 |
| `dist/` | 44 | 7.73 MB | 本地构建产物，已忽略 |
| `sample-project/` | 39 | 3.28 MB | 旧/默认样例工程 |
| `dist-electron/` | 35 | 3.37 MB | Electron 构建产物，当前被追踪 |
| `public/` | 33 | 3.28 MB | Web 静态样例资源 |
| `assets-for-sample/` | 33 | 3.28 MB | 样例素材源 |
| `docs/` | 10 | 0.06 MB | 用户文档 |
| `electron/` | 2 | 0.12 MB | 主进程源码，但 `main.ts` 很大 |

## `src/` 结构

```txt
src/
├─ App.vue                    # 应用模式分流：GamePlayer / 子窗口 / Launcher / EditorLayout
├─ main.ts                    # Vue + Pinia 启动入口
├─ styles/base.css
├─ components/
│  ├─ common/                 # 弹窗、右键菜单、状态组件
│  ├─ game/                   # Web 导出/游戏运行入口 GamePlayer
│  ├─ launcher/               # 工程启动器
│  ├─ layout/                 # 主编辑器布局、顶部工具栏、Viewport、Console
│  ├─ panels/                 # Scene Tree / Inspector / Assets / Script / Timeline / Prefab
│  └─ windows/                # Electron 子窗口：代码编辑器、Tilemap 编辑器
├─ engine/
│  ├─ animation/              # 动画资源、图集、动画应用逻辑
│  ├─ assets/                 # 资源树类型、AssetDatabase、硬编码样例资产树
│  ├─ components/             # ECS 风格组件定义
│  ├─ core/                   # Component / Entity / Scene / Engine 基类
│  ├─ prefabs/                # Prefab 序列化/实例化
│  ├─ project/                # 样例目录、fallback 项目
│  ├─ renderer/               # PixiRenderer，渲染、交互、运行态编排
│  ├─ runtime/                # ScriptRuntime / InputState / AudioRuntime
│  ├─ serialization/          # Scene 序列化/反序列化
│  └─ sampleScene.ts          # 内置 Demo Scene 构造
└─ stores/
   ├─ assets.ts               # 资源树、文件操作、项目打开/导出
   ├─ console.ts              # Console 消息队列
   ├─ editor.ts               # 编辑器 UI 状态
   ├─ project.ts              # 当前工程和状态日志
   ├─ runtime.ts              # 播放态、性能指标、加载态
   ├─ scene.ts                # 场景集合、实体操作、撤销重做、Prefab、类文件夹
   └─ selection.ts            # 当前选中实体
```

## 大文件排行

| 文件 | 行数 | 主要职责 | 风险判断 |
|---|---:|---|---|
| `electron/main.ts` | 2,885 | IPC、项目创建/扫描、资源修复、样例生成、导出、窗口管理 | 主进程上帝文件 |
| `src/engine/renderer/PixiRenderer.ts` | 2,513 | Pixi 渲染、缓存、Gizmo、UI、运行态、脚本/音频接线 | 引擎和应用状态耦合 |
| `src/components/panels/InspectorPanel.vue` | 1,994 | 所有组件 Inspector 表单和操作 | UI 维护成本高 |
| `src/engine/runtime/ScriptRuntime.ts` | 1,980 | 项目脚本加载、脚本 API、碰撞、内置玩法、实体生成 | 运行时和样例玩法混杂 |
| `src/stores/scene.ts` | 1,623 | 场景/实体/历史/Prefab/文件夹/脚本同步 | Store 承担业务服务职责 |
| `src/components/panels/ScriptEditorPanel.vue` | 1,373 | 代码编辑、外部编辑器、语法高亮、保存 | 与 CodeEditorWindow 重复 |
| `src/components/panels/TimelinePanel.vue` | 934 | 动画编辑、资源保存、状态机 | 可拆 composable |
| `src/stores/assets.ts` | 836 | 资源树、IPC 文件操作、项目生命周期 | Store 与文件系统耦合 |

## 入口与启动路径

- `src/main.ts`：创建 Vue 应用，注册 Pinia，挂载 `App.vue`。
- `src/App.vue`：根据 URL query 和 Electron 环境决定显示：
  - `?game=1` 或 `window.__UNU_GAME_EXPORT__`：进入 `GamePlayer`。
  - `?tilemapEditor=1`：进入 `TilemapEditorWindow`。
  - `?codeEditor=1`：进入 `CodeEditorWindow`。
  - Electron 常规启动：先进入 `LauncherView`，打开工程后进入 `EditorLayout`。
- `electron/preload.ts`：暴露 `window.unu`，把渲染进程请求转成 `ipcRenderer.invoke(...)`。
- `electron/main.ts`：注册全部 IPC handler，并创建主窗口/子窗口。

## 样例与资源目录关系

当前至少存在四套样例资源来源：

- `assets-for-sample/`：看起来是样例素材源，Electron 主进程也会尝试从这里复制种子素材。
- `public/assets/`：供 Vite/Web 静态访问的样例素材。
- `sample-project/assets/`：旧默认样例工程资源。
- `Sample-project-list/*/assets/`：Launcher 中可选样例工程的资源。

这四套之间有大量同 hash 图片重复。短期不要直接删除，应先决定“唯一真源”：建议以 `Sample-project-list/` 下的真实样例工程为主，`public/` 和 fallback 资源由脚本生成或按需复制。

