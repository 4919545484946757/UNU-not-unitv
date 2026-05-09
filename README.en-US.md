# UNU Engine Starter

[中文](README.md) | English

UNU Engine Starter is a desktop 2D game editor and runtime sample project built with `Vue 3 + Pinia + PixiJS 8 + Electron`. It is designed to grow beyond a demo shell into a lightweight engine that can support real 2D game development workflows: project management, scene editing, asset management, components, project-level scripts, animation state machines, Tilemap editing, UI, audio, packaging, and Web export.

- Documentation updated: `2026-05-10`
- Project version: `0.1.1`
- Current focus: desktop 2D game editor + exportable Web game runtime

## Documentation

- [Beginner Tutorial](docs/BEGINNER_TUTORIAL.en-US.md) / [中文](docs/BEGINNER_TUTORIAL.zh-CN.md)
- [Console Commands](docs/CONSOLE_COMMANDS.en-US.md) / [中文](docs/CONSOLE_COMMANDS.zh-CN.md)
- [Roadmap](docs/ROADMAP.en-US.md) / [中文](docs/ROADMAP.zh-CN.md)
- [Optimization Plan](docs/OPTIMIZATION_PLAN.en-US.md) / [中文](docs/OPTIMIZATION_PLAN.zh-CN.md)

## Core Features

### Project And Launcher

- Opens into a Launcher window before the main editor.
- Supports recent projects, local projects, sample projects, and new projects.
- New projects are created inside a same-name folder under the selected parent directory.
- Supports project rename and deletion.
- The sample list is separated from user projects. The current `2D Action Demo` uses `Sample-project-list/sample-2D-shooting`.
- Project opening automatically scans and repairs scene catalogs, resource paths, and missing project runtime script files.
- Packaged samples are copied from `resources/Sample-project-list` into user data before editing, so installed app resources stay read-only.

### Editor Workflow

- Scene Tree: select, duplicate, delete, rename, edit IDs, and create entities.
- Asset Tree: refresh, import images/audio, collapse, reveal in file manager, open text files, and preview images.
- Asset Tree supports file/folder creation, rename, copy, delete, drag-move, and `Ctrl/Cmd + Z` / `Ctrl/Cmd + Y` undo/redo for file operations.
- Resource rename and move operations automatically synchronize JSON references in scenes, prefabs, animations, and atlases.
- Inspector: edit `Transform`, `Sprite`, `Collider`, `Animation`, `Script`, `Camera`, `Background`, `Interactable`, `Audio`, `UI`, and `Tilemap` components.
- Scene View: edit, play preview, pause, resume, and stop.
- Top toolbar: grouped project, scene, entity, tool, play, and export actions.
- Status messages are integrated into Console with category filtering.
- Console provides `Log` and `Performance` tabs. The Performance tab supports detailed stage sampling, disabled by default.
- Non-play mode supports a pan tool. Play mode disables transform/scale editing tools to avoid accidental scene changes.

### Runtime And Gameplay

- Preview can be paused and resumed mid-play.
- Play-mode selection and edit-mode selection are separated.
- Debug visuals such as colliders, bounds, Tilemap grids, entity names, and interaction labels are hidden by default during normal play.
- A debug play toggle next to the play button can show those debug visuals.
- Input system supports keyboard, mouse, and action mapping.
- Sample Player features:
  - `W/A/S/D` movement with normalized diagonal speed.
  - Hold `Shift` to sprint at speed `280`.
  - Sprinting doubles walk animation playback speed.
  - Left-click shooting from Player toward the mouse position.
  - Bullets are automatically destroyed after exceeding a configured range.
- Sample Enemy logic is project-script driven instead of hardcoded in the generic editor runtime.
- Enemy can chase Player, be destroyed by bullets, and respawn at random positions.
- `isBlockedRect` is used by both Player and Enemy for consistent collision blocking.
- Interactions are triggered by right-clicking an interactable entity within range.
- Door interaction switches scenes through script.
- Chest interaction cycles material colors through script.

### Project-Level Runtime Scripts

UNU is moving from editor-hardcoded gameplay logic to project-owned runtime logic:

- Each project can have its own `assets/scripts/ScriptRuntime.ts`.
- Each project can have its own `assets/scripts/InputState.ts`.
- Each project can have its own `assets/scripts/AudioRuntime.ts`.
- Sample gameplay logic such as Player, Enemy, Bullet, Door, Chest, and background switching is driven by files in the project asset tree.
- The script editor can open, edit, and save `.ts`, `.js`, `.json`, `.anim.json`, and other text resources.
- The script editor supports syntax highlighting and horizontal scrolling.

### Console And Performance Monitoring

- Console `Log` tab supports logs, errors, status messages, and debug command input.
- Common debug commands include `help`, `fps`, `play`, `pause`, `stop`, `debug`, `entities`, `select`, `inspect`, `get`, `set`, `tp`, and `remove`.
- Console `Performance` tab shows FPS, entity count, and optional detailed performance metrics.
- Detailed performance sampling is disabled by default. When enabled, it shows Frame Time, Render, Script, Collision, Animation, Audio Sync, and Camera timings.
- Project scripts can write to Console with `ctx.api.log`, `ctx.api.warn`, and `ctx.api.error`.

### Components

Current built-in components:

- `Transform`: position, rotation, scale, size, and basic transform data.
- `Sprite`: image, color, anchor, flipping, and pixel-art sampling.
- `Collider`: collision box with relative offset and size.
- `Animation`: frame animation, state machine, transition conditions, and exit time.
- `Script`: binds project script logic.
- `Camera`: follow target, zoom, and bounds.
- `Background`: background image, camera-follow behavior, and script switching.
- `Interactable`: interaction range, action, and visual prompt.
- `Audio`: basic runtime audio control.
- `UI`: text, buttons, Markdown, and HTML Overlay.
- `Tilemap`: tile layers, collision layers, and value-to-material mapping.

### Tilemap

- Supports Tiles CSV and Collision CSV.
- Supports tile value to texture/material binding.
- Inspector includes a tile value input and a bind-selected-image action.
- Provides an Electron child-window graphical Tilemap editor.
- Graphical editor supports:
  - Compact square cells.
  - Mouse-wheel zoom.
  - Middle-mouse panning.
  - Click a cell and type a number to change its value.
  - Long-press box selection.
  - `Shift + left drag` multi-select painting.
  - Batch value update for selected cells.
  - Material thumbnails and quick binding actions.

### Animation

- Supports `.anim.json` resources.
- Supports state-machine based transitions.
- Supports common states such as Idle, Run, and Attack.
- Attack state exits correctly back to movement or idle instead of getting stuck after rapid input changes.
- Sprite flipping can be driven by movement direction, for example flipping Player when moving right.
- Sample Player states use different colors/textures.
- Pixel-art textures use nearest sampling to reduce blur.

### Prefab

- Supports saving entities as Prefabs.
- Supports instantiating Prefabs from resource files.
- Supports saving Prefab Variants.
- Supports synchronizing source Prefab updates to the current instance or all same-source instances.
- Supports visual Variant / instance diff inspection.
- Preserves nested Prefab source paths so parent and child Prefabs can be synchronized independently.

### UI

- Supports UI Text entity creation.
- Supports multiline text rendering.
- Inspector text fields support multiline input.
- Supports basic Markdown rendering.
- Supports DOM Overlay based HTML UI for more complex layout.

### Assets And Sample Materials

- Pixel-art sample textures are organized into the sample project assets folder.
- Image resources can be previewed by double-clicking or using the context menu.
- Image preview windows support mouse-wheel zoom, left-drag, middle-drag, and edge resizing.
- Background images cover the viewport without stretching and follow the camera.
- The sample main scene uses `background-img.png`; the facility scene uses `background-facility.png`.

### Export And Packaging

- Supports exporting a project as a Web game.
- Export copies project assets, scenes, prefabs, and frontend runtime files.
- Export output includes:
  - `index.html`
  - `assets/`
  - `scenes/`
  - `prefabs/`
  - `project.json`
  - `PLAY_GAME.bat`
  - `PLAY_GAME.ps1`
  - `EXPORT_README.md`
  - `export-report.json`
- Do not open exported `index.html` directly via `file://`; use `PLAY_GAME.bat` to start a local HTTP server.
- Windows packaging supports:
  - NSIS installer.
  - Portable executable.
  - `win-unpacked` directory.
- Packaging currently handles:
  - Application icon written into the main exe.
  - Installer and uninstaller icons.
  - `dist` copied into `resources/dist` for packaged Web export.
  - Sample projects and assets distributed as `extraResources`.

