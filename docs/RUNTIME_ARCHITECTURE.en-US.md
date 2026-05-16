# Runtime Architecture Split

English | [中文](RUNTIME_ARCHITECTURE.zh-CN.md)

Updated: `2026-05-16`

## Goal

Phase 4 separates the generic runtime from sample gameplay. The generic runtime should own engine-level capabilities such as script lifecycle hooks, project module loading, context API creation, collision/trigger dispatch, and runtime command queuing. Gameplay for `sample-2D-shooting`, `Snake`, and future samples should live inside each project folder.

## Current Modules

- `ScriptRuntime.ts`: public compatibility facade for existing imports.
- `ScriptRuntimeCore.ts`: runtime coordinator for lifecycle, scene updates, hook invocation, collision events, and ctx API assembly.
- `ProjectModuleLoader.ts`: TS/JS transpile, execution, and compile-error location.
- `RuntimeCommandQueue.ts`: queues `switchScene`, `pause/resume/reset/exit`, and related runtime commands.
- `EntityFactory.ts`: temporary home for bullet/enemy sample entity construction before those flows move fully to project scripts or configurable Prefabs.

## Project Scripts

`Sample-project-list/sample-2D-shooting/assets/scripts/ScriptRuntime.ts` owns the main gameplay script registry:

- `assets/scripts/player-input.js`
- `assets/scripts/bullet-projectile.js`
- `assets/scripts/enemy-chase-respawn.js`
- `custom://interaction`

These scripts are project assets, editable from the resource tree, the script panel, or the detached code editor, and they participate in hot reload during preview.

## Security Note

`ProjectModuleLoader` currently uses `new Function` to execute local project scripts. This is treated as trusted local project code for the editor prototype. A future hardening pass should move script execution into an isolated Worker, a dedicated renderer, or a restricted VM and expose only a whitelisted `ctx.api` capability object.

## Tests

- `tests/runtime.test.ts` covers hook invocation, console output, runtime error locations, and project-script compile error locations.
- `npm run typecheck` keeps TypeScript/Vue checks active.
- `npm run test` covers runtime, serializers, path rewriting, and render cache smoke behavior.
