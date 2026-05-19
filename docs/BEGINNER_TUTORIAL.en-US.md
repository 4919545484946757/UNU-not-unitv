# UNU Engine Beginner Tutorial

[中文](BEGINNER_TUTORIAL.zh-CN.md) | English

Updated: `2026-05-19`  
Version: `0.5.0`

## Quick Start

```bash
npm install
npm run dev
```

The launcher opens first. It can open recent projects, samples, local projects, and can create, rename, or delete projects. New projects are created inside same-name child folders.

## Samples

- `2D Action Demo`: `Sample-project-list/sample-2D-shooting`; movement, sprint, shooting, Enemy HP, inventory, container UI, meds, armor, guns, debug tools, access card, scene switching, and bottom hotbar preview.
- `Snake`: `Sample-project-list/snake`; classic movement, score, difficulty, pause menu, game-over menu, and key reset.

## Common Workflow

1. Select an entity or class folder in the Scene tree.
2. Edit components in Inspector.
3. Move, scale, rotate, or Shift multi-select in Scene View.
4. Manage images, audio, scripts, HTML, items, and Prefabs in the asset tree.
5. Save, then press Play to preview.

## Scripts

Project scripts live in `assets/scripts/`, including `ScriptRuntime.ts`, `InputState.ts`, `AudioRuntime.ts`, `shared/`, `interactions/`, and `scenes/<SceneName>/`. Saving triggers hot reload and errors are linked to asset tree files and lines.

## UI And Items

UI supports Text, Markdown, Button, Slider, and HTML Overlay. HTML UI can link `assets/ui/*.html` and communicate through `window.UNU.emit(type, payload)`. Items use `[project-name]:[english-item-name]` namespaces and the registry is `assets/items/items.registry.json`.

## Web Export

The output contains `index.html`, `project.json`, `assets/`, `scenes/`, `prefabs/`, `PLAY_GAME.bat`, `PLAY_GAME.ps1`, and `export-report.json`. Run `PLAY_GAME.bat`; do not open `index.html` directly.
