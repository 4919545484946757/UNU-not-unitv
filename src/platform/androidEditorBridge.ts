import { registerPlugin } from '@capacitor/core'
import type { AssetNode, AssetType } from '../engine/assets/types'
import { Scene } from '../engine/core/Scene'
import { serializeScene } from '../engine/serialization/sceneSerializer'

type MobileManifestFile = {
  path: string
  type?: AssetType
  size?: number
}

type MobileManifest = {
  generatedAt?: string
  files: MobileManifestFile[]
}

type AndroidPickedFile = {
  uri: string
  name: string
  mimeType: string
  dataUrl: string
  size?: number
}

type UnuAndroidFilesPlugin = {
  pickDirectory: (payload?: { title?: string }) => Promise<{ uri: string; name: string } | null>
  pickFiles: (payload?: { accept?: string; multiple?: boolean }) => Promise<{ files: AndroidPickedFile[] } | null>
  openFileManager: (payload?: { title?: string; uri?: string }) => Promise<{ ok: boolean; error?: string }>
  writeFileToTree: (payload: { treeUri: string; path: string; mimeType?: string; data: string; base64?: boolean }) => Promise<{ uri: string }>
  setOrientation: (payload: { orientation: 'portrait' | 'landscape' | 'unspecified' }) => Promise<{ ok: boolean; error?: string }>
}

const UnuAndroidFiles = registerPlugin<UnuAndroidFilesPlugin>('UnuAndroidFiles')

async function pickAndroidDirectory(title: string) {
  const picked = await UnuAndroidFiles.pickDirectory({ title })
  if (!picked?.uri) return null
  return {
    dirPath: picked.uri,
    name: picked.name || 'Android Directory'
  }
}

async function openAndroidFileManager(uri?: string) {
  return UnuAndroidFiles.openFileManager({ title: '打开安卓文件管理器', uri })
}

const DEFAULT_ROOT = 'android://sample-2D-shooting'
const DEFAULT_PROJECT_NAME = 'sample-2D-shooting'
const TEXT_EXTENSIONS = /\.(scene\.json|prefab\.json|anim\.json|atlas\.json|item\.json|json|js|ts|html|css|md|txt)$/i
const ANDROID_SAMPLE_PROJECTS = [
  {
    id: 'android-2d-shooting',
    rootPath: DEFAULT_ROOT,
    title: '2D Shooting (Android)',
    description: '内置 Android 编辑器示例，可在 APK 内打开、预览，并将修改保存到 WebView 本地存储。',
    bundleBase: '',
    manifestPath: 'android-game/manifest.json',
    entryScene: 'MainScene.scene.json',
    tags: ['android', '2d', 'shooting']
  },
  {
    id: 'android-snake',
    rootPath: 'android://snake',
    title: 'Snake Demo (Android)',
    description: '内置 Android 贪吃蛇示例，包含网格移动、食物、计分、暂停菜单和难度调整。',
    bundleBase: '__samples/snake/',
    manifestPath: 'android-game/__samples/snake/manifest.json',
    entryScene: 'Snake.scene.json',
    tags: ['android', '2d', 'arcade', 'snake']
  }
] as const

const manifestCache = new Map<string, Promise<MobileManifest>>()
let codeEditorSession: unknown = null
let tilemapEditorSession: unknown = null
let spriteAtlasEditorSession: unknown = null
const codeEditorInitCallbacks = new Set<(payload: unknown) => void>()
const codeEditorApplyCallbacks = new Set<(payload: unknown) => void>()
const codeEditorClosedCallbacks = new Set<(payload: unknown) => void>()
const tilemapEditorInitCallbacks = new Set<(payload: unknown) => void>()
const tilemapEditorApplyCallbacks = new Set<(payload: unknown) => void>()
const spriteAtlasEditorInitCallbacks = new Set<(payload: unknown) => void>()
const spriteAtlasEditorApplyCallbacks = new Set<(payload: unknown) => void>()

async function setAndroidOrientation(orientation: 'portrait' | 'landscape' | 'unspecified') {
  return UnuAndroidFiles.setOrientation({ orientation }).catch((error: unknown) => ({ ok: false, error: String(error) }))
}

