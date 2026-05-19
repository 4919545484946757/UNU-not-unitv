# UNU Script API Cheat Sheet

[中文](SCRIPT_API.zh-CN.md) | English

Updated: `2026-05-19`  
Version: `0.5.0`

## Entry Points

Projects own `assets/scripts/ScriptRuntime.ts`, `InputState.ts`, `AudioRuntime.ts`, plus `shared/`, `interactions/`, and `scenes/<SceneName>/`. Entities bind scripts through `Script.scriptPath`. Web export copies these directories.

## Lifecycle

| Hook | When |
| --- | --- |
| `onInit` / `onStart` | Initialization and start. |
| `onEnterScene` / `onExitScene` | Enter/exit scene. |
| `onUpdate` / `onPausedUpdate` | Frame and paused updates. |
| `onInteract` | Right-click interaction. |
| `onUiClick` / `onHtmlMessage` | UI and HTML UI events. |
| `onCollisionEnter/Stay/Exit` | Collision events. |
| `onTriggerEnter/Stay/Exit` | Trigger events. |
| `onDestroy` | Before destroy. |

## Common API

- `ctx.entity`, `ctx.scene`, `ctx.event`.
- `ctx.api.delta`, `ctx.api.time`, `ctx.api.getState(entity)`.
- `ctx.api.log/warn/error` to Console.
- `ctx.api.input.isActionDown`, `wasActionPressed`, `getMoveVector(true)`, `getMousePosition`, `setActionBindings`.
- `ctx.api.findEntityByName`, `findEntitiesByClass(path, true)`, `spawnEntity`, `removeEntity`, `switchScene`.
- `ctx.api.isBlockedRect`, `isTouching`, `spawnBullet`, `spawnEnemyLike`.
- `ctx.api.audio.playOneShot`, `setMasterVolume`, `setGroupVolume`.

## HTML UI Bridge

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
