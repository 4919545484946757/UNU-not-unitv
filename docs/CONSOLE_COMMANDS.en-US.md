# UNU Console Commands

[中文](CONSOLE_COMMANDS.zh-CN.md) | English

Updated: `2026-05-21`  
Version: `0.5.0+`

The Console sits below the Scene View and has `Log` and `Performance` tabs. The `Log` tab accepts commands, shows script output, folds repeated messages, and can filter status messages such as folder opening, project saved, and asset repair. The `Performance` tab keeps overhead low by default; detailed timings for Render, Script, Collision, Animation, Audio Sync, and Camera are collected only when detailed sampling is enabled.

## Input Rules

| Rule | Notes |
| --- | --- |
| Space separated | Commands and arguments are separated by spaces, for example `tp Player 0 120`. |
| Quoted arguments | Use quotes for names with spaces, for example `select "Enemy Boss"`. |
| Key-value options | Some commands accept `key=value`, for example `slot=19 replace=true`. |
| JSON options | `give` can accept one quoted JSON object as extra options. |
| Escaped output | Console output supports `\n` line breaks and `\t` indentation; `help` prints one command per line. |
| History | The command input supports common history behavior for repeated debugging. |

Commands target the active scene. In edit mode they modify the editable scene. In play mode most runtime debugging commands affect the runtime scene copy and are not automatically written back to project files after stopping, unless the command explicitly uses an editor save path.

## Basic Commands

| Command | Purpose | Example |
| --- | --- | --- |
| `help` / `?` | Shows command summary. | `help` |
| `clear` / `cls` | Clears current console logs. | `clear` |
| `fps` | Prints FPS and deltaTime; detailed sampling adds phase timings. | `fps` |
| `play` | Starts preview playback. | `play` |
| `pause` | Pauses preview playback. | `pause` |
| `resume` | Resumes preview playback. | `resume` |
| `stop` | Stops preview and returns to edit mode. | `stop` |
| `debug` | Toggles play-debug overlays. | `debug` |
| `debug on` / `debug off` | Explicitly enables or disables play-debug overlays. | `debug on` |

Play-debug overlays include colliders, entity bounds, tilemap grids, entity names, and interaction highlight labels. Normal playback hides these overlays by default.

## Scene Commands

| Command | Purpose | Example |
| --- | --- | --- |
| `scenes` | Lists discovered scenes in the current project. | `scenes` |
| `scene <name/id>` | Switches the edit-mode Scene View scene. Unavailable during play. | `scene SecondScene` |

Scene lists are synchronized when projects open. If Save As or rename operations leave stale paths, dependency check and auto-repair try to rewrite old references.

## Entity Commands

| Command | Purpose | Example |
| --- | --- | --- |
| `entities` / `ls` | Lists entities in the current scene. | `entities` |
| `entities <filter>` / `ls <filter>` | Filters entities by ID or name. | `ls Enemy` |
| `select <id/name>` | Selects an entity in the editor. | `select Player` |
| `inspect <id/name>` | Prints entity details and components. | `inspect Chest_001` |
| `remove <id/name>` / `delete <id/name>` | Deletes an entity. | `remove Bullet_001` |

Entity lookup usually supports both ID and display name. If multiple entities share the same name, use the stable ID.

## Property And Position Commands

| Command | Purpose | Example |
| --- | --- | --- |
| `get <id/name> <Component.prop>` | Reads a component field. | `get Player Transform.x` |
| `set <id/name> <Component.prop> <value>` | Writes a component field. Numbers, booleans, and JSON are parsed when possible. | `set Player Sprite.tint 16777215` |
| `tp <id/name> <x> <y>` | Teleports an entity. | `tp Player 0 120` |

Common paths include `Transform.x`, `Transform.y`, `Transform.rotation`, `Sprite.tint`, `Collider.width`, `Collider.height`, and `UI.text`. Custom components can be addressed by component name, such as `Health.data.current` or `Inventory.data.items`.

## Inventory And Item Commands

