# UNU Engine Optimization Plan

[中文](OPTIMIZATION_PLAN.zh-CN.md) | English

Updated: `2026-05-15`

This plan focuses on low-risk, high-impact improvements that are easy to verify. It is not the long-term roadmap; it is a small-step task pool for continuous polish.

## Principles

- Prioritize issues users encounter every day.
- Every task must have a clear verification scenario.
- Avoid large risky rewrites; prefer small reversible changes.
- Protect play mode and export workflows when changing editor UX.

## Priority Table

| ID | Task | Priority | Estimate | Done When | Verification | Status |
|---|---|---|---|---|---|---|
| O1 | Launcher recent-project search and sorting | Medium | 0.5 day | Can filter by name and sort by recent time | Add multiple projects and search | Not started |
| O2 | New-project validation | High | 0.5 day | Invalid characters, duplicate folders, and blank names show clear feedback | Try special characters and duplicate names | Not started |
| O3 | Tilemap large-map performance | High | 1 day | 100x100 maps zoom and pan smoothly | Stress test graphical Tilemap editor | In progress |
| O4 | Script editor improvements | Medium | 1 day | Supports find/replace, detached editor windows, highlighting, and error location | Edit long scripts | In progress |
| O5 | Animation state machine debug HUD | Medium | 0.5 day | Shows current state, transition candidates, and hit conditions in play mode | Rapid movement/attack input test | Not started |
| O6 | Runtime performance panel | Medium | 1 day | Shows FPS, render, script, and collision timings | Observe metrics during play | Done |
| O7 | Web export one-click ZIP | High | 0.5 day | Can optionally generate a zip after export | Export, unzip, run `PLAY_GAME.bat` | Not started |
| O8 | Asset dependency check | High | 1 day | Checks missing texture/audio/script references before export and attempts auto-repair | Delete a texture and export | Done |
| O9 | Sample cache cleanup entry | Medium | 0.5 day | Launcher can clear copied bundled sample cache | Clear cache and reopen sample | Not started |
| O10 | Remember image preview zoom/pan | Low | 0.5 day | Reopening the same image keeps previous view | Close and reopen image preview | Not started |
| O11 | Remember Inspector fold states | Medium | 0.5 day | Component fold states persist across entity switching | Switch entities and return | Not started |
| O12 | Quick open exported result | Medium | 0.5 day | Export completion can open folder or launch game | Click action after export | Not started |

## Suggested Order

1. O8: reduce missing resource risk first.
2. O7: make Web export easier to distribute.
3. O2: reduce new-project creation friction.
4. O12: make the export loop smoother.
5. O3: continue improving large Tilemap editing.
6. O4: make project-level scripting more comfortable.
7. O6: collect data before deeper performance work.

## Completed Notes

### 2026-05-15 Documentation, Menus, And Debug UX

- README, tutorials, roadmap, Script API, and Console command docs are synced with current features.
- The Snake sample now has an Esc menu, game-over menu, difficulty switching, and reset key bindings.
- Script API docs cover `onPausedUpdate`, `onUiClick`, input rebinding, and reset key bindings.
- Console Performance tab supports detailed stage sampling, disabled by default.

### 2026-05-15 Script And Asset Stability

- Project script hot reload is supported.
- Script errors can be linked to Asset Tree files and line numbers.
- Asset dependency checks and missing asset auto-repair are integrated into project opening and export.


### 2026-05-01 Packaging And Export Stability

- Packaged Web export now copies from `resources/dist`, avoiding `app.asar/dist` directory traversal.
- `dist` is included in `extraResources`.
- Sample projects and sample assets are distributed as `extraResources`.
- Windows app icon is written into the exe through an `afterPack` hook.
- NSIS installer and uninstaller icons are configured.

### 2026-05-01 Sample Project Path Stability

- Sample project paths were changed from absolute paths to relative paths.
- Opening a project automatically checks the scene catalog.
- Save-as project flow repairs scenes and resource paths.
- Packaged samples are copied into user data before editing.

### 2026-05-01 Play Mode UX

- Debug visuals are hidden by default during play.
- Debug Play can show colliders, bounds, grids, and entity names.
- Play-mode and edit-mode selection logic are separated.
- Play, pause, resume, and stop flow is stabilized.

## Completion Record Template

```md
### [O?] Title

- Date: YYYY-MM-DD
- Changed files: path/to/file
- User-visible change: ...
- Verification: ...
- Remaining risk: ...
```




### 2026-05-15 Scene Organization UX

- Completed Scene File Tree / Layer List view switching.
- Added nested class folders, drag moving, copy/paste, and rename reference synchronization.
- Organized the `sample-2D-shooting` and `Snake` sample scene hierarchies to make examples easier to learn and maintain.
