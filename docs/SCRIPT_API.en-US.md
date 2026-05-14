# UNU Script API Cheat Sheet

English | [中文](SCRIPT_API.zh-CN.md)

Updated: `2026-05-15`

This is a quick reference for UNU project scripts. Use it when writing Player, Enemy, bullet, door, pickup, trap, UI button, pause menu, key rebinding, or scene transition logic in the script editor.

## Script Entry

Each project can own its runtime files, usually at:

```text
assets/scripts/ScriptRuntime.ts
assets/scripts/InputState.ts
assets/scripts/AudioRuntime.ts
```

An entity `Script` component binds to a script through `scriptPath`. At runtime, UNU resolves that path in the project script registry and calls the matching hooks.

UNU supports a project-level shared script plus optional scene-level script convention:

```text
assets/scripts/shared/              # Reusable by any scene
assets/scripts/interactions/        # Reusable interaction scripts, such as doors, chests, pickups
assets/scripts/scenes/MainScene/    # MainScene-only scripts
assets/scripts/scenes/SecondScene/  # SecondScene-only scripts
```

Files in these folders can directly export a hook object. The file path becomes the entity `Script.scriptPath`.

```ts
export default {
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return

    const move = ctx.api.input.getMoveVector(true)
    const speed = ctx.api.input.isActionDown('sprint') ? 280 : 140
    transform.x += move.x * speed * ctx.api.delta
    transform.y += move.y * speed * ctx.api.delta
  }
}
```

## Lifecycle Hooks

| Hook | When It Runs | Common Uses |
| --- | --- | --- |
| `onInit(ctx)` | First script initialization | Initialize state and cached config |
| `onStart(ctx)` | Entity starts running | Spawn initial data, play entry audio |
| `onEnterScene(ctx)` | Entity enters a scene | Restore state, refresh UI |
| `onExitScene(ctx)` | Entity exits a scene | Save state, stop audio |
| `onUpdate(ctx)` | Every frame | Movement, AI, input, timers |
| `onPausedUpdate(ctx)` | While the game is paused | Pause menus, key capture, settings UI |
| `onInteract(ctx)` | Interactable entity is used | Doors, chests, NPCs, switches |
| `onUiClick(ctx)` | UI Button / Slider is operated | Menu buttons, volume, difficulty, key rebinding |
| `onCollisionEnter(ctx)` | Collision starts | Bullet hits, damage, landing |
| `onCollisionStay(ctx)` | Collision continues | Pushing, sustained damage |
| `onCollisionExit(ctx)` | Collision ends | Leaving ground or zones |
| `onTriggerEnter(ctx)` | Enters a trigger | Pickups, teleport areas, sensors |
| `onTriggerStay(ctx)` | Stays inside a trigger | Continuous zone effects |
| `onTriggerExit(ctx)` | Leaves a trigger | Hide hints, stop zone effects |
| `onDestroy(ctx)` | Before entity removal | Cleanup, spawn effects |

## ScriptContext

Every hook receives `ctx`:

| Field | Type | Description |
| --- | --- | --- |
| `ctx.entity` | `Entity` | The entity running this script |
| `ctx.scene` | `Scene` | The active scene |
| `ctx.event` | `ScriptEvent \| undefined` | Collision, trigger, scene, or UI event data |
| `ctx.api` | `Script API` | Runtime helpers exposed by the engine |

## Component Access

```ts
const transform = ctx.entity.getTransform()
const sprite = ctx.entity.getComponent('Sprite')
const collider = ctx.entity.getComponent('Collider')
const script = ctx.entity.getComponent('Script')
const ui = ctx.entity.getComponent('UI')
```

Always check for missing components before using them.

## Time, State, And Logs

| API | Description |
| --- | --- |
| `ctx.api.delta` | Current frame delta time in seconds |
| `ctx.api.time` | Runtime time in seconds |
| `ctx.api.getState(entity)` | Gets a private per-entity state object that persists across frames |
| `ctx.api.log(...values)` | Writes a log message to Console |
| `ctx.api.warn(...values)` | Writes a warning to Console |
| `ctx.api.error(...values)` | Writes an error to Console |

## Input API

| API | Description |
| --- | --- |
| `ctx.api.input.isKeyDown(code)` | Checks a keyboard code, such as `KeyW` or `ShiftLeft` |
| `ctx.api.input.isMouseDown(button?)` | Checks a mouse button. Left `0`, middle `1`, right `2` |
| `ctx.api.input.wasMousePressed(button?)` | True only on the frame the mouse button was pressed |
| `ctx.api.input.isActionDown(action)` | Checks an action, such as `move_left`, `fire`, or `sprint` |
| `ctx.api.input.wasActionPressed(action)` | True only on the frame the action was pressed |
| `ctx.api.input.wasActionReleased(action)` | True only on the frame the action was released |
| `ctx.api.input.getAxis('horizontal' \| 'vertical')` | Reads a movement axis |
| `ctx.api.input.getMoveVector(normalized?)` | Reads the movement vector. Use `true` to prevent diagonal overspeed |
| `ctx.api.input.getMousePosition()` | Gets the mouse world position |
| `ctx.api.input.getActionMap?.()` | Gets the merged default, project, and user action map |
| `ctx.api.input.getActionBindings?.(action)` | Gets current bindings for an action |
| `ctx.api.input.setActionBindings?.(action, bindings)` | Sets user bindings for an action |
| `ctx.api.input.resetActionBindings?.(action?)` | Resets one action, or all user bindings when no action is passed |
| `ctx.api.input.getPressedBindings?.()` | Gets keys or mouse buttons pressed this frame; useful for key rebinding |

