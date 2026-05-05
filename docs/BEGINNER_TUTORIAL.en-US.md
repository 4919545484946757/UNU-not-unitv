# UNU Engine Beginner Tutorial

[中文](BEGINNER_TUTORIAL.zh-CN.md) | English

Updated: `2026-05-05`

This tutorial is for first-time UNU Engine users. Follow it from Launcher, sample project, scene editing, script editing, and finally Web export.

## 1. Prepare The Environment

1. Install Node.js `18+`; `20+` is recommended.
2. Install dependencies in the project root:

```bash
npm install
```

3. Start the development editor:

```bash
npm run dev
```

If you are using a packaged build, launch the installed `UNU Engine` application directly.

## 2. Understand The Launcher

UNU opens into the Launcher first. From there you can:

- Open recent projects.
- Open an existing local project folder.
- Open sample projects.
- Create a new project.
- Rename or delete projects.

When creating a project with a name and parent folder, UNU creates a same-name folder inside the selected directory. For example, project name `MyGame` and target folder `D:/Games` creates `D:/Games/MyGame/`.

## 3. Open The Sample Project

Start with `2D Action Demo`. It currently uses `Sample-project-list/sample-2D-shooting` and includes:

- Player movement, sprinting, and shooting.
- Enemy chasing, bullet hit detection, and respawning.
- Door right-click interaction for scene switching.
- Chest right-click interaction for cycling material colors.
- Two-scene flow.
- Camera-following background images.
- Tilemap collision.
- Project-level runtime scripts.

## 4. Editor Layout

The editor is divided into four main areas:

- Left: Scene Tree and Asset Tree.
- Center: Scene View for editing and play preview.
- Right: Inspector, Script Editor, Timeline, and related panels.
- Top: Project, Scene, Entity, Tool, Play, and Export menus.

The top-right message panel shows save, import, export, and error messages. It can be dragged and closed.

## 5. Basic Editing Flow

1. Select an entity in the Scene Tree.
2. Edit its components in the Inspector.
3. Use the top toolbar to create, duplicate, or delete entities.
4. Select an image in the Asset Tree and bind it to Sprite or Tilemap materials.
5. Press `Ctrl/Cmd + S` to save the scene.
6. Click Play to enter preview mode.
7. Click Play again to pause or resume.
8. Click Stop to leave play mode.

Play mode disables some editing tools to avoid accidental scene edits. Debug visuals are hidden by default. Enable Debug Play next to the play button when you need colliders, entity names, Tilemap grids, and bounds.

## 6. Sample Controls

In `2D Action Demo`:

- `W/A/S/D`: move Player.
- Diagonal movement is normalized.
- Hold `Shift`: sprint at speed `280`.
- Sprinting doubles walk animation speed.
- Left-click: shoot.
- Bullets are automatically removed after exceeding range.
- Enemy is destroyed by bullets and respawns randomly.
- Right-click a nearby Door to switch scenes.
- Right-click Chest to cycle material colors.

## 7. Edit Scripts

UNU sample gameplay is driven by project files instead of hardcoded editor logic.

Common script files:

```txt
assets/scripts/ScriptRuntime.ts
assets/scripts/InputState.ts
assets/scripts/AudioRuntime.ts
```

How to edit:

1. Find the script file in the Asset Tree.
2. Double-click it, or use the context menu to open it in the script panel.
3. Modify the code.
4. Save the text asset.
5. Replay or switch scenes to verify behavior.

The script editor supports syntax highlighting, horizontal scrolling, and multiple text resource types.

## 8. Create Entities

You can create entities from the Scene Tree or top toolbar. The creation dialog lets you configure:

- Entity type.
- Entity ID.
- Entity name.
- Initial position, size, and basic properties.

Common types:

- Empty
- Sprite
- Player
- Enemy
- Bullet
- Door
- Chest
- Tilemap
- Camera
- Background
- UI Text
- UI Button
- HTML UI

## 9. Use The Tilemap Editor

Tilemap can be edited in the Inspector or in a graphical child window.

The graphical editor supports:

- Mouse-wheel zoom.
- Middle-mouse panning.
- Click a cell and type a number to update it.
- Long-press box selection.
- Hold `Shift` and drag with left mouse to multi-select.
- Batch update selected cells.
- View material thumbnails for tile values.
- Bind the selected Asset Tree image to a tile value.

The Collision layer uses `0/1` values for blocking. Player and Enemy both use `isBlockedRect` for blocking checks.

## 10. Edit UI

UI supports:

- Multiline text.
- Multiline input in Inspector.
- Basic Markdown layout.
- DOM Overlay based HTML UI.

Use HTML UI for more complex layout. Use UI Text for lightweight labels, hints, titles, and button text.

## 11. Preview Images

Image files in the Asset Tree can be previewed by double-clicking or using the context menu.

The image preview window supports:

- Mouse-wheel zoom.
- Left-drag view panning.
- Middle-mouse panning.
- Edge resizing.

This is especially helpful for checking pixel-art assets.

## 12. Export A Web Game

When exporting a Web game, UNU creates a standalone output folder containing project assets, scenes, runtime files, and launch scripts.

Do not open `index.html` directly. Browsers block module scripts and styles under `file://`.

Recommended launch file:

```txt
PLAY_GAME.bat
```

It starts a local HTTP server and opens the game in your browser.

## 13. Package The Editor

Developers can run:

```bash
npm run dist:win:installer
```

Outputs are written to `release-fixed/`:

- NSIS installer.
- Portable executable.
- `win-unpacked` directory.

Packaging currently includes application icons, installer icons, sample resources, and `resources/dist` for packaged Web export.

## 14. Troubleshooting

### Sample assets are missing after opening a sample

Packaged samples are copied from `resources/Sample-project-list` into user data. If an old cached sample was created by an older build, remove the old cache or open the sample again with the latest package.

### Exported Web game fails when opening index.html directly

Use `PLAY_GAME.bat`. Direct `file://` opening is blocked by browser security rules.

### Windows icon does not refresh after install

Windows may cache shortcut icons. Uninstall the old version, install the new one, and delete old desktop shortcuts if needed.

### Colliders are not visible during play

Debug visuals are hidden by default. Enable Debug Play next to the play button.
