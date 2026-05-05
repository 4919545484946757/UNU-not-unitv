# UNU Engine Roadmap

[中文](ROADMAP.zh-CN.md) | English

Updated: `2026-05-05`

This roadmap tracks the evolution of UNU Engine from an editor prototype into a usable 2D game development tool.

## Phase 1: Editor Foundation

Goal: users can reliably create, open, save, and manage projects.

- [x] Electron + Vite + Vue editor shell.
- [x] Launcher window.
- [x] Recent project list.
- [x] Sample project list.
- [x] New project dialog.
- [x] Project rename and deletion.
- [x] Save project as.
- [x] Scene View reloads after switching projects.
- [x] Top-right message panel.
- [x] Grouped top toolbar dropdowns.
- [x] Scene Tree entity context menu.
- [x] Asset Tree context menu.
- [x] Folder double-click expand/collapse in Asset Tree.

## Phase 2: Runtime Core

Goal: provide a minimal playable 2D game loop.

- [x] Play, pause, resume, and stop.
- [x] Separate play-mode and edit-mode selection logic.
- [x] Disable certain editing tools during play.
- [x] Debug Play toggle.
- [x] Input system and keyboard/mouse mapping.
- [x] Camera component.
- [x] Background component.
- [x] Basic Audio runtime.
- [x] Collider relative offset and size.
- [x] `isBlockedRect` collision blocking.
- [x] Scene switching.
- [x] Interactable component.
- [x] Scriptable interaction logic.

## Phase 3: Content Creation Tools

Goal: make levels, animation, assets, and UI efficient to edit.

- [x] Basic Tilemap editing.
- [x] Graphical Tilemap Electron child window.
- [x] Tile value to material mapping.
- [x] Tilemap multi-select and batch editing.
- [x] Image preview window.
- [x] Text resource editor.
- [x] Syntax highlighting.
- [x] Script editor horizontal scrolling.
- [x] Prefab save and instantiation.
- [x] Animation frame editing.
- [x] Animation state machine logic.
- [x] Animation state machine graph preview.
- [x] UI Text multiline rendering.
- [x] UI Markdown rendering.
- [x] HTML UI DOM Overlay.
- [ ] More complete Timeline keyframe tracks.
- [ ] Asset dependency analysis and unused asset detection.

## Phase 4: Project-Level Script System

Goal: gameplay logic should live in each project, not in hardcoded editor runtime logic.

- [x] Per-project `ScriptRuntime.ts`.
- [x] Per-project `InputState.ts`.
- [x] Per-project `AudioRuntime.ts`.
- [x] Sample gameplay logic migrated into project scripts.
- [x] Enemy logic no longer depends on a fixed ID.
- [x] Bullet, Door, Chest, and background switching driven by project scripts.
- [x] Missing runtime scripts are created when opening projects.
- [ ] Script hot reload.
- [ ] Script type hints and generated API docs.
- [ ] Script breakpoints.
- [ ] Script errors linked to Asset Tree files.

## Phase 5: Sample Project Library

Goal: reduce learning cost with different game examples.

- [x] Sample project list entry.
- [x] 2D Action Demo.
- [x] Pixel-art sample material organization.
- [x] Two-scene Door interaction sample.
- [x] Background switching sample.
- [ ] Platformer Demo.
- [ ] Top-down RPG Demo.
- [ ] Puzzle Demo.
- [ ] UI-heavy Narrative Demo.
- [ ] Template wizard.

## Phase 6: Export And Publishing

Goal: projects can move from editor to distributable builds.

- [x] Web game export.
- [x] Local HTTP launch scripts in exported folder.
- [x] `export-report.json`.
- [x] Packaged Web export copies from `resources/dist` instead of `app.asar`.
- [x] Windows NSIS installer.
- [x] Windows Portable package.
- [x] App icon, installer icon, and uninstaller icon.
- [ ] One-click ZIP export.
- [ ] itch.io publishing template.
- [ ] GitHub Pages static publishing template.
- [ ] Native Windows game shell export.

## Phase 7: Performance And Engineering

Goal: support larger projects and longer iteration cycles.

- [x] Initial optimization for collision-overlap stutter.
- [x] Initial render cache layer.
- [x] Pixel texture sampling fix.
- [x] Background camera-follow stutter optimization.
- [ ] Frontend code splitting.
- [ ] Pixi render object pooling.
- [ ] Collision spatial partitioning.
- [ ] Performance profiling panel.
- [ ] Automated regression checklist.
- [ ] Project format migration tools.

## Recommended Next Steps

1. Improve script hot reload and error location.
2. Add asset dependency analysis to reduce missing-resource export issues.
3. Add ZIP and publishing templates for Web export.
4. Expand Timeline keyframe editing.
5. Add a minimal regression suite for opening projects, scene switching, playback, and export.
