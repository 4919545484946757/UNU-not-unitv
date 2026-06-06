import * as fs from 'node:fs/promises'
import path from 'node:path'

export type ExportGamePayload = {
  projectRoot: string
  projectName?: string
  sceneFiles?: Array<{ fileName?: string; content: string }>
}

export type ExportGameReport = {
  format: 'unu-web-export'
  version: 1
  exportedAt: string
  projectName: string
  projectRoot: string
  outputDir: string
  indexPath: string
  launchScript: string
  sceneCount: number
  startupScene: string
  sceneCatalog: Array<{ file: string; name: string }>
  sceneSnapshotWritten: number
  sceneSnapshotFiles: string[]
  assetCount: number
  assetIntegrityRepaired: boolean
  normalizedSceneFiles: number
  normalizedFiles: number
  copiedAssets: number
  relinkedAssets: number
  relinkedFiles: number
  checkedAssetRefs: number
  resolvedAssets: number
  unresolvedAssets: number
  unresolvedRefs: unknown[]
  runtimeAssetChecked: number
  runtimeAssetMissing: string[]
}

export type ExportGameDependencies = {
  resolveProjectRootPath: (projectRoot: string) => Promise<string>
  exists: (targetPath: string) => Promise<boolean>
  ensureProjectStructure: (projectRoot: string) => Promise<void>
  ensureProjectRuntimeScriptFiles: (projectRoot: string) => Promise<unknown>
  reconcileProjectSceneCatalog: (projectRoot: string, projectName?: string) => Promise<{
    sceneCount: number
    startupScene: string
  }>
  ensureProjectAssetIntegrity: (projectRoot: string) => Promise<{
    repaired: boolean
    normalizedSceneFiles: number
    normalizedFiles: number
    copiedAssets: number
    relinkedAssets: number
    relinkedFiles: number
    checkedAssetRefs: number
    resolvedAssets: number
    unresolvedAssets: number
    unresolvedRefs: unknown[]
  }>
  chooseOutputDirectory: () => Promise<string | null>
  resolveWebDistRoot: () => Promise<string>
  copyIfExists: (from: string, to: string) => Promise<void>
  now?: () => Date
}

export function createExportGameHandler(deps: ExportGameDependencies) {
  return async function exportGame(payload: ExportGamePayload) {
    const projectRoot = await deps.resolveProjectRootPath(String(payload?.projectRoot || '').trim())
    if (!projectRoot || projectRoot === 'sample-project' || !(await deps.exists(projectRoot))) {
      throw new Error('Please open a local project before exporting a Web game.')
    }

    await deps.ensureProjectStructure(projectRoot)
    await deps.ensureProjectRuntimeScriptFiles(projectRoot)
    const projectName = sanitizeProjectName(payload?.projectName) || path.basename(projectRoot)
    const sceneSnapshot = await writeSceneSnapshotFiles(projectRoot, payload?.sceneFiles)
    const reconcile = await deps.reconcileProjectSceneCatalog(projectRoot, projectName)
    const integrity = await deps.ensureProjectAssetIntegrity(projectRoot)

    const outputParent = await deps.chooseOutputDirectory()
    if (!outputParent) return null

    const distRoot = await deps.resolveWebDistRoot()
    const outputDir = path.join(outputParent, makeExportFolderName(projectName, deps.now?.() ?? new Date()))
    await fs.mkdir(outputDir, { recursive: true })
    await fs.cp(distRoot, outputDir, { recursive: true, force: true })

    await deps.copyIfExists(path.join(projectRoot, 'assets'), path.join(outputDir, 'assets'))
    await deps.copyIfExists(path.join(projectRoot, 'scenes'), path.join(outputDir, 'scenes'))
    await deps.copyIfExists(path.join(projectRoot, 'prefabs'), path.join(outputDir, 'prefabs'))
    const exportProject = await writeNormalizedExportProjectFile(projectRoot, outputDir, projectName)
    const runtimeValidation = await validateRuntimeAssets(outputDir)

    const indexPath = path.join(outputDir, 'index.html')
    await patchExportIndexHtml(indexPath, projectName)
    await writeExportLaunchFiles(outputDir, projectName)
    const assetCount = await countFilesRecursive(path.join(outputDir, 'assets'))
    const report = createExportReport({
      exportedAt: (deps.now?.() ?? new Date()).toISOString(),
      projectName,
      projectRoot,
      outputDir,
      indexPath,
      launchScript: path.join(outputDir, 'PLAY_GAME.bat'),
      sceneCount: exportProject.sceneCatalog.length || reconcile.sceneCount,
      startupScene: exportProject.startupScene || reconcile.startupScene,
      sceneCatalog: exportProject.sceneCatalog,
      sceneSnapshotWritten: sceneSnapshot.written,
      sceneSnapshotFiles: sceneSnapshot.fileNames,
      assetCount,
      integrity,
      runtimeValidation
    })
    const reportPath = path.join(outputDir, 'export-report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8')
    await validateExportOutput(outputDir, report)

    return {
      ok: true,
      outputDir,
      indexPath,
      launchScript: path.join(outputDir, 'PLAY_GAME.bat'),
      reportPath,
      sceneCount: report.sceneCount,
      startupScene: report.startupScene,
      assetCount,
      sceneSnapshotWritten: sceneSnapshot.written,
      assetIntegrityRepaired: integrity.repaired,
      unresolvedAssets: integrity.unresolvedAssets
    }
  }
}

