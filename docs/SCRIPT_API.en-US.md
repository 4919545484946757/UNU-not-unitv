# UNU Script API Cheat Sheet

English | [中文](SCRIPT_API.zh-CN.md)

This is a quick reference for UNU project scripts. Use it when writing Player, Enemy, bullet, door, pickup, trap, UI hint, or scene transition logic in the script editor.

## Script Entry

Each project can own its runtime script file, usually at:

```text
assets/scripts/ScriptRuntime.ts
```

An entity `Script` component binds to a script with `scriptPath`. At runtime, UNU looks up the same path in the exported `scripts` table and calls the matching hooks.

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

## Lifecycle Hooks

| Hook | When It Runs | Common Uses |
| --- | --- | --- |
| `onInit(ctx)` | First script initialization | Initialize state and cached config |
| `onStart(ctx)` | Entity starts running | Spawn initial data, play entry audio |
| `onEnterScene(ctx)` | Entity enters a scene | Restore state, refresh UI |
| `onExitScene(ctx)` | Entity exits a scene | Save state, stop audio |
| `onUpdate(ctx)` | Every frame | Movement, AI, input, timers |
| `onInteract(ctx)` | Interactable entity is used | Doors, chests, NPCs, switches |
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
| `ctx.event` | `ScriptEvent \| undefined` | Collision, trigger, or scene event data |
| `ctx.api` | `Script API` | Runtime helpers exposed by the engine |

## Component Access

```ts
const transform = ctx.entity.getTransform()
const sprite = ctx.entity.getComponent('Sprite')
const collider = ctx.entity.getComponent('Collider')
const script = ctx.entity.getComponent('Script')
```

Always check for missing components before using them. This keeps scripts safe when they are assigned to different entity types.

## Time, State, And Logs

| API | Description |
| --- | --- |
| `ctx.api.delta` | Current frame delta time in seconds |
| `ctx.api.time` | Runtime time in seconds |
| `ctx.api.getState(entity)` | Gets a private per-entity state object that persists across frames |
| `ctx.api.log(...values)` | Writes a log message to Console |
| `ctx.api.warn(...values)` | Writes a warning to Console |
| `ctx.api.error(...values)` | Writes an error to Console |

```ts
const state = ctx.api.getState<{ timer?: number }>(ctx.entity)
state.timer = (state.timer ?? 0) + ctx.api.delta
ctx.api.log(`[${ctx.entity.id}] timer`, state.timer)
```

## Input API

| API | Description |
| --- | --- |
| `ctx.api.input.isKeyDown(code)` | Checks a keyboard code, such as `KeyW` or `ShiftLeft` |
| `ctx.api.input.isMouseDown(button?)` | Checks a mouse button. Left `0`, middle `1`, right `2` |
| `ctx.api.input.wasMousePressed(button?)` | True only on the frame the mouse button was pressed |
| `ctx.api.input.isActionDown(action)` | Checks an action, such as `move_left`, `shoot`, or `sprint` |
| `ctx.api.input.wasActionPressed(action)` | True only on the frame the action was pressed |
| `ctx.api.input.wasActionReleased(action)` | True only on the frame the action was released |
| `ctx.api.input.getAxis('horizontal' \| 'vertical')` | Reads a movement axis |
| `ctx.api.input.getMoveVector(normalized?)` | Reads the movement vector. Use `true` to prevent diagonal overspeed |
| `ctx.api.input.getMousePosition()` | Gets the mouse world position |

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

## Scene And Entity API

| API | Description |
| --- | --- |
| `ctx.api.getSelectedEntity()` | Gets the editor-selected entity, mostly for debugging |
| `ctx.api.findEntityByName(name)` | Finds an entity by name |
| `ctx.api.removeEntity(target)` | Removes an entity safely through the runtime mutation queue |
| `ctx.api.spawnEntity(entity)` | Spawns an entity safely through the runtime mutation queue |
| `ctx.api.switchScene(sceneName, options?)` | Requests a scene switch |

`switchScene` options:

| Field | Description |
| --- | --- |
| `targetSpawnId` | Spawn point entity ID to place the player at |
| `sceneStateMode` | `preserve` keeps scene state, `reset` reloads scene state |

