import { contextBridge as r, ipcRenderer as n } from "electron";
r.exposeInMainWorld("unu", {
  version: "0.9.0",
  createProject: (e) => n.invoke("unu:create-project-v2", e),
  pickDirectory: (e) => n.invoke("unu:pick-directory", e),
  saveProjectAs: (e) => n.invoke("unu:save-project-as", e),
  pickProjectFolder: () => n.invoke("unu:pick-project-folder"),
  scanProject: (e) => n.invoke("unu:scan-project", e),
  saveScene: (e) => n.invoke("unu:save-scene", e),
  openScene: (e) => n.invoke("unu:open-scene", e),
  readAssetDataUrl: (e) => n.invoke("unu:read-asset-data-url", e),
  importImages: (e) => n.invoke("unu:import-images", e),
  importAudios: (e) => n.invoke("unu:import-audios", e),
  savePrefab: (e) => n.invoke("unu:save-prefab", e),
  openPrefab: (e) => n.invoke("unu:open-prefab", e),
  saveTextAsset: (e) => n.invoke("unu:save-text-asset", e),
  openTextAsset: (e) => n.invoke("unu:open-text-asset", e),
  readTextAsset: (e) => n.invoke("unu:read-text-asset", e),
  renameProject: (e) => n.invoke("unu:rename-project", e),
  deleteProject: (e) => n.invoke("unu:delete-project", e),
  revealInFolder: (e) => n.invoke("unu:reveal-in-folder", e),
  openTilemapEditor: (e) => n.invoke("unu:open-tilemap-editor", e),
  submitTilemapEditorUpdate: (e) => n.invoke("unu:tilemap-editor-update", e),
  closeTilemapEditor: () => n.invoke("unu:close-tilemap-editor"),
  setMainWindowPreset: (e) => n.invoke("unu:set-main-window-preset", e),
  onTilemapEditorInit: (e) => {
    const o = (i, t) => e(t);
    return n.on("unu:tilemap-editor-init", o), () => n.removeListener("unu:tilemap-editor-init", o);
  },
  onTilemapEditorApply: (e) => {
    const o = (i, t) => e(t);
    return n.on("unu:tilemap-editor-apply", o), () => n.removeListener("unu:tilemap-editor-apply", o);
  }
});
