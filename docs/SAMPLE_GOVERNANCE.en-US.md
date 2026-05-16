# Sample And Asset Governance

[中文](SAMPLE_GOVERNANCE.zh-CN.md)

Updated: 2026-05-16

## Source Of Truth

- `Sample-project-list/` is the single source of truth for bundled sample projects.
- Every sample project must provide both `project.json` and `manifest.json`.
- `assets-for-sample/` is no longer used at runtime or packaged. If raw source art needs to be preserved, keep it in an external archive or document its source separately.
- `sample-project/` is no longer packaged as a resource. The legacy `sample-project` string is only a memory fallback compatibility path; editor logic should prefer `project.mode`.
- `public/assets/` is generated, not manually maintained. Generate it only when browser fallback assets are needed.

## Sample Layout

Recommended layout:

```text
Sample-project-list/<sample-id>/
  manifest.json
  project.json
  scenes/
  assets/
    images/
    audio/
    scripts/
    animations/
  prefabs/
  README.md
```

Current bundled samples:

- `Sample-project-list/sample-2D-shooting`
- `Sample-project-list/snake`

## Manifest Fields

```json
{
  "format": "unu-sample-manifest",
  "version": 1,
  "id": "snake",
  "title": "Snake Demo",
  "description": "Playable Snake sample.",
  "available": true,
  "projectFile": "project.json",
  "entryScene": "Snake.scene.json",
  "tags": ["2d", "arcade"]
}
```

- `id`: stable sample ID, preferably matching the directory name.
- `title`: launcher display name.
- `description`: launcher description.
- `available`: whether the sample can be opened.
- `projectFile`: project descriptor, usually `project.json`.
- `entryScene`: recommended startup scene.
- `tags`: future categorization, filtering, and documentation metadata.

The Electron launcher dynamically scans `Sample-project-list/*/manifest.json`, so adding a sample usually only requires adding a directory and manifest rather than editing launcher hardcoded lists.

## Generating Public Assets

Do not maintain `public/assets/` by hand. If browser fallback assets are needed, run:

```bash
npm run assets:sync-public
```

The command regenerates `public/assets` from `Sample-project-list/sample-2D-shooting/assets`.

## Duplicate Asset Audit

Run:

```bash
npm run assets:audit
```

The script groups media files by hash. The current target is `0` duplicate groups to avoid three-way asset drift across samples, public assets, and old raw-material folders.

## Case Convention

Sample directories use lowercase kebab-case. The historical `Sample-project-list/Snake` directory has been renamed to:

```text
Sample-project-list/snake
```
