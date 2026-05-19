# UNU Engine Starter

[中文](README.md) | English

UNU Engine Starter is a desktop 2D game editor and runtime built with `Vue 3 + Pinia + PixiJS 8 + Electron`. Version 0.5.0 focuses on a practical loop for building, previewing, and exporting 2D games: launcher, scene editing, assets, components, script hot reload, animation state machines, Tilemaps, HTML UI, items/inventory, collision triggers, Console, performance panel, Prefabs, Web export, and Windows packaging.

- Documentation updated: `2026-05-19`
- Project version: `0.5.0`
- Current focus: desktop 2D game editor + exportable Web game runtime

## Documentation

- [Beginner Tutorial](docs/BEGINNER_TUTORIAL.en-US.md) / [中文](docs/BEGINNER_TUTORIAL.zh-CN.md)
- [Console Commands](docs/CONSOLE_COMMANDS.en-US.md) / [中文](docs/CONSOLE_COMMANDS.zh-CN.md)
- [Script API Cheat Sheet](docs/SCRIPT_API.en-US.md) / [中文](docs/SCRIPT_API.zh-CN.md)
- [Web Export Capabilities](docs/EXPORT_WEB.en-US.md) / [中文](docs/EXPORT_WEB.zh-CN.md)
- [Architecture And Domain Model](docs/ARCHITECTURE.en-US.md) / [中文](docs/ARCHITECTURE.zh-CN.md)
- [Renderer Architecture Split](docs/RENDERER_ARCHITECTURE.en-US.md) / [中文](docs/RENDERER_ARCHITECTURE.zh-CN.md)
- [Runtime Architecture Split](docs/RUNTIME_ARCHITECTURE.en-US.md) / [中文](docs/RUNTIME_ARCHITECTURE.zh-CN.md)
- [UI Panel Architecture Split](docs/UI_PANEL_ARCHITECTURE.en-US.md) / [中文](docs/UI_PANEL_ARCHITECTURE.zh-CN.md)
- [Sample And Asset Governance](docs/SAMPLE_GOVERNANCE.en-US.md) / [中文](docs/SAMPLE_GOVERNANCE.zh-CN.md)
- [Roadmap](docs/ROADMAP.en-US.md) / [中文](docs/ROADMAP.zh-CN.md)
- [Optimization Plan](docs/OPTIMIZATION_PLAN.en-US.md) / [中文](docs/OPTIMIZATION_PLAN.zh-CN.md)

## Core Features

- Launcher: recent projects, samples, new-project dialog, rename, delete, and return-to-launcher flow.
- Projects: new projects are written into same-name folders; Save As copies scripts, scenes, textures, audio, HTML UI, item registries, and repairs references.
- Scenes: multi-scene editing, scene list, preserve/reset scene state, loading layer, spawn points, and exits.
- Scene Tree: entity list and nested folder-tree views with class folders, expand/collapse, drag/drop, copy/paste, delete, rename, Shift multi-select, and batch operations.
- Scene View: selection, Shift multi-select, move, scale, degree-based rotate, middle-button pan, wheel zoom, and play-debug overlays.
- Inspector: collapsible components, custom component add/remove, and editors for Transform/Sprite/Collider/Camera/Background/Audio/UI/Inventory/Script.
- Tilemap: CSV plus graphical child-window editing, wheel zoom, middle-button pan, multi-select, batch values, and tile-value material binding.
- Scripts: project-owned ScriptRuntime/InputState/AudioRuntime, project shared scripts, optional scene scripts, hot reload, and file/line error locations.
- Runtime: lifecycle hooks, collision/trigger events, collision layers/matrix, input mappings, key rebinding, audio runtime, and performance sampling toggle.
- UI: Text, Markdown, Button, Slider, HTML/DOM Overlay, iframe bridge, auto sizing, percentage sizes, menu hierarchy, and button script binding.
- Assets: tree/browser, image preview, open folder, drag/move, copy/delete/rename, automatic reference rewrite, and undo/redo for file operations.
- Prefab: source sync, Variant visual diff, and nested Prefabs.
- Console: repeated-log folding, status-log whitelist, command input, performance tab, FPS/render/script/collision timings.
- Samples: 2D Action Demo and Snake Demo are playable; the 2D sample includes inventory/container UI, items, armor, guns, Enemy HP, scene switching, and bottom hotbar preview.
- Export: Web export copies assets/scenes/prefabs and writes project.json, export-report.json, plus local HTTP launch scripts; packaged builds export from resources/dist.

## Development Commands

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run assets:audit
npm run build
npm run dist:win:installer
```

`npm run dev` starts Vite, Electron main/preload watch build, and the Electron app together. `dist/` and `dist-electron/` are build outputs and should not be committed.

## Web Export Confirmation

0.5.0 confirms that Web export includes the current feature set: multi-scene projects, nested scene tree data, project scripts, scene scripts, HTML UI, item registries, item scripts, audio, images, Prefabs, and export reports. Run `PLAY_GAME.bat` after export; do not open `index.html` directly through `file://`.
