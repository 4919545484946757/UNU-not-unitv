# UNU 脚本 API 参考

[English](SCRIPT_API.en-US.md) | 中文

更新时间：`2026-05-21`  
适用版本：`0.5.0+`

本文只记录当前代码实际暴露的脚本能力。项目脚本通常位于：

```text
assets/scripts/ScriptRuntime.ts
assets/scripts/InputState.ts
assets/scripts/AudioRuntime.ts
assets/scripts/shared/
assets/scripts/interactions/
assets/scripts/scenes/<SceneName>/
```

实体通过 `Script.scriptPath` 绑定脚本。保存文本资源后会触发热重载；编译或运行错误会输出到 Console，并尽量定位到资源树文件、行号和列号。Web 导出会复制 `assets/`、`scenes/`、`prefabs/`。

## 脚本模块格式

```js
export default {
  onInit(ctx) {},
  onUpdate(ctx) {}
}
```

## 生命周期 Hooks

| Hook | 触发时机 | 常见用途 |
| --- | --- | --- |
| `onInit(ctx)` | 脚本首次初始化。 | 初始化状态、读取 JSON 配置。 |
| `onStart(ctx)` | 实体开始运行。 | 播放入场音效、生成初始数据。 |
| `onEnterScene(ctx)` / `onExitScene(ctx)` | 进入/离开运行场景。 | 恢复或保存状态。 |
| `onUpdate(ctx)` | 每帧播放态更新。 | 移动、AI、计时、射击。 |
| `onPausedUpdate(ctx)` | 游戏暂停时仍更新。 | 暂停菜单、设置菜单、改键菜单。 |
| `onInteract(ctx)` | 可交互实体被交互。 | 门、箱子、NPC、机关。 |
| `onUiClick(ctx)` | Pixi UI Button/Slider 被操作。 | 菜单按钮、音量、难度。 |
| `onHtmlMessage(ctx)` | HTML UI 调用 `window.UNU.emit`。 | 背包、容器、复杂 DOM UI。 |
| `onCollisionEnter/Stay/Exit(ctx)` | 碰撞开始/持续/结束。 | 受击、持续伤害、离开接触。 |
| `onTriggerEnter/Stay/Exit(ctx)` | Trigger 进入/停留/离开。 | 拾取、传送、区域效果。 |
| `onDestroy(ctx)` | 实体销毁前。 | 清理状态、生成掉落。 |

