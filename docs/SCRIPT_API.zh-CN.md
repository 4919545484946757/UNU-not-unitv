# UNU 脚本 API 提示文档

[English](SCRIPT_API.en-US.md) | 中文

本文是 UNU 项目脚本的快速查询表，适合在脚本编辑器中实现 Player、Enemy、子弹、门、拾取物、陷阱、UI 提示等游戏逻辑时参考。

## 脚本入口

每个项目可以拥有自己的运行时脚本文件，通常位于：

```text
assets/scripts/ScriptRuntime.ts
```

实体的 `Script` 组件通过 `scriptPath` 绑定脚本。运行时会在导出的 `scripts` 表中查找同名脚本，并调用对应生命周期函数。

UNU 也支持“项目级共享脚本 + 场景级可选脚本”目录约定：

```text
assets/scripts/shared/              # 任意场景都可复用
assets/scripts/scenes/MainScene/    # MainScene 专属脚本
assets/scripts/scenes/SecondScene/  # SecondScene 专属脚本
```

这些目录中的脚本文件可以直接导出 Hook 对象，文件路径就是实体 `Script.scriptPath`。

```ts
export const scripts = {
  'assets/scripts/player.js': {
    onUpdate(ctx) {
      const transform = ctx.entity.getTransform()
      const move = ctx.api.input.getMoveVector(true)
      if (!transform) return

      const speed = ctx.api.input.isActionDown('sprint') ? 280 : 140
      transform.x += move.x * speed * ctx.api.delta
      transform.y += move.y * speed * ctx.api.delta
    }
  }
}
```

```ts
// assets/scripts/scenes/SecondScene/player-platformer.js
export default {
  onUpdate(ctx) {
    ctx.api.log('SecondScene only')
  }
}
```

## 生命周期

| Hook | 触发时机 | 常见用途 |
| --- | --- | --- |
| `onInit(ctx)` | 脚本首次初始化 | 初始化状态、缓存配置 |
| `onStart(ctx)` | 实体开始运行 | 生成初始数据、播放入场音效 |
| `onEnterScene(ctx)` | 实体进入场景 | 恢复状态、刷新 UI |
| `onExitScene(ctx)` | 实体退出场景 | 保存状态、停止音效 |
| `onUpdate(ctx)` | 每帧更新 | 移动、AI、输入读取、计时 |
| `onInteract(ctx)` | 可交互实体被交互 | 门、箱子、NPC、机关 |
| `onCollisionEnter(ctx)` | 碰撞开始 | 子弹命中、受伤、落地 |
| `onCollisionStay(ctx)` | 碰撞持续 | 推挤、持续伤害 |
| `onCollisionExit(ctx)` | 碰撞结束 | 离开地面、离开区域 |
| `onTriggerEnter(ctx)` | 进入 Trigger | 拾取物、传送区、检测区 |
| `onTriggerStay(ctx)` | 停留 Trigger | 持续区域效果 |
| `onTriggerExit(ctx)` | 离开 Trigger | 关闭提示、停止区域效果 |
| `onDestroy(ctx)` | 实体销毁前 | 清理状态、生成特效 |

## ScriptContext

