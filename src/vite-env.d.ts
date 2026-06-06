/// <reference types="vite/client" />

declare global {
  type UnuAssetIntegrityRef = {
    sourceFile: string
    sourceKind: string
    keyPath: string
    ref: string
  }

  type UnuAssetIntegrityResult = {
    repaired: boolean
    normalizedSceneFiles: number
    normalizedFiles?: number
    copiedAssets: number
    relinkedAssets?: number
    relinkedFiles?: number
    checkedAssetRefs?: number
    resolvedAssets?: number
    unresolvedAssets: number
    unresolvedRefs?: UnuAssetIntegrityRef[]
  }

  type UnuProjectRenderBackend = 'pixi' | 'canvas2d' | 'three'
  type UnuProjectPhysicsBackend = 'none' | 'cannon' | 'rapier'

  interface Window {
    __UNU_GAME_EXPORT__?: boolean
    unu?: {
      version: string
      windowRole?: 'main' | 'tilemap-editor' | 'code-editor' | 'sprite-atlas-editor' | string
      createProject?: (payload?: { projectName?: string; parentDir?: string; renderBackend?: UnuProjectRenderBackend; physicsBackend?: UnuProjectPhysicsBackend; template?: string }) => Promise<{
        rootPath: string
        name: string
        parentDir?: string
        renderBackend?: UnuProjectRenderBackend
        physicsBackend?: UnuProjectPhysicsBackend
        created: boolean
        integrity?: UnuAssetIntegrityResult
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
        integrity?: UnuAssetIntegrityResult
      } | null>
      pickProjectFolder?: () => Promise<{ rootPath: string; name: string } | null>
      listSampleProjects?: () => Promise<Array<{
        id: string
        title: string
        description: string
        available: boolean
        rootPath?: string
        manifestPath?: string
        projectFile?: string
        entryScene?: string
        tags?: string[]
      }>>
      getProjectInfo?: (projectRoot: string) => Promise<{ rootPath: string; name: string; renderBackend?: UnuProjectRenderBackend; physicsBackend?: UnuProjectPhysicsBackend }>
      updateProjectSettings?: (payload: { projectRoot: string; renderBackend?: UnuProjectRenderBackend; physicsBackend?: UnuProjectPhysicsBackend }) => Promise<{ ok: boolean; renderBackend?: UnuProjectRenderBackend; physicsBackend?: UnuProjectPhysicsBackend; error?: string }>
      clearApplicationData?: () => Promise<{ ok: boolean; cleared?: string[]; restartRequired?: boolean; error?: string }>
      scanProject?: (projectRoot: string) => Promise<{
        rootPath: string
        name: string
        renderBackend?: UnuProjectRenderBackend
        physicsBackend?: UnuProjectPhysicsBackend
        tree: import('./engine/assets/types').AssetNode[]
        assetTreeTruncated?: boolean
        sceneCatalogRepaired?: boolean
        sceneCount?: number
        sceneCreatedByReference?: number
        assetIntegrityRepaired?: boolean
        normalizedSceneFiles?: number
        normalizedFiles?: number
        copiedAssets?: number
        relinkedAssets?: number
        relinkedFiles?: number
        checkedAssetRefs?: number
        resolvedAssets?: number
        unresolvedAssets?: number
        unresolvedRefs?: UnuAssetIntegrityRef[]
      }>
      saveScene?: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) => Promise<{ filePath: string; name: string } | null>
      openScene?: (payload: { projectRoot?: string }) => Promise<{ filePath: string; name: string; content: string } | null>
      readAssetDataUrl?: (payload: { projectRoot: string; relativePath: string }) => Promise<{ dataUrl: string } | null>
      importImages?: (payload: { projectRoot: string }) => Promise<{ imported: Array<{ fileName: string; relativePath: string }> } | null>
      importAudios?: (payload: { projectRoot: string }) => Promise<{ imported: Array<{ fileName: string; relativePath: string }> } | null>
      importModels?: (payload: { projectRoot: string }) => Promise<{ imported: Array<{ fileName: string; relativePath: string }> } | null>
      savePrefab?: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) => Promise<{ filePath: string; name: string; relativePath?: string } | null>
      openPrefab?: (payload: { projectRoot?: string }) => Promise<{ filePath: string; name: string; relativePath?: string; content: string } | null>
      saveTextAsset?: (payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string; subdir?: string; title?: string; filterName?: string }) => Promise<{ filePath: string; name: string; relativePath?: string } | null>
      openTextAsset?: (payload: { projectRoot?: string; defaultSubdir?: string; title?: string; extensions?: string[] }) => Promise<{ filePath: string; name: string; relativePath?: string; content: string } | null>
      readTextAsset?: (payload: { projectRoot: string; relativePath: string }) => Promise<{ filePath: string; name: string; relativePath?: string; content: string } | null>
      createTextAssetInFolder?: (payload: { projectRoot: string; folderPath: string; fileName?: string; content?: string }) => Promise<{ filePath: string; name: string; relativePath?: string } | null>
      createAssetFolder?: (payload: { projectRoot: string; folderPath: string; folderName?: string }) => Promise<{ filePath: string; name: string; relativePath?: string } | null>
      renameAsset?: (payload: { projectRoot: string; relativePath: string; nextName: string }) => Promise<{ filePath: string; name: string; relativePath?: string; relinkedFiles?: number } | null>
      copyAsset?: (payload: { projectRoot: string; relativePath: string; targetFolderPath?: string }) => Promise<{ filePath: string; name: string; relativePath?: string } | null>
      deleteAsset?: (payload: { projectRoot: string; relativePath: string }) => Promise<{ ok: boolean; relativePath?: string; trashRelativePath?: string; error?: string }>
      restoreDeletedAsset?: (payload: { projectRoot: string; trashRelativePath: string; restoreRelativePath: string }) => Promise<{ filePath: string; name: string; relativePath?: string } | null>
      moveAsset?: (payload: { projectRoot: string; relativePath: string; targetFolderPath: string }) => Promise<{ filePath: string; name: string; relativePath?: string; relinkedFiles?: number } | null>
      renameProject?: (payload: { projectRoot: string; nextName: string }) => Promise<{ rootPath: string; name: string } | null>
      deleteProject?: (payload: { projectRoot: string }) => Promise<{ ok: boolean; error?: string }>
      revealInFolder?: (payload: { projectRoot: string; relativePath: string; isDirectory?: boolean }) => Promise<{ ok: boolean; error?: string }>
      checkAssetIntegrity?: (payload: { projectRoot: string }) => Promise<{
        rootPath: string
        name: string
        tree: import('./engine/assets/types').AssetNode[]
        assetTreeTruncated?: boolean
        assetIntegrityRepaired?: boolean
        normalizedSceneFiles?: number
        normalizedFiles?: number
        copiedAssets?: number
        relinkedAssets?: number
        relinkedFiles?: number
        checkedAssetRefs?: number
        resolvedAssets?: number
        unresolvedAssets?: number
        unresolvedRefs?: UnuAssetIntegrityRef[]
      }>
      watchProjectScripts?: (payload: { projectRoot: string }) => Promise<{ ok: boolean; error?: string }>
      unwatchProjectScripts?: () => Promise<{ ok: boolean; error?: string }>
      onProjectScriptChanged?: (callback: (payload: { projectRoot: string; relativePath: string; changedAt: number }) => void) => (() => void)
      exportGame?: (payload: { projectRoot: string; projectName?: string; renderBackend?: UnuProjectRenderBackend; physicsBackend?: UnuProjectPhysicsBackend; sceneFiles?: Array<{ fileName?: string; content: string }> }) => Promise<{
        ok: boolean
        outputDir?: string
        indexPath?: string
        launchScript?: string
        reportPath?: string
        sceneCount?: number
        startupScene?: string
        assetCount?: number
        assetIntegrityRepaired?: boolean
        unresolvedAssets?: number
        error?: string
      } | null>
      openTilemapEditor?: (payload: unknown) => Promise<{ ok: boolean; error?: string }>
      submitTilemapEditorUpdate?: (payload: unknown) => Promise<{ ok: boolean; error?: string }>
      closeTilemapEditor?: () => Promise<{ ok: boolean; error?: string }>
      openCodeEditor?: (payload: unknown) => Promise<{ ok: boolean; error?: string }>
      submitCodeEditorUpdate?: (payload: unknown) => Promise<{ ok: boolean; error?: string }>
      closeCodeEditor?: () => Promise<{ ok: boolean; error?: string }>
      openSpriteAtlasEditor?: (payload: unknown) => Promise<{ ok: boolean; error?: string }>
      submitSpriteAtlasEditorUpdate?: (payload: unknown) => Promise<{ ok: boolean; error?: string }>
      closeSpriteAtlasEditor?: () => Promise<{ ok: boolean; error?: string }>
      setMainWindowPreset?: (preset: 'launcher' | 'editor') => Promise<{ ok: boolean; error?: string }>
      onTilemapEditorInit?: (callback: (payload: unknown) => void) => (() => void)
      onTilemapEditorApply?: (callback: (payload: unknown) => void) => (() => void)
      onCodeEditorInit?: (callback: (payload: unknown) => void) => (() => void)
      onCodeEditorApply?: (callback: (payload: unknown) => void) => (() => void)
      onCodeEditorClosed?: (callback: (payload: unknown) => void) => (() => void)
      onSpriteAtlasEditorInit?: (callback: (payload: unknown) => void) => (() => void)
      onSpriteAtlasEditorApply?: (callback: (payload: unknown) => void) => (() => void)
    }
  }
}

export {}