```ts
if (ctx.api.input.wasActionPressed('fire')) {
  const mouse = ctx.api.input.getMousePosition()
  ctx.api.spawnBullet(ctx.entity, {
    targetX: mouse.x,
    targetY: mouse.y,
    speed: 520,
    maxDistance: 900
  })
}
```

Key rebinding example:

```ts
const pressed = ctx.api.input.getPressedBindings?.() || []
const next = pressed[0]
if (next) ctx.api.input.setActionBindings?.('move_left', [next])
```

## UI Event API

UI Buttons and Sliders call `onUiClick(ctx)` during play mode. If a script has no `onUiClick`, UNU falls back to `onInteract` for compatibility.

```ts
export default {
  onUiClick(ctx) {
    const ui = ctx.event?.type === 'uiClick' ? ctx.event.ui : null
    if (!ui) return

    if (ui.mode === 'slider') {
      ctx.api.audio.setMasterVolume(Number(ui.sliderValue || 0))
    }
  }
}
```

UI event fields:

| Field | Description |
| --- | --- |
| `event.type` | `uiClick` |
| `event.ui` | The operated UI component |
| `event.value` | Numeric value for controls such as sliders |
| `event.pointer` | Pointer position |

## Scene And Entity API

| API | Description |
| --- | --- |
| `ctx.api.getSelectedEntity()` | Gets the editor-selected entity, mostly for debugging |
| `ctx.api.findEntityByName(name)` | Finds an entity by name |
| `ctx.api.removeEntity(target)` | Removes an entity safely through the runtime mutation queue |
| `ctx.api.spawnEntity(entity)` | Spawns an entity safely through the runtime mutation queue |
| `ctx.api.switchScene(sceneName, options?)` | Requests a scene switch |
| `ctx.api.pauseGame()` | Requests game pause |
| `ctx.api.resumeGame()` | Requests game resume |
| `ctx.api.togglePause()` | Requests pause toggle |
| `ctx.api.resetGame()` | Requests runtime game reset |
| `ctx.api.exitGame()` | Requests Web game exit or editor-context return |

`switchScene` options:

| Field | Description |
| --- | --- |
| `targetSpawnId` | Spawn point entity ID to place the player at |
| `sceneStateMode` | `preserve` keeps scene state, `reset` reloads scene state |

## Collision And Trigger API

| API | Description |
| --- | --- |
| `ctx.api.isBlockedAt(x, y)` | Checks whether a Tilemap collision blocks a point |
| `ctx.api.isBlockedRect(cx, cy, halfW, halfH)` | Checks whether a Tilemap collision blocks a rectangle |
| `ctx.api.isTouching(left, right)` | Checks whether two entities touch |
| `ctx.api.findEnemyOverlap(target?, matcher?)` | Finds an Enemy-like entity overlapping the target |
| `ctx.api.moveTowards(source, target, speed, useCollision?)` | Moves an entity toward another entity, optionally using collision blocking |

Collision and trigger events expose `ctx.event` with `type`, `other`, `selfCollider`, and `otherCollider`.

## Gameplay Helpers

| API | Description |
| --- | --- |
| `ctx.api.spawnEnemyLike(source?, options?)` | Spawns a new Enemy based on an existing Enemy template |
| `ctx.api.spawnBullet(source?, options?)` | Spawns a bullet from an entity position |

Common `spawnBullet` options: `angle`, `targetX`, `targetY`, `speed`, `life`, `maxDistance`, `width`, `height`, `tint`.

## Background And Audio API

| API | Description |
| --- | --- |
| `ctx.api.setBackgroundTexture(texturePath)` | Sets the current scene background texture |
| `ctx.api.cycleBackgroundTexture(texturePaths)` | Cycles through background textures |
| `ctx.api.audio.playOneShot(clipPath, options?)` | Plays a one-shot sound |
| `ctx.api.audio.playEntity(target?)` | Plays the target entity's Audio component |
| `ctx.api.audio.stopEntity(target?)` | Stops the target entity's Audio component |
| `ctx.api.audio.setMasterVolume(volume)` | Sets master volume |
| `ctx.api.audio.setGroupVolume(group, volume)` | Sets an audio group volume |
| `ctx.api.audio.getMasterVolume()` | Gets master volume |
| `ctx.api.audio.getGroupVolume(group)` | Gets an audio group volume |

## Interaction JSON Actions

The sample project registers `custom://interaction` in `assets/scripts/ScriptRuntime.ts`. Interactable entities can use JSON in the `Script` component to define behavior. These actions are project script logic, so users can freely edit them inside the project.

Supported actions include `sequence`, `randomOne`, `switchScene`, `setBackgroundTexture`, `cycleBackgroundTexture`, `setTexture`, `cycleTexture`, `setTint`, `cycleTint`, `toggleVisible`, `setInteractDistance`, and `removeEntity`.

`target` accepts empty or `self`, `selected`, `id:EntityId`, or an entity name.

## Debugging Tips

- Prefer `ctx.api.log/warn/error` for script logs. Errors can be linked back to script file and line.
- Use `getMoveVector(true)` for movement to avoid faster diagonal movement.
- Use `sceneStateMode: 'preserve'` for scene transitions by default, and `reset` only when you need a clean scene.
- Bullets, temporary effects, and drops should have lifetime or distance limits to avoid entity buildup.
- Use `onPausedUpdate` and `onUiClick` for pause menus, settings menus, and key rebinding UI.
