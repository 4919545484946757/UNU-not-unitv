<template>
  <main class="game-shell">
    <div ref="containerRef" class="game-canvas"></div>
    <div v-if="errorMessage" class="game-error">{{ errorMessage }}</div>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Scene } from '../../engine/core/Scene'
import { PixiRenderer } from '../../engine/renderer/PixiRenderer'
import { deserializeScene } from '../../engine/serialization/sceneSerializer'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'

const containerRef = ref<HTMLDivElement | null>(null)
const errorMessage = ref('')
const project = useProjectStore()
const runtime = useRuntimeStore()
const sceneStore = useSceneStore()
let renderer: PixiRenderer | null = null

type ExportProject = {
  name?: string
  startupScene?: string
  sceneCatalog?: Array<string | { file?: string; fileName?: string; path?: string; name?: string }>
}

type LoadedSceneEntry = {
  scene: Scene
  filePath: string
}

function installExportFileBridge() {
  if (window.unu) return
  window.unu = {
    version: 'export-web',
    readTextAsset: async ({ relativePath }) => {
      const response = await fetch(normalizeFetchPath(relativePath))
      if (!response.ok) throw new Error(`Failed to load ${relativePath}`)
      const content = await response.text()
      return { filePath: relativePath, name: relativePath.split('/').pop() || relativePath, relativePath, content }
    },
    readAssetDataUrl: async ({ relativePath }) => {
      const response = await fetch(normalizeFetchPath(relativePath))
      if (!response.ok) return null
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error(`Failed to read ${relativePath}`))
        reader.readAsDataURL(blob)
      })
      return { dataUrl }
    }
  }
}

function normalizeFetchPath(relativePath: string) {
  const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '')
  return `./${normalized}`
}

function normalizeSceneFileReference(value: unknown) {
  const raw = String(value || '').replace(/\\/g, '/').trim()
  if (!raw) return ''
  const withoutPrefix = raw.replace(/^\.?\//, '').replace(/^scenes\//i, '')
  return withoutPrefix.split('/').filter(Boolean).pop() || withoutPrefix
}

function getCatalogFile(item: NonNullable<ExportProject['sceneCatalog']>[number]) {
  if (typeof item === 'string') return normalizeSceneFileReference(item)
  return normalizeSceneFileReference(item.file || item.fileName || item.path || '')
}

function resolveStartupSceneFile(projectJson: ExportProject, sceneFiles: string[]) {
  const startupReference = normalizeSceneFileReference(projectJson.startupScene)
  if (!startupReference) return sceneFiles[0] || ''
  if (!sceneFiles.length) return startupReference
  const exact = sceneFiles.find((file) => file.toLowerCase() === startupReference.toLowerCase())
  if (exact) return exact
  const byName = (projectJson.sceneCatalog || []).find((item) => {
    if (typeof item === 'string') return false
    return String(item.name || '').trim().toLowerCase() === startupReference.toLowerCase()
  })
  return byName ? getCatalogFile(byName) : (sceneFiles[0] || '')
}

async function loadExportScenes() {
  const projectResponse = await fetch('./project.json')
  if (!projectResponse.ok) throw new Error('未找到导出的 project.json')
  const projectJson = await projectResponse.json() as ExportProject
  const catalogFiles = (projectJson.sceneCatalog || [])
    .map(getCatalogFile)
    .filter(Boolean)
  const startupScene = resolveStartupSceneFile(projectJson, catalogFiles)
  if (!startupScene) throw new Error('导出项目没有启动场景')
  const sceneFiles = Array.from(new Set(catalogFiles.length ? catalogFiles : [startupScene]))
  const entries: LoadedSceneEntry[] = []
  let startupSceneId = ''

  for (const fileName of sceneFiles) {
    const sceneResponse = await fetch(normalizeFetchPath(`scenes/${fileName}`))
    if (!sceneResponse.ok) throw new Error(`场景加载失败：${fileName}`)
    const sceneText = await sceneResponse.text()
    const scene = deserializeScene(sceneText)
    entries.push({ scene, filePath: `scenes/${fileName}` })
    if (fileName.toLowerCase() === startupScene.toLowerCase()) startupSceneId = scene.id
  }

  if (!entries.length) throw new Error('导出项目没有可加载的场景文件')
  if (!startupSceneId) startupSceneId = entries[0].scene.id

  return {
    projectName: String(projectJson.name || 'UNU Game'),
    entries,
    startupSceneId
  }
}

onMounted(async () => {
  if (!containerRef.value) return
  try {
    installExportFileBridge()
    const loaded = await loadExportScenes()
    project.setProject({ rootPath: '.', name: loaded.projectName })
    sceneStore.bootstrapSceneCollection(loaded.entries, loaded.startupSceneId)
    sceneStore.repairCurrentSceneComponents()

    renderer = new PixiRenderer({
      container: containerRef.value,
      onRuntimeSceneUpdated: (scene) => {
        if (scene) sceneStore.setRuntimeScene(scene)
      }
    })
    await renderer.init(sceneStore.currentScene)
    renderer.setGridVisible(false)
    renderer.setPlayDebugEnabled(false)
    runtime.play()
    await renderer.setRuntimeState(true, false, sceneStore.currentScene, true)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errorMessage.value = `游戏启动失败：${message}`
  }
})

onBeforeUnmount(() => {
  runtime.stop()
  renderer?.destroy()
})
</script>

<style scoped>
.game-shell {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #05070b;
  position: relative;
}

.game-canvas {
  width: 100%;
  height: 100%;
}

.game-error {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: min(520px, calc(100vw - 32px));
  border: 1px solid #5c2f35;
  border-radius: 8px;
  background: #241417;
  color: #ffd9df;
  padding: 14px 16px;
  font-size: 14px;
  line-height: 1.6;
}
</style>
