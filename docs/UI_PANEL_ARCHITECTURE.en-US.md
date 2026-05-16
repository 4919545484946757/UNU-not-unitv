# UI Panel Architecture Split

English | [中文](UI_PANEL_ARCHITECTURE.zh-CN.md)

Updated: `2026-05-16`

## Goal

Phase 5 gradually moves large panels away from all-in-one SFCs toward smaller components and composables. This lowers regression risk and makes the Inspector, script editor, and Timeline easier to maintain, test, and reuse.

## Current Progress

- `InspectorPanel.vue`
  - Extracted `ScriptInspector.vue`.
  - Extracted `TransformInspector.vue`.
  - Extracted `SpriteInspector.vue`.
  - Extracted `ColliderInspector.vue`.
  - Extracted `BackgroundInspector.vue`.
  - Extracted `AudioInspector.vue`.
  - Extracted `CameraInspector.vue`.
  - Added `componentFieldSchema.ts` so Inspector field updates are schema-backed instead of relying on broad `Record<string, number>` casts.
- `ScriptEditorPanel.vue`
  - Extracted `FindReplaceBar.vue`.
  - Extracted `useSyntaxHighlight.ts` for reuse between the side-panel editor and future detached editor surfaces.
- `TimelinePanel.vue`
  - Extracted `FrameList.vue`.

## Next Order

1. Continue Inspector extraction: `AnimationInspector`, `TilemapInspector`, and `UiInspector`, then consolidate duplicated child Inspector styles into shared styles.
2. Continue script editor extraction: `CodeEditorSurface` and `useExternalCodeEditorSync`.
3. Continue Timeline extraction: `StateMachineEditor` and `AnimationAssetActions`.
4. Expand the Inspector schema into renderable field definitions so forms can eventually be generated from schema.

## Verification

- `npm run typecheck`
- `npm run test`
- `npm run build`
