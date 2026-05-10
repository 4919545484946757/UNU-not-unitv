import { app, BrowserWindow, dialog, ipcMain, nativeImage, screen, shell } from 'electron'
import * as fs from 'node:fs/promises'
import * as fsSync from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let mainWindow: BrowserWindow | null = null
let tilemapEditorWindow: BrowserWindow | null = null
let tilemapEditorSession: any = null
const projectScriptWatchers = new Map<number, { watcher: fsSync.FSWatcher; timer: NodeJS.Timeout | null; projectRoot: string }>()

function normalizePath(inputPath: string) {
  return inputPath.split(path.sep).join('/')
}

function inferAssetType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase()
  if (fileName.endsWith('.anim.json')) return 'animation'
  if (fileName.endsWith('.atlas.json')) return 'atlas'
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return 'image'
  if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) return 'audio'
  if (['.js', '.ts', '.mjs'].includes(ext)) return 'script'
  if (fileName.endsWith('.scene.json')) return 'scene'
  if (fileName.endsWith('.prefab.json')) return 'prefab'
  if (['.json'].includes(ext)) return 'animation'
  return 'script'
}

async function ensureProjectStructure(projectRoot: string) {
  const folders = [
    'assets',
    'assets/images',
    'assets/audio',
    'assets/scripts',
    'assets/scripts/shared',
    'assets/scripts/scenes',
    'assets/animations',
    'scenes',
    'prefabs'
  ]
  await Promise.all(folders.map((folder) => fs.mkdir(path.join(projectRoot, folder), { recursive: true })))
}


async function writeProjectFile(projectRoot: string, projectName?: string) {
  const projectFile = path.join(projectRoot, 'project.json')
  const name = projectName?.trim() || path.basename(projectRoot)
  const payload = {
    format: 'unu-project',
    version: 1,
    name,
    createdAt: new Date().toISOString()
  }
  await fs.writeFile(projectFile, JSON.stringify(payload, null, 2), 'utf-8')
  return payload
}

function createProjectRuntimeTemplate() {
  return `export default {
  scripts: {
    // 'assets/scripts/player-input.js': {
    //   onUpdate(ctx) {}
    // }
  }
}

// You can also create directly editable scripts under:
// - assets/scripts/shared/
// - assets/scripts/scenes/<SceneName>/
// Files in those folders may export hooks directly:
// export default { onUpdate(ctx) {} }
`
}

function createProjectInputRuntimeTemplate() {
  return `export default {
  // 项目输入映射覆盖。键位字符串兼容 KeyboardEvent.code 与 MouseN（例如 Mouse0/Mouse2）。
  actionMap: {
    move_left: ['KeyA', 'ArrowLeft'],
    move_right: ['KeyD', 'ArrowRight'],
    move_up: ['KeyW', 'ArrowUp'],
    move_down: ['KeyS', 'ArrowDown'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    jump: ['Space'],
    fire: ['KeyJ', 'Mouse0'],
    interact: ['Mouse2']
  }
}
`
}

function createProjectAudioRuntimeTemplate() {
  return `export default {
  // 项目音频运行时覆盖。可按项目需要调默认音量，或在播放前重写请求。
  initialMasterVolume: 1,
  initialGroupVolumes: {
    bgm: 0.8,
    sfx: 1,
    ui: 1
  }
}
`
}

async function ensureProjectRuntimeScriptFiles(projectRoot: string) {
  const runtimeFiles: Array<{ fileName: string; content: string }> = [
    { fileName: 'ScriptRuntime.ts', content: createProjectRuntimeTemplate() },
    { fileName: 'InputState.ts', content: createProjectInputRuntimeTemplate() },
    { fileName: 'AudioRuntime.ts', content: createProjectAudioRuntimeTemplate() }
  ]
  let createdCount = 0
  for (const file of runtimeFiles) {
    const target = path.join(projectRoot, 'assets', 'scripts', file.fileName)
    if (await exists(target)) continue
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, file.content, 'utf-8')
    createdCount += 1
  }
  return createdCount
}

function parseSceneBaseName(fileName: string) {
  return fileName.replace(/\.scene\.json$/i, '')
}

function sanitizeSceneName(input?: string) {
  const raw = String(input || '').trim()
  const cleaned = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
  return cleaned
}

function toSceneFileName(sceneName: string) {
  const name = sanitizeSceneName(sceneName) || 'MainScene'
  return `${name}.scene.json`
}

function createDefaultSceneContent(sceneName: string) {
  const safeName = sanitizeSceneName(sceneName) || 'MainScene'
  const sceneId = `scene_${safeName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'main'}`
  if (safeName === 'SecondScene') {
    const playerScriptConfig = `{
  "moveSpeed": 140,
  "sprintSpeed": 280,
  "runAnimationMultiplierWhenSprint": 2,
  "shootAction": "fire",
  "fireCooldown": 0,
  "bullet": {
    "speed": 420,
    "life": 2,
    "maxDistance": 560,
    "width": 20,
    "height": 8,
    "tint": 15922687
  }
}`
    const payload = {
      format: 'unu-scene',
      version: 1,
      scene: {
        id: 'scene_second',
        name: 'SecondScene',
        entities: [
          {
            id: 'background_second_001',
            name: 'Background',
            components: [
              { type: 'Transform', data: { type: 'Transform', x: -120, y: 20, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 0 } },
              { type: 'Sprite', data: { type: 'Sprite', texturePath: 'assets/images/pixel/background/background-facility.png', width: 1539, height: 1022, visible: true, alpha: 1, tint: 16777215, preserveAspect: false } },
              { type: 'Background', data: { type: 'Background', enabled: true, followCamera: true, fitMode: 'cover' } },
              { type: 'Camera', data: { type: 'Camera', enabled: false, zoom: 1, followEntityId: '', followSmoothing: 0.18, offsetX: 0, offsetY: 0, boundsEnabled: false, minX: -2000, maxX: 2000, minY: -2000, maxY: 2000 } }
            ]
          },
          {
            id: 'tilemap_002',
            name: 'LevelTilemap',
            components: [
              { type: 'Transform', data: { type: 'Transform', x: -300, y: -120, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 1 } },
              {
                type: 'Tilemap',
                data: {
                  type: 'Tilemap',
                  enabled: true,
                  columns: 14,
                  rows: 8,
                  tileWidth: 48,
                  tileHeight: 48,
                  tiles: [
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    1,1,1,1,1,1,1,1,1,1,1,1,1,1,
                    1,1,1,1,1,1,1,1,1,1,1,1,1,1,
                    2,2,2,2,2,2,2,2,2,2,2,2,2,2
                  ],
                  collision: [
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    1,1,1,1,1,1,1,1,1,1,1,1,1,1,
                    1,1,1,1,1,1,1,1,1,1,1,1,1,1,
                    1,1,1,1,1,1,1,1,1,1,1,1,1,1
                  ],
                  showGrid: true,
                  tileTextures: {
                    1: 'assets/images/pixel/tilemap/texture_1.png',
                    2: 'assets/images/pixel/tilemap/texture_2.png',
                    4: 'assets/images/pixel/tilemap/texture_4.png'
                  }
                }
              }
            ]
          },
          {
            id: 'player_002',
            name: 'Player',
            components: [
              { type: 'Transform', data: { type: 'Transform', x: -120, y: 20, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 2 } },
              { type: 'Sprite', data: { type: 'Sprite', texturePath: 'assets/images/pixel/player/idle/idle_01.png', width: 96, height: 96, visible: true, alpha: 1, tint: 16777215, preserveAspect: true } },
              { type: 'Collider', data: { type: 'Collider', shape: 'rect', width: 100, height: 50, offsetX: 0, offsetY: 20, isTrigger: false } },
              {
                type: 'Animation',
                data: {
                  type: 'Animation',
                  enabled: true,
                  playing: true,
                  fps: 10,
                  loop: true,
                  currentFrame: 0,
                  elapsed: 0,
                  framePaths: [
                    'assets/images/pixel/player/idle/idle_01.png',
                    'assets/images/pixel/player/idle/idle_02.png',
                    'assets/images/pixel/player/idle/idle_03.png',
                    'assets/images/pixel/player/idle/idle_04.png'
                  ],
                  frameDurations: [1, 1, 1, 1],
                  animationAssetPath: '',
                  sourceAtlasPath: '',
                  atlasGrid: null,
                  frameEvents: [],
                  transformTracks: { positionX: [], positionY: [], rotation: [] },
                  stateMachine: {
                    enabled: true,
                    initialState: 'Idle',
                    currentState: 'Idle',
                    clips: [
                      { name: 'Idle', framePaths: ['assets/images/pixel/player/idle/idle_01.png', 'assets/images/pixel/player/idle/idle_02.png', 'assets/images/pixel/player/idle/idle_03.png', 'assets/images/pixel/player/idle/idle_04.png'], frameDurations: [1, 1, 1, 1], loop: true },
                      { name: 'Run', framePaths: ['assets/images/pixel/player/run/run_01.png', 'assets/images/pixel/player/run/run_02.png', 'assets/images/pixel/player/run/run_03.png', 'assets/images/pixel/player/run/run_04.png', 'assets/images/pixel/player/run/run_05.png', 'assets/images/pixel/player/run/run_06.png'], frameDurations: [1, 1, 1, 1, 1, 1], loop: true },
                      { name: 'Attack', framePaths: ['assets/images/pixel/player/forward/forward_01.png', 'assets/images/pixel/player/forward/forward_02.png', 'assets/images/pixel/player/forward/forward_03.png', 'assets/images/pixel/player/forward/forward_04.png', 'assets/images/pixel/player/forward/forward_05.png', 'assets/images/pixel/player/forward/forward_06.png'], frameDurations: [1, 1, 1, 1, 1, 1], loop: false }
                    ],
                    transitions: [
                      { from: 'Idle', to: 'Run', condition: 'ifMoving', priority: 0, canInterrupt: true, once: false, minNormalizedTime: 0, exitTime: false },
                      { from: 'Run', to: 'Idle', condition: 'ifNotMoving', priority: 0, canInterrupt: true, once: false, minNormalizedTime: 0, exitTime: false },
                      { from: 'Idle', to: 'Attack', condition: 'ifActionDown', action: 'fire', priority: 0, canInterrupt: true, once: false, minNormalizedTime: 0, exitTime: false },
                      { from: 'Run', to: 'Attack', condition: 'ifActionDown', action: 'fire', priority: 0, canInterrupt: true, once: false, minNormalizedTime: 0, exitTime: false },
                      { from: 'Attack', to: 'Run', condition: 'ifMoving', priority: 0, canInterrupt: true, once: false, minNormalizedTime: 0.6, exitTime: true },
                      { from: 'Attack', to: 'Idle', condition: 'ifNotMoving', priority: 0, canInterrupt: true, once: false, minNormalizedTime: 0.6, exitTime: true }
                    ]
                  }
                }
              },
              { type: 'Script', data: { type: 'Script', scriptPath: 'assets/scripts/player-input.js', sourceCode: playerScriptConfig, enabled: true, instance: null, initialized: false, started: false } }
            ]
          },
          {
            id: 'door_to_main_001',
            name: 'DoorToMain',
            components: [
              { type: 'Transform', data: { type: 'Transform', x: -220, y: 20, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 3 } },
              { type: 'Sprite', data: { type: 'Sprite', texturePath: 'assets/images/pixel/props/door.png', width: 110, height: 180, visible: true, alpha: 0.95, tint: 15201279, preserveAspect: true } },
              { type: 'Collider', data: { type: 'Collider', shape: 'rect', width: 110, height: 180, offsetX: 0, offsetY: 0, isTrigger: false } },
              { type: 'Interactable', data: { type: 'Interactable', enabled: true, interactDistance: 180, actionType: 'switchScene', targetScene: 'MainScene', textureCycle: [], tintCycle: [] } }
            ]
          },
          {
            id: 'camera_second',
            name: 'MainCamera',
            components: [
              { type: 'Transform', data: { type: 'Transform', x: -120, y: 20, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5, zIndex: 4 } },
              { type: 'Camera', data: { type: 'Camera', enabled: true, zoom: 1, followEntityId: 'player_002', followSmoothing: 1, offsetX: 0, offsetY: 0, boundsEnabled: false, minX: -2000, maxX: 2000, minY: -2000, maxY: 2000 } }
            ]
          }
        ]
      }
    }
    return JSON.stringify(payload, null, 2)
  }
  const payload = {
    format: 'unu-scene',
    version: 1,
    scene: {
      id: sceneId,
      name: safeName,
      entities: []
    }
  }
  return JSON.stringify(payload, null, 2)
}

