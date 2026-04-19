import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('unu', {
  version: '0.9.0',
  createProject: () => ipcRenderer.invoke('unu:create-project'),
  saveProjectAs: (payload: { sourceProjectRoot?: string; projectName?: string; currentSceneContent?: string; currentSceneName?: string }) =>
    ipcRenderer.invoke('unu:save-project-as', payload),
  pickProjectFolder: () => ipcRenderer.invoke('unu:pick-project-folder'),
  scanProject: (projectRoot: string) => ipcRenderer.invoke('unu:scan-project', projectRoot),
  saveScene: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) =>
    ipcRenderer.invoke('unu:save-scene', payload),
  openScene: (payload: { projectRoot?: string }) => ipcRenderer.invoke('unu:open-scene', payload),
  readAssetDataUrl: (payload: { projectRoot: string; relativePath: string }) => ipcRenderer.invoke('unu:read-asset-data-url', payload),
  importImages: (payload: { projectRoot: string }) => ipcRenderer.invoke('unu:import-images', payload),
  importAudios: (payload: { projectRoot: string }) => ipcRenderer.invoke('unu:import-audios', payload),
  savePrefab: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) =>
    ipcRenderer.invoke('unu:save-prefab', payload),
  openPrefab: (payload: { projectRoot?: string }) => ipcRenderer.invoke('unu:open-prefab', payload),
  saveTextAsset: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string; subdir?: string; title?: string; filterName?: string }) =>
    ipcRenderer.invoke('unu:save-text-asset', payload),
  openTextAsset: (payload: { projectRoot?: string; defaultSubdir?: string; title?: string; extensions?: string[] }) =>
    ipcRenderer.invoke('unu:open-text-asset', payload),
  readTextAsset: (payload: { projectRoot: string; relativePath: string }) =>
    ipcRenderer.invoke('unu:read-text-asset', payload),
  revealInFolder: (payload: { projectRoot: string; relativePath: string; isDirectory?: boolean }) =>
    ipcRenderer.invoke('unu:reveal-in-folder', payload)
})
