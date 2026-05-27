# UNU Engine Starter

[中文](README.md) | English

UNU Engine Starter is a desktop 2D game editor and runtime built with `Vue 3 + Pinia + PixiJS 8 + Electron`. The project aims to provide a full practical loop: create projects, edit scenes, write scripts, preview gameplay, debug performance, export Web games, and package the editor for Windows.

- Documentation updated: `2026-05-27`
- Project version: `1.0.0`
- Current focus: desktop 2D game editor + exportable Web game runtime
- Sample project source of truth: `Sample-project-list/`

## Quick Start

```bash
npm install
npm run dev
```

The app opens in the project launcher. From there you can open recent projects, open samples, create a project, or return to the launcher from the editor. `npm run dev` starts Vite, Electron main/preload watch build, and the Electron app together.

## Documentation

| Topic | 中文 | English |
| --- | --- | --- |
| Beginner Tutorial | [BEGINNER_TUTORIAL.zh-CN.md](docs/BEGINNER_TUTORIAL.zh-CN.md) | [BEGINNER_TUTORIAL.en-US.md](docs/BEGINNER_TUTORIAL.en-US.md) |
| Console Commands | [CONSOLE_COMMANDS.zh-CN.md](docs/CONSOLE_COMMANDS.zh-CN.md) | [CONSOLE_COMMANDS.en-US.md](docs/CONSOLE_COMMANDS.en-US.md) |
| Script API | [SCRIPT_API.zh-CN.md](docs/SCRIPT_API.zh-CN.md) | [SCRIPT_API.en-US.md](docs/SCRIPT_API.en-US.md) |
| Web Export | [EXPORT_WEB.zh-CN.md](docs/EXPORT_WEB.zh-CN.md) | [EXPORT_WEB.en-US.md](docs/EXPORT_WEB.en-US.md) |
| Android APK | [ANDROID_APK.zh-CN.md](docs/ANDROID_APK.zh-CN.md) | [ANDROID_APK.en-US.md](docs/ANDROID_APK.en-US.md) |
| Architecture And Domain Model | [ARCHITECTURE.zh-CN.md](docs/ARCHITECTURE.zh-CN.md) | [ARCHITECTURE.en-US.md](docs/ARCHITECTURE.en-US.md) |
| Renderer Split | [RENDERER_ARCHITECTURE.zh-CN.md](docs/RENDERER_ARCHITECTURE.zh-CN.md) | [RENDERER_ARCHITECTURE.en-US.md](docs/RENDERER_ARCHITECTURE.en-US.md) |
| Runtime Architecture | [RUNTIME_ARCHITECTURE.zh-CN.md](docs/RUNTIME_ARCHITECTURE.zh-CN.md) | [RUNTIME_ARCHITECTURE.en-US.md](docs/RUNTIME_ARCHITECTURE.en-US.md) |
| UI Panel Architecture | [UI_PANEL_ARCHITECTURE.zh-CN.md](docs/UI_PANEL_ARCHITECTURE.zh-CN.md) | [UI_PANEL_ARCHITECTURE.en-US.md](docs/UI_PANEL_ARCHITECTURE.en-US.md) |
| Sample And Asset Governance | [SAMPLE_GOVERNANCE.zh-CN.md](docs/SAMPLE_GOVERNANCE.zh-CN.md) | [SAMPLE_GOVERNANCE.en-US.md](docs/SAMPLE_GOVERNANCE.en-US.md) |
| Optimization Plan | [OPTIMIZATION_PLAN.zh-CN.md](docs/OPTIMIZATION_PLAN.zh-CN.md) | [OPTIMIZATION_PLAN.en-US.md](docs/OPTIMIZATION_PLAN.en-US.md) |
| Roadmap | [ROADMAP.zh-CN.md](docs/ROADMAP.zh-CN.md) | [ROADMAP.en-US.md](docs/ROADMAP.en-US.md) |

## Feature Overview

### Projects And Launcher

- Launcher supports recent projects, sample projects, new-project dialog, rename, delete, and returning from the editor to the launcher.
- New projects are created inside a same-name project folder under the selected directory.
- Save As copies scenes, scripts, textures, audio, HTML UI, item registries, Prefabs, and repairs stale references.
- Project opening automatically checks scene lists, asset references, and missing paths, then attempts repair for moved or renamed projects.

