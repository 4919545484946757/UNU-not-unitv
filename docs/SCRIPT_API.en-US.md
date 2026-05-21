# UNU Script API Reference

[中文](SCRIPT_API.zh-CN.md) | English

Updated: `2026-05-21`  
Version: `0.5.0+`

This document lists the script APIs currently exposed by the codebase. Project scripts usually live in:

```text
assets/scripts/ScriptRuntime.ts
assets/scripts/InputState.ts
assets/scripts/AudioRuntime.ts
assets/scripts/shared/
assets/scripts/interactions/
assets/scripts/scenes/<SceneName>/
```

Entities bind scripts through `Script.scriptPath`. Saving text assets triggers hot reload. Compile/runtime errors are reported to Console with file, line, and column when available. Web export copies `assets/`, `scenes/`, and `prefabs/`.

## Script Module Format

```js
export default {
  onInit(ctx) {},
  onUpdate(ctx) {}
}
```

`assets/scripts/ScriptRuntime.ts` may export a script registry or generic hooks; entity script files usually export hook objects.

## Lifecycle Hooks

| Hook | When | Common Use |
| --- | --- | --- |
| `onInit(ctx)` | First initialization. | Init state, parse JSON config. |
| `onStart(ctx)` | Entity starts running. | Start sounds, create initial data. |
| `onEnterScene(ctx)` / `onExitScene(ctx)` | Enter/exit runtime scene. | Restore or save state. |
| `onUpdate(ctx)` | Every play frame. | Movement, AI, timers, shooting. |
| `onPausedUpdate(ctx)` | Runs while paused. | Pause/settings/keybinding menus. |
| `onInteract(ctx)` | Interactable entity is used. | Doors, chests, NPCs, switches. |
| `onUiClick(ctx)` | Pixi UI Button/Slider event. | Menu buttons, volume, difficulty. |
| `onHtmlMessage(ctx)` | HTML UI calls `window.UNU.emit`. | Inventory, containers, DOM UI. |
| `onCollisionEnter/Stay/Exit(ctx)` | Collision starts/stays/exits. | Damage, continuous effects, contact exit. |
| `onTriggerEnter/Stay/Exit(ctx)` | Trigger enter/stay/exit. | Pickup, teleport, area effect. |
| `onDestroy(ctx)` | Before destroy. | Cleanup, drops. |

## ScriptContext

| Field | Type | Description |
| --- | --- | --- |
| `ctx.entity` | `Entity` | Entity running the script. |
| `ctx.scene` | `Scene` | Current runtime scene. |
| `ctx.event` | `ScriptEvent \| undefined` | UI, HTML, collision, trigger, or scene event. |
| `ctx.api` | `Script API` | Engine runtime capabilities. |

## Entity / Scene Essentials

| API | Description |
| --- | --- |
| `entity.id` / `entity.name` | Entity ID and name. |
| `entity.sceneFolderPath` | Class folder path in the Scene tree. |
| `entity.getTransform()` | Gets Transform component. |
| `entity.getComponent(type)` | Gets a component, such as `Sprite`, `Collider`, `UI`, `Script`, `Inventory`. |
| `entity.addComponent(component)` / `entity.removeComponent(type)` | Adds or removes component. |
| `scene.entities` | Current scene entity array. |
| `scene.getEntityById(id)` | Finds entity by ID. |
| `scene.addEntity(entity)` / `scene.removeEntityById(id)` | Direct add/remove; scripts should usually prefer `ctx.api.spawnEntity/removeEntity`. |

## ctx.api Basics

| API | Description |
| --- | --- |
| `ctx.api.delta` | Frame delta in seconds. |
| `ctx.api.time` | Current scene runtime time in seconds. |
| `ctx.api.getState(entity)` | Per-scene, per-entity runtime state object. |
| `ctx.api.log(...values)` / `warn(...values)` / `error(...values)` | Outputs to Console. |

## Input API

Default actions: `move_left`, `move_right`, `move_up`, `move_down`, `sprint`, `jump`, `fire`, `interact`, `menu`.

| API | Description |
| --- | --- |
| `ctx.api.input.isKeyDown(code)` | Key held, for example `KeyW`. |
| `ctx.api.input.isMouseDown(button?)` | Mouse held: left `0`, middle `1`, right `2`. |
| `ctx.api.input.wasMousePressed(button?)` | Mouse pressed this frame. |
| `ctx.api.input.isActionDown(action)` | Action held. |
| `ctx.api.input.wasActionPressed(action)` | Action pressed this frame. |
| `ctx.api.input.wasActionReleased(action)` | Action released this frame. |
| `ctx.api.input.getAxis('horizontal' | 'vertical')` | Axis value, usually `-1..1`. |
| `ctx.api.input.getMoveVector(normalized?)` | Movement vector; pass `true` to avoid diagonal speed boost. |
| `ctx.api.input.getMousePosition()` | Mouse world position. |
| `ctx.api.input.getActionMap?.()` | Merged action map. |
| `ctx.api.input.getActionBindings?.(action)` | Action bindings. |
| `ctx.api.input.setActionBindings?.(action, bindings)` | Set user bindings. |
| `ctx.api.input.resetActionBindings?.(action?)` | Reset one action or all user bindings. |
| `ctx.api.input.getPressedBindings?.()` | Bindings pressed this frame, useful for keybinding UI. |

## Scene And Entity API

