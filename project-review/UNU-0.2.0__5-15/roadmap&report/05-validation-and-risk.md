# 05. 验证结果与风险清单

## 已执行检查

### 文件结构扫描

- 使用 `rg --files` 获取仓库文件。
- 统计了根目录、`src/`、`electron/` 的文件数量、大小和行数。
- 统计了大文件排行。
- 扫描了重复媒体文件 hash。
- 扫描了 `window.unu` 使用分布。
- 用轻量 import 解析检查了本地静态 import 关系。

### 类型检查

执行命令：

```bash
npx vue-tsc --noEmit
```

结果：失败。

错误分布：

| 错误码 | 数量 | 主要含义 |
|---|---:|---|
| `TS2345` | 46 | Pinia/Vue reactive 后的 `Scene` 结构不再满足原 `Scene` 类；以及事件回调参数不匹配 |
| `TS2352` | 21 | 组件实例强转成 `Record<string, number|string|boolean>` |
| `TS2322` | 8 | 回调期望 `void | Promise<void>`，实际返回带值 Promise |
| `TS18047` | 4 | `entity.value` 可能为 null |
| `TS7022` | 3 | 隐式 any/self reference |
| `TS7023` | 2 | 隐式 any 返回类型 |

重点问题：`Scene` 类含 private `syncZIndices`，但 Pinia/Vue 会把类实例代理成普通结构，导致多处传参被 TypeScript 判定不兼容。这是模型层和状态层边界不清的直接症状。

### 测试与构建

- 未发现测试文件。
- 未执行 `npm run build`，因为该命令会写入 `dist/` 和 `dist-electron/`，而本次任务是审查与报告，不应额外扰动构建产物。
- `package.json` 没有 `test`、`lint`、`typecheck` 脚本。

## 高风险点

### 1. 类型系统当前不能作为护栏

`tsconfig.json` 开了 `strict: true`，但实际 `vue-tsc` 失败。后续继续加功能时，很容易把运行时问题延后到手测阶段。

建议：先把 `typecheck` 修绿，并纳入默认验证。

### 2. Electron 主进程权限面太大

`electron/main.ts` 中有大量文件系统操作，包括 `fs.rm`、`fs.cp`、`fs.rename`、项目删除、资源删除、资源移动、导出复制。虽然有一些路径 normalize 和 projectRoot 校验，但逻辑集中在一个文件里，审计困难。

建议：拆 service 后给危险操作写路径安全测试，尤其是“必须在 projectRoot 内”的操作。

### 3. 项目脚本直接执行

`ScriptRuntime`、`InputState`、`AudioRuntime` 都通过 `typescript.transpileModule` + `new Function` 执行项目代码。对本地游戏编辑器这是可接受的早期方案，但不能宣传成安全沙箱。

建议：文档明确“项目脚本拥有执行能力”；未来如要打开第三方工程，需要 sandbox/权限模型。

### 4. 运行态和编辑态共享模型风险

当前播放态通过 `serializeScene` + `deserializeScene` 复制 scene，这是正确方向。但 Renderer、Scene Store、Runtime 之间仍然互相感知，播放态热重载、场景切换、runtimeScene 同步等逻辑集中在 `PixiRenderer` 和 `CenterViewport`。

建议：抽 `RuntimePreviewController`，明确 source scene 和 play scene 的生命周期。

### 5. Store 与文件系统耦合

`assets.ts` 同时处理资源树、文件撤销重做、项目创建打开、导入导出、文件重命名、状态消息。任何小改动都可能影响项目生命周期。

建议：store 只保存状态；文件操作放到 services/use-cases。

### 6. 样例资源来源过多

重复资源不仅浪费空间，也让“改一张图到底改哪份”变得不清楚。当前至少有四套样例资源来源。

建议：先定唯一真源，再做删除。

### 7. 构建产物追踪策略不一致

`.gitignore` 忽略了 `dist`，但 `dist-electron` 已被 Git 追踪。这样容易让 dev 依赖旧产物，也让构建输出污染 PR。

建议：改造 dev/build 流程后移除 `dist-electron` 追踪。

## 中风险点

- `window.unu` 调用分散：前端、engine runtime、renderer 都能直接触达 Electron API。
- `sample-project` 字符串哨兵分散：代码里大量判断 `rootPath === 'sample-project'`。
- `InspectorPanel.vue` 用通用 setter 和 `Record` 强转更新不同组件字段，短期快，长期类型不可控。
- `README`、`docs`、代码中的功能描述可能与实际行为漂移，需要文档检查脚本或单一功能清单来源。
- `Sample-project-list/Snake` 与实际 `snake` 目录大小写不一致，Windows 不暴露问题，跨平台会踩坑。

## 低风险/正向信号

- 静态 import 未发现循环依赖。
- 数据格式有明确 `format/version` 字段。
- 播放态通过序列化复制 scene，避免直接污染编辑态，方向正确。
- 资源引用修复、移动重命名后的 relink 已经有基础设计。
- Console、性能指标、脚本错误定位都已有雏形，利于后续做调试体验。

## 建议验收清单

短期每次重构后至少跑：

```bash
npm run typecheck
npm run test
```

当测试脚本还没有建立时，手动验收至少覆盖：

- 打开 Launcher。
- 打开 `sample-2D-shooting`。
- 打开 `snake`。
- 新建本地工程。
- 保存/另存当前场景。
- 导入图片和音频。
- 资源重命名后场景引用仍正确。
- 播放、暂停、继续、停止。
- 脚本热重载。
- Tilemap 子窗口打开、编辑、应用。
- Code Editor 子窗口打开、保存、关闭。
- Web 游戏导出并通过生成脚本启动。