## ScriptContext

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ctx.entity` | `Entity` | 当前执行脚本的实体。 |
| `ctx.scene` | `Scene` | 当前运行场景。 |
| `ctx.event` | `ScriptEvent \| undefined` | UI、HTML、碰撞、Trigger、场景事件。 |
| `ctx.api` | `Script API` | 引擎提供的运行时能力。 |

## Entity / Scene 常用方法

| API | 说明 |
| --- | --- |
| `entity.id` / `entity.name` | 实体 ID 与名称。 |
| `entity.sceneFolderPath` | Scene 文件树中的类文件夹路径。 |
| `entity.getTransform()` | 获取 Transform 组件。 |
| `entity.getComponent(type)` | 获取组件，例如 `Sprite`、`Collider`、`UI`、`Script`、`Inventory`。 |
| `entity.addComponent(component)` / `entity.removeComponent(type)` | 添加或删除组件。 |
| `scene.entities` | 当前场景实体数组。 |
| `scene.getEntityById(id)` | 按 ID 查找实体。 |
| `scene.addEntity(entity)` / `scene.removeEntityById(id)` | 直接添加/删除实体；脚本中更推荐 `ctx.api.spawnEntity/removeEntity`。 |

## ctx.api 基础能力

| API | 说明 |
| --- | --- |
| `ctx.api.delta` | 当前帧间隔，单位秒。 |
| `ctx.api.time` | 当前场景运行时间，单位秒。 |
| `ctx.api.getState(entity)` | 获取实体运行态私有状态对象，按场景和实体 ID 隔离。 |
| `ctx.api.log(...values)` / `warn(...values)` / `error(...values)` | 输出到 Console。 |

## 输入 API

默认动作：`move_left`、`move_right`、`move_up`、`move_down`、`sprint`、`jump`、`fire`、`interact`、`menu`。

| API | 说明 |
| --- | --- |
| `ctx.api.input.isKeyDown(code)` | 键盘按键是否按下，例如 `KeyW`。 |
| `ctx.api.input.isMouseDown(button?)` | 鼠标按钮是否按下，左键 `0`、中键 `1`、右键 `2`。 |
| `ctx.api.input.wasMousePressed(button?)` | 鼠标按钮本帧是否按下。 |
| `ctx.api.input.isActionDown(action)` | 动作是否按下。 |
| `ctx.api.input.wasActionPressed(action)` | 动作本帧是否触发。 |
| `ctx.api.input.wasActionReleased(action)` | 动作本帧是否释放。 |
| `ctx.api.input.getAxis("horizontal" | "vertical")` | 获取轴值，范围通常为 `-1..1`。 |
| `ctx.api.input.getMoveVector(normalized?)` | 获取移动向量；传 `true` 可避免斜向超速。 |
| `ctx.api.input.getMousePosition()` | 获取鼠标世界坐标。 |
| `ctx.api.input.getActionMap?.()` | 获取合并后的动作映射。 |
| `ctx.api.input.getActionBindings?.(action)` | 获取动作绑定。 |
| `ctx.api.input.setActionBindings?.(action, bindings)` | 设置用户自定义绑定。 |
| `ctx.api.input.resetActionBindings?.(action?)` | 重置某个动作或全部用户绑定。 |
| `ctx.api.input.getPressedBindings?.()` | 获取本帧按下的键/鼠标绑定，适合改键菜单。 |

## 场景与实体 API

| API | 说明 |
| --- | --- |
| `ctx.api.getSelectedEntity()` | 获取编辑器当前选中实体，通常仅调试使用。 |
| `ctx.api.findEntityByName(name)` | 按名称精确查找当前场景实体。 |
| `ctx.api.findEntitiesByFolder(folderPath, includeDescendants = true)` | 按 Scene 文件树类文件夹查找实体。 |
| `ctx.api.findEntitiesByClass(classPath, includeDescendants = true)` | `findEntitiesByFolder` 的语义别名。 |
| `ctx.api.spawnEntity(entity)` / `ctx.api.removeEntity(entity)` | 延迟生成/删除实体。 |
| `ctx.api.switchScene(sceneName, options?)` | 请求切换场景。选项：`targetSpawnId`、`sceneStateMode: preserve/reset`。 |
| `ctx.api.pauseGame()` / `resumeGame()` / `togglePause()` / `resetGame()` / `exitGame()` | 运行控制。 |

## 碰撞与 Trigger API

碰撞层：`Default`、`Player`、`Enemy`、`World`、`Door`、`Pickup`、`Trap`、`Attack`、`Sensor`、`UI`。

| API | 说明 |
| --- | --- |
| `ctx.api.isBlockedAt(x, y)` | 检查世界坐标点是否被 Tilemap Collision 阻挡。 |
| `ctx.api.isBlockedRect(cx, cy, halfW, halfH)` | 检查矩形是否被 Tilemap Collision 阻挡。 |
| `ctx.api.isTouching(left, right)` | 检查两个实体 Collider 是否重叠。 |
| `ctx.api.findEnemyOverlap(target?, matcher?)` | 查找与目标重叠的 Enemy 类实体。 |
| `ctx.api.moveTowards(source, target, speed, useCollision = true)` | 让实体朝目标移动，可接入 Tilemap 阻挡。 |

`findEnemyOverlap` matcher 可包含：`id`、`ids`、`idPrefix`、`name`、`names`、`namePrefix`、`scriptPath`、`scriptPaths`、`scriptPathPrefix`、`requireCollider`、`requireSprite`。

碰撞事件字段：`event.type`、`event.other`、`event.selfCollider`、`event.otherCollider`。

## 生成辅助 API

| API | 说明 |
| --- | --- |
| `ctx.api.spawnEnemyLike(source?, options?)` | 以某个 Enemy 为模板生成新 Enemy。选项：`x`、`y`、`avoidX`、`avoidY`、`minDistance`。 |
| `ctx.api.spawnBullet(source?, options?)` | 以实体位置生成子弹。选项：`angle`、`targetX`、`targetY`、`speed`、`life`、`maxDistance`、`width`、`height`、`tint`、`damage`。 |

## 背景 API

| API | 说明 |
| --- | --- |
| `ctx.api.setBackgroundTexture(texturePath)` | 设置当前场景背景贴图。 |
| `ctx.api.cycleBackgroundTexture(texturePaths)` | 在多张背景贴图间循环。 |

## UI 与 HTML API

| API | 说明 |
| --- | --- |
| `ctx.api.ui.postMessage(message, target?)` | 向 HTML UI 发送消息。 |
| `ctx.api.ui.postHtmlMessage(message, target?)` | 同上，语义更明确。 |

HTML UI 内调用：`window.UNU.emit(type, payload)`。脚本侧通过 `onHtmlMessage(ctx)` 接收。UI 事件字段：`event.type`、`event.ui`、`event.value`、`event.pointer`、`event.messageType`、`event.payload`。

## 音频 API

音频分组：`bgm`、`sfx`、`ui`。

| API | 说明 |
| --- | --- |
| `ctx.api.audio.playOneShot(path, options?)` | 播放一次性音频。选项：`group`、`volume`、`loop`、`muted`、`playbackRate`、`fadeIn`、`fadeOut`。 |
| `ctx.api.audio.playEntity(target?)` / `stopEntity(target?)` | 播放/停止实体 Audio 组件。 |
| `ctx.api.audio.pauseEntity(target?)` / `resumeEntity(target?)` | 暂停/继续实体 Audio。 |
| `ctx.api.audio.seekEntity(seconds, target?)` | 跳转实体 Audio 播放位置。 |
| `ctx.api.audio.getEntityState(target?)` | 获取实体音频状态。 |
| `ctx.api.audio.stopGroup(group, fadeOut?)` | 停止分组音频。 |
| `ctx.api.audio.setMasterVolume(volume)` / `getMasterVolume()` | 设置/读取主音量。 |
| `ctx.api.audio.setMasterMuted(muted)` / `getMasterMuted()` | 设置/读取主静音。 |
| `ctx.api.audio.setGroupVolume(group, volume)` / `getGroupVolume(group)` | 设置/读取分组音量。 |
| `ctx.api.audio.setGroupMuted(group, muted)` / `getGroupMuted(group)` | 设置/读取分组静音。 |

## InputState.ts 项目覆盖

`assets/scripts/InputState.ts` 可导出：`actionMap`、`isActionDown(ctx)`、`wasActionPressed(ctx)`、`wasActionReleased(ctx)`、`getAxis(ctx)`、`getMoveVector(ctx)`。

## 常用组件字段速查

| 组件 | 常用字段 |
| --- | --- |
| `Transform` | `x`、`y`、`scaleX`、`scaleY`、`rotation`、`positionMode`、`viewportHorizontal`、`viewportVertical`。 |
| `Sprite` | `texturePath`、`width`、`height`、`visible`、`alpha`、`tint`、`offsetX`、`offsetY`。 |
| `Collider` | `shape`、`width`、`height`、`offsetX`、`offsetY`、`isTrigger`、`layer`、`collidesWith`。 |
| `UI` | `enabled`、`mode`、`text`、`renderMode`、`htmlSourcePath`、`htmlBridgeEnabled`、`sliderValue`。 |
| `Audio` | `clipPath`、`group`、`volume`、`loop`、`playOnStart`、`muted`、`fadeIn`、`fadeOut`。 |
| `Script` | `scriptPath`、`sourceCode`、`enabled`。 |
| `Inventory` | 自定义组件：`data.ownerType`、`data.capacity`、`data.items`、`data.itemMeta`。 |
| `Health` | 自定义组件：`data.max`、`data.current`。 |

## 调试建议

- 优先使用 `ctx.api.log/warn/error`，重复日志会在 Console 折叠。
- 移动逻辑优先使用 `getMoveVector(true)`，避免斜向速度过快。
- 生成/删除实体优先使用 `spawnEntity/removeEntity`。
- 场景切换默认建议 `sceneStateMode: preserve`；需要重置关卡时再使用 `reset`。