export function installAndroidEditorBridge() {
  if (window.unu || import.meta.env.VITE_UNU_ANDROID_EDITOR !== '1') return

  window.unu = {
    version: 'android-editor',
    createProject: async (payload) => {
      const name = sanitizeName(payload?.projectName || 'UNU Android Project')
      const pickedParent = payload?.parentDir ? null : await pickAndroidDirectory('选择项目存放目录').catch(() => null)
      const parentDir = payload?.parentDir || pickedParent?.dirPath || ''
      const rootPath = `android://workspace/${name}`
      const files = createBlankProjectFiles(name)
      for (const file of files) {
        await writeOverlayText(rootPath, file.path, file.content)
      }
      if (parentDir?.startsWith('content://')) {
        for (const file of files) {
          await UnuAndroidFiles.writeFileToTree({
            treeUri: parentDir,
            path: `${name}/${file.path}`,
            mimeType: mimeFromPath(file.path),
            data: file.content,
            base64: false
          })
        }
      }
      rememberWorkspace(rootPath, name, '', parentDir)
      return { rootPath, name, parentDir, created: true }
    },
    pickDirectory: async (payload) => {
      const picked = await pickAndroidDirectory(payload?.title || '选择目录').catch(() => null)
      return picked
    },
    pickProjectFolder: async () => {
      const picked = await pickAndroidDirectory('选择工程目录').catch(() => null)
      if (picked) {
        const name = sanitizeName(picked.name || 'Android Project')
        const rootPath = `android://workspace/${name}`
        await ensureWorkspaceProjectFiles(rootPath, name)
        rememberWorkspace(rootPath, name, '', picked.dirPath)
        return { rootPath, name }
      }
      return null
    },
    listSampleProjects: async () => [
      ...ANDROID_SAMPLE_PROJECTS.map((sample) => ({
        id: sample.id,
        title: sample.title,
        description: sample.description,
        available: true,
        rootPath: sample.rootPath,
        manifestPath: sample.manifestPath,
        projectFile: 'project.json',
        entryScene: sample.entryScene,
        tags: [...sample.tags]
      }))
    ],
    scanProject: async (projectRoot) => {
      const rootPath = normalizeRoot(projectRoot)
      const projectJson = await readProjectJson(rootPath)
      return {
        rootPath,
        name: String(projectJson.name || rootName(rootPath)),
        tree: await buildAssetTree(rootPath),
        sceneCount: Array.isArray(projectJson.sceneCatalog) ? projectJson.sceneCatalog.length : 0,
        checkedAssetRefs: 0,
        resolvedAssets: 0,
        unresolvedAssets: 0
      }
    },
    saveProjectAs: async (payload) => {
      const name = sanitizeName(payload.projectName || `${rootName(payload.sourceProjectRoot || DEFAULT_ROOT)} Copy`)
      const rootPath = `android://workspace/${name}`
      const sourceRoot = normalizeRoot(payload.sourceProjectRoot || DEFAULT_ROOT)
      const projectJson = await readProjectJson(sourceRoot).catch(() => ({ name }))
      projectJson.name = name
      await writeOverlayText(rootPath, 'project.json', JSON.stringify(projectJson, null, 2))
      for (const file of payload.sceneFiles || []) {
        const sceneName = sanitizeFileName(file.fileName || 'Scene.scene.json')
        await writeOverlayText(rootPath, `scenes/${sceneName}`, file.content)
      }
      if (payload.currentSceneContent) {
        await writeOverlayText(rootPath, `scenes/${sanitizeFileName(payload.currentSceneName || 'Scene.scene.json')}`, payload.currentSceneContent)
      }
      rememberWorkspace(rootPath, name, sourceRoot, getWorkspaceParentDir(sourceRoot))
      return {
        rootPath,
        name,
        sceneFilePath: payload.currentSceneName ? `scenes/${sanitizeFileName(payload.currentSceneName)}` : undefined,
        fromSample: isAndroidSampleRoot(sourceRoot)
      }
    },
    saveScene: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const relativePath = normalizeRelativePath(payload.filePath || `scenes/${payload.suggestedName || 'Scene.scene.json'}`)
      await writeOverlayText(rootPath, relativePath, payload.content)
      return { filePath: relativePath, name: fileName(relativePath) }
    },
    openScene: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const projectJson = await readProjectJson(rootPath)
      const first = normalizeSceneReference(projectJson.startupScene || projectJson.sceneCatalog?.[0]?.file || projectJson.sceneCatalog?.[0])
      if (!first) return null
      const relativePath = `scenes/${first}`
      const content = await readText(rootPath, relativePath)
      return { filePath: relativePath, name: fileName(relativePath), content }
    },
    readTextAsset: async ({ projectRoot, relativePath }) => {
      const rootPath = normalizeRoot(projectRoot)
      const normalized = normalizeRelativePath(relativePath)
      const content = await readText(rootPath, normalized)
      return { filePath: normalized, name: fileName(normalized), relativePath: normalized, content }
    },
    saveTextAsset: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const relativePath = normalizeRelativePath(payload.filePath || `${payload.subdir || 'assets/scripts'}/${payload.suggestedName || 'NewFile.txt'}`)
      await writeOverlayText(rootPath, relativePath, payload.content)
      return { filePath: relativePath, name: fileName(relativePath), relativePath }
    },
    openTextAsset: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const files = await listTextFiles(rootPath)
      const relativePath = files.find((path) => {
        if (payload.defaultSubdir && !path.startsWith(normalizeRelativePath(payload.defaultSubdir))) return false
        if (payload.extensions?.length) return payload.extensions.some((ext) => path.toLowerCase().endsWith(`.${ext.toLowerCase()}`))
        return TEXT_EXTENSIONS.test(path)
      })
      if (!relativePath) return null
      const content = await readText(rootPath, relativePath)
      return { filePath: relativePath, name: fileName(relativePath), relativePath, content }
    },
    savePrefab: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const relativePath = normalizeRelativePath(payload.filePath || `prefabs/${payload.suggestedName || 'Prefab.prefab.json'}`)
      await writeOverlayText(rootPath, relativePath, payload.content)
      return { filePath: relativePath, name: fileName(relativePath), relativePath }
    },
    openPrefab: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const files = await listTextFiles(rootPath)
      const relativePath = files.find((path) => path.toLowerCase().endsWith('.prefab.json'))
      if (!relativePath) return null
      return { filePath: relativePath, name: fileName(relativePath), relativePath, content: await readText(rootPath, relativePath) }
    },
    readAssetDataUrl: async ({ projectRoot, relativePath }) => {
      const rootPath = normalizeRoot(projectRoot)
      const normalized = normalizeRelativePath(relativePath)
      const overlay = localStorage.getItem(fileKey(rootPath, normalized))
      if (overlay?.startsWith('data:')) return { dataUrl: overlay }
      if (!getAndroidSample(rootPath)) return null
      const response = await fetch(resolveBundlePath(normalized, rootPath))
      if (!response.ok) return null
      const blob = await response.blob()
      return { dataUrl: await blobToDataUrl(blob) }
    },
    importImages: async (payload) => importFiles(normalizeRoot(payload.projectRoot), 'assets/images/imported', 'image/*'),
    importAudios: async (payload) => importFiles(normalizeRoot(payload.projectRoot), 'assets/audio/imported', 'audio/*'),
    createTextAssetInFolder: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const name = sanitizeFileName(payload.fileName || 'NewFile.txt')
      const relativePath = normalizeRelativePath(`${payload.folderPath || 'assets'}/${name}`)
      await writeOverlayText(rootPath, relativePath, payload.content ?? '')
      return { filePath: relativePath, name: fileName(relativePath), relativePath }
    },
    createAssetFolder: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const name = sanitizeFileName(payload.folderName || 'NewFolder')
      const relativePath = normalizeRelativePath(`${payload.folderPath || 'assets'}/${name}`)
      localStorage.setItem(folderKey(rootPath, relativePath), '1')
      return { filePath: relativePath, name, relativePath }
    },
    renameAsset: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const from = normalizeRelativePath(payload.relativePath)
      const to = normalizeRelativePath(`${from.split('/').slice(0, -1).join('/')}/${sanitizeFileName(payload.nextName)}`)
      const content = await readText(rootPath, from).catch(() => '')
      if (content) {
        await writeOverlayText(rootPath, to, content)
        localStorage.removeItem(fileKey(rootPath, from))
      }
      return { filePath: to, name: fileName(to), relativePath: to, relinkedFiles: 0 }
    },
    copyAsset: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const source = normalizeRelativePath(payload.relativePath)
      const targetFolder = normalizeRelativePath(payload.targetFolderPath || source.split('/').slice(0, -1).join('/'))
      const target = normalizeRelativePath(`${targetFolder}/${uniqueCopyName(fileName(source))}`)
      const content = await readText(rootPath, source).catch(() => '')
      await writeOverlayText(rootPath, target, content)
      return { filePath: target, name: fileName(target), relativePath: target }
    },
    deleteAsset: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const relativePath = normalizeRelativePath(payload.relativePath)
      const trashRelativePath = `.unu-trash/${Date.now()}-${fileName(relativePath)}`
      const content = await readText(rootPath, relativePath).catch(() => '')
      if (content) await writeOverlayText(rootPath, trashRelativePath, content)
      localStorage.removeItem(fileKey(rootPath, relativePath))
      return { ok: true, relativePath, trashRelativePath }
    },
    restoreDeletedAsset: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const content = await readText(rootPath, payload.trashRelativePath)
      await writeOverlayText(rootPath, payload.restoreRelativePath, content)
      return { filePath: payload.restoreRelativePath, name: fileName(payload.restoreRelativePath), relativePath: payload.restoreRelativePath }
    },
    moveAsset: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const from = normalizeRelativePath(payload.relativePath)
      const to = normalizeRelativePath(`${payload.targetFolderPath}/${fileName(from)}`)
      const content = await readText(rootPath, from).catch(() => '')
      if (content) {
        await writeOverlayText(rootPath, to, content)
        localStorage.removeItem(fileKey(rootPath, from))
      }
      return { filePath: to, name: fileName(to), relativePath: to, relinkedFiles: 0 }
    },
    deleteProject: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      if (isAndroidSampleRoot(rootPath)) return { ok: false, error: 'Android 内置示例不可删除。' }
      forgetWorkspace(rootPath)
      for (const key of allLocalStorageKeys()) {
        if (key.includes(`${rootPath}:`)) localStorage.removeItem(key)
      }
      return { ok: true }
    },
    renameProject: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const name = sanitizeName(payload.nextName)
      rememberWorkspace(rootPath, name, getWorkspaceSourceRoot(rootPath), getWorkspaceParentDir(rootPath))
      const project = await readProjectJson(rootPath).catch(() => ({ name }))
      project.name = name
      await writeOverlayText(rootPath, 'project.json', JSON.stringify(project, null, 2))
      return { rootPath, name }
    },
    revealInFolder: async (payload) => {
      const rootPath = normalizeRoot(payload.projectRoot)
      const result = await openAndroidFileManager(getWorkspaceParentDir(rootPath)).catch((error) => ({ ok: false, error: String(error) }))
      return result?.ok ? result : { ok: false, error: result?.error || 'Android 文件管理器未返回可用目录。' }
    },
    checkAssetIntegrity: async (payload) => {
      const scanned = await window.unu!.scanProject!(normalizeRoot(payload.projectRoot))
      return { ...scanned, assetIntegrityRepaired: false }
    },
    watchProjectScripts: async () => ({ ok: true }),
    unwatchProjectScripts: async () => ({ ok: true }),
    onProjectScriptChanged: () => () => undefined,
    exportGame: async (payload) => exportProjectBundle(normalizeRoot(payload.projectRoot), payload.projectName, payload.sceneFiles),
    openTilemapEditor: async (payload) => {
      await setAndroidOrientation('portrait')
      tilemapEditorSession = payload
      window.dispatchEvent(new Event('unu-android-tilemap-editor-open'))
      queueMicrotask(() => tilemapEditorInitCallbacks.forEach((callback) => callback(payload)))
      return { ok: true }
    },
    submitTilemapEditorUpdate: async (payload) => {
      tilemapEditorApplyCallbacks.forEach((callback) => callback(payload))
      return { ok: true }
    },
    closeTilemapEditor: async () => {
      tilemapEditorSession = null
      window.dispatchEvent(new Event('unu-android-tilemap-editor-close'))
      await setAndroidOrientation('landscape')
      return { ok: true }
    },
    openCodeEditor: async (payload) => {
      await setAndroidOrientation('portrait')
      codeEditorSession = payload
      window.dispatchEvent(new Event('unu-android-code-editor-open'))
      queueMicrotask(() => codeEditorInitCallbacks.forEach((callback) => callback(payload)))
      return { ok: true }
    },
    submitCodeEditorUpdate: async (payload) => {
      codeEditorApplyCallbacks.forEach((callback) => callback(payload))
      return { ok: true }
    },
    closeCodeEditor: async () => {
      const payload = codeEditorSession
      codeEditorSession = null
      codeEditorClosedCallbacks.forEach((callback) => callback(payload))
      window.dispatchEvent(new Event('unu-android-code-editor-close'))
      await setAndroidOrientation('landscape')
      return { ok: true }
    },
    openSpriteAtlasEditor: async (payload) => {
      await setAndroidOrientation('portrait')
      spriteAtlasEditorSession = payload
      window.dispatchEvent(new Event('unu-android-sprite-atlas-editor-open'))
      queueMicrotask(() => spriteAtlasEditorInitCallbacks.forEach((callback) => callback(payload)))
      return { ok: true }
    },
    submitSpriteAtlasEditorUpdate: async (payload) => {
      spriteAtlasEditorApplyCallbacks.forEach((callback) => callback(payload))
      return { ok: true }
    },
    closeSpriteAtlasEditor: async () => {
      spriteAtlasEditorSession = null
      window.dispatchEvent(new Event('unu-android-sprite-atlas-editor-close'))
      await setAndroidOrientation('landscape')
      return { ok: true }
    },
    setMainWindowPreset: async (preset) => setAndroidOrientation(preset === 'launcher' ? 'portrait' : 'landscape'),
    onTilemapEditorInit: (callback) => {
      tilemapEditorInitCallbacks.add(callback)
      if (tilemapEditorSession) queueMicrotask(() => callback(tilemapEditorSession))
      return () => tilemapEditorInitCallbacks.delete(callback)
    },
    onTilemapEditorApply: (callback) => {
      tilemapEditorApplyCallbacks.add(callback)
      return () => tilemapEditorApplyCallbacks.delete(callback)
    },
    onCodeEditorInit: (callback) => {
      codeEditorInitCallbacks.add(callback)
      if (codeEditorSession) queueMicrotask(() => callback(codeEditorSession))
      return () => codeEditorInitCallbacks.delete(callback)
    },
    onCodeEditorApply: (callback) => {
      codeEditorApplyCallbacks.add(callback)
      return () => codeEditorApplyCallbacks.delete(callback)
    },
    onCodeEditorClosed: (callback) => {
      codeEditorClosedCallbacks.add(callback)
      return () => codeEditorClosedCallbacks.delete(callback)
    },
    onSpriteAtlasEditorInit: (callback) => {
      spriteAtlasEditorInitCallbacks.add(callback)
      if (spriteAtlasEditorSession) queueMicrotask(() => callback(spriteAtlasEditorSession))
      return () => spriteAtlasEditorInitCallbacks.delete(callback)
    },
    onSpriteAtlasEditorApply: (callback) => {
      spriteAtlasEditorApplyCallbacks.add(callback)
      return () => spriteAtlasEditorApplyCallbacks.delete(callback)
    }
  }
}

