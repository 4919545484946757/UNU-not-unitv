import { contextBridge as o, ipcRenderer as n } from "electron";
o.exposeInMainWorld("unu", {
  version: "0.9.0",
  createProject: () => n.invoke("unu:create-project"),
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
  revealInFolder: (e) => n.invoke("unu:reveal-in-folder", e)
});