function collectSwitchTargetSceneNamesFromObject(value: unknown, output: Set<string>) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectSwitchTargetSceneNamesFromObject(item, output)
    return
  }
  const record = value as Record<string, unknown>
  if (record.actionType === 'switchScene') {
    const target = String(record.targetScene || '').trim()
    if (target) output.add(target)
  }
  for (const key of Object.keys(record)) {
    collectSwitchTargetSceneNamesFromObject(record[key], output)
  }
}

async function ensureMissingSwitchTargetSceneFiles(projectRoot: string, sceneFiles: string[]) {
  const scenesDir = path.join(projectRoot, 'scenes')
  const existing = new Set(sceneFiles.map((file) => file.toLowerCase()))
  const requiredSceneNames = new Set<string>()

  for (const fileName of sceneFiles) {
    const fullPath = path.join(scenesDir, fileName)
    try {
      const raw = await fs.readFile(fullPath, 'utf-8')
      const parsed = JSON.parse(raw)
      collectSwitchTargetSceneNamesFromObject(parsed, requiredSceneNames)
    } catch {
      // Ignore broken scene file; catalog reconcile will still continue.
    }
  }

  let createdCount = 0
  for (const sceneName of requiredSceneNames) {
    const targetFile = toSceneFileName(sceneName)
    const lower = targetFile.toLowerCase()
    if (existing.has(lower)) continue
    const targetPath = path.join(scenesDir, targetFile)
    const content = createDefaultSceneContent(sceneName)
    await fs.writeFile(targetPath, content, 'utf-8')
    existing.add(lower)
    createdCount += 1
  }

  return createdCount
}

async function collectSceneFileNames(projectRoot: string) {
  const scenesDir = path.join(projectRoot, 'scenes')
  const entries = await fs.readdir(scenesDir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.scene.json'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

async function reconcileProjectSceneCatalog(projectRoot: string, projectName?: string) {
  const projectFile = path.join(projectRoot, 'project.json')
  let sceneFiles = await collectSceneFileNames(projectRoot)
  const createdByReference = await ensureMissingSwitchTargetSceneFiles(projectRoot, sceneFiles)
  if (createdByReference > 0) {
    sceneFiles = await collectSceneFileNames(projectRoot)
  }
  const fallbackName = projectName?.trim() || path.basename(projectRoot)
  const nowIso = new Date().toISOString()

  let parsed: Record<string, any> = {}
  try {
    const raw = await fs.readFile(projectFile, 'utf-8')
    const json = JSON.parse(raw)
    if (json && typeof json === 'object') parsed = json
  } catch {
    parsed = {}
  }

  const nextCatalog = sceneFiles.map((file) => ({
    file,
    name: parseSceneBaseName(file)
  }))
  const previousCatalog = Array.isArray(parsed.sceneCatalog)
    ? parsed.sceneCatalog.map((item: any) => String(item?.file || item?.fileName || '')).filter(Boolean)
    : []
  const nextCatalogFiles = nextCatalog.map((item) => item.file)
  const isCatalogChanged =
    previousCatalog.length !== nextCatalogFiles.length ||
    previousCatalog.some((file, index) => file !== nextCatalogFiles[index])

  const previousStartup = String(parsed.startupScene || '').trim()
  const nextStartup = sceneFiles.length
    ? (sceneFiles.includes(previousStartup) ? previousStartup : sceneFiles[0])
    : ''
  const startupChanged = previousStartup !== nextStartup

  const nextPayload: Record<string, any> = {
    ...parsed,
    format: 'unu-project',
    version: 1,
    name: String(parsed.name || projectName || '').trim() || fallbackName,
    createdAt: String(parsed.createdAt || '').trim() || nowIso,
    updatedAt: nowIso,
    sceneCatalogVersion: 1,
    sceneCatalog: nextCatalog,
    startupScene: nextStartup
  }

  const shouldWrite =
    !parsed.format ||
    !parsed.version ||
    !Array.isArray(parsed.sceneCatalog) ||
    isCatalogChanged ||
    startupChanged ||
    String(parsed.name || '').trim() !== nextPayload.name ||
    createdByReference > 0

  if (shouldWrite) {
    await fs.writeFile(projectFile, JSON.stringify(nextPayload, null, 2), 'utf-8')
  }

  return {
    repaired: shouldWrite,
    sceneCount: sceneFiles.length,
    startupScene: nextStartup,
    createdByReference
  }
}

async function exists(targetPath: string) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function resolveProjectRootPath(projectRoot: string) {
  const raw = String(projectRoot || '').trim()
  if (!raw || raw === 'sample-project') return raw
  if (path.isAbsolute(raw)) return raw
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '')
  if (app.isPackaged && normalized.toLowerCase().startsWith('sample-project-list/')) {
    const sourceCandidates = [
      path.join(process.resourcesPath, normalized),
      path.join(app.getAppPath(), normalized)
    ]
    const target = path.join(app.getPath('userData'), 'bundled-samples', path.basename(normalized))
    const targetReady =
      await exists(path.join(target, 'project.json')) &&
      await exists(path.join(target, 'scenes')) &&
      await exists(path.join(target, 'assets'))
    if (!targetReady) {
      const source = await firstExistingPath(sourceCandidates)
      if (source) {
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.rm(target, { recursive: true, force: true })
        await fs.cp(source, target, { recursive: true, force: true })
      }
    }
    if (await exists(target)) return target
  }
  const candidates = [
    path.join(app.getAppPath(), normalized),
    path.join(process.cwd(), normalized),
    path.resolve(__dirname, '..', normalized),
    path.resolve(normalized)
  ]
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate
  }
  return path.resolve(raw)
}

async function firstExistingPath(candidates: string[]) {
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate
  }
  return ''
}

function makeDefaultProjectName() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `UNUProject_${date}_${time}`
}

function sanitizeProjectName(input?: string) {
  const raw = String(input || '').trim()
  const cleaned = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
  return cleaned || ''
}

function sanitizeAssetFileName(input?: string) {
  const raw = String(input || '').trim()
  const cleaned = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
  return cleaned || ''
}

function normalizeSafeRelativePath(input?: string) {
  const normalized = String(input || '').replace(/\\/g, '/').replace(/^\/+/, '').trim()
  if (!normalized || path.isAbsolute(normalized)) return ''
  const parts = normalized.split('/').filter(Boolean)
  if (parts.some((part) => part === '..')) return ''
  return parts.join('/')
}

function resolveProjectChildPath(projectRoot: string, relativePath: string) {
  const root = path.resolve(projectRoot)
  const normalized = normalizeSafeRelativePath(relativePath)
  if (!normalized) return ''
  const target = path.resolve(root, normalized)
  const relative = path.relative(root, target)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return ''
  return target
}

function splitKnownAssetExtension(fileName: string) {
  const lower = fileName.toLowerCase()
  const known = ['.anim.json', '.atlas.json', '.scene.json', '.prefab.json']
  const matched = known.find((suffix) => lower.endsWith(suffix))
  if (matched) return { base: fileName.slice(0, -matched.length), ext: fileName.slice(fileName.length - matched.length) }
  const ext = path.extname(fileName)
  return { base: ext ? fileName.slice(0, -ext.length) : fileName, ext }
}

async function makeUniquePathIfNeeded(targetPath: string) {
  if (!(await exists(targetPath))) return targetPath
  const dir = path.dirname(targetPath)
  const parsed = splitKnownAssetExtension(path.basename(targetPath))
  for (let index = 1; index < 1000; index += 1) {
    const candidate = path.join(dir, `${parsed.base}-${index}${parsed.ext}`)
    if (!(await exists(candidate))) return candidate
  }
  throw new Error('无法生成可用的默认文件名，请手动输入文件名。')
}

function sanitizeSceneFileName(input?: string) {
  const raw = String(input || '').trim()
  const withoutExt = raw.replace(/\.scene\.json$/i, '').trim()
  const cleaned = withoutExt
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
  const base = cleaned || 'MainScene'
  return `${base}.scene.json`
}

async function copyIfExists(from: string, to: string) {
  if (!(await exists(from))) return
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.cp(from, to, { recursive: true, force: true })
}