| API | Description |
| --- | --- |
| `ctx.api.getSelectedEntity()` | Current editor selection, mainly for debugging. |
| `ctx.api.findEntityByName(name)` | Exact name lookup in current scene. |
| `ctx.api.findEntitiesByFolder(folderPath, includeDescendants = true)` | Lookup by Scene folder/class path. |
| `ctx.api.findEntitiesByClass(classPath, includeDescendants = true)` | Semantic alias of `findEntitiesByFolder`. |
| `ctx.api.spawnEntity(entity)` / `ctx.api.removeEntity(entity)` | Deferred spawn/remove. |
| `ctx.api.switchScene(sceneName, options?)` | Request scene switch. Options: `targetSpawnId`, `sceneStateMode: preserve/reset`. |
| `ctx.api.pauseGame()` / `resumeGame()` / `togglePause()` / `resetGame()` / `exitGame()` | Runtime control. |

## Collision And Trigger API

Collision layers: `Default`, `Player`, `Enemy`, `World`, `Door`, `Pickup`, `Trap`, `Attack`, `Sensor`, `UI`.

| API | Description |
| --- | --- |
| `ctx.api.isBlockedAt(x, y)` | Tilemap Collision point test. |
| `ctx.api.isBlockedRect(cx, cy, halfW, halfH)` | Tilemap Collision rectangle test. |
| `ctx.api.isTouching(left, right)` | Collider overlap test. |
| `ctx.api.findEnemyOverlap(target?, matcher?)` | Finds overlapping Enemy-like entity. |
| `ctx.api.moveTowards(source, target, speed, useCollision = true)` | Moves source toward target with optional Tilemap blocking. |

`findEnemyOverlap` matcher fields: `id`, `ids`, `idPrefix`, `name`, `names`, `namePrefix`, `scriptPath`, `scriptPaths`, `scriptPathPrefix`, `requireCollider`, `requireSprite`.

Collision event fields: `event.type`, `event.other`, `event.selfCollider`, `event.otherCollider`.

## Spawn Helpers

| API | Description |
| --- | --- |
| `ctx.api.spawnEnemyLike(source?, options?)` | Spawns an Enemy from a template. Options: `x`, `y`, `avoidX`, `avoidY`, `minDistance`. |
| `ctx.api.spawnBullet(source?, options?)` | Spawns a bullet at source position. Options: `angle`, `targetX`, `targetY`, `speed`, `life`, `maxDistance`, `width`, `height`, `tint`, `damage`. |

## Background API

| API | Description |
| --- | --- |
| `ctx.api.setBackgroundTexture(texturePath)` | Sets current scene background texture. |
| `ctx.api.cycleBackgroundTexture(texturePaths)` | Cycles through background textures. |

## UI And HTML API

| API | Description |
| --- | --- |
| `ctx.api.ui.postMessage(message, target?)` | Sends message to HTML UI. |
| `ctx.api.ui.postHtmlMessage(message, target?)` | Same as above with clearer name. |

HTML side: `window.UNU.emit(type, payload)`. Script side receives `onHtmlMessage(ctx)`. UI event fields: `event.type`, `event.ui`, `event.value`, `event.pointer`, `event.messageType`, `event.payload`.

## Audio API

Audio groups: `bgm`, `sfx`, `ui`.

| API | Description |
| --- | --- |
| `ctx.api.audio.playOneShot(path, options?)` | Plays one-shot audio. Options: `group`, `volume`, `loop`, `muted`, `playbackRate`, `fadeIn`, `fadeOut`. |
| `ctx.api.audio.playEntity(target?)` / `stopEntity(target?)` | Plays/stops target Audio component. |
| `ctx.api.audio.pauseEntity(target?)` / `resumeEntity(target?)` | Pauses/resumes target Audio. |
| `ctx.api.audio.seekEntity(seconds, target?)` | Seeks target Audio. |
| `ctx.api.audio.getEntityState(target?)` | Gets target Audio state. |
| `ctx.api.audio.stopGroup(group, fadeOut?)` | Stops a group. |
| `ctx.api.audio.setMasterVolume(volume)` / `getMasterVolume()` | Master volume. |
| `ctx.api.audio.setMasterMuted(muted)` / `getMasterMuted()` | Master mute. |
| `ctx.api.audio.setGroupVolume(group, volume)` / `getGroupVolume(group)` | Group volume. |
| `ctx.api.audio.setGroupMuted(group, muted)` / `getGroupMuted(group)` | Group mute. |

## InputState.ts Overrides

`assets/scripts/InputState.ts` can export `actionMap`, `isActionDown(ctx)`, `wasActionPressed(ctx)`, `wasActionReleased(ctx)`, `getAxis(ctx)`, `getMoveVector(ctx)`.

## Component Cheat Sheet

| Component | Common Fields |
| --- | --- |
| `Transform` | `x`, `y`, `scaleX`, `scaleY`, `rotation`, `positionMode`, `viewportHorizontal`, `viewportVertical`. |
| `Sprite` | `texturePath`, `width`, `height`, `visible`, `alpha`, `tint`, `offsetX`, `offsetY`. |
| `Collider` | `shape`, `width`, `height`, `offsetX`, `offsetY`, `isTrigger`, `layer`, `collidesWith`. |
| `UI` | `enabled`, `mode`, `text`, `renderMode`, `htmlSourcePath`, `htmlBridgeEnabled`, `sliderValue`. |
| `Audio` | `clipPath`, `group`, `volume`, `loop`, `playOnStart`, `muted`, `fadeIn`, `fadeOut`. |
| `Script` | `scriptPath`, `sourceCode`, `enabled`. |
| `Inventory` | Custom component: `data.ownerType`, `data.capacity`, `data.items`, `data.itemMeta`. |
| `Health` | Custom component: `data.max`, `data.current`. |

## Debugging Tips

- Prefer `ctx.api.log/warn/error`; repeated logs fold in Console.
- Use `getMoveVector(true)` for movement to avoid diagonal speed boosts.
- Use `spawnEntity/removeEntity` instead of mutating scene arrays during iteration.
- Prefer `sceneStateMode: preserve` unless a level reset is intended.