async function loadManifest(rootPath = DEFAULT_ROOT) {
  const normalizedRoot = normalizeRoot(rootPath)
  if (!getAndroidSample(normalizedRoot)) {
    return { files: [] } as MobileManifest
  }
  if (!manifestCache.has(normalizedRoot)) {
    manifestCache.set(normalizedRoot, fetch(resolveBundlePath('unu-mobile-manifest.json', normalizedRoot))
      .then((response) => {
        if (!response.ok) throw new Error('Android manifest missing')
        return response.json() as Promise<MobileManifest>
      }))
  }
  return manifestCache.get(normalizedRoot)!
}

async function buildAssetTree(rootPath: string) {
  const manifest = await loadManifest(rootPath)
  const paths = new Map<string, AssetNode>()
  for (const root of ['assets', 'scenes', 'prefabs']) ensureFolder(paths, root)
  for (const item of manifest.files) addFileNode(paths, item.path, item.type || classifyAssetType(item.path))
  for (const item of overlayFilePaths(rootPath)) addFileNode(paths, item, classifyAssetType(item))
  for (const folder of overlayFolderPaths(rootPath)) ensureFolder(paths, folder)

  const nodes = Array.from(paths.values())
  for (const node of nodes) node.children = []
  for (const node of nodes) {
    if (!node.parentId) continue
    nodes.find((candidate) => candidate.id === node.parentId)?.children?.push(node)
  }
  for (const node of nodes) node.children?.sort(sortAssetNode)
  return nodes.filter((node) => !node.parentId).sort(sortAssetNode)
}