async function moveDirectoryWithFallback(sourcePath: string, targetPath: string) {
  try {
    await fs.rename(sourcePath, targetPath)
    return
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code
    if (code !== 'EPERM' && code !== 'EXDEV' && code !== 'EACCES') {
      throw error
    }
  }

  await fs.cp(sourcePath, targetPath, {
    recursive: true,
    force: false,
    errorOnExist: true
  })
  try {
    await fs.rm(sourcePath, {
      recursive: true,
      force: false,
      maxRetries: 6,
      retryDelay: 120
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Project files are busy. Please close occupying programs and retry. (${message})`)
  }
}

async function copyFileIfExists(from: string, to: string) {
  if (!(await exists(from))) return false
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.copyFile(from, to)
  return true
}

function resolveSampleAssetsRoot() {
  const candidates = [
    path.resolve(__dirname, '..', 'assets-for-sample'),
    path.resolve(process.cwd(), 'assets-for-sample')
  ]
  return candidates.find((candidate) => fsSync.existsSync(candidate)) || ''
}

const SAMPLE_PIXEL_ASSET_MAPPINGS: Array<{ from: string; to: string }> = [
  { from: 'background-img.png', to: 'assets/images/pixel/background/background-img.png' },
  { from: 'background-facility.png', to: 'assets/images/pixel/background/background-facility.png' },
  { from: 'door.png', to: 'assets/images/pixel/props/door.png' },
  { from: 'Enemy Animation/Tube Animation1.png', to: 'assets/images/pixel/enemy/tube_01.png' },
  { from: 'Enemy Animation/Tube Animation2.png', to: 'assets/images/pixel/enemy/tube_02.png' },
  { from: 'Enemy Animation/Tube Animation3.png', to: 'assets/images/pixel/enemy/tube_03.png' },
  { from: 'Enemy Animation/Tube Animation4.png', to: 'assets/images/pixel/enemy/tube_04.png' },
  { from: 'Player Animations/Idle Animation/Idle Astronaut Animation1.png', to: 'assets/images/pixel/player/idle/idle_01.png' },
  { from: 'Player Animations/Idle Animation/Idle Astronaut Animation2.png', to: 'assets/images/pixel/player/idle/idle_02.png' },
  { from: 'Player Animations/Idle Animation/Idle Astronaut Animation3.png', to: 'assets/images/pixel/player/idle/idle_03.png' },
  { from: 'Player Animations/Idle Animation/Idle Astronaut Animation4.png', to: 'assets/images/pixel/player/idle/idle_04.png' },
  { from: 'Player Animations/Side Animation/Side Astronaut Animation1.png', to: 'assets/images/pixel/player/run/run_01.png' },
  { from: 'Player Animations/Side Animation/Side Astronaut Animation2.png', to: 'assets/images/pixel/player/run/run_02.png' },
  { from: 'Player Animations/Side Animation/Side Astronaut Animation3.png', to: 'assets/images/pixel/player/run/run_03.png' },
  { from: 'Player Animations/Side Animation/Side Astronaut Animation4.png', to: 'assets/images/pixel/player/run/run_04.png' },
  { from: 'Player Animations/Side Animation/Side Astronaut Animation5.png', to: 'assets/images/pixel/player/run/run_05.png' },
  { from: 'Player Animations/Side Animation/Side Astronaut Animation6.png', to: 'assets/images/pixel/player/run/run_06.png' },
  { from: 'Player Animations/Forward Animation/Forward Astronaut Animation1.png', to: 'assets/images/pixel/player/forward/forward_01.png' },
  { from: 'Player Animations/Forward Animation/Forward Astronaut Animation2.png', to: 'assets/images/pixel/player/forward/forward_02.png' },
  { from: 'Player Animations/Forward Animation/Forward Astronaut Animation3.png', to: 'assets/images/pixel/player/forward/forward_03.png' },
  { from: 'Player Animations/Forward Animation/Forward Astronaut Animation4.png', to: 'assets/images/pixel/player/forward/forward_04.png' },
  { from: 'Player Animations/Forward Animation/Forward Astronaut Animation5.png', to: 'assets/images/pixel/player/forward/forward_05.png' },
  { from: 'Player Animations/Forward Animation/Forward Astronaut Animation6.png', to: 'assets/images/pixel/player/forward/forward_06.png' },
  { from: 'tilemap-sorted-by-value/texture-for-1.png', to: 'assets/images/pixel/tilemap/texture_1.png' },
  { from: 'tilemap-sorted-by-value/texture-for-2.png', to: 'assets/images/pixel/tilemap/texture_2.png' },
  { from: 'tilemap-sorted-by-value/texture-for-4.png', to: 'assets/images/pixel/tilemap/texture_4.png' }
]

async function writeSampleScriptFiles(projectRoot: string) {
  const scriptsDir = path.join(projectRoot, 'assets', 'scripts')
  await fs.mkdir(scriptsDir, { recursive: true })
  const samples: Record<string, string> = {
    'player-input.js': `export default {
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    const speed = 140
    const move = ctx.api.input.getMoveVector(true)
    transform.x += move.x * speed * ctx.api.delta
    transform.y += move.y * speed * ctx.api.delta
    if (ctx.api.input.wasMousePressed(0)) {
      // 左键点击触发射击（由内置运行时生成子弹）
    }
  }
}
`,
    'bullet-projectile.js': `export default {
  onInit(ctx) {
    // 子弹从 player 位置发射，朝鼠标点击方向飞行
  },
  onUpdate(ctx) {
    // 子弹命中 Enemy 后，Enemy 被销毁并随机重生
  }
}
`,
    'orbit-around-chest.js': `export default {
  onInit(ctx) {
    const state = ctx.api.getState(ctx.entity)
    const chest = ctx.api.findEntityByName('Chest')
    const transform = ctx.entity.getTransform()
    const chestTransform = chest?.getTransform()
    if (!transform || !chestTransform) return
    const dx = transform.x - chestTransform.x
    const dy = transform.y - chestTransform.y
    state.radius = Math.max(80, Math.hypot(dx, dy))
    state.angle = Math.atan2(dy, dx)
    state.angularSpeed = 1.1
  },
  onUpdate(ctx) {
    const chest = ctx.api.findEntityByName('Chest')
    const transform = ctx.entity.getTransform()
    const chestTransform = chest?.getTransform()
    if (!transform || !chestTransform) return
    const state = ctx.api.getState(ctx.entity)
    const radius = Number(state.radius ?? 180)
    const angularSpeed = Number(state.angularSpeed ?? 1.1)
    const angle = Number(state.angle ?? 0) + angularSpeed * ctx.api.delta
    state.angle = angle
    transform.x = chestTransform.x + Math.cos(angle) * radius
    transform.y = chestTransform.y + Math.sin(angle) * radius
  }
}
`,
    'enemy-chase-respawn.js': `export default {
  onUpdate(ctx) {
    const player = ctx.api.findEntityByName('Player')
    if (!player) return
    // Enemy 持续追踪 Player
    // 与 Player 接触后删除自身，并在随机位置生成新的 Enemy
  }
}
`,
    'patrol.js': `export default {
  onInit(ctx) {
    const state = ctx.api.getState(ctx.entity)
    state.dir = 1
    state.startX = ctx.entity.getTransform()?.x ?? 0
  },
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    const state = ctx.api.getState(ctx.entity)
    const startX = Number(state.startX ?? transform.x)
    let dir = Number(state.dir ?? 1)
    transform.x += dir * 80 * ctx.api.delta
    if (transform.x > startX + 100) dir = -1
    if (transform.x < startX - 100) dir = 1
    state.dir = dir
  }
}
`,
    'spin.js': `export default {
  onUpdate(ctx) {
    const transform = ctx.entity.getTransform()
    if (!transform) return
    transform.rotation += 1.5 * ctx.api.delta
  }
}
`,
    'ScriptRuntime.ts': `const parseConfig = (ctx) => {
  try {
    const raw = String(ctx.entity.getComponent('Script')?.sourceCode || '').trim()
    if (!raw.startsWith('{')) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const resolveEnemyMatcher = (cfg) => {
  const fromConfig = cfg && typeof cfg.enemyMatch === 'object' ? cfg.enemyMatch : null
  if (fromConfig) return fromConfig
  return {
    scriptPath: 'assets/scripts/enemy-chase-respawn.js',
    namePrefix: 'Enemy'
  }
}

export default {
  scripts: {
    'assets/scripts/player-input.js': {
      onUpdate(ctx) {
        const transform = ctx.entity.getTransform()
        const collider = ctx.entity.getComponent('Collider')
        if (!transform) return
        const cfg = parseConfig(ctx)
        const moveSpeed = Number(cfg.moveSpeed ?? 140)
        const sprintSpeed = Number(cfg.sprintSpeed ?? 280)
        const speed = ctx.api.input.isActionDown('sprint') ? sprintSpeed : moveSpeed
        const move = ctx.api.input.getMoveVector(true)
        const state = ctx.api.getState(ctx.entity)
        if (!Number.isFinite(state.__baseScaleX)) {
          state.__baseScaleX = Math.max(0.001, Math.abs(transform.scaleX || 1))
        }
        if (move.x > 1e-4) {
          transform.scaleX = -Math.abs(state.__baseScaleX || 1)
        } else if (move.x < -1e-4) {
          transform.scaleX = Math.abs(state.__baseScaleX || 1)
        }

        if (move.x || move.y) {
          const nextX = transform.x + move.x * speed * ctx.api.delta
          const nextY = transform.y + move.y * speed * ctx.api.delta
          const halfWidth = Math.max(2, Number(collider?.width ?? 36) / 2)
          const halfHeight = Math.max(2, Number(collider?.height ?? 36) / 2)
          const offsetX = Number(collider?.offsetX ?? 0)
          const offsetY = Number(collider?.offsetY ?? 0)
          if (!ctx.api.isBlockedRect(nextX + offsetX, transform.y + offsetY, halfWidth, halfHeight)) transform.x = nextX
          if (!ctx.api.isBlockedRect(transform.x + offsetX, nextY + offsetY, halfWidth, halfHeight)) transform.y = nextY
        }

        if (!ctx.api.input.wasActionPressed(String(cfg.shootAction || 'fire'))) return
        const mouse = ctx.api.input.getMousePosition()
        ctx.api.spawnBullet(ctx.entity, {
          targetX: mouse.x,
          targetY: mouse.y,
          speed: Number(cfg.bullet?.speed ?? 420),
          life: Number(cfg.bullet?.life ?? 2),
          maxDistance: Number(cfg.bullet?.maxDistance ?? 560),
          width: Number(cfg.bullet?.width ?? 20),
          height: Number(cfg.bullet?.height ?? 8),
          tint: Number(cfg.bullet?.tint ?? 15922687)
        })
      }
    },
    'assets/scripts/bullet-projectile.js': {
      onInit(ctx) {
        const state = ctx.api.getState(ctx.entity)
        const cfg = parseConfig(ctx)
        const transform = ctx.entity.getTransform()
        const speed = Number(cfg.speed ?? 420)
        const angle = transform?.rotation ?? 0
        state.vx = Math.cos(angle) * speed
        state.vy = Math.sin(angle) * speed
        state.life = Number(cfg.life ?? 2)
        state.originX = transform?.x ?? 0
        state.originY = transform?.y ?? 0
        state.maxDistance = Number(cfg.maxDistance ?? 560)
      },
      onUpdate(ctx) {
        const transform = ctx.entity.getTransform()
        if (!transform) return
        const state = ctx.api.getState(ctx.entity)
        transform.x += Number(state.vx || 0) * ctx.api.delta
        transform.y += Number(state.vy || 0) * ctx.api.delta
        state.life = Number(state.life || 0) - ctx.api.delta

        const distance = Math.hypot(transform.x - Number(state.originX || 0), transform.y - Number(state.originY || 0))
        if (distance >= Number(state.maxDistance || 560) || Number(state.life || 0) <= 0) {
          ctx.api.removeEntity(ctx.entity)
          return
        }

        const hitEnemy = ctx.api.findEnemyOverlap(ctx.entity, resolveEnemyMatcher(cfg))
        if (!hitEnemy) return
        ctx.api.removeEntity(ctx.entity)
        ctx.api.removeEntity(hitEnemy)
        const player = ctx.api.findEntityByName('Player')
        const playerTransform = player?.getTransform()
        const spawnedEnemy = ctx.api.spawnEnemyLike(hitEnemy, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: Number(cfg.respawnMinDistance ?? 160)
        })
        if (spawnedEnemy) ctx.api.log('[' + spawnedEnemy.id + '] respawn')
      }
    },
    'assets/scripts/enemy-chase-respawn.js': {
      onUpdate(ctx) {
        const player = ctx.api.findEntityByName('Player')
        if (!player) return
        const cfg = parseConfig(ctx)
        const chaseSpeed = Number(cfg.chaseSpeed ?? 120)
        ctx.api.moveTowards(ctx.entity, player, chaseSpeed, true)
      },
      onCollisionEnter(ctx) {
        const other = ctx.event?.other
        if (!other || other.name !== 'Player') return
        const cfg = parseConfig(ctx)
        ctx.api.removeEntity(ctx.entity)
        const playerTransform = other.getTransform()
        ctx.api.spawnEnemyLike(ctx.entity, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: Number(cfg.respawnMinDistance ?? 160)
        })
      }
    }
  }
}
`,
    'InputState.ts': `export default {
  actionMap: {
    move_left: ['KeyA', 'ArrowLeft'],
    move_right: ['KeyD', 'ArrowRight'],
    move_up: ['KeyW', 'ArrowUp'],
    move_down: ['KeyS', 'ArrowDown'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    jump: ['Space'],
    fire: ['KeyJ', 'Mouse0'],
    interact: ['Mouse2']
  }
}
`,
    'AudioRuntime.ts': `export default {
  initialMasterVolume: 1,
  initialGroupVolumes: {
    bgm: 0.8,
    sfx: 1,
    ui: 1
  }
}
`
  }
  await Promise.all(
    Object.entries(samples).map(([name, content]) => fs.writeFile(path.join(scriptsDir, name), content, 'utf-8'))
  )
}

async function writeSampleImageFiles(projectRoot: string) {
  const imagesDir = path.join(projectRoot, 'assets', 'images')
  await fs.mkdir(imagesDir, { recursive: true })
  const playerPng = createSampleIconPng('player')
  const enemyPng = createSampleIconPng('enemy')
  const chestPng = createSampleIconPng('chest')
  await Promise.all([
    fs.writeFile(path.join(imagesDir, 'player.png'), playerPng),
    fs.writeFile(path.join(imagesDir, 'enemy.png'), enemyPng),
    fs.writeFile(path.join(imagesDir, 'chest.png'), chestPng)
  ])
}

async function writeSamplePixelImageFiles(projectRoot: string) {
  const sourceRoot = resolveSampleAssetsRoot()
  if (!sourceRoot) return false

  let copiedCount = 0
  for (const map of SAMPLE_PIXEL_ASSET_MAPPINGS) {
    const ok = await copyFileIfExists(path.join(sourceRoot, map.from), path.join(projectRoot, map.to))
    if (ok) copiedCount += 1
  }
  return copiedCount > 0
}

async function writeSampleAnimationFiles(projectRoot: string) {
  const animationsDir = path.join(projectRoot, 'assets', 'animations')
  await fs.mkdir(animationsDir, { recursive: true })
  const torchAnim = {
    format: 'unu-animation',
    version: 1,
    animation: {
      name: 'TorchFX',
      fps: 6,
      loop: true,
      frames: [
        { texturePath: 'assets/images/player.png', duration: 1 },
        { texturePath: 'assets/images/enemy.png', duration: 1 },
        { texturePath: 'assets/images/chest.png', duration: 2 }
      ]
    }
  }
  const torchAtlas = {
    format: 'unu-atlas',
    version: 1,
    atlas: {
      imagePath: 'assets/images/player.png',
      columns: 1,
      rows: 1,
      cellWidth: 1,
      cellHeight: 1,
      frameCount: 1
    }
  }
  await Promise.all([
    fs.writeFile(path.join(animationsDir, 'TorchFX.anim.json'), JSON.stringify(torchAnim, null, 2), 'utf-8'),
    fs.writeFile(path.join(animationsDir, 'TorchSheet.atlas.json'), JSON.stringify(torchAtlas, null, 2), 'utf-8')
  ])
}

async function writeSampleAudioPlaceholder(projectRoot: string) {
  const audioDir = path.join(projectRoot, 'assets', 'audio')
  await fs.mkdir(audioDir, { recursive: true })
  // Placeholder file to keep starter tree complete.
  await fs.writeFile(path.join(audioDir, 'bgm.mp3'), Buffer.alloc(0))
}

async function writeSampleProjectSeed(projectRoot: string) {
  const pixelCopied = await writeSamplePixelImageFiles(projectRoot)
  await Promise.all([
    writeSampleScriptFiles(projectRoot),
    ...(pixelCopied ? [] : [writeSampleImageFiles(projectRoot)]),
    writeSampleAnimationFiles(projectRoot),
    writeSampleAudioPlaceholder(projectRoot)
  ])
}

function normalizeAssetRef(raw: string, projectRoot: string) {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (text.startsWith('data:') || text.startsWith('http://') || text.startsWith('https://')) return text

  let next = text.replace(/\\/g, '/').replace(/^\.\/+/, '').trim()
  const normalizedRoot = normalizePath(path.resolve(projectRoot))
  const rootLower = normalizedRoot.toLowerCase()
  const nextLower = next.toLowerCase()
  if (nextLower.startsWith(`${rootLower}/`)) {
    next = next.slice(normalizedRoot.length + 1)
  }

  const assetsMarker = '/assets/'
  const markerIndex = nextLower.lastIndexOf(assetsMarker)
  if (markerIndex >= 0) {
    next = next.slice(markerIndex + 1)
  }
  next = next.replace(/^\/+/, '')
  if (next.toLowerCase().startsWith('dist/assets/')) next = next.slice('dist/'.length)
  if (next.toLowerCase().startsWith('dist-electron/assets/')) next = next.slice('dist-electron/'.length)
  return next
}

type AssetReferenceRecord = {
  sourceFile: string
  sourceKind: string
  keyPath: string
  ref: string
}

type AssetDependencyFile = {
  fullPath: string
  relativePath: string
  kind: string
}

const assetRefKeySet = new Set([
  'texturePath',
  'animationAssetPath',
  'sourceAtlasPath',
  'scriptPath',
  'clipPath',
  'imagePath',
  'path',
  'relativePath'
])

const assetRefArrayKeySet = new Set(['framePaths', 'textureCycle'])

function shouldTrackAssetRef(raw: string) {
  const normalized = normalizeAssetRef(raw, '')
  if (!normalized) return false
  const lower = normalized.toLowerCase()
  return !(
    lower.startsWith('data:') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('builtin://') ||
    lower.startsWith('custom://') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('about:')
  )
}

function assetRefLookupKey(raw: string) {
  return normalizeRelativeAssetPath(raw).toLowerCase()
}

function getDependencyKind(fileName: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.scene.json')) return 'scene'
  if (lower.endsWith('.prefab.json')) return 'prefab'
  if (lower.endsWith('.anim.json')) return 'animation'
  if (lower.endsWith('.atlas.json')) return 'atlas'
  return 'json'
}

function normalizeSceneAssetReferences(
  value: unknown,
  projectRoot: string,
  refs: AssetReferenceRecord[],
  sourceFile: string,
  sourceKind: string
) {
  let changed = false

  const normalizeAndTrack = (container: Record<string, unknown>, key: string, raw: string, keyPath: string) => {
    const normalized = normalizeAssetRef(raw, projectRoot)
    if (shouldTrackAssetRef(normalized)) {
      refs.push({ sourceFile, sourceKind, keyPath, ref: normalized })
    }
    if (normalized !== raw) {
      container[key] = normalized
      changed = true
    }
  }

  const walk = (node: unknown, keyPath = '$') => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${keyPath}[${index}]`))
      return
    }
    const record = node as Record<string, unknown>
    for (const [key, entry] of Object.entries(record)) {
      const nextPath = `${keyPath}.${key}`
      if (typeof entry === 'string' && assetRefKeySet.has(key)) {
        normalizeAndTrack(record, key, entry, nextPath)
        continue
      }
      if (Array.isArray(entry) && assetRefArrayKeySet.has(key)) {
        const nextList = entry.map((item) => {
          if (typeof item !== 'string') return item
          const normalized = normalizeAssetRef(item, projectRoot)
          if (shouldTrackAssetRef(normalized)) {
            refs.push({ sourceFile, sourceKind, keyPath: nextPath, ref: normalized })
          }
          if (normalized !== item) changed = true
          return normalized
        })
        record[key] = nextList
        continue
      }
      if (entry && typeof entry === 'object' && key === 'tileTextureMap' && !Array.isArray(entry)) {
        const map = entry as Record<string, unknown>
        for (const [mapKey, mapValue] of Object.entries(map)) {
          if (typeof mapValue !== 'string') continue
          const normalized = normalizeAssetRef(mapValue, projectRoot)
          if (shouldTrackAssetRef(normalized)) {
            refs.push({ sourceFile, sourceKind, keyPath: `${nextPath}.${mapKey}`, ref: normalized })
          }
          if (normalized !== mapValue) {
            map[mapKey] = normalized
            changed = true
          }
        }
      }
      walk(entry, nextPath)
    }
  }
  walk(value)
  return changed
}

