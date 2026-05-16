import { afterEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs/promises'
import path from 'node:path'
import { createExportGameHandler, createExportReport, validateExportOutput } from '../electron/services/exportGame'

const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
})

async function makeTempExportDir() {
  const dir = await fs.mkdtemp(path.join(process.cwd(), 'tests/.tmp-export-'))
  tempRoots.push(dir)
  return dir
}

describe('exportGame service', () => {
  it('creates a stable export report shape', () => {
    const report = createExportReport({
      exportedAt: '2026-05-16T00:00:00.000Z',
      projectName: 'Demo',
      projectRoot: 'C:/demo',
      outputDir: 'C:/out/Demo-web-20260516-000000',
      indexPath: 'C:/out/Demo-web-20260516-000000/index.html',
      launchScript: 'C:/out/Demo-web-20260516-000000/PLAY_GAME.bat',
      sceneCount: 1,
      startupScene: 'MainScene.scene.json',
      sceneCatalog: [{ file: 'MainScene.scene.json', name: 'MainScene' }],
      sceneSnapshotWritten: 0,
      sceneSnapshotFiles: [],
      assetCount: 3,
      integrity: {
        repaired: false,
        normalizedSceneFiles: 0,
        normalizedFiles: 0,
        copiedAssets: 0,
        relinkedAssets: 0,
        relinkedFiles: 0,
        checkedAssetRefs: 3,
        resolvedAssets: 3,
        unresolvedAssets: 0,
        unresolvedRefs: []
      }
    })

    expect(report).toMatchObject({
      format: 'unu-web-export',
      version: 1,
      exportedAt: '2026-05-16T00:00:00.000Z',
      projectName: 'Demo',
      sceneCount: 1,
      startupScene: 'MainScene.scene.json',
      assetIntegrityRepaired: false,
      unresolvedAssets: 0
    })
    expect(report.sceneCatalog).toEqual([{ file: 'MainScene.scene.json', name: 'MainScene' }])
  })

  it('validates required Web export files and startup scene', async () => {
    const outputDir = await makeTempExportDir()
    await fs.mkdir(path.join(outputDir, 'scenes'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(outputDir, 'index.html'), '<!doctype html>'),
      fs.writeFile(path.join(outputDir, 'project.json'), '{}'),
      fs.writeFile(path.join(outputDir, 'PLAY_GAME.bat'), '@echo off'),
      fs.writeFile(path.join(outputDir, 'PLAY_GAME.ps1'), ''),
      fs.writeFile(path.join(outputDir, 'EXPORT_README.md'), '# Export'),
      fs.writeFile(path.join(outputDir, 'export-report.json'), '{}'),
      fs.writeFile(path.join(outputDir, 'scenes/MainScene.scene.json'), '{}')
    ])

    await expect(validateExportOutput(outputDir, { startupScene: 'MainScene.scene.json' })).resolves.toEqual({
      ok: true,
      checked: 7
    })
  })

  it('fails validation when the launch script is missing', async () => {
    const outputDir = await makeTempExportDir()
    await fs.mkdir(path.join(outputDir, 'scenes'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(outputDir, 'index.html'), '<!doctype html>'),
      fs.writeFile(path.join(outputDir, 'project.json'), '{}'),
      fs.writeFile(path.join(outputDir, 'PLAY_GAME.ps1'), ''),
      fs.writeFile(path.join(outputDir, 'EXPORT_README.md'), '# Export'),
      fs.writeFile(path.join(outputDir, 'export-report.json'), '{}'),
      fs.writeFile(path.join(outputDir, 'scenes/MainScene.scene.json'), '{}')
    ])

    await expect(validateExportOutput(outputDir, { startupScene: 'MainScene.scene.json' })).rejects.toThrow('PLAY_GAME.bat')
  })

  it('exports a Web game folder with copied assets and launch files', async () => {
    const workspace = await makeTempExportDir()
    const projectRoot = path.join(workspace, 'project')
    const distRoot = path.join(workspace, 'dist')
    const outputParent = path.join(workspace, 'out')
    await fs.mkdir(path.join(projectRoot, 'assets'), { recursive: true })
    await fs.mkdir(path.join(projectRoot, 'scenes'), { recursive: true })
    await fs.mkdir(distRoot, { recursive: true })
    await fs.writeFile(path.join(distRoot, 'index.html'), '<html><head><title>UNU</title></head><body><script src="/assets/index.js"></script></body></html>')
    await fs.writeFile(path.join(projectRoot, 'assets/texture.txt'), 'asset')
    await fs.writeFile(path.join(projectRoot, 'scenes/MainScene.scene.json'), '{}')
    await fs.writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({
      format: 'unu-project',
      name: 'Demo',
      startupScene: 'MainScene.scene.json'
    }))

    const handler = createExportGameHandler({
      resolveProjectRootPath: async (root) => root,
      exists: async (target) => fs.access(target).then(() => true, () => false),
      ensureProjectStructure: async () => undefined,
      ensureProjectRuntimeScriptFiles: async () => undefined,
      reconcileProjectSceneCatalog: async () => ({ sceneCount: 1, startupScene: 'MainScene.scene.json' }),
      ensureProjectAssetIntegrity: async () => ({
        repaired: false,
        normalizedSceneFiles: 0,
        normalizedFiles: 0,
        copiedAssets: 0,
        relinkedAssets: 0,
        relinkedFiles: 0,
        checkedAssetRefs: 1,
        resolvedAssets: 1,
        unresolvedAssets: 0,
        unresolvedRefs: []
      }),
      chooseOutputDirectory: async () => outputParent,
      resolveWebDistRoot: async () => distRoot,
      copyIfExists: async (from, to) => {
        await fs.access(from).catch(() => null)
        const sourceExists = await fs.access(from).then(() => true, () => false)
        if (!sourceExists) return
        await fs.cp(from, to, { recursive: true, force: true })
      },
      now: () => new Date('2026-05-16T12:34:56.000Z')
    })

    const result = await handler({ projectRoot, projectName: 'Demo' })

    expect(result?.ok).toBe(true)
    expect(path.basename(result!.outputDir)).toMatch(/^Demo-web-20260516-\d{6}$/)
    await expect(fs.access(path.join(result!.outputDir, 'assets/texture.txt'))).resolves.toBeUndefined()
    await expect(fs.access(path.join(result!.outputDir, 'PLAY_GAME.bat'))).resolves.toBeUndefined()
    const report = JSON.parse(await fs.readFile(path.join(result!.outputDir, 'export-report.json'), 'utf-8'))
    expect(report).toMatchObject({
      format: 'unu-web-export',
      projectName: 'Demo',
      startupScene: 'MainScene.scene.json',
      assetCount: 1,
      unresolvedAssets: 0
    })
  })
})
