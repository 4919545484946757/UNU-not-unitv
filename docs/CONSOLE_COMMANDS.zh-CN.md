# UNU Console 常用调试命令

[English](CONSOLE_COMMANDS.en-US.md) | 中文

更新时间：`2026-05-19`  
适用版本：`0.5.0`

Console 包含 `Log` 与 `Performance` 两个页签。`Log` 支持命令输入、重复日志折叠、状态日志白名单和脚本输出；`Performance` 默认低开销，打开详细采样后显示 Render、Script、Collision、Animation、Audio Sync、Camera 等阶段耗时。

## 基础命令

| 命令 | 作用 |
| --- | --- |
| `help` | 显示命令摘要，支持 `\n` 和 `\t`。 |
| `clear` / `cls` | 清空控制台。 |
| `fps` | 输出 FPS 和 deltaTime。 |
| `play` / `pause` / `resume` / `stop` | 控制播放。 |
| `debug on` / `debug off` / `debug` | 控制播放调试层。 |
| `scenes` / `scene <name/id>` | 查看或切换编辑场景。 |
| `entities` / `select <id/name>` / `inspect <id/name>` | 查看、选中和检查实体。 |
| `get <id/name> <Component.prop>` | 读取组件字段。 |
| `set <id/name> <Component.prop> <value>` | 设置组件字段。 |
| `tp <id/name> <x> <y>` | 移动实体。 |

## 脚本输出

```js
ctx.api.log('hello')
ctx.api.warn('warning')
ctx.api.error('failed')
```

高频重复日志会折叠显示，适合 Enemy 重生、缺失资源、碰撞调试等场景。
