# UNU Console 常用调试命令

[English](CONSOLE_COMMANDS.en-US.md) | 中文

更新时间：`2026-05-21`  
适用版本：`0.5.0+`

控制台位于 Scene View 下方，包含 `Log` 与 `Performance` 两个页签。`Log` 页签可以接收命令、显示脚本输出、折叠重复日志，并可通过白名单控制是否显示“打开文件夹、项目已保存、资源修复”等状态消息。`Performance` 页签默认只显示低成本指标，打开“详细阶段采样”后才统计 Render、Script、Collision、Animation、Audio Sync、Camera 等阶段耗时。

## 输入规则

| 规则 | 说明 |
| --- | --- |
| 空格分隔 | 命令和参数用空格分隔，例如 `tp Player 0 120`。 |
| 引号参数 | 名称中含空格时使用引号，例如 `select "Enemy Boss"`。 |
| 键值参数 | 部分命令支持 `key=value`，例如 `slot=19 replace=true`。 |
| JSON 参数 | `give` 支持把额外参数写成单段 JSON 字符串。 |
| 转义输出 | 控制台输出支持 `\n` 换行和 `\t` 缩进，`help` 会自动分行。 |
| 历史记录 | 输入框支持常见命令历史行为，便于反复调试。 |

命令默认作用于当前活动场景。编辑态下修改的是编辑场景；播放态下多数运行调试命令作用于运行态场景副本，停止播放后不会自动写回项目文件，除非命令本身明确走编辑器保存流程。

## 基础命令

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `help` / `?` | 显示命令摘要。 | `help` |
| `clear` / `cls` | 清空控制台当前日志。 | `clear` |
| `fps` | 输出 FPS 和 deltaTime；开启详细采样后附带阶段耗时。 | `fps` |
| `play` | 开始播放预览。 | `play` |
| `pause` | 暂停播放预览。 | `pause` |
| `resume` | 继续播放预览。 | `resume` |
| `stop` | 停止播放预览并回到编辑态。 | `stop` |
| `debug` | 切换播放调试层显示状态。 | `debug` |
| `debug on` / `debug off` | 显式开启或关闭播放调试层。 | `debug on` |

播放调试层会显示碰撞箱、实体边界框、Tilemap 网格、实体名称、可交互高亮提示等信息。普通播放默认隐藏这些调试信息，避免示例游戏视觉被干扰。

## 场景命令

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `scenes` | 列出当前项目已发现的场景。 | `scenes` |
| `scene <name/id>` | 切换编辑态 Scene View 的场景。播放中不可用。 | `scene SecondScene` |

场景列表会在项目打开时自动同步实际场景文件；如果另存为或重命名后出现引用缺失，资源依赖检查与自动修复会尝试改写旧路径。

## 实体命令

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `entities` / `ls` | 列出当前场景实体。 | `entities` |
| `entities <filter>` / `ls <filter>` | 按 ID 或名称过滤实体。 | `ls Enemy` |
| `select <id/name>` | 在编辑器中选中实体。 | `select Player` |
| `inspect <id/name>` | 输出实体基本信息和组件列表。 | `inspect Chest_001` |
| `remove <id/name>` / `delete <id/name>` | 删除实体。 | `remove Bullet_001` |

实体查找通常同时支持 ID 和名称。若存在重名实体，建议使用稳定 ID。

## 属性与位置命令

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `get <id/name> <Component.prop>` | 读取组件字段。 | `get Player Transform.x` |
| `set <id/name> <Component.prop> <value>` | 写入组件字段。数值、布尔值和 JSON 会尽量自动解析。 | `set Player Sprite.tint 16777215` |
| `tp <id/name> <x> <y>` | 快速移动实体到指定坐标。 | `tp Player 0 120` |

常见路径包括 `Transform.x`、`Transform.y`、`Transform.rotation`、`Sprite.tint`、`Collider.width`、`Collider.height`、`UI.text`。自定义组件可以通过其组件名访问，例如 `Health.data.current` 或 `Inventory.data.items`。

## 背包与物品命令