function rewriteAssetReferences(value: unknown, replacements: Map<string, string>) {
  let changed = false

  const replaceString = (raw: string) => {
    const normalized = normalizeRelativeAssetPath(raw)
    const next = replacements.get(assetRefLookupKey(normalized))
    return next || raw
  }

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    const record = node as Record<string, unknown>
    for (const [key, entry] of Object.entries(record)) {
      if (typeof entry === 'string' && assetRefKeySet.has(key)) {
        const next = replaceString(entry)
        if (next !== entry) {
          record[key] = next
          changed = true
        }
        continue
      }
      if (Array.isArray(entry) && assetRefArrayKeySet.has(key)) {
        const nextList = entry.map((item) => {
          if (typeof item !== 'string') return item
          const next = replaceString(item)
          if (next !== item) changed = true
          return next
        })
        record[key] = nextList
        continue
      }
      if (entry && typeof entry === 'object' && key === 'tileTextureMap' && !Array.isArray(entry)) {
        const map = entry as Record<string, unknown>
        for (const [mapKey, mapValue] of Object.entries(map)) {
          if (typeof mapValue !== 'string') continue
          const next = replaceString(mapValue)
          if (next !== mapValue) {
            map[mapKey] = next
            changed = true
          }
        }
      }
      walk(entry)
    }
  }

  walk(value)
  return changed
}

async function collectAssetDependencyFiles(projectRoot: string) {
  const files: AssetDependencyFile[] = []
  const roots = ['scenes', 'prefabs', 'assets']

  const visit = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await visit(fullPath)
        continue
      }
      if (!entry.isFile()) continue
      const lower = entry.name.toLowerCase()
      if (!lower.endsWith('.json')) continue
      const relativePath = normalizePath(path.relative(projectRoot, fullPath))
      if (relativePath.toLowerCase() === 'project.json') continue
      files.push({ fullPath, relativePath, kind: getDependencyKind(entry.name) })
    }
  }

  for (const root of roots) {
    await visit(path.join(projectRoot, root))
  }
  return files
}

async function scanAndNormalizeAssetDependencies(projectRoot: string) {
  const dependencyFiles = await collectAssetDependencyFiles(projectRoot)
  const refs: AssetReferenceRecord[] = []
  let normalizedFiles = 0
  let normalizedSceneFiles = 0

  for (const file of dependencyFiles) {
    const raw = await fs.readFile(file.fullPath, 'utf-8').catch(() => '')
    if (!raw) continue
    let parsed: unknown = null
    try {
      parsed = JSON.parse(String(raw).replace(/^\uFEFF/, ''))
    } catch {
      continue
    }
    const changed = normalizeSceneAssetReferences(parsed, projectRoot, refs, file.relativePath, file.kind)
    if (changed) {
      normalizedFiles += 1
      if (file.kind === 'scene') normalizedSceneFiles += 1
      await fs.writeFile(file.fullPath, JSON.stringify(parsed, null, 2), 'utf-8')
    }
  }

  return { refs, normalizedFiles, normalizedSceneFiles, dependencyFiles }
}

async function buildProjectAssetIndex(projectRoot: string) {
  const byBasename = new Map<string, string[]>()
  const assetsRoot = path.join(projectRoot, 'assets')

  const visit = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await visit(fullPath)
        continue
      }
      if (!entry.isFile()) continue
      const relativePath = normalizePath(path.relative(projectRoot, fullPath))
      const key = path.basename(entry.name).toLowerCase()
      const list = byBasename.get(key) || []
      list.push(relativePath)
      byBasename.set(key, list)
    }
  }

  await visit(assetsRoot)
  return { byBasename }
}

async function findUnresolvedAssetRefs(projectRoot: string, refs: AssetReferenceRecord[]) {
  const unresolved: AssetReferenceRecord[] = []
  const cache = new Map<string, boolean>()
  for (const ref of refs) {
    const key = assetRefLookupKey(ref.ref)
    if (!cache.has(key)) {
      const resolved = await resolveAssetPathWithFallback(projectRoot, ref.ref)
      cache.set(key, Boolean(resolved))
    }
    if (!cache.get(key)) unresolved.push(ref)
  }
  return unresolved
}

async function relinkMissingAssetReferences(projectRoot: string, missingRefs: AssetReferenceRecord[], dependencyFiles: AssetDependencyFile[]) {
  if (!missingRefs.length) return { relinkedAssets: 0, relinkedFiles: 0 }
  const index = await buildProjectAssetIndex(projectRoot)
  const replacements = new Map<string, string>()

  const uniqueMissing = Array.from(new Map(missingRefs.map((item) => [assetRefLookupKey(item.ref), item.ref])).values())
  for (const ref of uniqueMissing) {
    const basename = path.basename(ref).toLowerCase()
    const candidates = (index.byBasename.get(basename) || []).filter((candidate) => assetRefLookupKey(candidate) !== assetRefLookupKey(ref))
    if (candidates.length === 1) {
      replacements.set(assetRefLookupKey(ref), candidates[0])
    }
  }

  if (!replacements.size) return { relinkedAssets: 0, relinkedFiles: 0 }

  let relinkedFiles = 0
  for (const file of dependencyFiles) {
    const raw = await fs.readFile(file.fullPath, 'utf-8').catch(() => '')
    if (!raw) continue
    let parsed: unknown = null
    try {
      parsed = JSON.parse(String(raw).replace(/^\uFEFF/, ''))
    } catch {
      continue
    }
    if (!rewriteAssetReferences(parsed, replacements)) continue
    relinkedFiles += 1
    await fs.writeFile(file.fullPath, JSON.stringify(parsed, null, 2), 'utf-8')
  }

  return { relinkedAssets: replacements.size, relinkedFiles }
}

function rewriteMovedAssetReference(raw: string, fromPath: string, toPath: string, isDirectory: boolean) {
  const normalized = normalizeRelativeAssetPath(raw)
  const from = normalizeRelativeAssetPath(fromPath)
  const to = normalizeRelativeAssetPath(toPath)
  if (!normalized || !from || !to) return raw

  const normalizedKey = normalized.toLowerCase()
  const fromKey = from.toLowerCase()
  if (normalizedKey === fromKey) return to
  if (isDirectory && normalizedKey.startsWith(`${fromKey}/`)) {
    return `${to}${normalized.slice(from.length)}`
  }
  return raw
}

function rewriteMovedAssetReferences(value: unknown, fromPath: string, toPath: string, isDirectory: boolean) {
  let changed = false
  const replaceString = (raw: string) => {
    const next = rewriteMovedAssetReference(raw, fromPath, toPath, isDirectory)
    if (next !== raw) changed = true
    return next
  }

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    const record = node as Record<string, unknown>
    for (const [key, entry] of Object.entries(record)) {
      if (typeof entry === 'string' && assetRefKeySet.has(key)) {
        record[key] = replaceString(entry)
        continue
      }
      if (Array.isArray(entry) && assetRefArrayKeySet.has(key)) {
        record[key] = entry.map((item) => typeof item === 'string' ? replaceString(item) : item)
        continue
      }
      if (entry && typeof entry === 'object' && key === 'tileTextureMap' && !Array.isArray(entry)) {
        const map = entry as Record<string, unknown>
        for (const [mapKey, mapValue] of Object.entries(map)) {
          if (typeof mapValue === 'string') map[mapKey] = replaceString(mapValue)
        }
      }
      walk(entry)
    }
  }

  walk(value)
  return changed
}

async function rewriteMovedAssetReferencesInProject(projectRoot: string, fromPath: string, toPath: string, isDirectory: boolean) {
  const normalizedFrom = normalizeRelativeAssetPath(fromPath)
  const normalizedTo = normalizeRelativeAssetPath(toPath)
  if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) return { relinkedFiles: 0 }

  const dependencyFiles = await collectAssetDependencyFiles(projectRoot)
  let relinkedFiles = 0
  for (const file of dependencyFiles) {
    const raw = await fs.readFile(file.fullPath, 'utf-8').catch(() => '')
    if (!raw) continue
    let parsed: unknown = null
    try {
      parsed = JSON.parse(String(raw).replace(/^\uFEFF/, ''))
    } catch {
      continue
    }
    if (!rewriteMovedAssetReferences(parsed, normalizedFrom, normalizedTo, isDirectory)) continue
    relinkedFiles += 1
    await fs.writeFile(file.fullPath, JSON.stringify(parsed, null, 2), 'utf-8')
  }
  return { relinkedFiles }
}

