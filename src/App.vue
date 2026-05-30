<template>
  <GamePlayer v-if="isGameExport" />
  <TilemapEditorWindow v-else-if="isTilemapEditorWindow" />
  <CodeEditorWindow v-else-if="isCodeEditorWindow" />
  <LauncherView v-else-if="showLauncher" @open-project="openProjectFromLauncher" />
  <EditorLayout v-else @return-launcher="returnToLauncher" />
  <div v-if="androidCodeEditorVisible" class="android-window-overlay">
    <CodeEditorWindow />
  </div>
  <div v-if="androidTilemapEditorVisible" class="android-window-overlay">
    <TilemapEditorWindow />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import GamePlayer from './components/game/GamePlayer.vue'
import LauncherView from './components/launcher/LauncherView.vue'
import EditorLayout from './components/layout/EditorLayout.vue'
import CodeEditorWindow from './components/windows/CodeEditorWindow.vue'
import TilemapEditorWindow from './components/windows/TilemapEditorWindow.vue'
import { createFallbackProject } from './engine/project/projectFallback'
import { installAndroidEditorBridge } from './platform/androidEditorBridge'
import { useAssetStore } from './stores/assets'
import { useProjectStore } from './stores/project'
import { useRuntimeStore } from './stores/runtime'
import { useSceneStore } from './stores/scene'
import { useSelectionStore } from './stores/selection'

installAndroidEditorBridge()

const isAndroidEditorMode = import.meta.env.VITE_UNU_ANDROID_EDITOR === '1'
const isTilemapEditorWindow = !isAndroidEditorMode && new URLSearchParams(window.location.search).get('tilemapEditor') === '1'
const isCodeEditorWindow = !isAndroidEditorMode && new URLSearchParams(window.location.search).get('codeEditor') === '1'
const isGameExport =
  new URLSearchParams(window.location.search).get('game') === '1' ||
  window.__UNU_GAME_EXPORT__ === true ||
  (import.meta.env.VITE_UNU_ANDROID === '1' && !isAndroidEditorMode)
const isElectronMode = !!window.unu
const showLauncher = ref(!isGameExport && !isTilemapEditorWindow && !isCodeEditorWindow && isElectronMode)

const assets = useAssetStore()
const project = useProjectStore()
const runtime = useRuntimeStore()
const scene = useSceneStore()
const selection = useSelectionStore()
const androidCodeEditorVisible = ref(false)
const androidTilemapEditorVisible = ref(false)

function refreshAndroidUiClasses() {
  const compactPhone = isAndroidEditorMode && Math.min(window.innerWidth, window.innerHeight) <= 540
  document.documentElement.classList.toggle('unu-android-editor', isAndroidEditorMode)
  document.documentElement.classList.toggle('unu-android-phone-compact', compactPhone)
}

function handleAndroidCodeEditorOpen() {
  androidCodeEditorVisible.value = true
}

function handleAndroidCodeEditorClose() {
  androidCodeEditorVisible.value = false
}

function handleAndroidTilemapEditorOpen() {
  androidTilemapEditorVisible.value = true
}

function handleAndroidTilemapEditorClose() {
  androidTilemapEditorVisible.value = false
}

onMounted(() => {
  if (!isAndroidEditorMode) return
  refreshAndroidUiClasses()
  window.addEventListener('resize', refreshAndroidUiClasses)
  window.addEventListener('unu-android-code-editor-open', handleAndroidCodeEditorOpen)
  window.addEventListener('unu-android-code-editor-close', handleAndroidCodeEditorClose)
  window.addEventListener('unu-android-tilemap-editor-open', handleAndroidTilemapEditorOpen)
  window.addEventListener('unu-android-tilemap-editor-close', handleAndroidTilemapEditorClose)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', refreshAndroidUiClasses)
  document.documentElement.classList.remove('unu-android-editor', 'unu-android-phone-compact')
  window.removeEventListener('unu-android-code-editor-open', handleAndroidCodeEditorOpen)
  window.removeEventListener('unu-android-code-editor-close', handleAndroidCodeEditorClose)
  window.removeEventListener('unu-android-tilemap-editor-open', handleAndroidTilemapEditorOpen)
  window.removeEventListener('unu-android-tilemap-editor-close', handleAndroidTilemapEditorClose)
})

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
      assets.clearFileHistory()
      project.setProject({ rootPath: fallback.rootPath, name: fallback.name, sampleProjectId: fallback.sampleProjectId, mode: 'memory' })
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
    assets.clearFileHistory()
    project.setProject({
      rootPath: scanned.rootPath,
      name: scanned.name || payload.name,
      sampleProjectId: payload.sampleProjectId || '',
      mode: payload.sampleProjectId ? 'sample' : 'local'
    })
    project.resetSceneFile()
    project.setStatus(buildProjectHealthMessage(scanned, `已打开工程：${scanned.name}`))
    showLauncher.value = false
    await window.unu?.setMainWindowPreset?.('editor')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`打开项目失败：${message}`)
  }
}

async function returnToLauncher() {
  runtime.stop()
  selection.clearSelection()
  showLauncher.value = true
  project.setStatus('已回到开始界面')
  await window.unu?.setMainWindowPreset?.('launcher')
}

if (showLauncher.value) {
  void window.unu?.setMainWindowPreset?.('launcher')
}
</script>

<style scoped>
.android-window-overlay {
  position: fixed;
  inset: 10px;
  z-index: 9999;
  display: grid;
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 14px;
  overflow: hidden;
  background: #0b1020;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
}

.android-window-overlay :deep(.code-window),
.android-window-overlay :deep(.tilemap-window) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
</style>
