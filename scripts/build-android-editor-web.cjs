const fs = require('node:fs/promises')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const runtimeDir = path.join(root, '.unu-android-runtime')
const distDir = path.join(root, 'dist')
const embeddedRuntimeDir = path.join(distDir, 'android-runtime')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with code ${result.status}`)
  }
}

async function collectFiles(dir, base = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    if (!base && entry.name === 'android-game') continue
    const relative = base ? `${base}/${entry.name}` : entry.name
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath, relative))
    } else if (entry.isFile()) {
      files.push(relative.replace(/\\/g, '/'))
    }
  }
  return files.sort((a, b) => a.localeCompare(b))
}

async function main() {
  await fs.rm(runtimeDir, { recursive: true, force: true })
  await fs.rm(embeddedRuntimeDir, { recursive: true, force: true })

  const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
  run(process.execPath, [vite, 'build', '--mode', 'android', '--outDir', runtimeDir, '--emptyOutDir'])
  run(process.execPath, [vite, 'build', '--mode', 'android-editor'])

  await fs.cp(runtimeDir, embeddedRuntimeDir, { recursive: true, force: true })
  await fs.rm(path.join(embeddedRuntimeDir, 'android-game'), { recursive: true, force: true })
  const files = await collectFiles(embeddedRuntimeDir)
  await fs.writeFile(
    path.join(embeddedRuntimeDir, 'unu-runtime-manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2),
    'utf8'
  )
  await fs.rm(runtimeDir, { recursive: true, force: true })
  console.log(`Embedded Android game runtime: ${path.relative(root, embeddedRuntimeDir)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