### Scene Editing

- Multi-scene projects, scene list dialog, scene rename/copy/delete, and edit-mode scene switching.
- Runtime scene switching, loading layer, preserve/reset scene state options, Player entrance/exit, and spawn binding.
- Scene Tree supports both entity-list view and nested folder-tree view.
- Folder classes support nesting, expand/collapse, create, delete, rename, copy/paste, drag/drop, and reference synchronization.
- Scripts can use `findEntitiesByFolder` / `findEntitiesByClass` to query entities by nested class path.

### Scene View And Editing Tools

- Selection, Shift multi-select, batch move, batch scale, degree-based rotation, copy/delete, layer changes, and Scene Tree hierarchy drag/drop.
- In edit mode, middle mouse pans the Scene View and mouse wheel zooms.
- In play mode, editor selection boxes are disabled and replaced with runtime interaction highlights, debug overlays, and gameplay input logic.
- The debug-play toggle can show colliders, entity bounds, Tilemap grids, entity names, and interaction hints.

### Inspector And Components

- Inspector supports collapsible components, default ordering, custom component add/remove, inactive component placeholders, and flexible width layout.
- Common components include Transform, Sprite, Collider, Camera, Background, Audio, UI, Inventory, Script, and custom components.
- Entities can configure texture offsets, tint color, relative collider offsets, collision layers, triggers, UI alignment, and percentage sizes.
- Inventory inspector supports a graphical item list with scrolling for larger inventories.

### Tilemap And Assets

- Tilemaps support CSV text editing and graphical Electron child-window editing.
- The graphical Tilemap editor supports wheel zoom, middle-button pan, multi-select, Shift painting selection, batch values, tile material previews, and quick binding.
- Asset Tree supports image preview, open folder, double-click/right-click text and image opening, drag/move files, copy/paste, delete, rename, and new file/folder.
- File operations support `Ctrl+Z` / `Ctrl+Y` undo/redo. Resource rename automatically rewrites references.
- Asset Browser supports breadcrumb directory navigation, image previews, and text resources such as JS/JSON/HTML.

### Script System

- Each project owns its own `ScriptRuntime.ts`, `InputState.ts`, `AudioRuntime.ts`, and related gameplay runtime files.
- Project-level shared scripts and optional scene-level scripts are supported. The sample SecondScene has independent gravity/platformer logic.
- Script hot reload, compile error locations, Resource Tree file links, side-panel editor, and independent editor window are supported.
- Script editors support syntax highlighting, `Ctrl+F` find/replace, dirty-file dot markers, and preserving unsaved edits while switching files.
- Runtime hooks include `onInit`, `onStart`, `onEnterScene`, `onExitScene`, `onUpdate`, `onPausedUpdate`, `onInteract`, `onUiClick`, `onHtmlMessage`, `onCollisionEnter/Stay/Exit`, `onTriggerEnter/Stay/Exit`, and `onDestroy`.
- See the [Script API documentation](docs/SCRIPT_API.en-US.md) for details.

### Input, Collision, Trigger, And Runtime

- Input supports keyboard, mouse, action maps, axes, normalized movement vectors, and in-game key rebinding.
- Collision supports entity-entity collisions, Trigger areas, Enter/Stay/Exit events, collision layers, and a collision matrix.
- Tilemap collision can be reused from scripts through `isBlockedAt` / `isBlockedRect` to keep Player and Enemy movement from tunneling through walls.
- Runtime keeps common engine capabilities generic while sample gameplay logic lives in project scripts.

### UI, HTML Overlay, And Interaction

- UI supports Text, Markdown, Button, Slider, HTML/DOM Overlay, iframe pages, and button script binding.
- UI supports auto sizing, percentage width/height, viewport-relative layout, menu hierarchy, pause menus, and game-over menus.
- HTML Overlay supports transparent backgrounds, dynamic sizing, iframe interaction bridge, and script messaging.
- The 2D sample includes inventory UI, container UI, bottom hotbar preview, current held item display, equipment slots, and character preview.

### Items, Inventory, And Sample Gameplay

- Item data uses the `[project]:[item_name]` namespace format.
- Projects can provide an item registry and item folder. Each item can define properties and scripts.
- Player, Enemy, Chest, and other entities can own Inventory data.
- The 2D sample includes medicine, armor, debug items, access cards, automatic rifle, precision rifle, sniper rifle, shotgun, ammo/reload behavior, Enemy HP, drops, and container interaction.