function ensureFolder(paths: Map<string, AssetNode>, folderPath: string) {
  const normalized = normalizeRelativePath(folderPath)
  if (!normalized || paths.has(normalized)) return
  const parent = normalized.includes('/') ? normalized.split('/').slice(0, -1).join('/') : ''
  if (parent) ensureFolder(paths, parent)
  paths.set(normalized, {
    id: `android-folder:${normalized}`,
    name: fileName(normalized),
    type: 'folder',
    path: normalized,
    parentId: parent ? `android-folder:${parent}` : undefined,
    children: []
  })
}

function addFileNode(paths: Map<string, AssetNode>, filePath: string, type: AssetType) {
  const normalized = normalizeRelativePath(filePath)
  if (!normalized) return
  const parent = normalized.split('/').slice(0, -1).join('/')
  if (parent) ensureFolder(paths, parent)
  paths.set(normalized, {
    id: `android-file:${normalized}`,
    name: fileName(normalized),
    type,
    path: normalized,
    parentId: parent ? `android-folder:${parent}` : undefined
  })
}

async function readProjectJson(rootPath: string) {
  return JSON.parse(await readText(rootPath, 'project.json'))
}

async function readText(rootPath: string, relativePath: string) {
  const normalized = normalizeRelativePath(relativePath)
  const stored = localStorage.getItem(fileKey(rootPath, normalized))
  if (stored !== null) return stored
  if (!getAndroidSample(rootPath)) throw new Error(`Android workspace asset not found: ${normalized}`)
  const response = await fetch(resolveBundlePath(normalized, rootPath))
  if (!response.ok) throw new Error(`Android asset not found: ${normalized}`)
  return response.text()
}

