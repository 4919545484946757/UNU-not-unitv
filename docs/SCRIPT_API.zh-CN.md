# UNU 脚本 API 提示文档

[English](SCRIPT_API.en-US.md) | 中文

更新时间：`2026-05-19`  
适用版本：`0.5.0`

## 脚本入口

项目拥有 `assets/scripts/ScriptRuntime.ts`、`InputState.ts`、`AudioRuntime.ts`，以及 `shared/`、`interactions/`、`scenes/<SceneName>/`。实体通过 `Script.scriptPath` 绑定脚本。Web 导出会复制这些目录。

## 生命周期

| Hook | 时机 |
| --- | --- |
| `onInit` / `onStart` | 初始化和开始运行。 |
| `onEnterScene` / `onExitScene` | 进入/离开场景。 |
| `onUpdate` / `onPausedUpdate` | 每帧和暂停时更新。 |
| `onInteract` | 可交互实体被右键交互。 |
| `onUiClick` / `onHtmlMessage` | UI 与 HTML UI 事件。 |
| `onCollisionEnter/Stay/Exit` | 碰撞事件。 |
| `onTriggerEnter/Stay/Exit` | Trigger 事件。 |
| `onDestroy` | 销毁前。 |

## 常用 API

- `ctx.entity`、`ctx.scene`、`ctx.event`。
- `ctx.api.delta`、`ctx.api.time`、`ctx.api.getState(entity)`。
- `ctx.api.log/warn/error` 输出到 Console。
- `ctx.api.input.isActionDown`、`wasActionPressed`、`getMoveVector(true)`、`getMousePosition`、`setActionBindings`。
- `ctx.api.findEntityByName`、`findEntitiesByClass(path, true)`、`spawnEntity`、`removeEntity`、`switchScene`。
- `ctx.api.isBlockedRect`、`isTouching`、`spawnBullet`、`spawnEnemyLike`。
- `ctx.api.audio.playOneShot`、`setMasterVolume`、`setGroupVolume`。

## HTML UI 桥

```js
window.UNU.emit('inventory-changed', { items, selectedHotbar })
```

```js
export default {
  onHtmlMessage(ctx) {
    ctx.api.log(ctx.event.messageType, ctx.event.payload)
  }
}
```
