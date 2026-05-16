# UNU Engine 项目审查报告索引

生成日期：2026-05-15  
审查范围：仓库根目录、`src/`、`electron/`、示例工程、资源目录、构建配置与基础验证。  
项目定位：基于 `Vue 3 + Pinia + PixiJS 8 + Electron + Vite + TypeScript` 的桌面 2D 游戏编辑器与 Web 导出运行时。

## 报告文件

- [01-project-structure.md](01-project-structure.md)：项目文件结构、目录职责、体量分布、主要入口。
- [02-code-architecture-and-principles.md](02-code-architecture-and-principles.md)：代码结构、运行链路、实现原理、关键模块职责。
- [03-low-value-files.md](03-low-value-files.md)：废弃/低价值/重复文件判断，以及建议处置方式。
- [04-optimization-roadmap.md](04-optimization-roadmap.md)：降低项目复杂度的分阶段优化路线。
- [05-validation-and-risk.md](05-validation-and-risk.md)：当前验证结果、类型错误、架构风险与后续验收建议。

## 一句话结论

这个项目已经具备编辑器、运行时、资源管理、样例工程、导出和打包的完整闭环；主要问题不是“没功能”，而是功能增长集中在少数巨型文件里，导致职责混杂、类型系统失效、样例/资源重复和 Electron 边界扩散。优先级最高的路线是先加类型/测试护栏，再拆 Electron 主进程、Renderer、Runtime、Scene Store 和 Inspector 这几个核心“重力井”。

## 关键发现

- `src + electron` 约 68 个 TS/Vue/CSS 文件，约 25,818 行代码；没有发现测试文件。
- 最大文件集中度很高：`electron/main.ts` 2,885 行，`PixiRenderer.ts` 2,513 行，`InspectorPanel.vue` 1,994 行，`ScriptRuntime.ts` 1,980 行，`scene.ts` 1,623 行。
- `window.unu` 直接散落在 14 个前端/引擎文件里，共 154 处，说明 IPC 边界没有被客户端服务封装。
- 静态 import 未发现直接循环依赖，但 store 是明显依赖中心：`scene/project/editor/assets/runtime` 被大量 UI 和引擎代码直接引用。
- 媒体资源存在 34 组重复 hash、195 个重复文件，估算可节省约 16.38 MB。
- `npx vue-tsc --noEmit` 当前失败，扫描到约 84 条类型错误，主要集中在 Pinia reactive class 实例、宽泛 `Record` 强转、回调签名和空值判断。

## 建议优先级

1. 先建立护栏：新增 `typecheck` 脚本、修复现有类型错误、补序列化/运行时/资源路径的基础测试。
2. 再拆边界：封装 `window.unu`、抽出 Electron IPC 模块、把 renderer 对 store 的直接依赖改成注入接口。
3. 然后清资产：合并示例资源来源，停止追踪构建产物，处理 `sample-project` 特殊哨兵。
4. 最后做大拆分：`PixiRenderer`、`ScriptRuntime`、`InspectorPanel`、`scene` store 按职责拆成小模块。