async function writeOverlayText(rootPath: string, relativePath: string, content: string) {
  localStorage.setItem(fileKey(rootPath, normalizeRelativePath(relativePath)), content)
}

async function listTextFiles(rootPath: string) {
  const manifest = await loadManifest(rootPath)
  return Array.from(new Set([
    ...manifest.files.map((item) => normalizeRelativePath(item.path)),
    ...overlayFilePaths(rootPath)
  ])).filter((path) => TEXT_EXTENSIONS.test(path)).sort()
}

function overlayFilePaths(rootPath: string) {
  const prefix = fileKey(rootPath, '')
  return allLocalStorageKeys().filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length))
}

function overlayFolderPaths(rootPath: string) {
  const prefix = folderKey(rootPath, '')
  return allLocalStorageKeys().filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length))
}

async function importFiles(rootPath: string, folder: string, accept: string) {
  const files = await pickFiles(accept)
  const imported: Array<{ fileName: string; relativePath: string }> = []
  for (const file of files) {
    const relativePath = normalizeRelativePath(`${folder}/${sanitizeFileName(file.name)}`)
    localStorage.setItem(fileKey(rootPath, relativePath), 'dataUrl' in file ? file.dataUrl : await fileToDataUrl(file))
    imported.push({ fileName: file.name, relativePath })
  }
  return { imported }
}

async function pickFiles(accept: string): Promise<Array<File | AndroidPickedFile>> {
  const native = await UnuAndroidFiles.pickFiles({ accept, multiple: true }).catch(() => null)
  if (native?.files?.length) return native.files
  return new Promise<File[]>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = true
    input.style.display = 'none'
    input.onchange = () => {
      resolve(Array.from(input.files || []))
      input.remove()
    }
    document.body.appendChild(input)
    input.click()
  })
}

async function exportProjectBundle(rootPath: string, projectName?: string, sceneFiles?: Array<{ fileName?: string; content: string }>) {
  const manifest = await loadManifest(rootPath)
  const exportName = `${sanitizeFileName(projectName || rootName(rootPath))}-web-${timestampForPath()}`
  const pickedOutput = await pickAndroidDirectory('选择 Web 游戏导出目录').catch(() => null)
  const exportTreeUri = pickedOutput?.dirPath?.startsWith('content://') ? pickedOutput.dirPath : ''
  const exportRoot = exportTreeUri ? exportName : `UNUExports/${exportName}`
  const report = {
    format: 'unu-android-web-export-directory',
    exportedAt: new Date().toISOString(),
    projectName: projectName || rootName(rootPath),
    rootPath,
    outputDir: exportTreeUri ? `${pickedOutput?.name || 'Android Directory'}/${exportName}` : exportRoot,
    files: [] as string[],
    runtimeFiles: [] as string[],
    warnings: [] as string[]
  }
  try {
    const runtimeExport = await writeEmbeddedGameRuntime(exportRoot, exportTreeUri).catch((error) => {
      report.warnings.push(`未能写入 Android 内置游戏运行时：${String(error)}`)
      return 0
    })
    const projectExportRoot = runtimeExport > 0 ? `${exportRoot}/android-game` : exportRoot
    report.runtimeFiles = runtimeExport > 0 ? ['index.html', 'android-runtime manifest embedded'] : []
    if (!exportTreeUri) {
      await writeAndroidDirectory(`${projectExportRoot}/assets`)
      await writeAndroidDirectory(`${projectExportRoot}/scenes`)
      await writeAndroidDirectory(`${projectExportRoot}/prefabs`)
    }

    for (const item of manifest.files) {
      const path = normalizeRelativePath(item.path)
      if (!path || path === 'unu-mobile-manifest.json') continue
      await writeExportFile(rootPath, projectExportRoot, path, exportTreeUri)
      report.files.push(path)
    }

    for (const path of overlayFilePaths(rootPath)) {
      if (!path || path.startsWith('.unu-trash/')) continue
      await writeExportFile(rootPath, projectExportRoot, path, exportTreeUri)
      if (!report.files.includes(path)) report.files.push(path)
    }

    for (const scene of sceneFiles || []) {
      const path = `scenes/${sanitizeFileName(scene.fileName || 'Scene.scene.json')}`
      await writeExportText(`${projectExportRoot}/${path}`, scene.content, exportTreeUri)
      if (!report.files.includes(path)) report.files.push(path)
    }

    const projectPayload = await readText(rootPath, 'project.json').catch(() => JSON.stringify({ name: projectName || rootName(rootPath) }, null, 2))
    await writeExportText(`${projectExportRoot}/project.json`, projectPayload, exportTreeUri)
    if (!report.files.includes('project.json')) report.files.push('project.json')

    report.files.sort()
    await writeExportText(`${exportRoot}/export-report.json`, JSON.stringify(report, null, 2), exportTreeUri)
    await writeExportText(
      `${exportRoot}/EXPORT_README.md`,
      [
        '# UNU Android Web Export',
        '',
        'This directory was generated from the Android editor build.',
        runtimeExport > 0
          ? 'It includes a standalone Web game runtime and the project files under android-game/. Serve this folder over HTTP and open index.html.'
          : 'It contains project resources in their normal relative paths. The standalone runtime was not available in this APK build.',
        '',
        `Project: ${report.projectName}`,
        `Exported At: ${report.exportedAt}`
      ].join('\n'),
      exportTreeUri
    )

    return {
      ok: true,
      outputDir: report.outputDir,
      indexPath: runtimeExport > 0 ? `${report.outputDir}/index.html` : `${report.outputDir}/project.json`,
      reportPath: `${report.outputDir}/export-report.json`,
      sceneCount: report.files.filter((path) => path.endsWith('.scene.json')).length,
      assetCount: report.files.length
    }
  } catch (error) {
    console.warn('[UNU][android] directory export failed, falling back to JSON bundle', error)
    const files: Record<string, string> = {}
    for (const item of manifest.files) {
      const path = normalizeRelativePath(item.path)
      if (isTextLike(path)) files[path] = await readText(rootPath, path).catch(() => '')
    }
    for (const path of overlayFilePaths(rootPath)) files[path] = await readText(rootPath, path).catch(() => '')
    for (const scene of sceneFiles || []) files[`scenes/${sanitizeFileName(scene.fileName || 'Scene.scene.json')}`] = scene.content
    const bundle = {
      format: 'unu-android-web-export-bundle',
      exportedAt: new Date().toISOString(),
      projectName: projectName || rootName(rootPath),
      rootPath,
      files
    }
    const fileName = `${sanitizeFileName(projectName || rootName(rootPath))}-android-web-export.json`
    downloadBlob(fileName, new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }))
    return {
      ok: true,
      outputDir: 'Android Downloads',
      indexPath: fileName,
      reportPath: fileName,
      sceneCount: Object.keys(files).filter((path) => path.endsWith('.scene.json')).length,
      assetCount: Object.keys(files).length,
      error: 'Directory export failed; downloaded JSON bundle fallback.'
    }
  }
}

