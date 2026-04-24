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

function buildProjectHealthMessage(
  scanned: {
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
  if (scanned.sceneCatalogRepaired) {
    const created = Number(scanned.sceneCreatedByReference || 0)
    suffixes.push(created > 0 ? `场景目录已修复（${scanned.sceneCount ?? 0}，补全 ${created}）` : `场景目录已修复（${scanned.sceneCount ?? 0}）`)
  }
  if (scanned.assetIntegrityRepaired) {
    const normalized = Number(scanned.normalizedSceneFiles || 0)
    const copied = Number(scanned.copiedAssets || 0)
    suffixes.push(`资源引用已修复（路径规范 ${normalized}，补齐素材 ${copied}）`)
  }
  const unresolved = Number(scanned.unresolvedAssets || 0)
  if (unresolved > 0) suffixes.push(`仍有 ${unresolved} 个资源引用未解析`)
  return suffixes.length ? `${base}（${suffixes.join('；')}）` : base
}

async function openProjectFromLauncher(payload: { rootPath: string; name: string; sampleProjectId?: string }) {
  try {
    runtime.stop()
    selection.clearSelection()
    scene.resetProjectSceneState()

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
      throw new Error('当前环境未接入项目扫描接口。')
    }
    const scanned = await window.unu.scanProject(payload.rootPath)
    assets.hydrateTree(scanned.tree)
    project.setProject({ rootPath: scanned.rootPath, name: scanned.name || payload.name, sampleProjectId: '' })
    project.resetSceneFile()
    project.setStatus(buildProjectHealthMessage(scanned, `已打开工程：${scanned.name}`))
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
