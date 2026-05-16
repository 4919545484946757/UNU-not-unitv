# UNU Console 常用调试命令

[English](CONSOLE_COMMANDS.en-US.md) | 中文

更新时间：`2026-05-15`

UNU 编辑器底部的 `Console` 面板包含两个页签：

- `Log`：显示脚本日志、错误、状态信息，并支持输入调试命令。
- `Performance`：显示 FPS、实体数量，以及可选的详细性能采样数据。

在 `Log` 页签输入命令后按 `Enter` 执行。按 `Up` / `Down` 可以切换历史命令。输出内容支持 `\n` 换行和 `\t` 缩进。

## 基础命令

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `help` | 显示常用命令摘要 | `help` |
| `clear` / `cls` | 清空控制台输出 | `clear` |
| `fps` | 输出当前 FPS 和 deltaTime；开启详细采样后会额外输出阶段耗时 | `fps` |

## 播放控制

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `play` | 进入播放预览 | `play` |
| `pause` | 暂停播放预览 | `pause` |
| `resume` | 继续播放预览 | `resume` |
| `stop` | 停止播放并回到编辑态 | `stop` |
| `debug on` | 显示播放调试信息 | `debug on` |
| `debug off` | 隐藏播放调试信息 | `debug off` |
| `debug` | 切换播放调试信息显示状态 | `debug` |

## 场景与实体

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `scenes` | 列出已加载场景 | `scenes` |
| `scene <name/id>` | 切换编辑场景，播放中不可用 | `scene MainScene` |
| `entities` / `ls` | 列出当前场景实体 | `entities` |
| `entities <filter>` | 按 ID 或名称过滤实体 | `entities Enemy` |
| `select <id/name>` | 选中实体 | `select Player` |
| `inspect <id/name>` | 查看实体组件列表 | `inspect Enemy` |
| `remove <id/name>` / `delete <id/name>` | 删除实体 | `remove Enemy` |

## 属性读取与修改

组件属性路径格式为 `Component.property`，例如 `Transform.x`、`Sprite.texturePath`、`Collider.width`。

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `get <id/name> <Component.prop>` | 读取实体组件属性 | `get Player Transform.x` |
| `set <id/name> <Component.prop> <value>` | 设置实体组件属性 | `set Player Transform.x 120` |
| `tp <id/name> <x> <y>` | 快速移动实体位置 | `tp Player 0 120` |

## 性能页签

`Performance` 页签默认只显示低成本信息：

- `FPS`
- `Entities`

详细阶段采样默认关闭。打开 `Detailed performance sampling` 后，会额外显示：

- `Frame Time`
- `Render`
- `Script`
- `Collision`
- `Animation`
- `Audio Sync`
- `Camera`

详细采样会带来少量额外开销，因此默认关闭。需要定位性能问题时再打开即可。

## 日志过滤

状态消息已经整合到 Console。顶部的“显示日志信息/隐藏日志信息”按钮可以控制是否显示状态类日志，例如打开文件夹、项目保存、导出完成等信息。

- 鼠标悬浮按钮会显示提示。
- 右键按钮可以打开日志白名单菜单。
- 白名单中可以勾选希望显示的状态信息类别。

## 脚本输出

项目脚本可以通过以下 API 输出到 Console：

```js
ctx.api.log('hello')
ctx.api.warn('something suspicious')
ctx.api.error('something failed')
```

示例项目中，Enemy 重生时会输出类似：

```js
ctx.api.log(`[${spawnedEnemy.id}] respawn`)
```

## 注意事项

- 播放态下的 `set`、`tp`、`remove` 会优先作用于运行态副本，停止播放后不会写回编辑场景。
- 编辑态下的 `set`、`tp`、`remove` 会标记场景为已修改。
- 名称包含空格时可以使用引号，例如 `select "Enemy Boss"`。
- 若需要长期调试性能，请先观察低成本指标，再按需打开详细采样。
