/// <reference types="vite/client" />

declare global {
  interface Window {
    unu?: {
      version: string
      createProject?: (payload?: { projectName?: string; parentDir?: string }) => Promise<{
        rootPath: string
        name: string
        parentDir?: string
        created: boolean
        integrity?: {
          repaired: boolean
          normalizedSceneFiles: number
          copiedAssets: number
          unresolvedAssets: number
        }
      } | null>
      pickDirectory?: (payload?: { title?: string; defaultPath?: string }) => Promise<{ dirPath: string; name: string } | null>
      saveProjectAs?: (payload: {
        sourceProjectRoot?: string
        projectName?: string
        currentSceneContent?: string
        currentSceneName?: string
        sceneFiles?: Array<{ fileName?: string; content: string }>
      }) => Promise<{
        rootPath: string
        name: string
        sceneFilePath?: string
        fromSample: boolean
        integrity?: {
          repaired: boolean
          normalizedSceneFiles: number
          copiedAssets: number
          unresolvedAssets: number
        }
      } | null>
      pickProjectFolder?: () => Promise<{ rootPath: string; name: string } | null>
      scanProject?: (projectRoot: string) => Promise<{
        rootPath: string
        name: string
        tree: import('./engine/assets/types').AssetNode[]
        sceneCatalogRepaired?: boolean
        sceneCount?: number
        sceneCreatedByReference?: number
        assetIntegrityRepaired?: boolean
        normalizedSceneFiles?: number
        copiedAssets?: number
        unresolvedAssets?: number
      }>
      saveScene?: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) => Promise<{ filePath: string; name: string } | null>
      openScene?: (payload: { projectRoot?: string }) => Promise<{ filePath: string; name: string; content: string } | null>
      readAssetDataUrl?: (payload: { projectRoot: string; relativePath: string }) => Promise<{ dataUrl: string } | null>
      importImages?: (payload: { projectRoot: string }) => Promise<{ imported: Array<{ fileName: string; relativePath: string }> } | null>
      importAudios?: (payload: { projectRoot: string }) => Promise<{ imported: Array<{ fileName: string; relativePath: string }> } | null>
      savePrefab?: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) => Promise<{ filePath: string; name: string; relativePath?: string } | null>
      openPrefab?: (payload: { projectRoot?: string }) => Promise<{ filePath: string; name: string; relativePath?: string; content: string } | null>
      saveTextAsset?: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string; subdir?: string; title?: string; filterName?: string }) => Promise<{ filePath: string; name: string; relativePath?: string } | null>
      openTextAsset?: (payload: { projectRoot?: string; defaultSubdir?: string; title?: string; extensions?: string[] }) => Promise<{ filePath: string; name: string; relativePath?: string; content: string } | null>
      readTextAsset?: (payload: { projectRoot: string; relativePath: string }) => Promise<{ filePath: string; name: string; relativePath?: string; content: string } | null>
      renameProject?: (payload: { projectRoot: string; nextName: string }) => Promise<{ rootPath: string; name: string } | null>
      deleteProject?: (payload: { projectRoot: string }) => Promise<{ ok: boolean; error?: string }>
      revealInFolder?: (payload: { projectRoot: string; relativePath: string; isDirectory?: boolean }) => Promise<{ ok: boolean; error?: string }>
      openTilemapEditor?: (payload: unknown) => Promise<{ ok: boolean; error?: string }>
      submitTilemapEditorUpdate?: (payload: unknown) => Promise<{ ok: boolean; error?: string }>
      closeTilemapEditor?: () => Promise<{ ok: boolean; error?: string }>
      setMainWindowPreset?: (preset: 'launcher' | 'editor') => Promise<{ ok: boolean; error?: string }>
      onTilemapEditorInit?: (callback: (payload: unknown) => void) => (() => void)
      onTilemapEditorApply?: (callback: (payload: unknown) => void) => (() => void)
    }
  }
}

export {}
