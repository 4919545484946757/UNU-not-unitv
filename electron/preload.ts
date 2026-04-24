import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('unu', {
  version: '0.9.0',
  createProject: (payload?: { projectName?: string; parentDir?: string }) => ipcRenderer.invoke('unu:create-project-v2', payload),
  pickDirectory: (payload?: { title?: string; defaultPath?: string }) => ipcRenderer.invoke('unu:pick-directory', payload),
  saveProjectAs: (payload: {
    sourceProjectRoot?: string
    projectName?: string
    currentSceneContent?: string
    currentSceneName?: string
    sceneFiles?: Array<{ fileName?: string; content: string }>
  }) =>
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
  renameProject: (payload: { projectRoot: string; nextName: string }) =>
    ipcRenderer.invoke('unu:rename-project', payload),
  deleteProject: (payload: { projectRoot: string }) =>
    ipcRenderer.invoke('unu:delete-project', payload),
  revealInFolder: (payload: { projectRoot: string; relativePath: string; isDirectory?: boolean }) =>
    ipcRenderer.invoke('unu:reveal-in-folder', payload),
  openTilemapEditor: (payload: unknown) => ipcRenderer.invoke('unu:open-tilemap-editor', payload),
  submitTilemapEditorUpdate: (payload: unknown) => ipcRenderer.invoke('unu:tilemap-editor-update', payload),
  closeTilemapEditor: () => ipcRenderer.invoke('unu:close-tilemap-editor'),
  setMainWindowPreset: (preset: 'launcher' | 'editor') => ipcRenderer.invoke('unu:set-main-window-preset', preset),
  onTilemapEditorInit: (callback: (payload: unknown) => void) => {
    const listener = (_event: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on('unu:tilemap-editor-init', listener)
    return () => ipcRenderer.removeListener('unu:tilemap-editor-init', listener)
  },
  onTilemapEditorApply: (callback: (payload: unknown) => void) => {
    const listener = (_event: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on('unu:tilemap-editor-apply', listener)
    return () => ipcRenderer.removeListener('unu:tilemap-editor-apply', listener)
  }
})