## Quick Start

### Requirements

- Node.js `18+`, recommended `20+`
- npm `9+`
- PowerShell is recommended on Windows

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

### Build Frontend And Electron Main Process

```bash
npm run build
```

### Build Windows Unpacked App

```bash
npm run dist:win
```

### Build Windows Installer And Portable App

```bash
npm run dist:win:installer
```

Build artifacts are written to `release-fixed/`.

## Shortcuts

- `Ctrl/Cmd + S`: save current scene.
- `Ctrl/Cmd + Shift + S`: save current scene as.
- `Ctrl/Cmd + Z`: undo.
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y`: redo.
- `Ctrl/Cmd + D`: duplicate entity.
- `Delete / Backspace`: delete entity.
- `Q / W / E`: select, move, scale tools.
- `P`: play, pause, or resume.
- `Ctrl/Cmd + Space`: stop playback.
- `W/A/S/D`: move Player in the sample project.
- `Shift`: sprint in the sample project.
- Left mouse button: shoot in the sample project.
- Right mouse button: interact with nearby interactable entities.

## Directory Structure

```txt
.
|-- electron/
|   |-- main.ts
|   `-- preload.ts
|-- src/
|   |-- components/
|   |-- engine/
|   |-- stores/
|   `-- main.ts
|-- docs/
|   |-- BEGINNER_TUTORIAL.zh-CN.md
|   |-- BEGINNER_TUTORIAL.en-US.md
|   |-- OPTIMIZATION_PLAN.zh-CN.md
|   |-- OPTIMIZATION_PLAN.en-US.md
|   |-- ROADMAP.zh-CN.md
|   `-- ROADMAP.en-US.md
|-- Sample-project-list/
|   `-- sample-2D-shooting/
|-- sample-project/
|-- assets-for-sample/
|-- scripts/
|   `-- afterPackIcon.cjs
|-- vite.config.ts
|-- vite.electron.config.ts
`-- package.json
```

## Electron API

Type declarations are in `src/vite-env.d.ts`. Renderer code calls APIs through `window.unu`:

- `createProject(payload?)`
- `pickDirectory(payload?)`
- `saveProjectAs(payload)`
- `pickProjectFolder()`
- `scanProject(projectRoot)`
- `saveScene(payload)`
- `openScene(payload)`
- `readAssetDataUrl(payload)`
- `importImages(payload)`
- `importAudios(payload)`
- `savePrefab(payload)`
- `openPrefab(payload)`
- `saveTextAsset(payload)`
- `openTextAsset(payload)`
- `readTextAsset(payload)`
- `renameProject(payload)`
- `deleteProject(payload)`
- `revealInFolder(payload)`
- `exportGame(payload)`
- `openTilemapEditor(payload)`
- `submitTilemapEditorUpdate(payload)`
- `closeTilemapEditor()`
- `setMainWindowPreset(preset)`
- `onTilemapEditorInit(callback)`
- `onTilemapEditorApply(callback)`

## Main IPC Channels

- `unu:create-project`
- `unu:create-project-v2`
- `unu:pick-directory`
- `unu:save-project-as`
- `unu:pick-project-folder`
- `unu:scan-project`
- `unu:save-scene`
- `unu:open-scene`
- `unu:read-asset-data-url`
- `unu:import-images`
- `unu:import-audios`
- `unu:save-prefab`
- `unu:open-prefab`
- `unu:save-text-asset`
- `unu:open-text-asset`
- `unu:read-text-asset`
- `unu:rename-project`
- `unu:delete-project`
- `unu:reveal-in-folder`
- `unu:export-game`
- `unu:open-tilemap-editor`
- `unu:tilemap-editor-update`
- `unu:close-tilemap-editor`
- `unu:set-main-window-preset`

## Known Limitations

- The main frontend chunk is still large and may trigger Vite's `>500KB` warning. Code splitting is planned.
- Project-level scripts are supported, but full hot reload, breakpoint debugging, and type-hinting workflows are not complete yet.
- The animation state machine has visual preview but not a full node-link editor.
- The graphical Tilemap editor works, but very large map performance can still improve.
- Web export currently targets static files and local HTTP preview. More publishing targets such as itch.io or GitHub Pages can be added later.
