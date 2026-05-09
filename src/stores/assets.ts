import { defineStore } from 'pinia'
import { AssetDatabase } from '../engine/assets/AssetDatabase'
import { createFallbackProject } from '../engine/project/projectFallback'
import { serializeScene } from '../engine/serialization/sceneSerializer'
import type { AssetNode } from '../engine/assets/types'
import { useProjectStore } from './project'

const fallbackProject = createFallbackProject()
const fallbackDatabase = new AssetDatabase(fallbackProject.tree)

type AssetFileHistoryEntry =
  | { type: 'create' | 'copy'; path: string; trashPath?: string }
  | { type: 'delete'; path: string; trashPath: string }
  | { type: 'move'; from: string; to: string }
  | { type: 'rename'; from: string; to: string }

function buildProjectHealthMessage(
  result: {
    name?: string
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
    unresolvedRefs?: Array<{ sourceFile: string; keyPath: string; ref: string }>
  },
  base: string
) {
  const suffixes: string[] = []
  if (result.sceneCatalogRepaired) {
    const sceneBase = `场景目录已修复（${result.sceneCount ?? 0}）`
    const created = Number(result.sceneCreatedByReference || 0)
    suffixes.push(created > 0 ? `${sceneBase}，补全场景 ${created} 个` : sceneBase)
  }
  if (result.assetIntegrityRepaired) {
    const normalized = Number(result.normalizedFiles ?? result.normalizedSceneFiles ?? 0)
    const copied = Number(result.copiedAssets || 0)
    const relinked = Number(result.relinkedAssets || 0)
    suffixes.push(`资源引用已修复（路径规范 ${normalized}，补齐素材 ${copied}，重定向 ${relinked}）`)
  }
  const checked = Number(result.checkedAssetRefs || 0)
  const resolved = Number(result.resolvedAssets || 0)
  if (checked > 0 && !result.assetIntegrityRepaired) suffixes.push(`资源依赖检查 ${resolved}/${checked}`)
  const unresolved = Number(result.unresolvedAssets || 0)
  if (unresolved > 0) {
    const first = result.unresolvedRefs?.[0]
    const hint = first ? `，例如 ${first.ref}` : ''
    suffixes.push(`仍有 ${unresolved} 个资源引用未解析${hint}`)
  }
  return suffixes.length ? `${base}（${suffixes.join('；')}）` : base
}