Inventory commands write to `Inventory.data.items`. If the entity has no Inventory custom component, `inv` / `give` creates a default 24-slot inventory.

| Command | Purpose | Example |
| --- | --- | --- |
| `inv <id/name>` / `inventory <id/name>` | Shows entity inventory. | `inv Player` |
| `give <id/name> <namespace:item> [quantity] [options]` | Adds items to an entity. | `give Player sample-2D-shooting:bandage 3` |
| `take <id/name> <namespace:item> [quantity]` | Removes items by namespace. | `take Player sample-2D-shooting:bandage 1` |
| `take <id/name> slot=<slot>` | Removes the item in a slot. | `take Player slot=19` |
| `clearinv <id/name>` / `clearinventory <id/name>` | Clears entity inventory. | `clearinv Enemy_001` |

`give` accepts key-value options or quoted JSON:

```text
give Player sample-2D-shooting:auto_rifle 1 slot=19 replace=true quality=debug durability=100

give Player sample-2D-shooting:medkit 1 '{"slot":5,"replace":true,"quality":"rare"}'
```

| Option | Notes |
| --- | --- |
| `slot` | 1-based slot index. If omitted, the first empty slot is used. |
| `replace=true` | Allows overwriting an occupied slot. |
| Other keys | Written to `Inventory.data.itemMeta[slotIndex]` for project scripts. |
| Quantity | Means multiple occupied slots, not one stacked slot. |

Sample projects use the `[project]:[item_name]` namespace style, for example `sample-2D-shooting:scp_500` and `sample-2D-shooting:debug_spawn_enemy`. Item definitions live under the project item/script resources.

## Health Commands

| Command | Purpose | Example |
| --- | --- | --- |
| `hp <id/name>` / `health <id/name>` | Reads health. | `hp Player` |
| `hp <id/name> <value>` | Sets current health. | `hp Enemy_001 50` |
| `heal <id/name> <amount>` | Heals by amount. | `heal Player 25` |
| `heal <id/name> full` | Restores to max health. | `heal Player full` |
| `damage <id/name> <amount>` | Damages an entity. | `damage Enemy_001 25` |

If the entity has no Health custom component, health commands create `{ max: 100, current: 100 }`. Armor, debug crown immunity, enemy contact intervals, and other advanced rules are project-script responsibilities; commands directly read and write base Health data.

## Script Output

Project scripts can print debugging information through `ctx.api`:

```js
ctx.api.log('[Enemy_001] respawn')
ctx.api.warn('low ammo')
ctx.api.error('failed to load item')
```

The console automatically folds repeated high-frequency messages. This is useful for repeated missing assets, script errors, enemy respawn messages, and collision diagnostics.

## Status Log Whitelist

The toolbar's Show/Hide log-info button controls whether status-style editor messages are copied into the console. Hovering shows a tooltip. Right-click opens a whitelist menu where categories such as folder opened, project saved, asset repair, and export result can be toggled. Script `log/warn/error` output is not filtered by this whitelist.

## Performance Tab

| Metric | Notes |
| --- | --- |
| FPS | Current frame rate. |
| Render | Rendering phase time. |
| Script | Lifecycle hooks and project script time. |
| Collision | Collision, trigger, and collision-matrix time. |
| Animation | State machines, frame switching, and texture sync time. |
| Audio Sync | Audio component synchronization time. |
| Camera | Camera follow, viewport zoom, and UI layout sync time. |

Detailed sampling is off by default. Enable the performance monitor switch only when profiling, so routine debugging does not reduce frame rate.

## Common Debug Recipes

```text
# Give the player three bandages
give Player sample-2D-shooting:bandage 3

# Put an automatic rifle into slot 19 and overwrite old content
give Player sample-2D-shooting:auto_rifle 1 slot=19 replace=true

# Inspect inventory and health
inv Player
hp Player

# Ensure an enemy starts with at least 50 HP
hp Enemy_001 50

# Switch to the second scene for editing
scene SecondScene

# Teleport the player near a door
tp Player 120 300
```
