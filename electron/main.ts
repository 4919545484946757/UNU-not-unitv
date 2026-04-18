import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron'
import * as fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function normalizePath(inputPath: string) {
  return inputPath.split(path.sep).join('/')
}

function inferAssetType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase()
  if (fileName.endsWith('.anim.json')) return 'animation'
  if (fileName.endsWith('.atlas.json')) return 'atlas'
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return 'image'
  if (['.mp3', '.wav', '.ogg'].includes(ext)) return 'audio'
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

async function exists(targetPath: string) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function copyIfExists(from: string, to: string) {
  if (!(await exists(from))) return
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.cp(from, to, { recursive: true, force: true })
}

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
  await Promise.all([
    writeSampleScriptFiles(projectRoot),
    writeSampleImageFiles(projectRoot),
    writeSampleAnimationFiles(projectRoot),
    writeSampleAudioPlaceholder(projectRoot)
  ])
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
          : 'application/octet-stream'

  const buffer = await fs.readFile(filePath)
  return `data:${mime};base64,${buffer.toString('base64')}`
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
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: '#111318',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
    if (process.env.UNU_OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }
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

    let sceneFilePath: string | undefined
    if (payload.currentSceneContent) {
      const sceneFileName = payload.currentSceneName?.trim() || 'MainScene.scene.json'
      sceneFilePath = path.join(targetRoot, 'scenes', sceneFileName)
      await fs.mkdir(path.dirname(sceneFilePath), { recursive: true })
      await fs.writeFile(sceneFilePath, payload.currentSceneContent, 'utf-8')
    }

    return {
      rootPath: targetRoot,
      name: path.basename(targetRoot),
      sceneFilePath,
      fromSample
    }
  })

  ipcMain.handle('unu:scan-project', async (_event, projectRoot: string) => {
    if (!projectRoot) return { rootPath: '', name: '', tree: [] }
    await ensureProjectStructure(projectRoot)
    const tree = await buildAssetNodes(projectRoot, projectRoot)
    return {
      rootPath: projectRoot,
      name: path.basename(projectRoot),
      tree
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
    const targetPath = path.join(payload.projectRoot, payload.relativePath)
    const dataUrl = await readFileAsDataUrl(targetPath)
    return { dataUrl }
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
      name: path.basename(targetPath)
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

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