export const useAssetStore = defineStore('assets', {
  state: () => ({
    tree: fallbackDatabase.getRoots() as AssetNode[],
    selectedPath: 'assets',
    selectedAssetPath: '' as string,
    flat: fallbackDatabase.flatten() as AssetNode[],
    previews: {} as Record<string, string>,
    imageSizes: {} as Record<string, { width: number; height: number }>,
    expandedPaths: { assets: true, scenes: true, prefabs: true } as Record<string, boolean>,
    fileUndoStack: [] as AssetFileHistoryEntry[],
    fileRedoStack: [] as AssetFileHistoryEntry[],
    isRestoringFileHistory: false
  }),
  getters: {
    browserItems(state) {
      return state.flat.find((node) => node.path === state.selectedPath)?.children ?? []
    },
    selectedAsset(state) {
      return state.flat.find((node) => node.path === state.selectedAssetPath) ?? null
    },
    canUndoFileOperation(state) {
      return state.fileUndoStack.length > 0
    },
    canRedoFileOperation(state) {
      return state.fileRedoStack.length > 0
    }
  },
  actions: {
    hydrateTree(tree: AssetNode[]) {
      const database = new AssetDatabase(tree)
      this.tree = database.getRoots()
      this.flat = database.flatten()
      const firstPath = this.tree[0]?.path ?? ''
      this.selectedPath = this.flat.some((node) => node.path === this.selectedPath) ? this.selectedPath : firstPath
      this.selectedAssetPath = this.flat.some((node) => node.path === this.selectedAssetPath) ? this.selectedAssetPath : ''
      for (const node of this.tree) {
        if (node.type === 'folder') this.expandedPaths[node.path] = this.expandedPaths[node.path] ?? true
      }
      this.ensureExpandedTo(this.selectedPath)
      if (this.selectedAssetPath) this.ensureExpandedTo(this.selectedAssetPath)
    },
    selectPath(path: string) {
      this.selectedPath = path
      this.ensureExpandedTo(path)
    },
    async selectAsset(path: string) {
      this.selectedAssetPath = path
      this.ensureExpandedTo(path)
      const target = this.flat.find((node) => node.path === path)
      if (target?.type === 'image') {
        await this.ensurePreview(path)
      }
    },

    isFolderExpanded(path: string) {
      return this.expandedPaths[path] ?? true
    },
    setFolderExpanded(path: string, expanded: boolean) {
      this.expandedPaths[path] = expanded
    },
    toggleFolder(path: string) {
      this.expandedPaths[path] = !(this.expandedPaths[path] ?? true)
    },
    ensureExpandedTo(path: string) {
      const target = this.flat.find((node) => node.path === path)
      if (!target) return
      let cursor = target
      while (cursor?.parentId) {
        const parent = this.flat.find((node) => node.id === cursor.parentId)
        if (!parent) break
        this.expandedPaths[parent.path] = true
        cursor = parent
      }
    },
    async ensurePreview(path: string) {
      if (this.previews[path]) return this.previews[path]
      const project = useProjectStore()
      if (window.unu?.readAssetDataUrl && project.rootPath && project.rootPath !== 'sample-project') {
        const result = await window.unu.readAssetDataUrl({ projectRoot: project.rootPath, relativePath: path })
        if (result?.dataUrl) {
          this.previews[path] = result.dataUrl
          return result.dataUrl
        }
      }
      this.previews[path] = ''
      return ''
    },

    async ensureImageSize(path: string) {
      if (this.imageSizes[path]) return this.imageSizes[path]
      const dataUrl = this.previews[path] || await this.ensurePreview(path)
      if (!dataUrl) return null
      const size = await new Promise<{ width: number; height: number } | null>((resolve) => {
        const image = new Image()
        image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height })
        image.onerror = () => resolve(null)
        image.src = dataUrl
      })
      if (size) this.imageSizes[path] = size
      return size
    },
    pushFileHistory(entry: AssetFileHistoryEntry) {
      if (this.isRestoringFileHistory) return
      this.fileUndoStack.push(entry)
      if (this.fileUndoStack.length > 80) this.fileUndoStack.shift()
      this.fileRedoStack = []
    },
    clearFileHistory() {
      this.fileUndoStack = []
      this.fileRedoStack = []
      this.isRestoringFileHistory = false
    },
    async refreshAfterFileHistory(pathHint = '') {
      await this.refreshProject()
      const target = pathHint ? this.flat.find((node) => node.path === pathHint) : null
      if (target?.type === 'folder') this.selectPath(target.path)
      else if (target) await this.selectAsset(target.path)
      else {
        const parent = pathHint.split('/').slice(0, -1).join('/')
        if (parent && this.flat.some((node) => node.path === parent && node.type === 'folder')) this.selectPath(parent)
      }
    },
    async deleteAssetForHistory(relativePath: string) {
      const project = useProjectStore()
      if (!window.unu?.deleteAsset || !project.rootPath || project.rootPath === 'sample-project') return null
      const result = await window.unu.deleteAsset({ projectRoot: project.rootPath, relativePath })
      if (!result?.ok || !result.trashRelativePath) {
        throw new Error(result?.error || '删除资源失败：未返回可恢复路径。')
      }
      delete this.previews[relativePath]
      delete this.imageSizes[relativePath]
      return result.trashRelativePath
    },
    async restoreAssetForHistory(trashPath: string, restorePath: string) {
      const project = useProjectStore()
      if (!window.unu?.restoreDeletedAsset || !project.rootPath || project.rootPath === 'sample-project') return null
      return window.unu.restoreDeletedAsset({
        projectRoot: project.rootPath,
        trashRelativePath: trashPath,
        restoreRelativePath: restorePath
      })
    },
    async undoFileOperation() {
      const project = useProjectStore()
      const entry = this.fileUndoStack.pop()
      if (!entry) {
        project.setStatus('没有可撤回的文件操作')
        return false
      }
      this.isRestoringFileHistory = true
      try {
        if (entry.type === 'create' || entry.type === 'copy') {
          entry.trashPath = await this.deleteAssetForHistory(entry.path) || entry.trashPath
          await this.refreshAfterFileHistory(entry.path)
          project.setStatus(`已撤回文件${entry.type === 'create' ? '新建' : '复制'}：${entry.path}`)
        } else if (entry.type === 'delete') {
          await this.restoreAssetForHistory(entry.trashPath, entry.path)
          await this.refreshAfterFileHistory(entry.path)
          project.setStatus(`已撤回文件删除：${entry.path}`)
        } else if (entry.type === 'move') {
          const parent = entry.from.split('/').slice(0, -1).join('/')
          await window.unu?.moveAsset?.({ projectRoot: project.rootPath, relativePath: entry.to, targetFolderPath: parent })
          await this.refreshAfterFileHistory(entry.from)
          project.setStatus(`已撤回文件移动：${entry.to} -> ${entry.from}`)
        } else if (entry.type === 'rename') {
          await window.unu?.renameAsset?.({
            projectRoot: project.rootPath,
            relativePath: entry.to,
            nextName: entry.from.split('/').pop() || entry.from
          })
          await this.refreshAfterFileHistory(entry.from)
          project.setStatus(`已撤回文件重命名：${entry.to} -> ${entry.from}`)
        }
        this.fileRedoStack.push(entry)
        return true
      } catch (error) {
        this.fileUndoStack.push(entry)
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`撤回文件操作失败：${message}`)
        return false
      } finally {
        this.isRestoringFileHistory = false
      }
    },
    async redoFileOperation() {
      const project = useProjectStore()
      const entry = this.fileRedoStack.pop()
      if (!entry) {
        project.setStatus('没有可恢复的文件操作')
        return false
      }
      this.isRestoringFileHistory = true
      try {
        if (entry.type === 'create' || entry.type === 'copy') {
          if (!entry.trashPath) throw new Error('缺少可恢复的临时文件。')
          await this.restoreAssetForHistory(entry.trashPath, entry.path)
          entry.trashPath = undefined
          await this.refreshAfterFileHistory(entry.path)
          project.setStatus(`已恢复文件${entry.type === 'create' ? '新建' : '复制'}：${entry.path}`)
        } else if (entry.type === 'delete') {
          entry.trashPath = await this.deleteAssetForHistory(entry.path) || entry.trashPath
          await this.refreshAfterFileHistory(entry.path)
          project.setStatus(`已恢复文件删除：${entry.path}`)
        } else if (entry.type === 'move') {
          const parent = entry.to.split('/').slice(0, -1).join('/')
          await window.unu?.moveAsset?.({ projectRoot: project.rootPath, relativePath: entry.from, targetFolderPath: parent })
          await this.refreshAfterFileHistory(entry.to)
          project.setStatus(`已恢复文件移动：${entry.from} -> ${entry.to}`)
        } else if (entry.type === 'rename') {
          await window.unu?.renameAsset?.({
            projectRoot: project.rootPath,
            relativePath: entry.from,
            nextName: entry.to.split('/').pop() || entry.to
          })
          await this.refreshAfterFileHistory(entry.to)
          project.setStatus(`已恢复文件重命名：${entry.from} -> ${entry.to}`)
        }
        this.fileUndoStack.push(entry)
        return true
      } catch (error) {
        this.fileRedoStack.push(entry)
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`恢复文件操作失败：${message}`)
        return false
      } finally {
        this.isRestoringFileHistory = false
      }
    },
    async createProject() {
      const project = useProjectStore()
      const { useSceneStore } = await import('./scene')
      const scene = useSceneStore()
      if (!scene.confirmDiscardUnsaved('新建项目')) {
        project.setStatus('已取消新建项目。')
        return
      }
      if (!window.unu?.createProject || !window.unu?.scanProject) {
        project.setStatus('当前环境未接入新建工程接口，请使用桌面版运行。')
        return
      }
      const created = await window.unu.createProject()
      if (!created) {
        project.setStatus('已取消新建工程。')
        return
      }
      const result = await window.unu.scanProject(created.rootPath)
      project.setProject({ rootPath: result.rootPath, name: result.name })
      this.hydrateTree(result.tree)
      this.clearFileHistory()
      this.selectedPath = 'assets'
      scene.createNewScene('MainScene', true)
      project.setStatus(buildProjectHealthMessage(result, `已新建工程：${result.name}`))
    },
    async openProjectFolder() {
      const project = useProjectStore()
      const { useSceneStore } = await import('./scene')
      const scene = useSceneStore()
      if (!scene.confirmDiscardUnsaved('切换工程')) {
        project.setStatus('已取消切换工程。')
        return
      }

      if (!window.unu?.pickProjectFolder || !window.unu?.scanProject) {
        project.setProject({ rootPath: fallbackProject.rootPath, name: fallbackProject.name })
        this.hydrateTree(fallbackProject.tree)
        return
      }

      const picked = await window.unu.pickProjectFolder()
      if (!picked) {
        project.setStatus('已取消打开工程。')
        return
      }
      const result = await window.unu.scanProject(picked.rootPath)
      this.hydrateTree(result.tree)
      this.clearFileHistory()
      project.setProject({ rootPath: result.rootPath, name: result.name })
      project.setStatus(buildProjectHealthMessage(result, `已打开工程：${result.name}`))
    },
    async saveProjectAs() {
      const project = useProjectStore()
      const { useSceneStore } = await import('./scene')
      const scene = useSceneStore()
      if (!window.unu?.saveProjectAs || !window.unu?.scanProject) {
        project.setStatus('当前环境未接入项目另存接口，请使用桌面版运行。')
        return
      }
      const currentScene = scene.currentScene
      const sceneFiles = scene.scenes.length > 0
        ? scene.scenes.map((sceneItem) => ({
            fileName: `${sceneItem.name}.scene.json`,
            content: serializeScene(sceneItem)
          }))
        : (currentScene ? [{
            fileName: `${currentScene.name}.scene.json`,
            content: serializeScene(currentScene)
          }] : [])
      const saved = await window.unu.saveProjectAs({
        sourceProjectRoot: project.rootPath,
        projectName: project.name,
        currentSceneContent: currentScene ? serializeScene(currentScene) : undefined,
        currentSceneName: currentScene ? `${currentScene.name}.scene.json` : undefined,
        sceneFiles
      })
      if (!saved) {
        project.setStatus('已取消项目另存。')
        return
      }

      const scanned = await window.unu.scanProject(saved.rootPath)
      this.hydrateTree(scanned.tree)
      this.clearFileHistory()
      this.selectedPath = 'assets'
      project.setProject({ rootPath: scanned.rootPath, name: scanned.name })
      if (saved.sceneFilePath) project.setSceneFile(saved.sceneFilePath)
      project.setStatus(
        buildProjectHealthMessage(
          scanned,
          saved.fromSample ? `示例项目已另存为：${scanned.rootPath}` : `项目已另存为：${scanned.rootPath}`
        )
      )
    },
    async refreshProject() {
      const project = useProjectStore()
      if (!project.rootPath || !window.unu?.scanProject) return
      const result = await window.unu.scanProject(project.rootPath)
      this.hydrateTree(result.tree)
      project.setStatus(buildProjectHealthMessage(result, `工程已刷新：${result.name}`))
    },
    async checkAssetIntegrity() {
      const project = useProjectStore()
      if (!window.unu?.checkAssetIntegrity) {
        project.setStatus('当前环境未接入资源依赖检查接口，请使用桌面版运行。')
        return
      }
      if (!project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('请先打开或另存为本地项目，再检查资源依赖。')
        return
      }
      project.setStatus('正在检查并修复资源依赖...')
      const result = await window.unu.checkAssetIntegrity({ projectRoot: project.rootPath })
      this.hydrateTree(result.tree)
      project.setStatus(buildProjectHealthMessage(result, `资源依赖检查完成：${result.name}`))
    },
    async exportGame() {
      const project = useProjectStore()
      if (!window.unu?.exportGame) {
        project.setStatus('当前环境未接入游戏导出接口，请使用桌面版运行。')
        return
      }
      if (!project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('请先打开或另存为本地项目，再导出游戏。')
        return
      }

      project.setStatus('正在导出 Web 游戏...')
      const result = await window.unu.exportGame({
        projectRoot: project.rootPath,
        projectName: project.name
      })
      if (!result) {
        project.setStatus('已取消导出 Web 游戏。')
        return
      }
      if (!result.ok) {
        project.setStatus(`导出 Web 游戏失败：${result.error || '未知错误'}`)
        return
      }
      project.setStatus(
        `Web 游戏已导出：${result.outputDir}（场景 ${result.sceneCount ?? 0}，资源 ${result.assetCount ?? 0}）`
      )
    },
    async importImages() {
      const project = useProjectStore()
      try {
        if (!window.unu?.importImages) {
          project.setStatus('当前环境未接入 Electron 导入接口，请使用桌面版运行。')
          return
        }

        if (!project.rootPath || project.rootPath === 'sample-project') {
          project.setStatus('请先选择一个本地工程目录，再导入图片。')
          if (window.unu?.pickProjectFolder && window.unu?.scanProject) {
            const picked = await window.unu.pickProjectFolder()
            if (!picked) {
              project.setStatus('已取消选择工程目录，未导入图片。')
              return
            }
            const scanned = await window.unu.scanProject(picked.rootPath)
            project.setProject({ rootPath: scanned.rootPath, name: scanned.name })
            this.hydrateTree(scanned.tree)
          } else {
            return
          }
        }

        const result = await window.unu.importImages({ projectRoot: project.rootPath })
        if (!result?.imported?.length) {
          project.setStatus('已取消导入图片。')
          return
        }

        await this.refreshProject()
        project.setStatus(`已导入图片 ${result.imported.length} 张`)
        const first = result.imported[0]?.relativePath
        if (first) {
          this.selectedPath = 'assets/images'
          await this.selectAsset(first)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`导入图片失败：${message}`)
        console.error('[UNU] importImages failed', error)
      }
    },
    async importAudios() {
      const project = useProjectStore()
      try {
        if (!window.unu?.importAudios) {
          project.setStatus('当前环境未接入 Electron 导入接口，请使用桌面版运行。')
          return
        }

        if (!project.rootPath || project.rootPath === 'sample-project') {
          project.setStatus('请先选择一个本地工程目录，再导入音频。')
          if (window.unu?.pickProjectFolder && window.unu?.scanProject) {
            const picked = await window.unu.pickProjectFolder()
            if (!picked) {
              project.setStatus('已取消选择工程目录，未导入音频。')
              return
            }
            const scanned = await window.unu.scanProject(picked.rootPath)
            project.setProject({ rootPath: scanned.rootPath, name: scanned.name })
            this.hydrateTree(scanned.tree)
          } else {
            return
          }
        }

        const result = await window.unu.importAudios({ projectRoot: project.rootPath })
        if (!result?.imported?.length) {
          project.setStatus('已取消导入音频。')
          return
        }

        await this.refreshProject()
        project.setStatus(`已导入音频 ${result.imported.length} 条`)
        const first = result.imported[0]?.relativePath
        if (first) {
          this.selectedPath = 'assets/audio'
          await this.selectAsset(first)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`导入音频失败：${message}`)
        console.error('[UNU] importAudios failed', error)
      }
    },
    async createTextAssetInFolder(folderPath: string, fileName?: string) {
      const project = useProjectStore()
      if (!window.unu?.createTextAssetInFolder) {
        project.setStatus('当前环境未接入新建文件接口，请使用桌面版运行。')
        return null
      }
      if (!project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('请先打开或另存为本地项目，再新建文件。')
        return null
      }
      try {
        const result = await window.unu.createTextAssetInFolder({
          projectRoot: project.rootPath,
          folderPath,
          fileName,
          content: ''
        })
        if (!result?.relativePath) {
          project.setStatus('新建文件失败：未返回文件路径。')
          return null
        }
        await this.refreshProject()
        this.setFolderExpanded(folderPath, true)
        await this.selectAsset(result.relativePath)
        this.pushFileHistory({ type: 'create', path: result.relativePath })
        project.setStatus(`已新建文件：${result.relativePath}`)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`新建文件失败：${message}`)
        return null
      }
    },
    async createFolderInFolder(folderPath: string, folderName?: string) {
      const project = useProjectStore()
      if (!window.unu?.createAssetFolder) {
        project.setStatus('当前环境未接入新建文件夹接口，请使用桌面版运行。')
        return null
      }
      if (!project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('请先打开或另存为本地项目，再新建文件夹。')
        return null
      }
      try {
        const result = await window.unu.createAssetFolder({
          projectRoot: project.rootPath,
          folderPath,
          folderName
        })
        if (!result?.relativePath) {
          project.setStatus('新建文件夹失败：未返回文件夹路径。')
          return null
        }
        await this.refreshProject()
        this.setFolderExpanded(folderPath, true)
        this.selectPath(result.relativePath)
        this.pushFileHistory({ type: 'create', path: result.relativePath })
        project.setStatus(`已新建文件夹：${result.relativePath}`)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`新建文件夹失败：${message}`)
        return null
      }
    },
    async renameAsset(relativePath: string, nextName: string) {
      const project = useProjectStore()
      if (!window.unu?.renameAsset) {
        project.setStatus('当前环境未接入资源重命名接口，请使用桌面版运行。')
        return null
      }
      if (!project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('请先打开或另存为本地项目，再重命名资源。')
        return null
      }
      try {
        const result = await window.unu.renameAsset({
          projectRoot: project.rootPath,
          relativePath,
          nextName
        })
        if (!result?.relativePath) {
          project.setStatus('重命名失败：未返回资源路径。')
          return null
        }
        const parent = result.relativePath.split('/').slice(0, -1).join('/')
        await this.refreshProject()
        if (parent) this.setFolderExpanded(parent, true)
        const target = this.flat.find((node) => node.path === result.relativePath)
        if (target?.type === 'folder') this.selectPath(result.relativePath)
        else await this.selectAsset(result.relativePath)
        if (relativePath !== result.relativePath) {
          this.pushFileHistory({ type: 'rename', from: relativePath, to: result.relativePath })
        }
        project.setStatus(`已重命名资源：${result.relativePath}${Number(result.relinkedFiles || 0) > 0 ? `（已同步引用 ${result.relinkedFiles} 个文件）` : ''}`)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`重命名资源失败：${message}`)
        return null
      }
    },
    async copyAsset(relativePath: string) {
      const project = useProjectStore()
      if (!window.unu?.copyAsset) {
        project.setStatus('当前环境未接入资源复制接口，请使用桌面版运行。')
        return null
      }
      if (!project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('请先打开或另存为本地项目，再复制资源。')
        return null
      }
      try {
        const result = await window.unu.copyAsset({ projectRoot: project.rootPath, relativePath })
        if (!result?.relativePath) {
          project.setStatus('复制资源失败：未返回资源路径。')
          return null
        }
        const parent = result.relativePath.split('/').slice(0, -1).join('/')
        await this.refreshProject()
        if (parent) this.setFolderExpanded(parent, true)
        const target = this.flat.find((node) => node.path === result.relativePath)
        if (target?.type === 'folder') this.selectPath(result.relativePath)
        else await this.selectAsset(result.relativePath)
        this.pushFileHistory({ type: 'copy', path: result.relativePath })
        project.setStatus(`已复制资源：${result.relativePath}`)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`复制资源失败：${message}`)
        return null
      }
    },
    async deleteAsset(relativePath: string) {
      const project = useProjectStore()
      if (!window.unu?.deleteAsset) {
        project.setStatus('当前环境未接入资源删除接口，请使用桌面版运行。')
        return null
      }
      if (!project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('请先打开或另存为本地项目，再删除资源。')
        return null
      }
      try {
        const parent = relativePath.split('/').slice(0, -1).join('/') || 'assets'
        const result = await window.unu.deleteAsset({ projectRoot: project.rootPath, relativePath })
        if (!result?.ok || !result.trashRelativePath) {
          project.setStatus(`删除资源失败：${result?.error || '未知错误'}`)
          return null
        }
        delete this.previews[relativePath]
        delete this.imageSizes[relativePath]
        await this.refreshProject()
        if (this.flat.some((node) => node.path === parent && node.type === 'folder')) this.selectPath(parent)
        this.pushFileHistory({ type: 'delete', path: relativePath, trashPath: result.trashRelativePath })
        project.setStatus(`已删除资源：${relativePath}`)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`删除资源失败：${message}`)
        return null
      }
    },
    async moveAsset(relativePath: string, targetFolderPath: string) {
      const project = useProjectStore()
      if (!window.unu?.moveAsset) {
        project.setStatus('当前环境未接入资源移动接口，请使用桌面版运行。')
        return null
      }
      if (!project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('请先打开或另存为本地项目，再移动资源。')
        return null
      }
      if (!relativePath || !targetFolderPath || relativePath === targetFolderPath) return null
      try {
        const result = await window.unu.moveAsset({
          projectRoot: project.rootPath,
          relativePath,
          targetFolderPath
        })
        if (!result?.relativePath) {
          project.setStatus('移动资源失败：未返回资源路径。')
          return null
        }
        const oldPreview = this.previews[relativePath]
        const oldSize = this.imageSizes[relativePath]
        delete this.previews[relativePath]
        delete this.imageSizes[relativePath]
        if (oldPreview) this.previews[result.relativePath] = oldPreview
        if (oldSize) this.imageSizes[result.relativePath] = oldSize
        await this.refreshProject()
        this.setFolderExpanded(targetFolderPath, true)
        const target = this.flat.find((node) => node.path === result.relativePath)
        if (target?.type === 'folder') this.selectPath(result.relativePath)
        else await this.selectAsset(result.relativePath)
        if (relativePath !== result.relativePath) {
          this.pushFileHistory({ type: 'move', from: relativePath, to: result.relativePath })
        }
        project.setStatus(`已移动资源：${relativePath} -> ${targetFolderPath}${Number(result.relinkedFiles || 0) > 0 ? `（已同步引用 ${result.relinkedFiles} 个文件）` : ''}`)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`移动资源失败：${message}`)
        return null
      }
    },
    async revealInFolder(path: string, isDirectory = false) {
      const project = useProjectStore()
      if (!window.unu?.revealInFolder) {
        project.setStatus('当前环境未接入“打开文件目录”接口，请使用桌面版运行。')
        return
      }
      if (!project.rootPath || project.rootPath === 'sample-project') {
        project.setStatus('当前是示例工程，无法定位本地文件。')
        return
      }
      try {
        project.setStatus('正在打开文件管理器...')
        const result = await window.unu.revealInFolder({
          projectRoot: project.rootPath,
          relativePath: path,
          isDirectory
        })
        if (!result?.ok) {
          project.setStatus(`打开目录失败：${result?.error || '未知错误'}`)
          return
        }
        project.setStatus('已在文件管理器中打开对应位置。')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`打开目录失败：${message}`)
      }
    }
  }
})