每个 Hook 都会收到 `ctx`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ctx.entity` | `Entity` | 当前执行脚本的实体 |
| `ctx.scene` | `Scene` | 当前场景 |
| `ctx.event` | `ScriptEvent \| undefined` | 碰撞、触发器、场景事件数据 |
| `ctx.api` | `Script API` | 引擎提供的脚本能力 |

## 常用组件访问

```ts
const transform = ctx.entity.getTransform()
const sprite = ctx.entity.getComponent('Sprite')
const collider = ctx.entity.getComponent('Collider')
const script = ctx.entity.getComponent('Script')
```

建议先判空再使用组件，避免脚本被绑定到缺少组件的实体时报错。

## 时间、状态与日志

| API | 说明 |
| --- | --- |
| `ctx.api.delta` | 当前帧间隔，单位秒 |
| `ctx.api.time` | 当前运行时间，单位秒 |
| `ctx.api.getState(entity)` | 获取实体私有状态对象，可跨帧保存数据 |
| `ctx.api.log(...values)` | 输出普通日志到 Console |
| `ctx.api.warn(...values)` | 输出警告到 Console |
| `ctx.api.error(...values)` | 输出错误到 Console |

```ts
const state = ctx.api.getState<{ timer?: number }>(ctx.entity)
state.timer = (state.timer ?? 0) + ctx.api.delta
ctx.api.log(`[${ctx.entity.id}] timer`, state.timer)
```

## 输入 API

| API | 说明 |
| --- | --- |
| `ctx.api.input.isKeyDown(code)` | 键盘按键是否按下，例如 `KeyW`、`ShiftLeft` |
| `ctx.api.input.isMouseDown(button?)` | 鼠标按钮是否按下，左键 `0`，中键 `1`，右键 `2` |
| `ctx.api.input.wasMousePressed(button?)` | 鼠标按钮是否在本帧按下 |
| `ctx.api.input.isActionDown(action)` | 动作是否按下，例如 `move_left`、`shoot`、`sprint` |
| `ctx.api.input.wasActionPressed(action)` | 动作是否在本帧触发 |
| `ctx.api.input.wasActionReleased(action)` | 动作是否在本帧释放 |
| `ctx.api.input.getAxis('horizontal' \| 'vertical')` | 获取水平或垂直轴 |
| `ctx.api.input.getMoveVector(normalized?)` | 获取移动向量，`true` 可保证斜向移动不超速 |
| `ctx.api.input.getMousePosition()` | 获取鼠标世界坐标 |

```ts
const move = ctx.api.input.getMoveVector(true)
if (ctx.api.input.wasActionPressed('shoot')) {
  const mouse = ctx.api.input.getMousePosition()
  ctx.api.spawnBullet(ctx.entity, {
    targetX: mouse.x,
    targetY: mouse.y,
    speed: 520,
    maxDistance: 900
  })
}
```

## 场景与实体 API

| API | 说明 |
| --- | --- |
| `ctx.api.getSelectedEntity()` | 获取编辑器当前选择实体，通常用于调试 |
| `ctx.api.findEntityByName(name)` | 按名称查找实体 |
| `ctx.api.removeEntity(target)` | 删除实体，运行时会安全延迟执行 |
| `ctx.api.spawnEntity(entity)` | 生成实体，运行时会安全延迟执行 |
| `ctx.api.switchScene(sceneName, options?)` | 切换场景 |

`switchScene` 的 `options`：

| 字段 | 说明 |
| --- | --- |
| `targetSpawnId` | 切换后绑定出生点实体 ID |
| `sceneStateMode` | `preserve` 保留场景状态，`reset` 重置场景状态 |

```ts
ctx.api.switchScene('SecondScene', {
  targetSpawnId: 'Spawn_From_Main',
  sceneStateMode: 'preserve'
})
```

## 碰撞与 Trigger API

| API | 说明 |
| --- | --- |
| `ctx.api.isBlockedAt(x, y)` | 检查某个点是否被 Tilemap 碰撞阻挡 |
| `ctx.api.isBlockedRect(cx, cy, halfW, halfH)` | 检查矩形区域是否被 Tilemap 碰撞阻挡 |
| `ctx.api.isTouching(left, right)` | 检查两个实体是否接触 |
| `ctx.api.findEnemyOverlap(target?, matcher?)` | 查找与目标重叠的 Enemy 类实体 |
| `ctx.api.moveTowards(source, target, speed, useCollision?)` | 让实体朝目标移动，可接入阻挡检测 |

碰撞和 Trigger 事件中，`ctx.event` 包含：

| 字段 | 说明 |
| --- | --- |
| `event.type` | `collisionEnter`、`collisionStay`、`collisionExit`、`triggerEnter`、`triggerStay`、`triggerExit` |
| `event.other` | 另一方实体 |
| `event.selfCollider` | 当前实体碰撞组件 |
| `event.otherCollider` | 另一方碰撞组件 |

```ts
onCollisionEnter(ctx) {
  const event = ctx.event
  if (!event || !('other' in event)) return

  if (event.other.name.startsWith('Enemy')) {
    ctx.api.removeEntity(event.other)
    ctx.api.log(`[${event.other.id}] destroyed`)
  }
}
```

`findEnemyOverlap` 可用的匹配条件：

```ts
ctx.api.findEnemyOverlap(ctx.entity, {
  idPrefix: 'Enemy_',
  namePrefix: 'Enemy',
  scriptPathPrefix: 'assets/scripts/enemy',
  requireCollider: true,
  requireSprite: true
})
```

## 游戏辅助 API

| API | 说明 |
| --- | --- |
| `ctx.api.spawnEnemyLike(source?, options?)` | 按已有 Enemy 模板生成新 Enemy |
| `ctx.api.spawnBullet(source?, options?)` | 从实体位置生成子弹 |

`spawnEnemyLike` 选项：

| 字段 | 说明 |
| --- | --- |
| `x`, `y` | 指定生成位置 |
| `avoidX`, `avoidY` | 需要避开的坐标 |
| `minDistance` | 与避开坐标保持的最小距离 |

`spawnBullet` 选项：

| 字段 | 说明 |
| --- | --- |
| `angle` | 子弹方向，弧度 |
| `targetX`, `targetY` | 朝指定世界坐标发射 |
| `speed` | 子弹速度 |
| `life` | 生存时间，秒 |
| `maxDistance` | 最大飞行距离 |
| `width`, `height` | 子弹尺寸 |
| `tint` | 子弹颜色 |

## 背景与音频 API

| API | 说明 |
| --- | --- |
| `ctx.api.setBackgroundTexture(texturePath)` | 设置当前场景背景贴图 |
| `ctx.api.cycleBackgroundTexture(texturePaths)` | 在多张背景贴图间循环 |
| `ctx.api.audio.playOneShot(clipPath, options?)` | 播放一次性音效 |
| `ctx.api.audio.playEntity(target?)` | 播放实体 Audio 组件 |
| `ctx.api.audio.stopEntity(target?)` | 停止实体 Audio 组件 |
| `ctx.api.audio.setMasterVolume(volume)` | 设置主音量 |
| `ctx.api.audio.setGroupVolume(group, volume)` | 设置音频分组音量 |
| `ctx.api.audio.getMasterVolume()` | 获取主音量 |
| `ctx.api.audio.getGroupVolume(group)` | 获取分组音量 |

```ts
await ctx.api.audio.playOneShot('assets/audio/hit.wav', {
  group: 'sfx',
  volume: 0.8
})
```

## 交互 JSON 动作

可交互实体也可以用 `Script` 组件的 JSON 配置快速定义交互行为：

```json
{
  "onInteract": [
    {
      "type": "switchScene",
      "scene": "SecondScene",
      "targetSpawnId": "Spawn_From_Main",
      "sceneStateMode": "preserve"
    }
  ]
}
```

支持的动作：

| `type` | 说明 |
| --- | --- |
| `sequence` | 顺序执行多个动作 |
| `randomOne` | 随机执行一个动作 |
| `switchScene` | 切换场景 |
| `setBackgroundTexture` | 设置背景贴图 |
| `cycleBackgroundTexture` | 循环背景贴图 |
| `setTexture` | 设置目标 Sprite 贴图 |
| `cycleTexture` | 循环目标 Sprite 贴图 |
| `setTint` | 设置目标颜色 |
| `cycleTint` | 循环目标颜色 |
| `toggleVisible` | 切换目标 Sprite 可见性 |
| `setInteractDistance` | 设置交互距离 |
| `removeEntity` | 删除目标实体 |

`target` 可填写：

| 写法 | 目标 |
| --- | --- |
| 空或 `self` | 当前实体 |
| `selected` | 编辑器当前选择实体 |
| `id:EntityId` | 指定 ID 的实体 |
| `EntityName` | 指定名称的实体 |

## 调试建议

- 优先用 `ctx.api.log/warn/error` 输出脚本日志，错误会关联脚本文件和行号。
- 移动类脚本建议使用 `getMoveVector(true)`，避免斜向移动速度过快。
- 场景切换默认建议使用 `sceneStateMode: 'preserve'`，需要重置关卡时再使用 `reset`。
- 子弹、临时特效、掉落物应设置生命周期或距离限制，避免实体无限堆积。
- 碰撞逻辑尽量放在 `onCollisionEnter/Stay/Exit` 或 `onTriggerEnter/Stay/Exit` 中，便于与碰撞矩阵、Trigger 区域配合。
