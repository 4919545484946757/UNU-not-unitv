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
  return 'folder'
}

async function ensureProjectStructure(projectRoot: string) {
  const folders = [
    'assets',
    'assets/images',
    'assets/audio',
    'assets/scripts',
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
`
}

async function ensureProjectRuntimeScriptFile(projectRoot: string) {
  const runtimePath = path.join(projectRoot, 'assets', 'scripts', 'ScriptRuntime.ts')
  if (await exists(runtimePath)) return false
  await fs.mkdir(path.dirname(runtimePath), { recursive: true })
  await fs.writeFile(runtimePath, createProjectRuntimeTemplate(), 'utf-8')
  return true
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

        const hitEnemy = ctx.api.findEnemyOverlap(ctx.entity)
        if (!hitEnemy) return
        ctx.api.removeEntity(ctx.entity)
        ctx.api.removeEntity(hitEnemy)
        const player = ctx.api.findEntityByName('Player')
        const playerTransform = player?.getTransform()
        ctx.api.spawnEnemyLike(hitEnemy, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: 160
        })
      }
    },
    'assets/scripts/enemy-chase-respawn.js': {
      onUpdate(ctx) {
        const player = ctx.api.findEntityByName('Player')
        if (!player) return
        const cfg = parseConfig(ctx)
        const chaseSpeed = Number(cfg.chaseSpeed ?? 120)
        ctx.api.moveTowards(ctx.entity, player, chaseSpeed, true)
        if (!ctx.api.isTouching(ctx.entity, player)) return
        ctx.api.removeEntity(ctx.entity)
        const playerTransform = player.getTransform()
        ctx.api.spawnEnemyLike(ctx.entity, {
          avoidX: playerTransform?.x ?? 0,
          avoidY: playerTransform?.y ?? 0,
          minDistance: Number(cfg.respawnMinDistance ?? 160)
        })
      }
    }
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

function normalizeSceneAssetReferences(value: unknown, projectRoot: string, refs: Set<string>) {
  let changed = false
  const refKeySet = new Set([
    'texturePath', 'animationAssetPath', 'sourceAtlasPath', 'scriptPath', 'clipPath', 'imagePath', 'path', 'relativePath'
  ])

  const normalizeAndTrack = (container: Record<string, unknown>, key: string, raw: string) => {
    const normalized = normalizeAssetRef(raw, projectRoot)
    if (normalized && !normalized.startsWith('data:') && !normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      refs.add(normalized)
    }
    if (normalized !== raw) {
      container[key] = normalized
      changed = true
    }
  }

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    const record = node as Record<string, unknown>
    for (const [key, entry] of Object.entries(record)) {
      if (typeof entry === 'string' && refKeySet.has(key)) {
        normalizeAndTrack(record, key, entry)
        continue
      }
      if (Array.isArray(entry) && (key === 'framePaths' || key === 'textureCycle')) {
        const nextList = entry.map((item) => {
          if (typeof item !== 'string') return item
          const normalized = normalizeAssetRef(item, projectRoot)
          if (normalized && !normalized.startsWith('data:') && !normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            refs.add(normalized)
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
          if (normalized && !normalized.startsWith('data:') && !normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            refs.add(normalized)
          }
          if (normalized !== mapValue) {
            map[mapKey] = normalized
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
  const sceneFiles = await collectSceneFileNames(projectRoot)
  if (!sceneFiles.length) {
    return { repaired: false, normalizedSceneFiles: 0, copiedAssets: 0, unresolvedAssets: 0 }
  }

  let normalizedSceneFiles = 0
  const allRefs = new Set<string>()
  for (const fileName of sceneFiles) {
    const fullPath = path.join(projectRoot, 'scenes', fileName)
    const raw = await fs.readFile(fullPath, 'utf-8').catch(() => '')
    if (!raw) continue
    let parsed: unknown = null
    try {
      parsed = JSON.parse(String(raw).replace(/^\uFEFF/, ''))
    } catch {
      continue
    }
    const changed = normalizeSceneAssetReferences(parsed, projectRoot, allRefs)
    if (changed) {
      normalizedSceneFiles += 1
      await fs.writeFile(fullPath, JSON.stringify(parsed, null, 2), 'utf-8')
    }
  }

  const missingBefore: string[] = []
  for (const ref of allRefs) {
    const resolved = await resolveAssetPathWithFallback(projectRoot, ref)
    if (!resolved) missingBefore.push(ref)
  }
  const copiedAssets = await repairMissingSampleAssets(projectRoot, missingBefore)

  let unresolvedAssets = 0
  for (const ref of allRefs) {
    const resolved = await resolveAssetPathWithFallback(projectRoot, ref)
    if (!resolved) unresolvedAssets += 1
  }

  return {
    repaired: normalizedSceneFiles > 0 || copiedAssets > 0,
    normalizedSceneFiles,
    copiedAssets,
    unresolvedAssets
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
  const sorted = entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))

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
    await ensureProjectRuntimeScriptFile(projectRoot)
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
    await ensureProjectRuntimeScriptFile(targetRoot)

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

  ipcMain.handle('unu:scan-project', async (_event, projectRoot: string) => {
    if (!projectRoot) return { rootPath: '', name: '', tree: [] }
    await ensureProjectStructure(projectRoot)
    await ensureProjectRuntimeScriptFile(projectRoot)
    const projectName = path.basename(projectRoot)
    const reconcile = await reconcileProjectSceneCatalog(projectRoot, projectName)
    const integrity = await ensureProjectAssetIntegrity(projectRoot)
    const tree = await buildAssetNodes(projectRoot, projectRoot)
    return {
      rootPath: projectRoot,
      name: projectName,
      tree,
      sceneCatalogRepaired: reconcile.repaired,
      sceneCount: reconcile.sceneCount,
      sceneCreatedByReference: reconcile.createdByReference,
      assetIntegrityRepaired: integrity.repaired,
      normalizedSceneFiles: integrity.normalizedSceneFiles,
      copiedAssets: integrity.copiedAssets,
      unresolvedAssets: integrity.unresolvedAssets
    }
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
      const resolvedPath = await resolveAssetPathWithFallback(payload.projectRoot, payload.relativePath)
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

  ipcMain.handle('unu:read-text-asset', async (_event, payload: { projectRoot: string; relativePath: string }) => {
    if (!payload.projectRoot || !payload.relativePath) return null
    const filePath = path.join(payload.projectRoot, payload.relativePath)
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
