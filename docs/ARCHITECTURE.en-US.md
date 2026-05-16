# UNU Architecture: Domain Model, Scene Store, And Testable Operations

[中文](ARCHITECTURE.zh-CN.md)

Updated: `2026-05-16`

## Current Goal

UNU is gradually moving the scene-editing core away from “Pinia directly owns mutable class instances plus a large amount of business logic” toward a more stable domain model:

- `SceneData`, `EntityData`, and `ComponentData` are serializable DTOs.
- `sceneSerializer` can read/write DTOs while still exposing `hydrateScene` / `deserializeScene` for runtime class compatibility.
- `SceneOperations` provides pure functions that can be tested without Vue or Pinia.
- `scene.ts` stays as a lightweight Pinia store responsible for state, history, status messages, and invoking external operations.

## Why DTO First

Vue/Pinia deeply proxies state. When `Scene`, `Entity`, and `Component` class instances live directly in the store, TypeScript can infer them as unwrapped plain object shapes. That creates compatibility issues around private methods, private fields, and class instance identity.

DTO-first state is steadier because:

- Scene state is naturally serializable for save files, history, undo/redo, and export.
- Editing operations can be pure functions and regression tested.
- Pinia does not need to understand complex class instances.
- Runtime code can still hydrate DTOs into class instances at the boundary.

## Key Files

- `src/engine/scene/sceneData.ts`
  - Defines `SceneData`, `EntityData`, and `ComponentData`.
- `src/engine/scene/sceneOperations.ts`
  - Pure operations for add/remove/duplicate entity, layer moves, component field updates, and scene-folder operations.
- `src/engine/serialization/sceneSerializer.ts`
  - DTO serializer APIs: `serializeSceneData`, `deserializeSceneData`.
  - Compatibility boundary APIs: `sceneToData`, `hydrateScene`, `serializeScene`, `deserializeScene`.
- `src/stores/scene.ts`
  - Lightweight Pinia store.
- `src/stores/sceneActions.ts`
  - Temporary home for editor-integrated actions; this can keep shrinking into smaller domain/service modules.

## Build Artifact Policy

`dist/` and `dist-electron/` are generated build artifacts and should not be committed. Generate them with:

```bash
npm run build
```

Packaging still uses:

```bash
npm run dist:win:installer
```

## Machine Checks

```bash
npm run typecheck
npm run test
npm run build
```

The current baseline tests cover:

- `sceneSerializer` round-trip.
- `prefabSerializer` round-trip.
- Asset path normalize/rewrite.
- `ScriptRuntime` hook invocation and error location.
- `InputState` action map merge.
- `SceneOperations` pure functions outside Vue/Pinia.

## Next Migration Steps

1. Store `SceneData[]` and `currentSceneData` directly in `scene.ts`.
2. Hydrate with `hydrateScene(sceneData)` only at Renderer/Runtime boundaries.
3. Move Inspector/SceneTree editing to `SceneOperations` over DTOs.
4. Remove temporary class-field compatibility needs.
5. Split `sceneActions.ts` into `scenePersistence`, `prefabActions`, `folderActions`, `entityFactory`, and similar smaller modules.