async function repairMissingSampleAssets(projectRoot: string, missingRefs: string[]) {
  if (!missingRefs.length) return 0
  const sourceRoot = resolveSampleAssetsRoot()
  if (!sourceRoot) return 0
  const mappingByTarget = new Map(SAMPLE_PIXEL_ASSET_MAPPINGS.map((item) => [item.to.toLowerCase(), item.from]))
  let repaired = 0
  for (const ref of missingRefs) {
    const fromRel = mappingByTarget.get(ref.toLowerCase())
    if (!fromRel) continue
    const ok = await copyFileIfExists(path.join(sourceRoot, fromRel), path.join(projectRoot, ref))
    if (ok) repaired += 1
  }
  return repaired
}

async function ensureProjectAssetIntegrity(projectRoot: string) {
  let firstScan = await scanAndNormalizeAssetDependencies(projectRoot)
  const missingBefore = await findUnresolvedAssetRefs(projectRoot, firstScan.refs)
  const missingRefList = Array.from(new Set(missingBefore.map((item) => item.ref)))
  const copiedAssets = await repairMissingSampleAssets(projectRoot, missingRefList)
  const missingAfterCopy = copiedAssets > 0 ? await findUnresolvedAssetRefs(projectRoot, firstScan.refs) : missingBefore
  const relink = await relinkMissingAssetReferences(projectRoot, missingAfterCopy, firstScan.dependencyFiles)
  if (copiedAssets > 0 || relink.relinkedAssets > 0) {
    const secondScan = await scanAndNormalizeAssetDependencies(projectRoot)
    firstScan = {
      ...secondScan,
      normalizedFiles: firstScan.normalizedFiles + secondScan.normalizedFiles,
      normalizedSceneFiles: firstScan.normalizedSceneFiles + secondScan.normalizedSceneFiles
    }
  }

  const unresolvedRefs = await findUnresolvedAssetRefs(projectRoot, firstScan.refs)
  const checkedAssetRefs = new Set(firstScan.refs.map((item) => assetRefLookupKey(item.ref))).size
  const unresolvedAssets = new Set(unresolvedRefs.map((item) => assetRefLookupKey(item.ref))).size
  return {
    repaired: firstScan.normalizedFiles > 0 || copiedAssets > 0 || relink.relinkedAssets > 0,
    normalizedSceneFiles: firstScan.normalizedSceneFiles,
    normalizedFiles: firstScan.normalizedFiles,
    copiedAssets,
    relinkedAssets: relink.relinkedAssets,
    relinkedFiles: relink.relinkedFiles,
    checkedAssetRefs,
    resolvedAssets: Math.max(0, checkedAssetRefs - unresolvedAssets),
    unresolvedAssets,
    unresolvedRefs: unresolvedRefs.slice(0, 100)
  }
}

function createSampleIconPng(kind: 'player' | 'enemy' | 'chest') {
  const size = 128
  const palette =
    kind === 'player'
      ? { bg: '#0E2A47', accent: '#56CCF2', stroke: '#BDEBFF', symbol: 'P' }
      : kind === 'enemy'
        ? { bg: '#3A1518', accent: '#EB5757', stroke: '#FFC4C4', symbol: 'E' }
        : { bg: '#3A2A11', accent: '#F2C94C', stroke: '#FFE8A3', symbol: 'C' }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg}" />
      <stop offset="100%" stop-color="${palette.accent}" />
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="${size - 12}" height="${size - 12}" rx="22" fill="url(#g)" stroke="${palette.stroke}" stroke-width="4"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="26" fill="rgba(0,0,0,0.25)" />
  <text x="${size / 2}" y="${size / 2 + 15}" text-anchor="middle" fill="#ffffff" font-size="54" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${palette.symbol}</text>
</svg>`

  const image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
  return image.toPNG()
}

async function buildAssetNodes(currentPath: string, projectRoot: string) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true })
  const visibleEntries = entries.filter((entry) => entry.name !== '.unu-trash')
  const sorted = visibleEntries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))

  return Promise.all(
    sorted.map(async (entry) => {
      const absolutePath = path.join(currentPath, entry.name)
      const relativePath = normalizePath(path.relative(projectRoot, absolutePath)) || '.'
      const isDirectory = entry.isDirectory()
      const node = {
        id: relativePath,
        name: entry.name,
        type: isDirectory ? 'folder' : inferAssetType(entry.name),
        path: relativePath,
        absolutePath,
        children: [] as any[]
      }

      if (isDirectory) {
        node.children = await buildAssetNodes(absolutePath, projectRoot)
      }

      return node
    })
  )
}

async function moveAssetToTrash(projectRoot: string, sourcePath: string) {
  const trashRoot = path.join(projectRoot, '.unu-trash')
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const targetDir = path.join(trashRoot, stamp)
  await fs.mkdir(targetDir, { recursive: true })
  const targetPath = path.join(targetDir, path.basename(sourcePath))
  await fs.rename(sourcePath, targetPath)
  return targetPath
}

async function readFileAsDataUrl(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.png'
    ? 'image/png'
    : ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.gif'
          ? 'image/gif'
          : ext === '.mp3'
            ? 'audio/mpeg'
            : ext === '.wav'
              ? 'audio/wav'
              : ext === '.ogg'
                ? 'audio/ogg'
                : ext === '.m4a'
                  ? 'audio/mp4'
          : 'application/octet-stream'

  const buffer = await fs.readFile(filePath)
  return `data:${mime};base64,${buffer.toString('base64')}`
}

function normalizeRelativeAssetPath(relativePath: string) {
  return String(relativePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .trim()
}

async function resolveAssetPathWithFallback(projectRoot: string, relativePath: string) {
  const normalizedRelativePath = normalizeRelativeAssetPath(relativePath)
  if (!normalizedRelativePath) return null

  const appRoot = app.getAppPath()
  const relativeWithoutAssetsPrefix = normalizedRelativePath.startsWith('assets/')
    ? normalizedRelativePath.slice('assets/'.length)
    : normalizedRelativePath

  const candidates = [
    path.join(projectRoot, normalizedRelativePath),
    path.join(projectRoot, 'assets', relativeWithoutAssetsPrefix),
    path.join(appRoot, normalizedRelativePath),
    path.join(appRoot, 'assets', relativeWithoutAssetsPrefix),
    path.join(appRoot, 'dist', normalizedRelativePath),
    path.join(appRoot, 'dist', 'assets', relativeWithoutAssetsPrefix),
    path.join(appRoot, 'dist-electron', normalizedRelativePath),
    path.join(appRoot, 'dist-electron', 'assets', relativeWithoutAssetsPrefix),
    path.join(__dirname, normalizedRelativePath),
    path.join(__dirname, 'assets', relativeWithoutAssetsPrefix)
  ]

  for (const candidate of candidates) {
    const stat = await fs.stat(candidate).catch(() => null)
    if (stat?.isFile()) return candidate
  }

  return null
}

async function importFiles(projectRoot: string, files: string[], targetDir: string) {
  await ensureProjectStructure(projectRoot)
  const baseDir = path.join(projectRoot, targetDir)
  await fs.mkdir(baseDir, { recursive: true })

  const imported: Array<{ fileName: string; relativePath: string }> = []
  for (const sourcePath of files) {
    const fileName = path.basename(sourcePath)
    const destination = path.join(baseDir, fileName)
    await fs.copyFile(sourcePath, destination)
    imported.push({
      fileName,
      relativePath: normalizePath(path.relative(projectRoot, destination))
    })
  }

  return imported
}

async function saveTextAsset(payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string; subdir?: string; title?: string; filterName?: string }) {
  let targetPath = payload.filePath
  if (!targetPath) {
    const defaultPath = path.join(payload.projectRoot || app.getPath('documents'), payload.subdir || '', payload.suggestedName || 'Asset.json')
    const result = await dialog.showSaveDialog({
      title: payload.title || '保存文本资源',
      defaultPath,
      filters: [{ name: payload.filterName || 'Text Asset', extensions: ['json', 'txt'] }]
    })
    if (result.canceled || !result.filePath) return null
    targetPath = result.filePath
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, payload.content, 'utf-8')
  return {
    filePath: targetPath,
    name: path.basename(targetPath),
    relativePath: payload.projectRoot ? normalizePath(path.relative(payload.projectRoot, targetPath)) : undefined
  }
}

async function openTextAsset(payload: { projectRoot?: string; defaultSubdir?: string; title?: string; extensions?: string[] }) {
  const result = await dialog.showOpenDialog({
    title: payload.title || '打开文本资源',
    defaultPath: payload.projectRoot ? path.join(payload.projectRoot, payload.defaultSubdir || '') : undefined,
    properties: ['openFile'],
    filters: [{ name: 'Text Asset', extensions: payload.extensions?.length ? payload.extensions : ['json', 'txt', 'js', 'ts'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const content = await fs.readFile(filePath, 'utf-8')
  return {
    filePath,
    name: path.basename(filePath),
    relativePath: payload.projectRoot ? normalizePath(path.relative(payload.projectRoot, filePath)) : undefined,
    content
  }
}

function closeProjectScriptWatcher(webContentsId: number) {
  const existing = projectScriptWatchers.get(webContentsId)
  if (!existing) return
  if (existing.timer) clearTimeout(existing.timer)
  existing.watcher.close()
  projectScriptWatchers.delete(webContentsId)
}

function isRuntimeScriptFile(fileName: string) {
  const lower = normalizePath(String(fileName || '')).toLowerCase()
  return lower.endsWith('.ts') || lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.json')
}

async function watchProjectScripts(webContents: Electron.WebContents, projectRoot: string) {
  closeProjectScriptWatcher(webContents.id)
  const resolvedProjectRoot = await resolveProjectRootPath(projectRoot)
  if (!resolvedProjectRoot || resolvedProjectRoot === 'sample-project') return { ok: false, error: 'sample-project cannot be watched' }
  const scriptsDir = path.join(resolvedProjectRoot, 'assets', 'scripts')
  await fs.mkdir(scriptsDir, { recursive: true })
  const handleChange = (_eventType: string, fileName: string | Buffer | null) => {
    if (!fileName || !isRuntimeScriptFile(String(fileName))) return
    const current = projectScriptWatchers.get(webContents.id)
    if (!current) return
    if (current.timer) clearTimeout(current.timer)
    const normalizedFile = normalizePath(String(fileName))
    current.timer = setTimeout(() => {
      if (webContents.isDestroyed()) {
        closeProjectScriptWatcher(webContents.id)
        return
      }
      webContents.send('unu:project-script-changed', {
        projectRoot: current.projectRoot,
        relativePath: normalizePath(path.join('assets', 'scripts', normalizedFile)),
        changedAt: Date.now()
      })
    }, 120)
  }
  let watcher: fsSync.FSWatcher
  try {
    watcher = fsSync.watch(scriptsDir, { recursive: true }, handleChange)
  } catch {
    watcher = fsSync.watch(scriptsDir, handleChange)
  }
  projectScriptWatchers.set(webContents.id, { watcher, timer: null, projectRoot: resolvedProjectRoot })
  webContents.once('destroyed', () => closeProjectScriptWatcher(webContents.id))
  return { ok: true }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 700,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#111318',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  applyMainWindowPreset(win, 'launcher')

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
    if (process.env.UNU_OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }
  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
}

function applyMainWindowPreset(win: BrowserWindow, preset: 'launcher' | 'editor') {
  if (!win || win.isDestroyed()) return
  const workArea = screen.getPrimaryDisplay().workAreaSize
  if (preset === 'editor') {
    const width = Math.min(1680, Math.max(1200, workArea.width - 120))
    const height = Math.min(980, Math.max(760, workArea.height - 100))
    win.setSize(width, height, true)
    win.center()
    return
  }
  const width = Math.min(1180, Math.max(980, workArea.width - 220))
  const height = Math.min(760, Math.max(640, workArea.height - 180))
  win.setSize(width, height, true)
  win.center()
}

function loadTilemapEditorWindow(win: BrowserWindow) {
  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173/?tilemapEditor=1')
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'), {
      query: { tilemapEditor: '1' }
    })
  }
}

function openTilemapEditorWindow(payload: unknown) {
  tilemapEditorSession = payload || null
  if (!mainWindow) return { ok: false, error: 'Main window not ready' }

  if (!tilemapEditorWindow || tilemapEditorWindow.isDestroyed()) {
    tilemapEditorWindow = new BrowserWindow({
      width: 1200,
      height: 840,
      minWidth: 900,
      minHeight: 620,
      title: 'Tilemap Graphical Editor',
      backgroundColor: '#0f1420',
      parent: mainWindow,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    loadTilemapEditorWindow(tilemapEditorWindow)
    tilemapEditorWindow.on('closed', () => {
      tilemapEditorWindow = null
    })
  } else {
    if (tilemapEditorWindow.isMinimized()) tilemapEditorWindow.restore()
    tilemapEditorWindow.focus()
  }

  tilemapEditorWindow.webContents.once('did-finish-load', () => {
    if (!tilemapEditorWindow || tilemapEditorWindow.isDestroyed()) return
    tilemapEditorWindow.webContents.send('unu:tilemap-editor-init', tilemapEditorSession)
  })
  if (tilemapEditorWindow.webContents.isLoadingMainFrame()) {
    return { ok: true }
  }
  tilemapEditorWindow.webContents.send('unu:tilemap-editor-init', tilemapEditorSession)
  return { ok: true }
}

function makeExportFolderName(projectName?: string) {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('')
  return `${sanitizeProjectName(projectName) || 'UNUGame'}-web-${stamp}`
}

async function resolveWebDistRoot() {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'dist'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'dist'),
        path.join(process.cwd(), 'dist')
      ]
    : [
        path.join(process.cwd(), 'dist'),
        path.resolve(__dirname, '..', 'dist'),
        path.join(__dirname, 'dist'),
        path.join(app.getAppPath(), 'dist')
      ]
  for (const candidate of candidates) {
    if (candidate.includes('.asar')) continue
    if (await exists(path.join(candidate, 'index.html'))) return candidate
  }
  throw new Error(app.isPackaged
    ? '未找到可复制的 Web 构建目录 resources/dist，请重新打包应用后再导出。'
    : '未找到 Web 构建目录 dist，请先执行 npm run build。'
  )
}

async function countFilesRecursive(rootPath: string) {
  if (!(await exists(rootPath))) return 0
  let count = 0
  const visit = async (targetPath: string) => {
    const entries = await fs.readdir(targetPath, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name)
      if (entry.isDirectory()) await visit(fullPath)
      else if (entry.isFile()) count += 1
    }
  }
  await visit(rootPath)
  return count
}

async function patchExportIndexHtml(indexPath: string, projectName?: string) {
  let html = await fs.readFile(indexPath, 'utf-8')
  html = html
    .replace(/(src|href)="\/assets\//g, '$1="./assets/')
    .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(projectName || 'UNU Game')}</title>`)
  if (!html.includes('__UNU_GAME_EXPORT__')) {
    html = html.replace(
      /<head([^>]*)>/i,
      `<head$1>\n    <script>window.__UNU_GAME_EXPORT__ = true;</script>`
    )
  }
  await fs.writeFile(indexPath, html, 'utf-8')
}