async function writeEmbeddedGameRuntime(exportRoot: string, treeUri = '') {
  const manifestResponse = await fetch('./android-runtime/unu-runtime-manifest.json')
  if (!manifestResponse.ok) return 0
  const manifest = await manifestResponse.json() as { files?: string[] }
  const files = Array.isArray(manifest.files) ? manifest.files.map(normalizeRelativePath).filter(Boolean) : []
  let written = 0
  for (const path of files) {
    if (path === 'unu-runtime-manifest.json') continue
    const response = await fetch(`./android-runtime/${path}`)
    if (!response.ok) continue
    const targetPath = `${exportRoot}/${path}`
    if (isRuntimeTextLike(path)) {
      const text = path === 'index.html' ? patchAndroidRuntimeIndex(await response.text()) : await response.text()
      await writeExportText(targetPath, text, treeUri)
    } else {
      const dataUrl = await blobToDataUrl(await response.blob())
      await writeExportBase64(targetPath, dataUrlToBase64(dataUrl), treeUri, mimeFromDataUrl(dataUrl))
    }
    written += 1
  }
  return written
}

function patchAndroidRuntimeIndex(html: string) {
  let next = html
    .replace(/(src|href)="\/assets\//g, '$1="./assets/')
    .replace(/<title>.*?<\/title>/i, '<title>UNU Web Game</title>')
  if (!next.includes('__UNU_GAME_EXPORT__')) {
    next = next.replace(/<head([^>]*)>/i, '<head$1>\n    <script>window.__UNU_GAME_EXPORT__ = true;</script>')
  }
  return next
}

async function writeExportFile(rootPath: string, exportRoot: string, relativePath: string, treeUri = '') {
  const normalized = normalizeRelativePath(relativePath)
  if (!normalized) return
  const overlay = localStorage.getItem(fileKey(rootPath, normalized))
  if (overlay !== null) {
    if (overlay.startsWith('data:')) {
      await writeExportBase64(`${exportRoot}/${normalized}`, dataUrlToBase64(overlay), treeUri, mimeFromDataUrl(overlay))
    } else {
      await writeExportText(`${exportRoot}/${normalized}`, overlay, treeUri)
    }
    return
  }
  if (isTextLike(normalized)) {
    await writeExportText(`${exportRoot}/${normalized}`, await readText(rootPath, normalized), treeUri)
    return
  }
  if (!getAndroidSample(rootPath)) throw new Error(`Android workspace binary asset not found: ${normalized}`)
  const response = await fetch(resolveBundlePath(normalized, rootPath))
  if (!response.ok) throw new Error(`Failed to export Android asset: ${normalized}`)
  const dataUrl = await blobToDataUrl(await response.blob())
  await writeExportBase64(`${exportRoot}/${normalized}`, dataUrlToBase64(dataUrl), treeUri, mimeFromDataUrl(dataUrl))
}

async function writeExportText(path: string, data: string, treeUri = '') {
  if (treeUri) {
    await UnuAndroidFiles.writeFileToTree({
      treeUri,
      path: normalizeAndroidFsPath(path),
      mimeType: mimeFromPath(path),
      data,
      base64: false
    })
    return
  }
  await writeAndroidText(path, data)
}

async function writeExportBase64(path: string, data: string, treeUri = '', mimeType = 'application/octet-stream') {
  if (treeUri) {
    await UnuAndroidFiles.writeFileToTree({
      treeUri,
      path: normalizeAndroidFsPath(path),
      mimeType,
      data,
      base64: true
    })
    return
  }
  await writeAndroidBase64(path, data)
}

async function writeAndroidDirectory(path: string) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  await Filesystem.mkdir({
    path: normalizeAndroidFsPath(path),
    directory: Directory.Documents,
    recursive: true
  }).catch((error: unknown) => {
    if (!String(error).toLowerCase().includes('exist')) throw error
  })
}

