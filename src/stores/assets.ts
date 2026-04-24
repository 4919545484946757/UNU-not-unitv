import { defineStore } from 'pinia'
import { AssetDatabase } from '../engine/assets/AssetDatabase'
import { createFallbackProject } from '../engine/project/projectFallback'
import { serializeScene } from '../engine/serialization/sceneSerializer'
import type { AssetNode } from '../engine/assets/types'
import { useProjectStore } from './project'

const fallbackProject = createFallbackProject()
const fallbackDatabase = new AssetDatabase(fallbackProject.tree)

function buildProjectHealthMessage(
  result: {
    name?: string
    sceneCatalogRepaired?: boolean
    sceneCount?: number
    sceneCreatedByReference?: number
    assetIntegrityRepaired?: boolean
    normalizedSceneFiles?: number
    copiedAssets?: number
    unresolvedAssets?: number
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
    const normalized = Number(result.normalizedSceneFiles || 0)
    const copied = Number(result.copiedAssets || 0)
    suffixes.push(`资源引用已修复（路径规范 ${normalized}，补齐素材 ${copied}）`)
  }
  const unresolved = Number(result.unresolvedAssets || 0)
  if (unresolved > 0) suffixes.push(`仍有 ${unresolved} 个资源引用未解析`)
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
    expandedPaths: { assets: true, scenes: true, prefabs: true } as Record<string, boolean>
  }),
  getters: {
    browserItems(state) {
      return state.flat.find((node) => node.path === state.selectedPath)?.children ?? []
    },
    selectedAsset(state) {
      return state.flat.find((node) => node.path === state.selectedAssetPath) ?? null
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