async function writeExportLaunchFiles(outputDir: string, projectName?: string) {
  const batContent = [
    '@echo off',
    'setlocal',
    'cd /d "%~dp0"',
    'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PLAY_GAME.ps1"',
    'if errorlevel 1 pause',
    ''
  ].join('\r\n')

  const psContent = String.raw`$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-PortAvailable([int]$port) {
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    $listener.Start()
    $listener.Stop()
    return $true
  } catch {
    return $false
  }
}

function Get-MimeType([string]$filePath) {
  switch ([System.IO.Path]::GetExtension($filePath).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".js" { return "text/javascript; charset=utf-8" }
    ".mjs" { return "text/javascript; charset=utf-8" }
    ".css" { return "text/css; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".png" { return "image/png" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".webp" { return "image/webp" }
    ".gif" { return "image/gif" }
    ".svg" { return "image/svg+xml" }
    ".mp3" { return "audio/mpeg" }
    ".wav" { return "audio/wav" }
    ".ogg" { return "audio/ogg" }
    default { return "application/octet-stream" }
  }
}

$port = 4173
while (-not (Test-PortAvailable $port)) {
  $port += 1
}

$server = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$port/"
$server.Prefixes.Add($prefix)
$server.Start()
Write-Host "UNU exported game is running at $prefix"
Write-Host "Press Ctrl+C to stop the local server."
Start-Process $prefix

try {
  while ($server.IsListening) {
    $context = $server.GetContext()
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }
    $requestPath = $requestPath -replace "/", [System.IO.Path]::DirectorySeparatorChar
    $targetPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $requestPath))
    $rootFullPath = [System.IO.Path]::GetFullPath($root)

    if (-not $targetPath.StartsWith($rootFullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }

    if (-not [System.IO.File]::Exists($targetPath)) {
      $targetPath = [System.IO.Path]::Combine($root, "index.html")
    }

    if ([System.IO.File]::Exists($targetPath)) {
      $bytes = [System.IO.File]::ReadAllBytes($targetPath)
      $context.Response.ContentType = Get-MimeType $targetPath
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $context.Response.StatusCode = 404
    }
    $context.Response.OutputStream.Close()
  }
} finally {
  if ($server.IsListening) {
    $server.Stop()
  }
  $server.Close()
}
`

  const readmeContent = [
    `# ${projectName || 'UNU Game'} Web Export`,
    '',
    'Do not open index.html directly with file://. Modern browsers block ES module scripts and CSS under file:// origins.',
    '',
    'Windows:',
    '1. Double-click PLAY_GAME.bat.',
    '2. The script starts a local HTTP server and opens the game in your default browser.',
    '3. Close the PowerShell window or press Ctrl+C to stop the server.',
    '',
    'If you already have a web server, serve this folder as static files and open index.html through http:// or https://.',
    ''
  ].join('\n')

  await fs.writeFile(path.join(outputDir, 'PLAY_GAME.bat'), batContent, 'utf-8')
  await fs.writeFile(path.join(outputDir, 'PLAY_GAME.ps1'), psContent, 'utf-8')
  await fs.writeFile(path.join(outputDir, 'EXPORT_README.md'), readmeContent, 'utf-8')
}

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