async function writeAndroidText(path: string, data: string) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  await ensureAndroidParentDirectory(path)
  await Filesystem.writeFile({
    path: normalizeAndroidFsPath(path),
    data,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true
  })
}

async function writeAndroidBase64(path: string, data: string) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  await ensureAndroidParentDirectory(path)
  await Filesystem.writeFile({
    path: normalizeAndroidFsPath(path),
    data,
    directory: Directory.Documents,
    recursive: true
  })
}

async function ensureAndroidParentDirectory(path: string) {
  const parent = normalizeAndroidFsPath(path).split('/').slice(0, -1).join('/')
  if (parent) await writeAndroidDirectory(parent)
}

function createBlankProjectFiles(name: string) {
  const now = new Date().toISOString()
  const scene = new Scene('scene_main', 'MainScene')
  const project = {
    format: 'unu-project',
    version: 1,
    name,
    createdAt: now,
    updatedAt: now,
    sceneCatalogVersion: 1,
    sceneCatalog: [
      {
        file: 'MainScene.scene.json',
        name: 'MainScene',
        scriptRoot: 'assets/scripts/scenes/MainScene'
      }
    ],
    startupScene: 'MainScene.scene.json',
    scriptRoots: {
      shared: 'assets/scripts/shared',
      scenes: 'assets/scripts/scenes',
      interactions: 'assets/scripts/interactions'
    }
  }
  return [
    { path: 'project.json', content: JSON.stringify(project, null, 2) },
    { path: 'scenes/MainScene.scene.json', content: serializeScene(scene) },
    { path: 'assets/README.md', content: '# Assets\n\nPlace images, audio, scripts, and other project assets here.\n' },
    { path: 'prefabs/README.md', content: '# Prefabs\n\nReusable entity prefabs can be saved here.\n' }
  ]
}

async function ensureWorkspaceProjectFiles(rootPath: string, name: string) {
  const existing = await readProjectJson(rootPath).catch(() => null)
  if (existing) return
  for (const file of createBlankProjectFiles(name)) {
    await writeOverlayText(rootPath, file.path, file.content)
  }
}

function normalizeAndroidFsPath(path: string) {
  return normalizeRelativePath(path)
}

function dataUrlToBase64(value: string) {
  const marker = ';base64,'
  const index = value.indexOf(marker)
  if (index >= 0) return value.slice(index + marker.length)
  const comma = value.indexOf(',')
  return comma >= 0 ? btoa(decodeURIComponent(value.slice(comma + 1))) : value
}

function mimeFromDataUrl(value: string) {
  const match = /^data:([^;,]+)[;,]/.exec(value)
  return match?.[1] || 'application/octet-stream'
}

function mimeFromPath(path: string) {
  const lower = path.toLowerCase()
  if (lower.endsWith('.json')) return 'application/json'
  if (lower.endsWith('.js')) return 'text/javascript'
  if (lower.endsWith('.ts')) return 'text/plain'
  if (lower.endsWith('.html')) return 'text/html'
  if (lower.endsWith('.css')) return 'text/css'
  if (lower.endsWith('.md')) return 'text/markdown'
  if (lower.endsWith('.txt')) return 'text/plain'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.mp3')) return 'audio/mpeg'
  if (lower.endsWith('.wav')) return 'audio/wav'
  if (lower.endsWith('.ogg')) return 'audio/ogg'
  return 'application/octet-stream'
}

function timestampForPath() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function resolveBundlePath(relativePath: string, rootPath = DEFAULT_ROOT) {
  const base = normalizeGameBasePath(import.meta.env.VITE_UNU_GAME_BASE || './android-game/')
  const sample = getAndroidSample(rootPath)
  return `${base}${sample?.bundleBase || ''}${normalizeRelativePath(relativePath)}`
}

function normalizeGameBasePath(value: string) {
  const raw = String(value || './').replace(/\\/g, '/').trim()
  if (!raw || raw === '.') return './'
  const withPrefix = raw.startsWith('./') || raw.startsWith('../') || raw.startsWith('/') ? raw : `./${raw}`
  return withPrefix.endsWith('/') ? withPrefix : `${withPrefix}/`
}

function normalizeRoot(value?: string) {
  return String(value || DEFAULT_ROOT)
}

function getAndroidSample(rootPath?: string) {
  const bundleRoot = resolveWorkspaceBundleRoot(normalizeRoot(rootPath))
  return ANDROID_SAMPLE_PROJECTS.find((sample) => sample.rootPath === bundleRoot)
}

function isAndroidSampleRoot(rootPath?: string) {
  const normalizedRoot = normalizeRoot(rootPath)
  return ANDROID_SAMPLE_PROJECTS.some((sample) => sample.rootPath === normalizedRoot)
}

