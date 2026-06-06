import { contextBridge, ipcRenderer } from 'electron'

const windowRoleArg = process.argv.find((arg) => arg.startsWith('--unu-window-role='))
const windowRole = windowRoleArg ? windowRoleArg.slice('--unu-window-role='.length) : 'main'

contextBridge.exposeInMainWorld('unu', {
  version: '0.9.0',
  windowRole,
  createProject: (payload?: { projectName?: string; parentDir?: string; renderBackend?: 'pixi' | 'canvas2d' | 'three'; physicsBackend?: 'none' | 'cannon' | 'rapier'; template?: string }) => ipcRenderer.invoke('unu:create-project-v2', payload),
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
  listSampleProjects: () => ipcRenderer.invoke('unu:list-sample-projects'),
  getProjectInfo: (projectRoot: string) => ipcRenderer.invoke('unu:get-project-info', projectRoot),
  updateProjectSettings: (payload: { projectRoot: string; renderBackend?: 'pixi' | 'canvas2d' | 'three'; physicsBackend?: 'none' | 'cannon' | 'rapier' }) =>
    ipcRenderer.invoke('unu:update-project-settings', payload),
  clearApplicationData: () => ipcRenderer.invoke('unu:clear-application-data'),
  scanProject: (projectRoot: string) => ipcRenderer.invoke('unu:scan-project', projectRoot),
  saveScene: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) =>
    ipcRenderer.invoke('unu:save-scene', payload),
  openScene: (payload: { projectRoot?: string }) => ipcRenderer.invoke('unu:open-scene', payload),
  readAssetDataUrl: (payload: { projectRoot: string; relativePath: string }) => ipcRenderer.invoke('unu:read-asset-data-url', payload),
  importImages: (payload: { projectRoot: string }) => ipcRenderer.invoke('unu:import-images', payload),
  importAudios: (payload: { projectRoot: string }) => ipcRenderer.invoke('unu:import-audios', payload),
  importModels: (payload: { projectRoot: string }) => ipcRenderer.invoke('unu:import-models', payload),
  savePrefab: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) =>
    ipcRenderer.invoke('unu:save-prefab', payload),
  openPrefab: (payload: { projectRoot?: string }) => ipcRenderer.invoke('unu:open-prefab', payload),
  saveTextAsset: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string; subdir?: string; title?: string; filterName?: string }) =>
    ipcRenderer.invoke('unu:save-text-asset', payload),
  openTextAsset: (payload: { projectRoot?: string; defaultSubdir?: string; title?: string; extensions?: string[] }) =>
    ipcRenderer.invoke('unu:open-text-asset', payload),
  readTextAsset: (payload: { projectRoot: string; relativePath: string }) =>
    ipcRenderer.invoke('unu:read-text-asset', payload),
  createTextAssetInFolder: (payload: { projectRoot: string; folderPath: string; fileName?: string; content?: string }) =>
    ipcRenderer.invoke('unu:create-text-asset-in-folder', payload),
  createAssetFolder: (payload: { projectRoot: string; folderPath: string; folderName?: string }) =>
    ipcRenderer.invoke('unu:create-asset-folder', payload),
  renameAsset: (payload: { projectRoot: string; relativePath: string; nextName: string }) =>
    ipcRenderer.invoke('unu:rename-asset', payload),
  copyAsset: (payload: { projectRoot: string; relativePath: string; targetFolderPath?: string }) =>
    ipcRenderer.invoke('unu:copy-asset', payload),
  deleteAsset: (payload: { projectRoot: string; relativePath: string }) =>
    ipcRenderer.invoke('unu:delete-asset', payload),
  restoreDeletedAsset: (payload: { projectRoot: string; trashRelativePath: string; restoreRelativePath: string }) =>
    ipcRenderer.invoke('unu:restore-deleted-asset', payload),
  moveAsset: (payload: { projectRoot: string; relativePath: string; targetFolderPath: string }) =>
    ipcRenderer.invoke('unu:move-asset', payload),
  renameProject: (payload: { projectRoot: string; nextName: string }) =>
    ipcRenderer.invoke('unu:rename-project', payload),
  deleteProject: (payload: { projectRoot: string }) =>
    ipcRenderer.invoke('unu:delete-project', payload),
  revealInFolder: (payload: { projectRoot: string; relativePath: string; isDirectory?: boolean }) =>
    ipcRenderer.invoke('unu:reveal-in-folder', payload),
  checkAssetIntegrity: (payload: { projectRoot: string }) =>
    ipcRenderer.invoke('unu:check-asset-integrity', payload),
  watchProjectScripts: (payload: { projectRoot: string }) =>
    ipcRenderer.invoke('unu:watch-project-scripts', payload),
  unwatchProjectScripts: () => ipcRenderer.invoke('unu:unwatch-project-scripts'),
  onProjectScriptChanged: (callback: (payload: { projectRoot: string; relativePath: string; changedAt: number }) => void) => {
    const listener = (_event: unknown, payload: { projectRoot: string; relativePath: string; changedAt: number }) => callback(payload)
    ipcRenderer.on('unu:project-script-changed', listener)
    return () => ipcRenderer.removeListener('unu:project-script-changed', listener)
  },
  exportGame: (payload: { projectRoot: string; projectName?: string; renderBackend?: 'pixi' | 'canvas2d' | 'three'; physicsBackend?: 'none' | 'cannon' | 'rapier'; sceneFiles?: Array<{ fileName?: string; content: string }> }) =>
    ipcRenderer.invoke('unu:export-game', payload),
  openTilemapEditor: (payload: unknown) => ipcRenderer.invoke('unu:open-tilemap-editor', payload),
  submitTilemapEditorUpdate: (payload: unknown) => ipcRenderer.invoke('unu:tilemap-editor-update', payload),
  closeTilemapEditor: () => ipcRenderer.invoke('unu:close-tilemap-editor'),
  openCodeEditor: (payload: unknown) => ipcRenderer.invoke('unu:open-code-editor', payload),
  submitCodeEditorUpdate: (payload: unknown) => ipcRenderer.invoke('unu:code-editor-update', payload),
  closeCodeEditor: () => ipcRenderer.invoke('unu:close-code-editor'),
  openSpriteAtlasEditor: (payload: unknown) => ipcRenderer.invoke('unu:open-sprite-atlas-editor', payload),
  submitSpriteAtlasEditorUpdate: (payload: unknown) => ipcRenderer.invoke('unu:sprite-atlas-editor-update', payload),
  closeSpriteAtlasEditor: () => ipcRenderer.invoke('unu:close-sprite-atlas-editor'),
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
  },
  onCodeEditorInit: (callback: (payload: unknown) => void) => {
    const listener = (_event: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on('unu:code-editor-init', listener)
    return () => ipcRenderer.removeListener('unu:code-editor-init', listener)
  },
  onCodeEditorApply: (callback: (payload: unknown) => void) => {
    const listener = (_event: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on('unu:code-editor-apply', listener)
    return () => ipcRenderer.removeListener('unu:code-editor-apply', listener)
  },
  onCodeEditorClosed: (callback: (payload: unknown) => void) => {
    const listener = (_event: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on('unu:code-editor-closed', listener)
    return () => ipcRenderer.removeListener('unu:code-editor-closed', listener)
  },
  onSpriteAtlasEditorInit: (callback: (payload: unknown) => void) => {
    const listener = (_event: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on('unu:sprite-atlas-editor-init', listener)
    return () => ipcRenderer.removeListener('unu:sprite-atlas-editor-init', listener)
  },
  onSpriteAtlasEditorApply: (callback: (payload: unknown) => void) => {
    const listener = (_event: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on('unu:sprite-atlas-editor-apply', listener)
    return () => ipcRenderer.removeListener('unu:sprite-atlas-editor-apply', listener)
  }
})