process.on('unhandledRejection', (reason) => {
  console.error('[UNU][main] Unhandled promise rejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('[UNU][main] Uncaught exception:', error)
})

app.whenReady().then(() => {
  ipcMain.handle('unu:create-project', async () => {
    const result = await dialog.showOpenDialog({
      title: '新建 UNU 工程',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const projectRoot = result.filePaths[0]
    await ensureProjectStructure(projectRoot)
    await writeProjectFile(projectRoot)
    return {
      rootPath: projectRoot,
      name: path.basename(projectRoot),
      created: true
    }
  })

  ipcMain.handle('unu:create-project-v2', async (_event, payload?: { projectName?: string; parentDir?: string }) => {
    let parentDir = String(payload?.parentDir || '').trim()
    if (!parentDir) {
      const result = await dialog.showOpenDialog({
        title: '新建 UNU 工程',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) return null
      parentDir = result.filePaths[0]
    }

    const parentStat = await fs.stat(parentDir).catch(() => null)
    if (!parentStat?.isDirectory()) {
      throw new Error('无效的项目目录')
    }

    const projectName = sanitizeProjectName(payload?.projectName) || makeDefaultProjectName()
    const projectRoot = path.join(parentDir, projectName)
    if (await exists(projectRoot)) {
      throw new Error(`目标目录已存在: ${projectRoot}`)
    }

    await ensureProjectStructure(projectRoot)
    await writeProjectFile(projectRoot, projectName)
    await ensureProjectRuntimeScriptFiles(projectRoot)
    const integrity = await ensureProjectAssetIntegrity(projectRoot)
    return {
      rootPath: projectRoot,
      name: projectName,
      parentDir,
      created: true,
      integrity
    }
  })

  ipcMain.handle('unu:pick-directory', async (_event, payload?: { title?: string; defaultPath?: string }) => {
    const result = await dialog.showOpenDialog({
      title: payload?.title || '选择目标目录',
      defaultPath: payload?.defaultPath,
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const dirPath = result.filePaths[0]
    return {
      dirPath,
      name: path.basename(dirPath)
    }
  })

  ipcMain.handle('unu:pick-project-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 UNU 工程目录',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const projectRoot = result.filePaths[0]
    await ensureProjectStructure(projectRoot)
    return {
      rootPath: projectRoot,
      name: path.basename(projectRoot)
    }
  })

  ipcMain.handle('unu:save-project-as', async (_event, payload: {
    sourceProjectRoot?: string
    projectName?: string
    currentSceneContent?: string
    currentSceneName?: string
    sceneFiles?: Array<{ fileName?: string; content: string }>
  }) => {
    const result = await dialog.showOpenDialog({
      title: '项目另存为',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const targetRoot = result.filePaths[0]
    const targetResolved = path.resolve(targetRoot)
    const sourceResolved = payload.sourceProjectRoot ? path.resolve(payload.sourceProjectRoot) : ''

    if (sourceResolved && sourceResolved !== 'sample-project' && sourceResolved === targetResolved) {
      throw new Error('目标目录与当前工程目录相同，请选择其他目录。')
    }

    await ensureProjectStructure(targetRoot)
    const fromSample = !payload.sourceProjectRoot || payload.sourceProjectRoot === 'sample-project'

    if (!fromSample && sourceResolved && await exists(sourceResolved)) {
      await copyIfExists(path.join(sourceResolved, 'assets'), path.join(targetRoot, 'assets'))
      await copyIfExists(path.join(sourceResolved, 'scenes'), path.join(targetRoot, 'scenes'))
      await copyIfExists(path.join(sourceResolved, 'prefabs'), path.join(targetRoot, 'prefabs'))
      await copyIfExists(path.join(sourceResolved, 'project.json'), path.join(targetRoot, 'project.json'))
    } else {
      await writeSampleProjectSeed(targetRoot)
    }

    await writeProjectFile(targetRoot, payload.projectName)
    await ensureProjectRuntimeScriptFiles(targetRoot)

    let sceneFilePath: string | undefined
    const sceneFiles = Array.isArray(payload.sceneFiles) ? payload.sceneFiles : []
    if (sceneFiles.length > 0) {
      const usedNames = new Set<string>()
      for (const file of sceneFiles) {
        const rawName = sanitizeSceneFileName(file.fileName)
        let candidate = rawName
        let idx = 2
        while (usedNames.has(candidate.toLowerCase())) {
          candidate = rawName.replace(/\.scene\.json$/i, `_${idx}.scene.json`)
          idx += 1
        }
        usedNames.add(candidate.toLowerCase())
        const fullPath = path.join(targetRoot, 'scenes', candidate)
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, String(file.content || ''), 'utf-8')

        if (!sceneFilePath) sceneFilePath = fullPath
        const currentName = sanitizeSceneFileName(payload.currentSceneName)
        if (candidate.toLowerCase() === currentName.toLowerCase()) {
          sceneFilePath = fullPath
        }
      }
    } else if (payload.currentSceneContent) {
      const sceneFileName = sanitizeSceneFileName(payload.currentSceneName)
      sceneFilePath = path.join(targetRoot, 'scenes', sceneFileName)
      await fs.mkdir(path.dirname(sceneFilePath), { recursive: true })
      await fs.writeFile(sceneFilePath, payload.currentSceneContent, 'utf-8')
    }
    await reconcileProjectSceneCatalog(targetRoot, payload.projectName)
    const integrity = await ensureProjectAssetIntegrity(targetRoot)

    return {
      rootPath: targetRoot,
      name: path.basename(targetRoot),
      sceneFilePath,
      fromSample,
      integrity
    }
  })

  ipcMain.handle('unu:export-game', async (_event, payload: { projectRoot: string; projectName?: string }) => {
    const projectRoot = await resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!projectRoot || projectRoot === 'sample-project' || !(await exists(projectRoot))) {
      throw new Error('请先打开一个本地项目，再导出游戏。')
    }

    await ensureProjectStructure(projectRoot)
    await ensureProjectRuntimeScriptFiles(projectRoot)
    const projectName = sanitizeProjectName(payload?.projectName) || path.basename(projectRoot)
    const reconcile = await reconcileProjectSceneCatalog(projectRoot, projectName)
    const integrity = await ensureProjectAssetIntegrity(projectRoot)

    const pick = await dialog.showOpenDialog({
      title: '导出 Web 游戏到目录',
      properties: ['openDirectory', 'createDirectory']
    })
    if (pick.canceled || pick.filePaths.length === 0) return null

    const distRoot = await resolveWebDistRoot()
    const outputDir = path.join(pick.filePaths[0], makeExportFolderName(projectName))
    await fs.mkdir(outputDir, { recursive: true })
    await fs.cp(distRoot, outputDir, { recursive: true, force: true })

    await copyIfExists(path.join(projectRoot, 'project.json'), path.join(outputDir, 'project.json'))
    await copyIfExists(path.join(projectRoot, 'assets'), path.join(outputDir, 'assets'))
    await copyIfExists(path.join(projectRoot, 'scenes'), path.join(outputDir, 'scenes'))
    await copyIfExists(path.join(projectRoot, 'prefabs'), path.join(outputDir, 'prefabs'))

    const indexPath = path.join(outputDir, 'index.html')
    await patchExportIndexHtml(indexPath, projectName)
    await writeExportLaunchFiles(outputDir, projectName)
    const assetCount = await countFilesRecursive(path.join(outputDir, 'assets'))
    const report = {
      format: 'unu-web-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      projectName,
      projectRoot,
      outputDir,
      indexPath,
      launchScript: path.join(outputDir, 'PLAY_GAME.bat'),
      sceneCount: reconcile.sceneCount,
      startupScene: reconcile.startupScene,
      assetCount,
      assetIntegrityRepaired: integrity.repaired,
      normalizedSceneFiles: integrity.normalizedSceneFiles,
      normalizedFiles: integrity.normalizedFiles,
      copiedAssets: integrity.copiedAssets,
      relinkedAssets: integrity.relinkedAssets,
      relinkedFiles: integrity.relinkedFiles,
      checkedAssetRefs: integrity.checkedAssetRefs,
      resolvedAssets: integrity.resolvedAssets,
      unresolvedAssets: integrity.unresolvedAssets,
      unresolvedRefs: integrity.unresolvedRefs
    }
    await fs.writeFile(path.join(outputDir, 'export-report.json'), JSON.stringify(report, null, 2), 'utf-8')

    return {
      ok: true,
      outputDir,
      indexPath,
      sceneCount: reconcile.sceneCount,
      assetCount
    }
  })

  ipcMain.handle('unu:scan-project', async (_event, projectRoot: string) => {
    if (!projectRoot) return { rootPath: '', name: '', tree: [] }
    const resolvedProjectRoot = await resolveProjectRootPath(projectRoot)
    await ensureProjectStructure(resolvedProjectRoot)
    await ensureProjectRuntimeScriptFiles(resolvedProjectRoot)
    const projectName = path.basename(resolvedProjectRoot)
    const reconcile = await reconcileProjectSceneCatalog(resolvedProjectRoot, projectName)
    const integrity = await ensureProjectAssetIntegrity(resolvedProjectRoot)
    const tree = await buildAssetNodes(resolvedProjectRoot, resolvedProjectRoot)
    return {
      rootPath: resolvedProjectRoot,
      name: projectName,
      tree,
      sceneCatalogRepaired: reconcile.repaired,
      sceneCount: reconcile.sceneCount,
      sceneCreatedByReference: reconcile.createdByReference,
      assetIntegrityRepaired: integrity.repaired,
      normalizedSceneFiles: integrity.normalizedSceneFiles,
      normalizedFiles: integrity.normalizedFiles,
      copiedAssets: integrity.copiedAssets,
      relinkedAssets: integrity.relinkedAssets,
      relinkedFiles: integrity.relinkedFiles,
      checkedAssetRefs: integrity.checkedAssetRefs,
      resolvedAssets: integrity.resolvedAssets,
      unresolvedAssets: integrity.unresolvedAssets,
      unresolvedRefs: integrity.unresolvedRefs
    }
  })

  ipcMain.handle('unu:check-asset-integrity', async (_event, payload: { projectRoot: string }) => {
    const resolvedProjectRoot = await resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!resolvedProjectRoot || resolvedProjectRoot === 'sample-project') {
      throw new Error('请先打开或另存为本地项目，再检查资源依赖。')
    }
    await ensureProjectStructure(resolvedProjectRoot)
    const integrity = await ensureProjectAssetIntegrity(resolvedProjectRoot)
    const tree = await buildAssetNodes(resolvedProjectRoot, resolvedProjectRoot)
    return {
      rootPath: resolvedProjectRoot,
      name: path.basename(resolvedProjectRoot),
      tree,
      assetIntegrityRepaired: integrity.repaired,
      normalizedSceneFiles: integrity.normalizedSceneFiles,
      normalizedFiles: integrity.normalizedFiles,
      copiedAssets: integrity.copiedAssets,
      relinkedAssets: integrity.relinkedAssets,
      relinkedFiles: integrity.relinkedFiles,
      checkedAssetRefs: integrity.checkedAssetRefs,
      resolvedAssets: integrity.resolvedAssets,
      unresolvedAssets: integrity.unresolvedAssets,
      unresolvedRefs: integrity.unresolvedRefs
    }
  })

  ipcMain.handle('unu:watch-project-scripts', async (event, payload: { projectRoot: string }) => {
    return watchProjectScripts(event.sender, String(payload?.projectRoot || '').trim())
  })

  ipcMain.handle('unu:unwatch-project-scripts', async (event) => {
    closeProjectScriptWatcher(event.sender.id)
    return { ok: true }
  })

  ipcMain.handle('unu:save-scene', async (_event, payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) => {
    let targetPath = payload.filePath

    if (!targetPath) {
      const defaultPath = path.join(payload.projectRoot || app.getPath('documents'), 'scenes', payload.suggestedName || 'Main.scene.json')
      const result = await dialog.showSaveDialog({
        title: '保存场景',
        defaultPath,
        filters: [{ name: 'UNU Scene', extensions: ['json'] }]
      })
      if (result.canceled || !result.filePath) return null
      targetPath = result.filePath
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, payload.content, 'utf-8')
    if (payload.projectRoot) {
      await reconcileProjectSceneCatalog(payload.projectRoot, path.basename(payload.projectRoot))
    }
    return {
      filePath: targetPath,
      name: path.basename(targetPath)
    }
  })

  ipcMain.handle('unu:open-scene', async (_event, payload: { projectRoot?: string }) => {
    const result = await dialog.showOpenDialog({
      title: '打开场景',
      defaultPath: payload.projectRoot ? path.join(payload.projectRoot, 'scenes') : undefined,
      properties: ['openFile'],
      filters: [{ name: 'UNU Scene', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const content = await fs.readFile(filePath, 'utf-8')
    return {
      filePath,
      name: path.basename(filePath),
      content
    }
  })

  ipcMain.handle('unu:read-asset-data-url', async (_event, payload: { projectRoot: string; relativePath: string }) => {
    if (!payload.projectRoot || !payload.relativePath) return null
    try {
      const projectRoot = await resolveProjectRootPath(payload.projectRoot)
      const resolvedPath = await resolveAssetPathWithFallback(projectRoot, payload.relativePath)
      if (!resolvedPath) {
        return null
      }
      const dataUrl = await readFileAsDataUrl(resolvedPath)
      return { dataUrl }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('[UNU][main] read-asset-data-url fallback failed:', {
        projectRoot: payload.projectRoot,
        relativePath: payload.relativePath,
        message
      })
      return null
    }
  })

  ipcMain.handle('unu:import-images', async (_event, payload: { projectRoot: string }) => {
    if (!payload.projectRoot) return null
    const result = await dialog.showOpenDialog({
      title: '导入图片资源',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const imported = await importFiles(payload.projectRoot, result.filePaths, 'assets/images')
    return { imported }
  })

  ipcMain.handle('unu:import-audios', async (_event, payload: { projectRoot: string }) => {
    if (!payload.projectRoot) return null
    const result = await dialog.showOpenDialog({
      title: '导入音频资源',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const imported = await importFiles(payload.projectRoot, result.filePaths, 'assets/audio')
    return { imported }
  })

  ipcMain.handle('unu:save-prefab', async (_event, payload: { filePath?: string; content: string; suggestedName?: string; projectRoot?: string }) => {
    let targetPath = payload.filePath
    if (!targetPath) {
      const defaultPath = path.join(payload.projectRoot || app.getPath('documents'), 'prefabs', payload.suggestedName || 'Entity.prefab.json')
      const result = await dialog.showSaveDialog({
        title: '保存 Prefab',
        defaultPath,
        filters: [{ name: 'UNU Prefab', extensions: ['json'] }]
      })
      if (result.canceled || !result.filePath) return null
      targetPath = result.filePath
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, payload.content, 'utf-8')
    return {
      filePath: targetPath,
      name: path.basename(targetPath),
      relativePath: payload.projectRoot ? normalizePath(path.relative(payload.projectRoot, targetPath)) : undefined
    }
  })

  ipcMain.handle('unu:open-prefab', async (_event, payload: { projectRoot?: string }) => {
    const result = await dialog.showOpenDialog({
      title: '打开 Prefab',
      defaultPath: payload.projectRoot ? path.join(payload.projectRoot, 'prefabs') : undefined,
      properties: ['openFile'],
      filters: [{ name: 'UNU Prefab', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const content = await fs.readFile(filePath, 'utf-8')
    return {
      filePath,
      name: path.basename(filePath),
      relativePath: payload.projectRoot ? normalizePath(path.relative(payload.projectRoot, filePath)) : undefined,
      content
    }
  })

  ipcMain.handle('unu:save-text-asset', async (_event, payload) => saveTextAsset(payload))
  ipcMain.handle('unu:open-text-asset', async (_event, payload) => openTextAsset(payload))

  ipcMain.handle('unu:create-text-asset-in-folder', async (_event, payload: { projectRoot: string; folderPath: string; fileName?: string; content?: string }) => {
    const projectRoot = await resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!projectRoot || projectRoot === 'sample-project') {
      throw new Error('请先打开或另存为本地项目，再新建文件。')
    }
    const folderPath = normalizeSafeRelativePath(payload?.folderPath || 'assets')
    const folderFullPath = resolveProjectChildPath(projectRoot, folderPath)
    if (!folderFullPath) throw new Error('目标目录不在当前项目内。')
    const stat = await fs.stat(folderFullPath).catch(() => null)
    if (!stat || !stat.isDirectory()) throw new Error('目标目录不存在。')

    const userProvidedName = !!String(payload?.fileName || '').trim()
    const fileName = sanitizeAssetFileName(payload?.fileName) || 'NewFile.ts'
    const targetPath = path.join(folderFullPath, fileName)
    const root = path.resolve(projectRoot)
    const relative = path.relative(root, path.resolve(targetPath))
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('目标文件不在当前项目内。')
    const finalPath = userProvidedName ? targetPath : await makeUniquePathIfNeeded(targetPath)
    if (userProvidedName && await exists(finalPath)) throw new Error('同名文件已存在。')
    await fs.writeFile(finalPath, payload?.content ?? '', 'utf-8')
    return {
      filePath: finalPath,
      name: path.basename(finalPath),
      relativePath: normalizePath(path.relative(projectRoot, finalPath))
    }
  })

  ipcMain.handle('unu:create-asset-folder', async (_event, payload: { projectRoot: string; folderPath: string; folderName?: string }) => {
    const projectRoot = await resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!projectRoot || projectRoot === 'sample-project') {
      throw new Error('Please open or save a local project before creating folders.')
    }
    const folderPath = normalizeSafeRelativePath(payload?.folderPath || 'assets')
    const parentFullPath = resolveProjectChildPath(projectRoot, folderPath)
    if (!parentFullPath) throw new Error('Target folder is outside the current project.')
    const parentStat = await fs.stat(parentFullPath).catch(() => null)
    if (!parentStat || !parentStat.isDirectory()) throw new Error('Target folder does not exist.')

    const userProvidedName = !!String(payload?.folderName || '').trim()
    const folderName = sanitizeAssetFileName(payload?.folderName) || 'NewFolder'
    const targetPath = path.join(parentFullPath, folderName)
    const root = path.resolve(projectRoot)
    const relative = path.relative(root, path.resolve(targetPath))
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Target folder is outside the current project.')
    const finalPath = userProvidedName ? targetPath : await makeUniquePathIfNeeded(targetPath)
    if (userProvidedName && await exists(finalPath)) throw new Error('A folder with the same name already exists.')
    await fs.mkdir(finalPath, { recursive: false })
    return {
      filePath: finalPath,
      name: path.basename(finalPath),
      relativePath: normalizePath(path.relative(projectRoot, finalPath))
    }
  })

  ipcMain.handle('unu:rename-asset', async (_event, payload: { projectRoot: string; relativePath: string; nextName: string }) => {
    const projectRoot = await resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!projectRoot || projectRoot === 'sample-project') {
      throw new Error('请先打开或另存为本地项目，再重命名资源。')
    }
    const sourcePath = resolveProjectChildPath(projectRoot, payload?.relativePath || '')
    if (!sourcePath) throw new Error('源资源不在当前项目内。')
    const stat = await fs.stat(sourcePath).catch(() => null)
    if (!stat) throw new Error('源资源不存在。')

    const rawNextName = sanitizeAssetFileName(payload?.nextName)
    if (!rawNextName) throw new Error('资源名称不能为空。')
    const sourceName = path.basename(sourcePath)
    const nextName = stat.isDirectory() || path.extname(rawNextName)
      ? rawNextName
      : `${rawNextName}${splitKnownAssetExtension(sourceName).ext}`
    const targetPath = path.join(path.dirname(sourcePath), nextName)
    const root = path.resolve(projectRoot)
    const relative = path.relative(root, path.resolve(targetPath))
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('目标资源不在当前项目内。')
    if (path.resolve(targetPath) === path.resolve(sourcePath)) {
      return {
        filePath: sourcePath,
        name: sourceName,
        relativePath: normalizePath(path.relative(projectRoot, sourcePath))
      }
    }
    if (await exists(targetPath)) throw new Error('同名资源已存在。')
    await fs.rename(sourcePath, targetPath)
    const sourceRelative = normalizePath(path.relative(projectRoot, sourcePath))
    const targetRelative = normalizePath(path.relative(projectRoot, targetPath))
    const relink = await rewriteMovedAssetReferencesInProject(projectRoot, sourceRelative, targetRelative, stat.isDirectory())
    return {
      filePath: targetPath,
      name: path.basename(targetPath),
      relativePath: targetRelative,
      relinkedFiles: relink.relinkedFiles
    }
  })

  ipcMain.handle('unu:copy-asset', async (_event, payload: { projectRoot: string; relativePath: string }) => {
    const projectRoot = await resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!projectRoot || projectRoot === 'sample-project') {
      throw new Error('Please open or save a local project before copying assets.')
    }
    const sourceRelative = normalizeSafeRelativePath(payload?.relativePath || '')
    if (!sourceRelative) throw new Error('Source asset path is invalid.')
    const sourcePath = resolveProjectChildPath(projectRoot, sourceRelative)
    if (!sourcePath) throw new Error('Source asset is outside the current project.')
    const sourceStat = await fs.stat(sourcePath).catch(() => null)
    if (!sourceStat) throw new Error('Source asset does not exist.')

    const parsed = splitKnownAssetExtension(path.basename(sourcePath))
    const targetBase = path.join(path.dirname(sourcePath), `${parsed.base}_Copy${parsed.ext}`)
    const targetPath = await makeUniquePathIfNeeded(targetBase)
    if (sourceStat.isDirectory()) await fs.cp(sourcePath, targetPath, { recursive: true, force: false })
    else await fs.copyFile(sourcePath, targetPath)
    return {
      filePath: targetPath,
      name: path.basename(targetPath),
      relativePath: normalizePath(path.relative(projectRoot, targetPath))
    }
  })

  ipcMain.handle('unu:delete-asset', async (_event, payload: { projectRoot: string; relativePath: string }) => {
    const projectRoot = await resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!projectRoot || projectRoot === 'sample-project') {
      throw new Error('Please open or save a local project before deleting assets.')
    }
    const sourceRelative = normalizeSafeRelativePath(payload?.relativePath || '')
    if (!sourceRelative) throw new Error('Asset path is invalid.')
    if (['assets', 'scenes', 'prefabs'].includes(sourceRelative)) {
      throw new Error('Top-level project folders cannot be deleted from the asset tree.')
    }
    const sourcePath = resolveProjectChildPath(projectRoot, sourceRelative)
    if (!sourcePath) throw new Error('Asset is outside the current project.')
    const sourceStat = await fs.stat(sourcePath).catch(() => null)
    if (!sourceStat) throw new Error('Asset does not exist.')
    const trashPath = await moveAssetToTrash(projectRoot, sourcePath)
    return {
      ok: true,
      relativePath: sourceRelative,
      trashRelativePath: normalizePath(path.relative(projectRoot, trashPath))
    }
  })

  ipcMain.handle('unu:restore-deleted-asset', async (_event, payload: { projectRoot: string; trashRelativePath: string; restoreRelativePath: string }) => {
    const projectRoot = await resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!projectRoot || projectRoot === 'sample-project') {
      throw new Error('Please open or save a local project before restoring assets.')
    }
    const trashRelative = normalizeSafeRelativePath(payload?.trashRelativePath || '')
    const restoreRelative = normalizeSafeRelativePath(payload?.restoreRelativePath || '')
    if (!trashRelative || !restoreRelative || !trashRelative.startsWith('.unu-trash/')) {
      throw new Error('Restore path is invalid.')
    }
    const trashPath = resolveProjectChildPath(projectRoot, trashRelative)
    const restorePath = resolveProjectChildPath(projectRoot, restoreRelative)
    if (!trashPath || !restorePath) throw new Error('Restore target is outside the current project.')
    const trashStat = await fs.stat(trashPath).catch(() => null)
    if (!trashStat) throw new Error('Deleted asset is no longer available in the undo trash.')
    if (await exists(restorePath)) throw new Error('Cannot restore because an asset already exists at the original path.')
    await fs.mkdir(path.dirname(restorePath), { recursive: true })
    await fs.rename(trashPath, restorePath)
    await fs.rm(path.dirname(trashPath), { recursive: true, force: true }).catch(() => null)
    return {
      filePath: restorePath,
      name: path.basename(restorePath),
      relativePath: normalizePath(path.relative(projectRoot, restorePath))
    }
  })

  ipcMain.handle('unu:move-asset', async (_event, payload: { projectRoot: string; relativePath: string; targetFolderPath: string }) => {
    const projectRoot = await resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!projectRoot || projectRoot === 'sample-project') {
      throw new Error('Please open or save a local project before moving assets.')
    }
    const sourceRelative = normalizeSafeRelativePath(payload?.relativePath || '')
    const targetFolderRelative = normalizeSafeRelativePath(payload?.targetFolderPath || '')
    if (!sourceRelative || !targetFolderRelative) throw new Error('Asset path is invalid.')
    if (['assets', 'scenes', 'prefabs'].includes(sourceRelative)) {
      throw new Error('Top-level project folders cannot be moved from the asset tree.')
    }
    const sourcePath = resolveProjectChildPath(projectRoot, sourceRelative)
    const targetFolderPath = resolveProjectChildPath(projectRoot, targetFolderRelative)
    if (!sourcePath || !targetFolderPath) throw new Error('Move target is outside the current project.')
    const sourceStat = await fs.stat(sourcePath).catch(() => null)
    const targetStat = await fs.stat(targetFolderPath).catch(() => null)
    if (!sourceStat) throw new Error('Source asset does not exist.')
    if (!targetStat || !targetStat.isDirectory()) throw new Error('Target folder does not exist.')
    const sourceResolved = path.resolve(sourcePath)
    const targetFolderResolved = path.resolve(targetFolderPath)
    if (sourceStat.isDirectory()) {
      const relativeToSource = path.relative(sourceResolved, targetFolderResolved)
      if (!relativeToSource || (!relativeToSource.startsWith('..') && !path.isAbsolute(relativeToSource))) {
        throw new Error('A folder cannot be moved into itself or one of its children.')
      }
    }
    if (path.dirname(sourceResolved) === targetFolderResolved) {
      return {
        filePath: sourcePath,
        name: path.basename(sourcePath),
        relativePath: normalizePath(path.relative(projectRoot, sourcePath))
      }
    }
    const targetPath = path.join(targetFolderPath, path.basename(sourcePath))
    if (await exists(targetPath)) throw new Error('An asset with the same name already exists in the target folder.')
    await fs.rename(sourcePath, targetPath)
    const movedSourceRelative = normalizePath(path.relative(projectRoot, sourcePath))
    const movedTargetRelative = normalizePath(path.relative(projectRoot, targetPath))
    const relink = await rewriteMovedAssetReferencesInProject(projectRoot, movedSourceRelative, movedTargetRelative, sourceStat.isDirectory())
    return {
      filePath: targetPath,
      name: path.basename(targetPath),
      relativePath: movedTargetRelative,
      relinkedFiles: relink.relinkedFiles
    }
  })

  ipcMain.handle('unu:read-text-asset', async (_event, payload: { projectRoot: string; relativePath: string }) => {
    if (!payload.projectRoot || !payload.relativePath) return null
    const projectRoot = await resolveProjectRootPath(payload.projectRoot)
    const filePath = path.join(projectRoot, payload.relativePath)
    const content = await fs.readFile(filePath, 'utf-8')
    return { filePath, name: path.basename(filePath), relativePath: payload.relativePath, content }
  })

  ipcMain.handle('unu:rename-project', async (_event, payload: { projectRoot: string; nextName: string }) => {
    const projectRoot = String(payload?.projectRoot || '').trim()
    const nextNameRaw = String(payload?.nextName || '').trim()
    const nextName = sanitizeProjectName(nextNameRaw)
    if (!projectRoot || !nextName) return null
    if (projectRoot === 'sample-project') {
      throw new Error('示例项目不支持重命名')
    }
    if (/[\\/]/.test(nextName)) {
      throw new Error('项目名称不能包含路径分隔符')
    }
    const reserved = new Set([
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ])
    if (reserved.has(nextName.toUpperCase())) {
      throw new Error(`Invalid project name: ${nextName}`)
    }
    const sourcePath = path.resolve(projectRoot)
    const sourceStat = await fs.stat(sourcePath).catch(() => null)
    if (!sourceStat || !sourceStat.isDirectory()) {
      throw new Error('项目目录不存在')
    }
    const parentDir = path.dirname(sourcePath)
    const targetPath = path.join(parentDir, nextName)
    if (path.resolve(targetPath) === sourcePath) {
      return {
        rootPath: sourcePath,
        name: nextName
      }
    }
    if (await exists(targetPath)) {
      throw new Error('目标目录已存在')
    }
    await moveDirectoryWithFallback(sourcePath, targetPath)
    const projectFile = path.join(targetPath, 'project.json')
    try {
      const rawProject = await fs.readFile(projectFile, 'utf-8')
      const parsedProject = JSON.parse(rawProject)
      const nextPayload = {
        ...(parsedProject && typeof parsedProject === 'object' ? parsedProject : {}),
        format: 'unu-project',
        version: 1,
        name: nextName,
        updatedAt: new Date().toISOString()
      }
      await fs.writeFile(projectFile, JSON.stringify(nextPayload, null, 2), 'utf-8')
    } catch {
      // Ignore project metadata update failure; folder rename has already succeeded.
    }
    return {
      rootPath: targetPath,
      name: nextName
    }
  })

  ipcMain.handle('unu:delete-project', async (_event, payload: { projectRoot: string }) => {
    const projectRoot = String(payload?.projectRoot || '').trim()
    if (!projectRoot) return { ok: false }
    if (projectRoot === 'sample-project') {
      throw new Error('示例项目不支持删除')
    }
    const target = path.resolve(projectRoot)
    const targetStat = await fs.stat(target).catch(() => null)
    if (!targetStat || !targetStat.isDirectory()) {
      return { ok: false, error: '项目目录不存在' }
    }
    await fs.rm(target, { recursive: true, force: true })
    return { ok: true }
  })

  ipcMain.handle('unu:reveal-in-folder', async (_event, payload: { projectRoot: string; relativePath: string; isDirectory?: boolean }) => {
    if (!payload.projectRoot || !payload.relativePath) return { ok: false }
    const targetPath = path.join(payload.projectRoot, payload.relativePath)
    try {
      console.log('[UNU][main] reveal-in-folder request:', {
        projectRoot: payload.projectRoot,
        relativePath: payload.relativePath,
        isDirectory: payload.isDirectory,
        targetPath
      })
      const stat = await fs.stat(targetPath).catch(() => null)
      if (!stat) {
        return { ok: false, error: `Path not found: ${targetPath}` }
      }

      if (payload.isDirectory || stat.isDirectory()) {
        const err = await shell.openPath(targetPath)
        return { ok: !err, error: err || undefined }
      }

      shell.showItemInFolder(targetPath)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, error: message }
    }
  })

  ipcMain.handle('unu:open-tilemap-editor', async (_event, payload) => {
    return openTilemapEditorWindow(payload)
  })

  ipcMain.handle('unu:tilemap-editor-update', async (_event, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: 'Main window not available' }
    mainWindow.webContents.send('unu:tilemap-editor-apply', payload)
    tilemapEditorSession = { ...(tilemapEditorSession || {}), ...(payload || {}) }
    return { ok: true }
  })

  ipcMain.handle('unu:close-tilemap-editor', async () => {
    if (tilemapEditorWindow && !tilemapEditorWindow.isDestroyed()) tilemapEditorWindow.close()
    tilemapEditorWindow = null
    return { ok: true }
  })

  ipcMain.handle('unu:set-main-window-preset', async (_event, preset: 'launcher' | 'editor') => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: 'main window not ready' }
    if (preset !== 'launcher' && preset !== 'editor') return { ok: false, error: 'invalid preset' }
    applyMainWindowPreset(mainWindow, preset)
    return { ok: true }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