export function createExportReport(input: {
  exportedAt: string
  projectName: string
  projectRoot: string
  outputDir: string
  indexPath: string
  launchScript: string
  sceneCount: number
  startupScene: string
  sceneCatalog: Array<{ file: string; name: string }>
  sceneSnapshotWritten: number
  sceneSnapshotFiles: string[]
  assetCount: number
  integrity: Awaited<ReturnType<ExportGameDependencies['ensureProjectAssetIntegrity']>>
  runtimeValidation?: { checked: number; missing: string[] }
}): ExportGameReport {
  return {
    format: 'unu-web-export',
    version: 1,
    exportedAt: input.exportedAt,
    projectName: input.projectName,
    projectRoot: input.projectRoot,
    outputDir: input.outputDir,
    indexPath: input.indexPath,
    launchScript: input.launchScript,
    sceneCount: input.sceneCount,
    startupScene: input.startupScene,
    sceneCatalog: input.sceneCatalog,
    sceneSnapshotWritten: input.sceneSnapshotWritten,
    sceneSnapshotFiles: input.sceneSnapshotFiles,
    assetCount: input.assetCount,
    assetIntegrityRepaired: input.integrity.repaired,
    normalizedSceneFiles: input.integrity.normalizedSceneFiles,
    normalizedFiles: input.integrity.normalizedFiles,
    copiedAssets: input.integrity.copiedAssets,
    relinkedAssets: input.integrity.relinkedAssets,
    relinkedFiles: input.integrity.relinkedFiles,
    checkedAssetRefs: input.integrity.checkedAssetRefs,
    resolvedAssets: input.integrity.resolvedAssets,
    unresolvedAssets: input.integrity.unresolvedAssets,
    unresolvedRefs: input.integrity.unresolvedRefs,
    runtimeAssetChecked: input.runtimeValidation?.checked ?? 0,
    runtimeAssetMissing: input.runtimeValidation?.missing ?? []
  }
}

export async function validateExportOutput(outputDir: string, report?: Partial<ExportGameReport>) {
  const required = [
    'index.html',
    'project.json',
    'PLAY_GAME.bat',
    'PLAY_GAME.ps1',
    'EXPORT_README.md',
    'export-report.json'
  ]
  const missing: string[] = []
  for (const rel of required) {
    try {
      await fs.access(path.join(outputDir, rel))
    } catch {
      missing.push(rel)
    }
  }
  if (report?.startupScene) {
    try {
      await fs.access(path.join(outputDir, 'scenes', report.startupScene))
    } catch {
      missing.push(`scenes/${report.startupScene}`)
    }
  }
  const runtimeValidation = await validateRuntimeAssets(outputDir)
  if (runtimeValidation.missing.length) {
    missing.push(...runtimeValidation.missing)
  }
  if (missing.length) {
    throw new Error(`Invalid Web export output. Missing: ${missing.join(', ')}`)
  }
  return { ok: true, checked: required.length + (report?.startupScene ? 1 : 0) + runtimeValidation.checked }
}