背包命令写入实体的 `Inventory.data.items`。如果实体没有 Inventory 自定义组件，`inv` / `give` 会自动创建默认 24 格背包。

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `inv <id/name>` / `inventory <id/name>` | 查看实体背包。 | `inv Player` |
| `give <id/name> <namespace:item> [数量] [参数]` | 给实体添加物品。 | `give Player sample-2D-shooting:bandage 3` |
| `take <id/name> <namespace:item> [数量]` | 按物品命名空间移除物品。 | `take Player sample-2D-shooting:bandage 1` |
| `take <id/name> slot=<格子>` | 按格子移除物品。 | `take Player slot=19` |
| `clearinv <id/name>` / `clearinventory <id/name>` | 清空实体背包。 | `clearinv Enemy_001` |

`give` 的额外参数支持两种格式：

```text
give Player sample-2D-shooting:auto_rifle 1 slot=19 replace=true quality=debug durability=100

give Player sample-2D-shooting:medkit 1 '{"slot":5,"replace":true,"quality":"rare"}'
```

| 参数 | 说明 |
| --- | --- |
| `slot` | 1 基下标；不传时自动放入第一个空格。 |
| `replace=true` | 允许覆盖已占用格子。 |
| 其他键值 | 写入 `Inventory.data.itemMeta[slotIndex]`，供项目脚本读取。 |
| 数量 | 表示占用多个格子，不是单格堆叠数量。 |

示例项目使用 `[项目名]:[物品英文名]` 命名空间，例如 `sample-2D-shooting:scp_500`、`sample-2D-shooting:debug_spawn_enemy`。物品定义位于项目资源目录下的 items/脚本资源中。

## 生命值命令

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `hp <id/name>` / `health <id/name>` | 查看生命值。 | `hp Player` |
| `hp <id/name> <value>` | 设置当前生命值。 | `hp Enemy_001 50` |
| `heal <id/name> <amount>` | 治疗指定数值。 | `heal Player 25` |
| `heal <id/name> full` | 恢复到最大生命值。 | `heal Player full` |
| `damage <id/name> <amount>` | 对实体造成伤害。 | `damage Enemy_001 25` |

如果实体没有 Health 自定义组件，生命值命令会自动创建 `{ max: 100, current: 100 }`。护甲、调试王冠、敌人伤害间隔等更复杂规则由项目脚本决定，命令只负责直接读写基础 Health 数据。

## 脚本输出

项目脚本可以通过 `ctx.api` 向控制台输出调试信息：

```js
ctx.api.log('[Enemy_001] respawn')
ctx.api.warn('low ammo')
ctx.api.error('failed to load item')
```

控制台会自动折叠大量重复日志。例如同一个缺失资源、同一个脚本报错、同一个敌人重生提示反复出现时，会显示为一条折叠记录并累加次数，避免调试区被刷屏。

## 日志显示白名单

工具栏中的“显示日志信息/隐藏日志信息”按钮控制状态类信息是否进入控制台。鼠标悬浮会显示提示；右键可打开白名单菜单，勾选需要显示的状态类型，例如文件夹打开、项目保存、资源修复、导出结果等。脚本 `log/warn/error` 不受该白名单影响。

## 性能页签

| 功能 | 说明 |
| --- | --- |
| FPS | 显示当前帧率。 |
| Render | 渲染阶段耗时。 |
| Script | 脚本生命周期与项目脚本耗时。 |
| Collision | 碰撞、触发器、碰撞矩阵检测耗时。 |
| Animation | 动画状态机、帧切换、贴图同步耗时。 |
| Audio Sync | 音频组件同步耗时。 |
| Camera | 相机跟随、视口缩放、UI 布局同步耗时。 |

详细阶段采样默认关闭。只有打开性能监测开关后，才会记录更细的阶段数据，以免平时调试反而影响游戏帧率。

## 常用调试配方

```text
# 给玩家三份绷带
give Player sample-2D-shooting:bandage 3

# 把自动步枪放入第 19 格并覆盖旧物品
give Player sample-2D-shooting:auto_rifle 1 slot=19 replace=true

# 查看玩家背包与生命值
inv Player
hp Player

# 让敌人保留至少 50 生命值
hp Enemy_001 50

# 切到第二场景编辑
scene SecondScene

# 传送玩家到门附近
tp Player 120 300
```