### Audio, Prefab, Console, And Performance

- Audio supports entity audio, one-shot sounds, group volume, master volume, mute, play/pause/stop/seek, fade in/out, and script APIs.
- Prefabs support source synchronization, Variant visual diff, and nested Prefabs.
- Console supports command input, script logs, repeated-log folding, status-log whitelist, and a performance tab.
- Console commands include `help`, `fps`, `play/pause/resume/stop`, `debug`, `scene`, `entities`, `select`, `inspect`, `get/set`, `tp`, `give/take/inv`, and `hp/heal/damage`.
- See the [Console command documentation](docs/CONSOLE_COMMANDS.en-US.md) for details.

## Sample Projects

| Sample | Path | Content |
| --- | --- | --- |
| 2D Shooting | `Sample-project-list/sample-2D-shooting` | Multi-scene 2D action shooting sample with Player, Enemy, guns, armor, items, inventory, containers, access cards, HTML UI, scene switching, and project scripts. |
| Snake | `Sample-project-list/snake` | Snake sample with grid movement, food, score, pause/game-over menus, difficulty switching, and project-local scripts. |

`Sample-project-list/` is the single source of truth for sample projects. To add a new sample, create one directory with `project.json` and `manifest.json` instead of hardcoding sample data in multiple places.

## Development Commands

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run assets:audit
npm run assets:sync-public
npm run build
npm run android:sync
npm run android:apk
npm run android:editor:apk
npm run dist:win
npm run dist:win:installer
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts Vite, Electron main/preload watch build, and the Electron app. |
| `npm run typecheck` | Runs `vue-tsc --noEmit`. |
| `npm run test` | Runs the Vitest baseline tests. |
| `npm run assets:audit` | Checks duplicate assets and asset governance issues. |
| `npm run assets:sync-public` | Syncs public resources needed by export/runtime. |
| `npm run build` | Builds the Web frontend and Electron main/preload. |
| `npm run android:sync` | Builds Android game-runtime mode and syncs it into the Capacitor Android project. |
| `npm run android:apk` | Builds an Android Debug APK; requires JDK 17/21 and Android SDK. |
| `npm run android:editor:apk` | Builds an Android editor Debug APK with the built-in sample and mobile `window.unu` compatibility bridge. |
| `npm run dist:win` | Creates a Windows unpacked build. |
| `npm run dist:win:installer` | Creates a Windows installer build. |

`dist/`, `dist-electron/`, `release/`, and `release-fixed/` are build outputs and should not be maintained as source.

## Web Export

Current Web export copies required scenes, assets, prefabs, HTML UI, project scripts, scene scripts, item registries, item scripts, images, audio, and the export runtime. It writes `project.json`, `export-report.json`, `PLAY_GAME.bat`, and related launch files.

Run exported Web games through `PLAY_GAME.bat` or a local HTTP server. Do not open `index.html` directly. Modern browsers restrict script, CSS, and asset loading under `file://`, which can cause CORS or missing-resource errors.

## Android APK

The current Android port uses `Capacitor + Android WebView`. `android:apk` enters game runtime mode directly; `android:editor:apk` enters editor mode and bundles `Sample-project-list/sample-2D-shooting` by default. Editor mode now supports the launcher, opening the built-in project, asset loading, scene/script saves, asset import, Prefabs, embedded script/Tilemap editor windows, and real directory export through Capacitor Filesystem.

Build a Debug APK:

```bash
npm run android:apk
npm run android:editor:apk
```

The APK is usually written to `android/app/build/outputs/apk/debug/app-debug.apk`. If you see `Unsupported class file major version 69`, switch Java from 25 to JDK 17 or 21. See the [Android APK Build Guide](docs/ANDROID_APK.en-US.md) for details.

## Project Conventions

- Prefer project-relative resource paths. Avoid machine-local absolute paths.
- `Sample-project-list/` is the single source of truth for samples.
- Gameplay logic should live in project scripts whenever possible, not in the generic engine runtime.
- Console and Script API docs should be updated whenever commands or APIs are added.
- Complex UI can use HTML Overlay, but should communicate through the script bridge instead of leaking input behavior into Canvas logic.