function resolveWorkspaceBundleRoot(rootPath: string) {
  let cursor = normalizeRoot(rootPath)
  const visited = new Set<string>()
  for (let depth = 0; depth < 8; depth += 1) {
    if (isAndroidSampleRoot(cursor)) return cursor
    if (visited.has(cursor)) return cursor
    visited.add(cursor)
    const source = getWorkspaceSourceRoot(cursor)
    if (!source) return cursor
    cursor = normalizeRoot(source)
  }
  return cursor
}

function normalizeRelativePath(value?: string) {
  return String(value || '').replace(/\\/g, '/').replace(/^android-game\//, '').replace(/^\.?\//, '').replace(/^\/+/, '')
}

function normalizeSceneReference(value: unknown) {
  if (typeof value === 'object' && value) {
    const item = value as { file?: string; fileName?: string; path?: string }
    return normalizeSceneReference(item.file || item.fileName || item.path)
  }
  return normalizeRelativePath(String(value || '')).replace(/^scenes\//, '').split('/').pop() || ''
}

function classifyAssetType(filePath: string): AssetType {
  const lower = filePath.toLowerCase()
  if (/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/.test(lower)) return 'image'
  if (/\.(mp3|wav|ogg|m4a|flac)$/.test(lower)) return 'audio'
  if (/\.scene\.json$/.test(lower)) return 'scene'
  if (/\.prefab\.json$/.test(lower)) return 'prefab'
  if (/\.anim\.json$/.test(lower)) return 'animation'
  if (/\.atlas\.json$/.test(lower)) return 'atlas'
  return 'script'
}

function isTextLike(path: string) {
  return TEXT_EXTENSIONS.test(path)
}

function isRuntimeTextLike(path: string) {
  return /\.(html|js|mjs|css|json|svg|txt|webmanifest)$/i.test(path)
}

function fileKey(rootPath: string, relativePath: string) {
  return `unu:android:file:${rootPath}:${normalizeRelativePath(relativePath)}`
}

function folderKey(rootPath: string, relativePath: string) {
  return `unu:android:folder:${rootPath}:${normalizeRelativePath(relativePath)}`
}

function fileName(path: string) {
  return normalizeRelativePath(path).split('/').filter(Boolean).pop() || path
}

function rootName(rootPath?: string) {
  const root = normalizeRoot(rootPath)
  const sample = ANDROID_SAMPLE_PROJECTS.find((item) => item.rootPath === root)
  if (sample) return sample.rootPath === DEFAULT_ROOT ? DEFAULT_PROJECT_NAME : sample.rootPath.replace(/^android:\/\//, '')
  return root.split('/').pop() || DEFAULT_PROJECT_NAME
}

function sanitizeName(value: string) {
  return value.replace(/[<>:"/\\|?*]/g, '-').trim() || 'UNU Android Project'
}

function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*]/g, '-').trim() || 'NewFile.txt'
}

function uniqueCopyName(name: string) {
  const dot = name.lastIndexOf('.')
  if (dot > 0) return `${name.slice(0, dot)} copy${name.slice(dot)}`
  return `${name} copy`
}

function sortAssetNode(left: AssetNode, right: AssetNode) {
  if (left.type === 'folder' && right.type !== 'folder') return -1
  if (left.type !== 'folder' && right.type === 'folder') return 1
  return left.name.localeCompare(right.name)
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read Android asset data URL'))
    reader.readAsDataURL(blob)
  })
}

function fileToDataUrl(file: File) {
  return blobToDataUrl(file)
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function allLocalStorageKeys() {
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index++) keys.push(localStorage.key(index) || '')
  return keys.filter(Boolean)
}

function listWorkspaces() {
  try {
    const parsed = JSON.parse(localStorage.getItem('unu:android:workspaces') || '[]') as Array<{ rootPath: string; name: string; sourceRoot?: string; parentDir?: string }>
    return parsed.map((item) => {
      const rootPath = String(item.rootPath || '')
      const sourceRoot = String(item.sourceRoot || '')
      const ownProject = localStorage.getItem(fileKey(rootPath, 'project.json'))
      const isSampleDerived = ownProject ? /"sampleManifest"\s*:/.test(ownProject) : false
      return {
        ...item,
        sourceRoot: ownProject && sourceRoot === DEFAULT_ROOT && !isSampleDerived ? '' : sourceRoot
      }
    })
  } catch {
    return []
  }
}

function rememberWorkspace(rootPath: string, name: string, sourceRoot?: string, parentDir?: string) {
  const previous = listWorkspaces().find((item) => item.rootPath === rootPath)
  const next = [
    {
      rootPath,
      name,
      sourceRoot: sourceRoot ?? previous?.sourceRoot ?? '',
      parentDir: parentDir || previous?.parentDir || ''
    },
    ...listWorkspaces().filter((item) => item.rootPath !== rootPath)
  ].slice(0, 12)
  localStorage.setItem('unu:android:workspaces', JSON.stringify(next))
  localStorage.setItem('unu:android:lastWorkspace', rootPath)
}

function getWorkspaceSourceRoot(rootPath: string) {
  return listWorkspaces().find((item) => item.rootPath === rootPath)?.sourceRoot || ''
}

function getWorkspaceParentDir(rootPath: string) {
  return listWorkspaces().find((item) => item.rootPath === rootPath)?.parentDir || ''
}

function forgetWorkspace(rootPath: string) {
  localStorage.setItem('unu:android:workspaces', JSON.stringify(listWorkspaces().filter((item) => item.rootPath !== rootPath)))
  if (getLastWorkspaceRoot() === rootPath) localStorage.removeItem('unu:android:lastWorkspace')
}

function getLastWorkspaceRoot() {
  return localStorage.getItem('unu:android:lastWorkspace') || listWorkspaces()[0]?.rootPath || ''
}