function makeExportFolderName(projectName: string | undefined, now = new Date()) {
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

async function countFilesRecursive(rootPath: string) {
  try {
    await fs.access(rootPath)
  } catch {
    return 0
  }
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
    .replace(/(<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=["'])([^"']*)(["'][^>]*>)/i, (_match, prefix, content, suffix) => {
      let policy = String(content)
      if (!policy.includes('media-src')) policy = `${policy}; media-src 'self' data: blob:`
      if (/connect-src\s+[^;]+/i.test(policy)) {
        policy = policy.replace(/connect-src\s+([^;]+)/i, (_connectMatch, sources) => {
          const values = String(sources).split(/\s+/).filter(Boolean)
          for (const source of ['data:', 'blob:']) {
            if (!values.includes(source)) values.push(source)
          }
          return `connect-src ${values.join(' ')}`
        })
      } else {
        policy = `${policy}; connect-src 'self' data: blob:`
      }
      return `${prefix}${policy}${suffix}`
    })
  if (!html.includes('__UNU_GAME_EXPORT__')) {
    html = html.replace(
      /<head([^>]*)>/i,
      `<head$1>\n    <script>window.__UNU_GAME_EXPORT__ = true;</script>`
    )
  }
  await fs.writeFile(indexPath, html, 'utf-8')
}

async function writeNormalizedExportProjectFile(projectRoot: string, outputDir: string, projectName: string) {
  const sourceProjectFile = path.join(projectRoot, 'project.json')
  const outputProjectFile = path.join(outputDir, 'project.json')
  let parsed: Record<string, any> = {}
  try {
    const raw = await fs.readFile(sourceProjectFile, 'utf-8')
    const json = JSON.parse(raw)
    if (json && typeof json === 'object') parsed = json
  } catch {
    parsed = {}
  }

  const sceneFiles = await collectSceneFileNames(outputDir)
  const catalog = sceneFiles.map((file) => ({ file, name: parseSceneBaseName(file) }))
  const previousStartup = normalizeExportSceneFileReference(parsed.startupScene)
  const startupScene =
    sceneFiles.find((file) => file.toLowerCase() === previousStartup.toLowerCase()) ||
    sceneFiles[0] ||
    ''

  const payload = {
    ...parsed,
    format: 'unu-project',
    version: 1,
    name: String(parsed.name || projectName || '').trim() || projectName,
    sceneCatalogVersion: 1,
    sceneCatalog: catalog,
    startupScene
  }
  await fs.writeFile(outputProjectFile, JSON.stringify(payload, null, 2), 'utf-8')
  return { sceneCatalog: catalog, startupScene }
}

async function writeSceneSnapshotFiles(projectRoot: string, sceneFiles?: Array<{ fileName?: string; content: string }>) {
  const files = Array.isArray(sceneFiles) ? sceneFiles : []
  if (!files.length) return { written: 0, fileNames: [] as string[] }
  const scenesDir = path.join(projectRoot, 'scenes')
  await fs.mkdir(scenesDir, { recursive: true })
  const usedNames = new Set<string>()
  const fileNames: string[] = []
  for (const file of files) {
    const rawName = sanitizeSceneFileName(file.fileName)
    let candidate = rawName
    let index = 2
    while (usedNames.has(candidate.toLowerCase())) {
      candidate = rawName.replace(/\.scene\.json$/i, `_${index}.scene.json`)
      index += 1
    }
    usedNames.add(candidate.toLowerCase())
    await fs.writeFile(path.join(scenesDir, candidate), String(file.content || ''), 'utf-8')
    fileNames.push(candidate)
  }
  return { written: fileNames.length, fileNames }
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

async function collectSceneFileNames(projectRoot: string) {
  const scenesDir = path.join(projectRoot, 'scenes')
  try {
    const files: string[] = []
    const visit = async (currentDir: string) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        if (entry.isDirectory()) {
          await visit(fullPath)
        } else if (entry.isFile() && entry.name.endsWith('.scene.json')) {
          files.push(normalizePath(path.relative(scenesDir, fullPath)))
        }
      }
    }
    await visit(scenesDir)
    return files
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

function parseSceneBaseName(fileName: string) {
  return path.basename(fileName).replace(/\.scene\.json$/i, '')
}

async function validateRuntimeAssets(outputDir: string) {
  const candidates = [
    'assets/scripts/ScriptRuntime.ts',
    'assets/scripts/InputState.ts',
    'assets/scripts/AudioRuntime.ts'
  ]
  let checked = 0
  const missing: string[] = []
  for (const relativePath of candidates) {
    checked += 1
    try {
      await fs.access(path.join(outputDir, relativePath))
    } catch {
      missing.push(relativePath)
    }
  }
  return { checked, missing }
}

function normalizePath(input: string) {
  return input.replace(/\\/g, '/')
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

function normalizeExportSceneFileReference(value: unknown) {
  const raw = String(value || '').replace(/\\/g, '/').trim()
  if (!raw) return ''
  const withoutPrefix = raw.replace(/^\.?\//, '').replace(/^scenes\//i, '')
  return withoutPrefix.split('/').filter(Boolean).pop() || withoutPrefix
}

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
