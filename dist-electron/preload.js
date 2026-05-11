import { contextBridge as i, ipcRenderer as t } from "electron";
i.exposeInMainWorld("unu", {
  version: "0.9.0",
  createProject: (e) => t.invoke("unu:create-project-v2", e),
  pickDirectory: (e) => t.invoke("unu:pick-directory", e),
  saveProjectAs: (e) => t.invoke("unu:save-project-as", e),
  pickProjectFolder: () => t.invoke("unu:pick-project-folder"),
  scanProject: (e) => t.invoke("unu:scan-project", e),
  saveScene: (e) => t.invoke("unu:save-scene", e),
  openScene: (e) => t.invoke("unu:open-scene", e),
  readAssetDataUrl: (e) => t.invoke("unu:read-asset-data-url", e),
  importImages: (e) => t.invoke("unu:import-images", e),
  importAudios: (e) => t.invoke("unu:import-audios", e),
  savePrefab: (e) => t.invoke("unu:save-prefab", e),
  openPrefab: (e) => t.invoke("unu:open-prefab", e),
  saveTextAsset: (e) => t.invoke("unu:save-text-asset", e),
  openTextAsset: (e) => t.invoke("unu:open-text-asset", e),
  readTextAsset: (e) => t.invoke("unu:read-text-asset", e),
  createTextAssetInFolder: (e) => t.invoke("unu:create-text-asset-in-folder", e),
  createAssetFolder: (e) => t.invoke("unu:create-asset-folder", e),
  renameAsset: (e) => t.invoke("unu:rename-asset", e),
  copyAsset: (e) => t.invoke("unu:copy-asset", e),
  deleteAsset: (e) => t.invoke("unu:delete-asset", e),
  restoreDeletedAsset: (e) => t.invoke("unu:restore-deleted-asset", e),
  moveAsset: (e) => t.invoke("unu:move-asset", e),
  renameProject: (e) => t.invoke("unu:rename-project", e),
  deleteProject: (e) => t.invoke("unu:delete-project", e),
  revealInFolder: (e) => t.invoke("unu:reveal-in-folder", e),
  checkAssetIntegrity: (e) => t.invoke("unu:check-asset-integrity", e),
  watchProjectScripts: (e) => t.invoke("unu:watch-project-scripts", e),
  unwatchProjectScripts: () => t.invoke("unu:unwatch-project-scripts"),
  onProjectScriptChanged: (e) => {
    const n = (r, o) => e(o);
    return t.on("unu:project-script-changed", n), () => t.removeListener("unu:project-script-changed", n);
  },
  exportGame: (e) => t.invoke("unu:export-game", e),
  openTilemapEditor: (e) => t.invoke("unu:open-tilemap-editor", e),
  submitTilemapEditorUpdate: (e) => t.invoke("unu:tilemap-editor-update", e),
  closeTilemapEditor: () => t.invoke("unu:close-tilemap-editor"),
  openCodeEditor: (e) => t.invoke("unu:open-code-editor", e),
  submitCodeEditorUpdate: (e) => t.invoke("unu:code-editor-update", e),
  closeCodeEditor: () => t.invoke("unu:close-code-editor"),
  setMainWindowPreset: (e) => t.invoke("unu:set-main-window-preset", e),
  onTilemapEditorInit: (e) => {
    const n = (r, o) => e(o);
    return t.on("unu:tilemap-editor-init", n), () => t.removeListener("unu:tilemap-editor-init", n);
  },
  onTilemapEditorApply: (e) => {
    const n = (r, o) => e(o);
    return t.on("unu:tilemap-editor-apply", n), () => t.removeListener("unu:tilemap-editor-apply", n);
  },
  onCodeEditorInit: (e) => {
    const n = (r, o) => e(o);
    return t.on("unu:code-editor-init", n), () => t.removeListener("unu:code-editor-init", n);
  },
  onCodeEditorApply: (e) => {
    const n = (r, o) => e(o);
    return t.on("unu:code-editor-apply", n), () => t.removeListener("unu:code-editor-apply", n);
  },
  onCodeEditorClosed: (e) => {
    const n = (r, o) => e(o);
    return t.on("unu:code-editor-closed", n), () => t.removeListener("unu:code-editor-closed", n);
  }
});
