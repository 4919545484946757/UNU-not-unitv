import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
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


async function writeProjectFile(projectRoot: string) {
  const projectFile = path.join(projectRoot, 'project.json')
  const projectName = path.basename(projectRoot)
  const payload = {
    format: 'unu-project',
    version: 1,
    name: projectName,
    createdAt: new Date().toISOString()
  }
  await fs.writeFile(projectFile, JSON.stringify(payload, null, 2), 'utf-8')
  return payload
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
    win.webContents.openDevTools({ mode: 'detach' })
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
      if (payload.isDirectory) {
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
