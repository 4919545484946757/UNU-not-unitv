# UNU Engine Starter

[中文](README.md) | English

UNU Engine Starter is a desktop 2D game editor and runtime sample project built with `Vue 3 + Pinia + PixiJS 8 + Electron`. It covers the launcher, scene editing, asset management, components, project scripts, animation state machines, Tilemaps, UI, audio, debug console, performance panel, Prefabs, Web export, and Windows packaging.

- Documentation updated: `2026-05-16`
- Project version: `0.2.0`
- Current focus: desktop 2D game editor + exportable Web game runtime

## Documentation

- [Beginner Tutorial](docs/BEGINNER_TUTORIAL.en-US.md) / [中文](docs/BEGINNER_TUTORIAL.zh-CN.md)
- [Console Commands](docs/CONSOLE_COMMANDS.en-US.md) / [中文](docs/CONSOLE_COMMANDS.zh-CN.md)
- [Script API Cheat Sheet](docs/SCRIPT_API.en-US.md) / [中文](docs/SCRIPT_API.zh-CN.md)
- [Architecture And Domain Model](docs/ARCHITECTURE.en-US.md) / [中文](docs/ARCHITECTURE.zh-CN.md)
- [Renderer Architecture Split](docs/RENDERER_ARCHITECTURE.en-US.md) / [中文](docs/RENDERER_ARCHITECTURE.zh-CN.md)
- [Runtime Architecture Split](docs/RUNTIME_ARCHITECTURE.en-US.md) / [中文](docs/RUNTIME_ARCHITECTURE.zh-CN.md)
- [UI Panel Architecture Split](docs/UI_PANEL_ARCHITECTURE.en-US.md) / [中文](docs/UI_PANEL_ARCHITECTURE.zh-CN.md)
- [Sample And Asset Governance](docs/SAMPLE_GOVERNANCE.en-US.md) / [中文](docs/SAMPLE_GOVERNANCE.zh-CN.md)
- [Roadmap](docs/ROADMAP.en-US.md) / [中文](docs/ROADMAP.zh-CN.md)
- [Optimization Plan](docs/OPTIMIZATION_PLAN.en-US.md) / [中文](docs/OPTIMIZATION_PLAN.zh-CN.md)

## Core Features

- Launcher: recent projects, samples, new project creation, rename, delete, and return-to-launcher flow.
- Project system: new projects are created in same-name folders; save-as copies scripts, textures, scenes, assets, and rewrites references.
- Scene system: multi-scene editing, scene switching, preserve/reset scene state, spawn points, and exits.
- Scene Tree: list view and multi-level file-tree view with class folders, nesting, drag/drop, copy/paste, delete, rename, and Shift multi-select.
- Inspector: components, collider offsets, sprite offsets, tint/color, script config, and Tilemap material binding.
- Scene View: select, move, scale, degree-based rotate, pan, zoom, play-debug overlays, and multi-selection batch edits.
- Script system: project shared scripts, optional scene scripts, hot reload, error locations, lifecycle hooks, collision/trigger hooks, and console logging.
- UI system: Text, Markdown, HTML/DOM Overlay, Button script binding, menu hierarchy, auto-size layout, pause menu, and keybinding menu examples.
- Runtime: input mapping, audio runtime, collision layers/matrix, Trigger areas, Loading layer, and performance sampling toggle.
- Asset system: resource tree, asset browser, image preview, open folder, drag/move, copy/delete/rename, reference rewrite, undo/redo.
- Prefab: source sync, Variant visual diff, and nested Prefabs.
- Samples: `2D Action Demo` uses `Sample-project-list/sample-2D-shooting`; `Snake` uses `Sample-project-list/snake`.
- Export and packaging: Web game export and Windows Electron packaging with relative packaged asset paths.

## Development Commands

```bash
npm install
npm run dev
npm run dev:electron
npm run start:electron
npm run typecheck
npm run test
npm run assets:audit
npm run build
```

`npm run dev` starts Vite, Electron main/preload watch build, and the Electron app together; it no longer depends on pre-committed `dist-electron/` files.

## Quality Guardrails

- `npm run typecheck` runs `vue-tsc --noEmit`.
- `npm run test` runs `vitest` for scene/prefab serialization, resource path rewrite, ScriptRuntime hooks and error locations, InputState action map merge, and RenderNodeCache smoke behavior.
- `npm run assets:audit` checks duplicate media hashes across sample/public asset roots.
- Build outputs `dist/` and `dist-electron/` should stay out of source control.
