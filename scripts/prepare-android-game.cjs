const fs = require('node:fs/promises')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const target = path.join(root, 'public', 'android-game')
const samples = [
  {
    id: 'sample-2D-shooting',
    source: path.join(root, 'Sample-project-list', 'sample-2D-shooting'),
    target
  },
  {
    id: 'snake',
    source: path.join(root, 'Sample-project-list', 'snake'),
    target: path.join(target, '__samples', 'snake')
  },
  {
    id: '2D-shooting-canvas',
    source: path.join(root, 'Sample-project-list', '2D-shooting-canvas'),
    target: path.join(target, '__samples', '2D-shooting-canvas')
  },
  {
    id: '3D',
    source: path.join(root, 'Sample-project-list', '3D'),
    target: path.join(target, '__samples', '3D')
  }
]

async function copyIfExists(source, target, name) {
  const from = path.join(source, name)
  const to = path.join(target, name)
  const stat = await fs.stat(from).catch(() => null)
  if (!stat) return
  await copyGeneratedEntry(from, to, stat)
}

async function copyGeneratedEntry(from, to, knownStat = null) {
  const stat = knownStat || await fs.stat(from).catch(() => null)
  if (!stat) return
  if (stat.isDirectory()) {
    await fs.mkdir(to, { recursive: true })
    const entries = await fs.readdir(from, { withFileTypes: true })
    for (const entry of entries) {
      await copyGeneratedEntry(path.join(from, entry.name), path.join(to, entry.name))
    }
    return
  }
  if (!stat.isFile()) return

  await fs.mkdir(path.dirname(to), { recursive: true })
  const sourceBuffer = await fs.readFile(from)
  const targetBuffer = await fs.readFile(to).catch(() => null)
  if (targetBuffer && Buffer.compare(sourceBuffer, targetBuffer) === 0) return
  await fs.writeFile(to, sourceBuffer).catch((error) => {
    if (error?.code === 'EPERM') {
      console.warn(`Skipped locked generated file: ${path.relative(root, to)}`)
      return
    }
    throw error
  })
}

async function resetGeneratedTarget(targetPath) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 })
    return
  } catch (error) {
    if (error?.code !== 'EPERM') throw error
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const childPath = path.join(targetPath, entry.name)
    await fs.rm(childPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 }).catch((error) => {
      if (error?.code !== 'EPERM') throw error
    })
  }
}

async function main() {
  await fs.mkdir(target, { recursive: true })
  for (const sample of samples) {
    const projectStat = await fs.stat(path.join(sample.source, 'project.json')).catch(() => null)
    if (!projectStat) {
      throw new Error(`Android sample source is missing: ${sample.source}`)
    }

    await resetGeneratedTarget(sample.target)
    await fs.mkdir(sample.target, { recursive: true })

    for (const name of ['project.json', 'manifest.json', 'scenes', 'assets', 'prefabs']) {
      await copyIfExists(sample.source, sample.target, name)
    }

    const files = await collectFiles(sample.target)
    const manifestPath = path.join(sample.target, 'unu-mobile-manifest.json')
    const manifestPayload = JSON.stringify({ id: sample.id, generatedAt: new Date().toISOString(), files }, null, 2)
    await fs.writeFile(manifestPath, manifestPayload, 'utf8').catch(async (error) => {
      const exists = await fs.stat(manifestPath).catch(() => null)
      if (error?.code === 'EPERM' && exists) return
      throw error
    })
  }

  console.log(`Prepared Android game assets: ${path.relative(root, target)}`)
}

async function collectFiles(dir, base = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    if (entry.name === 'unu-mobile-manifest.json') continue
    if (entry.name === '.unu-trash') continue
    if (!base && entry.name === '__samples') continue
    const relative = base ? `${base}/${entry.name}` : entry.name
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath, relative))
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath)
      files.push({ path: relative.replace(/\\/g, '/'), type: classifyAssetType(relative), size: stat.size })
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

function classifyAssetType(filePath) {
  const lower = filePath.toLowerCase()
  if (/\.(png|jpg|jpeg|webp|gif|bmp|svg|exr)$/.test(lower)) return 'image'
  if (/\.(mp3|wav|ogg|m4a|flac)$/.test(lower)) return 'audio'
  if (/\.scene\.json$/.test(lower)) return 'scene'
  if (/\.prefab\.json$/.test(lower)) return 'prefab'
  if (/\.anim\.json$/.test(lower)) return 'animation'
  if (/\.atlas\.json$/.test(lower)) return 'atlas'
  if (/\.(glb|gltf|obj|fbx|bin)$/.test(lower)) return 'model'
  if (/\.(js|ts|json|html|css|md|txt)$/.test(lower)) return 'script'
  return 'script'
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
