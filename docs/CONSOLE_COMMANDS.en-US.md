# UNU Console Commands

[中文](CONSOLE_COMMANDS.zh-CN.md) | English

Updated: `2026-05-19`  
Version: `0.5.0`

The Console has `Log` and `Performance` tabs. `Log` supports command input, repeated-log folding, status-log whitelist, and script output. `Performance` is low-cost by default and shows Render, Script, Collision, Animation, Audio Sync, and Camera timings when detailed sampling is enabled.

## Commands

| Command | Purpose |
| --- | --- |
| `help` | Shows command summary with `\n` and `\t`. |
| `clear` / `cls` | Clears the console. |
| `fps` | Prints FPS and deltaTime. |
| `play` / `pause` / `resume` / `stop` | Controls preview. |
| `debug on` / `debug off` / `debug` | Controls play-debug overlays. |
| `scenes` / `scene <name/id>` | Lists or switches edit scenes. |
| `entities` / `select <id/name>` / `inspect <id/name>` | Lists, selects, and inspects entities. |
| `get <id/name> <Component.prop>` | Reads component field. |
| `set <id/name> <Component.prop> <value>` | Writes component field. |
| `tp <id/name> <x> <y>` | Moves entity. |

## Script Output

```js
ctx.api.log('hello')
ctx.api.warn('warning')
ctx.api.error('failed')
```

High-frequency repeated messages are folded, useful for Enemy respawn, missing assets, and collision debugging.