```ts
ctx.api.switchScene('SecondScene', {
  targetSpawnId: 'Spawn_From_Main',
  sceneStateMode: 'preserve'
})
```

## Collision And Trigger API

| API | Description |
| --- | --- |
| `ctx.api.isBlockedAt(x, y)` | Checks whether a Tilemap collision blocks a point |
| `ctx.api.isBlockedRect(cx, cy, halfW, halfH)` | Checks whether a Tilemap collision blocks a rectangle |
| `ctx.api.isTouching(left, right)` | Checks whether two entities touch |
| `ctx.api.findEnemyOverlap(target?, matcher?)` | Finds an Enemy-like entity overlapping the target |
| `ctx.api.moveTowards(source, target, speed, useCollision?)` | Moves an entity toward another entity, optionally using collision blocking |

Collision and trigger events expose `ctx.event`:

| Field | Description |
| --- | --- |
| `event.type` | `collisionEnter`, `collisionStay`, `collisionExit`, `triggerEnter`, `triggerStay`, or `triggerExit` |
| `event.other` | The other entity |
| `event.selfCollider` | This entity's collider |
| `event.otherCollider` | The other entity's collider |

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

`findEnemyOverlap` matcher example:

```ts
ctx.api.findEnemyOverlap(ctx.entity, {
  idPrefix: 'Enemy_',
  namePrefix: 'Enemy',
  scriptPathPrefix: 'assets/scripts/enemy',
  requireCollider: true,
  requireSprite: true
})
```

## Gameplay Helpers

| API | Description |
| --- | --- |
| `ctx.api.spawnEnemyLike(source?, options?)` | Spawns a new Enemy based on an existing Enemy template |
| `ctx.api.spawnBullet(source?, options?)` | Spawns a bullet from an entity position |

`spawnEnemyLike` options:

| Field | Description |
| --- | --- |
| `x`, `y` | Explicit spawn position |
| `avoidX`, `avoidY` | Position to avoid |
| `minDistance` | Minimum distance from the avoided position |

`spawnBullet` options:

| Field | Description |
| --- | --- |
| `angle` | Bullet direction in radians |
| `targetX`, `targetY` | Fire toward this world position |
| `speed` | Bullet speed |
| `life` | Lifetime in seconds |
| `maxDistance` | Maximum travel distance |
| `width`, `height` | Bullet size |
| `tint` | Bullet color |

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

```ts
await ctx.api.audio.playOneShot('assets/audio/hit.wav', {
  group: 'sfx',
  volume: 0.8
})
```

## Interaction JSON Actions

Interactable entities can also define simple behavior with JSON in the `Script` component:

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

Supported actions:

| `type` | Description |
| --- | --- |
| `sequence` | Runs multiple actions in order |
| `randomOne` | Picks and runs one action |
| `switchScene` | Switches scene |
| `setBackgroundTexture` | Sets background texture |
| `cycleBackgroundTexture` | Cycles background textures |
| `setTexture` | Sets target Sprite texture |
| `cycleTexture` | Cycles target Sprite texture |
| `setTint` | Sets target color |
| `cycleTint` | Cycles target color |
| `toggleVisible` | Toggles target Sprite visibility |
| `setInteractDistance` | Sets interact distance |
| `removeEntity` | Removes target entity |

`target` accepts:

| Value | Target |
| --- | --- |
| Empty or `self` | Current entity |
| `selected` | Current editor-selected entity |
| `id:EntityId` | Entity with the given ID |
| `EntityName` | Entity with the given name |

## Debugging Tips

- Prefer `ctx.api.log/warn/error` for script logs. Errors can be linked back to script file and line.
- Use `getMoveVector(true)` for movement to avoid faster diagonal movement.
- Use `sceneStateMode: 'preserve'` for scene transitions by default, and `reset` only when you need a clean scene.
- Bullets, temporary effects, and drops should have lifetime or distance limits to avoid entity buildup.
- Put collision logic in `onCollisionEnter/Stay/Exit` or `onTriggerEnter/Stay/Exit` so it works cleanly with collision layers, matrices, and Trigger areas.
