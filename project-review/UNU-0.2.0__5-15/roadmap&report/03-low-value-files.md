# 03. 废弃/低价值/重复文件判断

## 判断原则

这里的“低价值”不等于可以立刻删除。更准确的意思是：它们要么是构建产物，要么与其它目录重复，要么是兼容旧流程的临时代码/哨兵，要么维护成本大于当前收益。建议先标记、确认使用链路，再分批处理。

## 高优先级处置

| 路径 | 现状 | 建议 |
|---|---|---|
| `dist/` | 本地存在，约 7.73 MB；`.gitignore` 已忽略 | 保持忽略，不要入库；本地可按需清理 |
| `dist-electron/` | 约 3.37 MB；当前 `git ls-files` 显示已被追踪 | 改造 dev/build 流程后停止追踪并加入 `.gitignore` |
| `unu0301.zip` | 根目录本地压缩包，`.gitignore` 已忽略 | 若无发布归档需求，可本地删除 |
| `sampleCatalog.ts` 中 `Sample-project-list/Snake` | 实际目录是 `Sample-project-list/snake` | 改成同大小写路径，避免非 Windows 环境出错 |

`dist-electron/` 需要谨慎：当前 `package.json.main` 指向 `dist-electron/main.js`，`npm run dev` 直接执行 `electron .`。如果删除追踪产物，需要同时补上 dev 阶段 Electron main/preload 的构建或 watch 方案。

## 样例资源重复

扫描媒体 hash 后发现：

- 重复 hash 组：34
- 重复文件数：195
- 估算重复浪费：约 16.38 MB

重复主要分布在：

- `assets-for-sample/`
- `public/assets/`
- `sample-project/assets/`
- `Sample-project-list/sample-2D-shooting/assets/`
- `dist/`
- `dist-electron/`

建议路线：

1. 定义唯一真源：建议以 `Sample-project-list/*` 的真实工程目录为主。
2. `assets-for-sample/` 改成 seed/source 目录，只有构建或初始化脚本使用。
3. `public/assets/` 不再手工维护重复素材，由脚本复制或按需提供最小 runtime 资源。
4. `sample-project/` 如果只是旧默认样例，迁移为 `Sample-project-list/sample-2D-shooting` 的别名或 fallback manifest。
5. 处理完成后再删除重复文件，不要先删。

## 旧样例与 fallback 相关

| 路径/概念 | 问题 | 建议 |
|---|---|---|
| `sample-project/` | 代码中被当成特殊 rootPath 哨兵；和新样例工程重复 | 引入 `ProjectMode = "sample" | "local" | "export"`，避免用字符串当模式 |
| `src/engine/assets/sampleAssets.ts` | 硬编码样例资产树，容易和真实资源不同步 | 改为读取 sample manifest 或由扫描结果生成 |
| `src/engine/sampleScene.ts` | 硬编码 Demo Scene，和 `Sample-project-list` 场景 JSON 重复 | 只保留最小 smoke scene；真实样例走工程目录 |
| `electron/main.ts` 中 sample 写入函数 | 主进程里塞了大量样例文件生成和默认场景内容 | 拆成 `sampleProjectSeeder`，最好使用模板文件而不是字符串 |
| `ScriptRuntime.ts` 内置玩法脚本 | 通用运行时里含 sample game logic | 将内置玩法迁入样例工程脚本，runtime 只保留 API 和通用系统 |

## 重复代码/功能

| 位置 | 重复点 | 建议 |
|---|---|---|
| `ScriptEditorPanel.vue` 与 `CodeEditorWindow.vue` | 都有代码高亮、查找替换、保存/同步逻辑 | 抽 `useCodeEditorBuffer`、`CodeEditorSurface`、`highlighting` 工具 |
| `InspectorPanel.vue` 与 `TimelinePanel.vue` | 动画状态机编辑逻辑交叉 | 抽 `animationStateMachine` composable 和子组件 |
| `App.vue` 与 `assets.ts` | `buildProjectHealthMessage` 逻辑重复 | 放到 `src/services/projectHealthMessage.ts` |
| `InputState.ts`、`AudioRuntime.ts`、`ScriptRuntime.ts` | 都有项目 runtime 代码 transpile + `new Function` 模式 | 抽统一 `ProjectModuleLoader`，集中错误处理和限制 |
| 多处路径 normalize | `replace(/\\/g, '/')`、sample root 判断到处写 | 抽 `pathUtils` 和 `projectMode` 常量 |

## 暂不建议删除

- `docs/`：虽然已有 roadmap/optimization 文档，仍是用户价值文档；可以后续做文档生成/校验，不建议直接删。
- `ico.png` 与 `ico.ico`：打包配置需要图标，除非引入统一资产管线。
- `Sample-project-list/`：这是 Launcher 的样例工程来源，属于高价值目录。
- `public/assets/`：短期 Web 运行和 Vite 静态访问可能依赖它；应先确定替代链路。

## 可疑但需二次确认

- `src/engine/core/Engine.ts` 只有 `currentScene` 和 `loadScene`，目前价值很低。如果没有未来扩展计划，可删除或等重构 runtime 时重新定义 Engine Facade。
- `sample-project/assets/scripts/*.js` 与 `Sample-project-list/sample-2D-shooting/assets/scripts/*.js` 有若干完全相同文件。确认 `sample-project` 是否仍要作为独立旧样例后再决定。
- `dist-electron/assets/**` 当前像是构建复制出的 public 资源。若 Electron dev/build 改成每次生成，就不应继续追踪。

