<template>
  <TilemapEditorWindow v-if="isTilemapEditorWindow" />
  <LauncherView v-else-if="showLauncher" @open-project="openProjectFromLauncher" />
  <EditorLayout v-else />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LauncherView from './components/launcher/LauncherView.vue'
import EditorLayout from './components/layout/EditorLayout.vue'
import TilemapEditorWindow from './components/windows/TilemapEditorWindow.vue'
import { createFallbackProject } from './engine/project/projectFallback'
import { useAssetStore } from './stores/assets'
import { useProjectStore } from './stores/project'
import { useRuntimeStore } from './stores/runtime'
import { useSceneStore } from './stores/scene'
import { useSelectionStore } from './stores/selection'

const isTilemapEditorWindow = new URLSearchParams(window.location.search).get('tilemapEditor') === '1'
const isElectronMode = !!window.unu
const showLauncher = ref(!isTilemapEditorWindow && isElectronMode)

const assets = useAssetStore()
const project = useProjectStore()
const runtime = useRuntimeStore()
const scene = useSceneStore()
const selection = useSelectionStore()

async function openProjectFromLauncher(payload: { rootPath: string; name: string; sampleProjectId?: string }) {
  try {
    runtime.stop()
    selection.clearSelection()
    scene.currentScene = null
    scene.scenes = []
    scene.runtimeScene = null
    scene.runtimeRevision += 1
    scene.revision += 1
    scene.isDirty = false
    scene.resetHistory()
    scene.clearAutoSaveTimer()

    if (payload.rootPath === 'sample-project') {
      const fallback = createFallbackProject(payload.sampleProjectId || 'action-2d', payload.name || 'sample-project')
      assets.hydrateTree(fallback.tree)
      project.setProject({ rootPath: fallback.rootPath, name: fallback.name, sampleProjectId: fallback.sampleProjectId })
      project.resetSceneFile()
      showLauncher.value = false
      await window.unu?.setMainWindowPreset?.('editor')
      return
    }

    if (!window.unu?.scanProject) {
      throw new Error('当前环境未接入项目扫描接口')
    }
    const scanned = await window.unu.scanProject(payload.rootPath)
    assets.hydrateTree(scanned.tree)
    project.setProject({ rootPath: scanned.rootPath, name: scanned.name || payload.name, sampleProjectId: '' })
    project.resetSceneFile()
    showLauncher.value = false
    await window.unu?.setMainWindowPreset?.('editor')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`打开项目失败：${message}`)
  }
}

if (showLauncher.value) {
  void window.unu?.setMainWindowPreset?.('launcher')
}
</script>
