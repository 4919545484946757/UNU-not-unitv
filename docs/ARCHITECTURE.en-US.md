# UNU Architecture: Domain Model, Scene Store, And Testable Operations

[中文](ARCHITECTURE.zh-CN.md)

Updated: `2026-05-16`

## Current Goal

UNU is gradually moving the scene-editing core away from “Pinia directly owns mutable class instances plus a large amount of business logic” toward a more stable domain model:

- `SceneData`, `EntityData`, and `ComponentData` are serializable DTOs.
- `sceneSerializer` can read/write DTOs while still exposing `sceneToData`, `hydrateScene`, `serializeScene`, and `deserializeScene` for runtime class compatibility.
- `SceneOperations` provides pure functions that can be tested without Vue or Pinia.
- `scene.ts` stays as a lightweight Pinia store responsible for state, history, status messages, and invoking external operations.

## 2026-05-16 Progress

- `sceneActions.ts` was further split into:
  - `sceneCatalogActions.ts`: scene collection, current scene, file bindings, and DTO mirror sync.
  - `sceneHistoryActions.ts`: history, undo/redo, and auto-save.
  - `sceneFolderActions.ts`: scene tree class-folder create, rename, move, copy, and delete actions.
  - `sceneEntityActions.ts`: entity creation, copy/paste, deletion, layer moves, entity JSON application, and sample scene switching.
  - `sceneActionUtils.ts`: Prefab trees, scene folders, script paths, and component repair helpers.
- Store state now includes `sceneDataList` and `currentSceneData` as synchronized DTO mirrors for the gradual migration from `Scene` instances to `SceneData`.
- Added `syncSceneDataState()` and `replaceScenesFromData()` as dual-write/migration bridge methods. UI and operation layers can gradually move to DTO reads next.
- Added `tests/sceneStoreData.test.ts` to lock DTO mirror behavior after `bootstrap` and entity insertion.

## Why DTO First

Vue/Pinia deeply proxies state. When `Scene`, `Entity`, and `Component` class instances live directly in the store, TypeScript can infer them as unwrapped plain object shapes. That creates compatibility issues around private methods, private fields, and class instance identity.

DTO-first state is steadier because:

- Scene state is naturally serializable for save files, history, undo/redo, and export.
- Editing operations can be pure functions and regression tested.
- Pinia does not need to understand complex class instances.
- Runtime code can still hydrate DTOs into class instances at the boundary.

## Key Files

- `src/engine/scene/sceneData.ts`: defines `SceneData`, `EntityData`, and `ComponentData`.
- `src/engine/scene/sceneOperations.ts`: pure operations for entity, layer, component, and scene-folder edits.
- `src/engine/serialization/sceneSerializer.ts`: DTO serializer APIs and class hydrate compatibility boundary.
- `src/stores/scene.ts`: lightweight Pinia store.
- `src/stores/sceneActions.ts`: composition entry plus remaining editor-integrated script sync, scene save/open, Prefab, and runtime-scene actions.

## Build Artifact Policy

`dist/` and `dist-electron/` are generated build artifacts and should not be committed.

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
- Scene Store `SceneData` mirror sync.

## Next Migration Steps

1. Move Inspector/SceneTree reads toward `currentSceneData`.
2. Route entity/folder/layer edits through `SceneOperations` over DTOs.
3. Hydrate with `hydrateScene(sceneData)` only at Renderer/Runtime boundaries.
4. Remove temporary class-field compatibility needs.
5. Continue splitting `sceneActions.ts` into `sceneEntityActions`, `sceneFolderActions`, `scenePrefabActions`, `scenePersistenceActions`, and similar smaller modules.
