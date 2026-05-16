# UNU Console Commands

[中文](CONSOLE_COMMANDS.zh-CN.md) | English

Updated: `2026-05-15`

The bottom `Console` panel has two tabs:

- `Log`: shows script logs, errors, status messages, and accepts debug commands.
- `Performance`: shows FPS, entity count, and optional detailed performance metrics.

Type a command in the `Log` tab and press `Enter` to run it. Press `Up` / `Down` to browse command history. Output supports `\n` line breaks and `\t` indentation.

## Basic Commands

| Command | Purpose | Example |
| --- | --- | --- |
| `help` | Show common command summary | `help` |
| `clear` / `cls` | Clear console output | `clear` |
| `fps` | Print FPS and deltaTime; detailed timing is included when detailed sampling is enabled | `fps` |

## Play Controls

| Command | Purpose | Example |
| --- | --- | --- |
| `play` | Start play preview | `play` |
| `pause` | Pause play preview | `pause` |
| `resume` | Resume play preview | `resume` |
| `stop` | Stop play preview and return to edit mode | `stop` |
| `debug on` | Show play debug overlays | `debug on` |
| `debug off` | Hide play debug overlays | `debug off` |
| `debug` | Toggle play debug overlays | `debug` |

## Scenes And Entities

| Command | Purpose | Example |
| --- | --- | --- |
| `scenes` | List loaded scenes | `scenes` |
| `scene <name/id>` | Switch the editing scene; unavailable during play mode | `scene MainScene` |
| `entities` / `ls` | List entities in the active scene | `entities` |
| `entities <filter>` | Filter entities by ID or name | `entities Enemy` |
| `select <id/name>` | Select an entity | `select Player` |
| `inspect <id/name>` | Show an entity's component list | `inspect Enemy` |
| `remove <id/name>` / `delete <id/name>` | Remove an entity | `remove Enemy` |

## Reading And Editing Properties

Component property paths use `Component.property`, for example `Transform.x`, `Sprite.texturePath`, or `Collider.width`.

| Command | Purpose | Example |
| --- | --- | --- |
| `get <id/name> <Component.prop>` | Read an entity component property | `get Player Transform.x` |
| `set <id/name> <Component.prop> <value>` | Set an entity component property | `set Player Transform.x 120` |
| `tp <id/name> <x> <y>` | Move an entity quickly | `tp Player 0 120` |

## Performance Tab

The `Performance` tab shows low-cost data by default:

- `FPS`
- `Entities`

Detailed stage sampling is disabled by default. Enable `Detailed performance sampling` to show:

- `Frame Time`
- `Render`
- `Script`
- `Collision`
- `Animation`
- `Audio Sync`
- `Camera`

Detailed sampling adds a small measurement overhead, so keep it off until you need to diagnose performance.

## Log Filtering

Status messages are integrated into Console. The show/hide log-info button controls whether status logs such as opening folders, project saved, or export completed are displayed.

- Hovering the button shows a tooltip.
- Right-clicking the button opens the log whitelist menu.
- The whitelist controls which status categories are visible.

## Script Output

Project scripts can write to Console with:

```js
ctx.api.log('hello')
ctx.api.warn('something suspicious')
ctx.api.error('something failed')
```

In the sample project, Enemy respawn logs:

```js
ctx.api.log(`[${spawnedEnemy.id}] respawn`)
```

## Notes

- In play mode, `set`, `tp`, and `remove` operate on the runtime scene copy and are not written back after stopping.
- In edit mode, `set`, `tp`, and `remove` mark the scene as dirty.
- Use quotes for names with spaces, for example `select "Enemy Boss"`.


