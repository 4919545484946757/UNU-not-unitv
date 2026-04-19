/// <reference types="vite/client" />

declare global {
  interface Window {
    unu?: {
      version: string
      createProject?: () => Promise<{ rootPath: string; name: string; created: boolean } | null>
      saveProjectAs?: (payload: { sourceProjectRoot?: string; projectName?: string; currentSceneContent?: string; currentSceneName?: string }) => Promise<{ rootPath: string; name: string; sceneFilePath?: string; fromSample: boolean } | null>
      pickProjectFolder?: () => Promise<{ rootPath: string; name: string } | null>
      scanProject?: (projectRoot: string) => Promise<{ rootPath: string; name: string; tree: import('./engine/assets/types').AssetNode[] }>
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
      revealInFolder?: (payload: { projectRoot: string; relativePath: string; isDirectory?: boolean }) => Promise<{ ok: boolean; error?: string }>
    }
  }
}

export {}
