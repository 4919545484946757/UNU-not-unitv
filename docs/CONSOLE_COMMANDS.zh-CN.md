# UNU Console 常用调试指令

UNU 编辑器中间底部的 `Console` 支持脚本日志输出和调试指令输入。输入指令后按 `Enter` 执行，按 `↑ / ↓` 可以切换历史指令。

## 基础指令

| 指令 | 作用 | 示例 |
| --- | --- | --- |
| `help` | 显示常用指令摘要 | `help` |
| `clear` / `cls` | 清空控制台输出 | `clear` |
| `fps` | 输出当前 FPS 与 deltaTime | `fps` |

## 播放控制

| 指令 | 作用 | 示例 |
| --- | --- | --- |
| `play` | 进入播放预览 | `play` |
| `pause` | 暂停播放预览 | `pause` |
| `resume` | 继续播放预览 | `resume` |
| `stop` | 停止播放预览并回到编辑态 | `stop` |
| `debug on` | 显示播放调试信息 | `debug on` |
| `debug off` | 隐藏播放调试信息 | `debug off` |
| `debug` | 切换播放调试信息显示状态 | `debug` |

## 场景与实体

| 指令 | 作用 | 示例 |
| --- | --- | --- |
| `scenes` | 列出已加载场景 | `scenes` |
| `scene <name/id>` | 切换编辑场景，播放中不可用 | `scene MainScene` |
| `entities` / `ls` | 列出当前场景实体 | `entities` |
| `entities <filter>` | 按 ID 或名称过滤实体 | `entities Enemy` |
| `select <id/name>` | 选中实体 | `select Player` |
| `inspect <id/name>` | 查看实体组件列表 | `inspect Enemy` |
| `remove <id/name>` | 删除实体。播放中删除运行态副本，编辑态删除场景实体 | `remove Enemy` |

## 属性读取与修改

组件属性路径格式为 `Component.property`。常见组件包括 `Transform`、`Sprite`、`Collider`、`Script`、`Camera`、`Background`、`Interactable`。

| 指令 | 作用 | 示例 |
| --- | --- | --- |
| `get <id/name> <Component.prop>` | 读取实体组件属性 | `get Player Transform.x` |
| `set <id/name> <Component.prop> <value>` | 设置实体组件属性 | `set Player Transform.x 120` |
| `tp <id/name> <x> <y>` | 快速移动实体位置 | `tp Player 0 120` |

## 脚本输出

项目脚本可使用以下 API 输出到 Console：

```js
ctx.api.log('hello')
ctx.api.warn('something suspicious')
ctx.api.error('something failed')
```

示例项目中，Enemy 重生时会输出：

```js
ctx.api.log(`[${spawnedEnemy.id}] respawn`)
```

## 注意事项

- 播放态下的 `set`、`tp`、`remove` 会优先作用于运行态副本，停止播放后不会写回编辑场景。
- 编辑态下的 `set`、`tp`、`remove` 会标记场景为已修改。
- 名称包含空格时可使用引号，例如 `select "Enemy Boss"`。
