<template>
  <GamePlayer v-if="isGameExport" />
  <TilemapEditorWindow v-else-if="isTilemapEditorWindow" />
  <CodeEditorWindow v-else-if="isCodeEditorWindow" />
  <SpriteAtlasEditorWindow v-else-if="isSpriteAtlasEditorWindow" />
  <LauncherView v-else-if="showLauncher" @open-project="openProjectFromLauncher" />
  <EditorLayout v-else @return-launcher="returnToLauncher" />
  <div v-if="androidCodeEditorVisible" class="android-window-overlay">
    <CodeEditorWindow />
  </div>
  <div v-if="androidTilemapEditorVisible" class="android-window-overlay">
    <TilemapEditorWindow />
  </div>
  <div v-if="androidSpriteAtlasEditorVisible" class="android-window-overlay">
    <SpriteAtlasEditorWindow />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import GamePlayer from './components/game/GamePlayer.vue'
import LauncherView from './components/launcher/LauncherView.vue'
import EditorLayout from './components/layout/EditorLayout.vue'
import CodeEditorWindow from './components/windows/CodeEditorWindow.vue'
import SpriteAtlasEditorWindow from './components/windows/SpriteAtlasEditorWindow.vue'
import TilemapEditorWindow from './components/windows/TilemapEditorWindow.vue'
import { AnimationComponent } from './engine/components/AnimationComponent'
import { SpriteComponent } from './engine/components/SpriteComponent'
import { createFallbackProject } from './engine/project/projectFallback'
import { installAndroidEditorBridge } from './platform/androidEditorBridge'
import { useAssetStore } from './stores/assets'
import { useProjectStore } from './stores/project'
import { useRuntimeStore } from './stores/runtime'
import { useSceneStore } from './stores/scene'
import { useSelectionStore } from './stores/selection'

installAndroidEditorBridge()

const isAndroidEditorMode = import.meta.env.VITE_UNU_ANDROID_EDITOR === '1'
const searchParams = new URLSearchParams(window.location.search)
const electronWindowRole = window.unu?.windowRole || 'main'
const isTilemapEditorWindow = !isAndroidEditorMode && (searchParams.get('tilemapEditor') === '1' || electronWindowRole === 'tilemap-editor')
const isCodeEditorWindow = !isAndroidEditorMode && (searchParams.get('codeEditor') === '1' || electronWindowRole === 'code-editor')
const isSpriteAtlasEditorWindow = !isAndroidEditorMode && (searchParams.get('spriteAtlasEditor') === '1' || electronWindowRole === 'sprite-atlas-editor')
const isGameExport =
  searchParams.get('game') === '1' ||
  window.__UNU_GAME_EXPORT__ === true ||
  (import.meta.env.VITE_UNU_ANDROID === '1' && !isAndroidEditorMode)
const isElectronMode = !!window.unu
const showLauncher = ref(!isGameExport && !isTilemapEditorWindow && !isCodeEditorWindow && !isSpriteAtlasEditorWindow && isElectronMode)

const assets = useAssetStore()
const project = useProjectStore()
const runtime = useRuntimeStore()
const scene = useSceneStore()
const selection = useSelectionStore()
const androidCodeEditorVisible = ref(false)
const androidTilemapEditorVisible = ref(false)
const androidSpriteAtlasEditorVisible = ref(false)
const openingProject = ref(false)
let removeSpriteAtlasEditorListener: (() => void) | null = null

interface SpriteAtlasEditorApplyPayload {
  action?: 'saved' | 'apply-frame' | 'apply-animation'
  atlasPath?: string
  framePath?: string
  framePaths?: string[]
  stateMachine?: {
    enabled: boolean
    initialState: string
    currentState: string
    clips: Array<{ name: string; framePaths: string[]; frameDurations: number[]; loop: boolean }>
    transitions: []
  }
  atlas?: {
    imagePath?: string
    columns?: number
    rows?: number
    cellWidth?: number
    cellHeight?: number
    frameCount?: number
  }
}

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

function handleAndroidSpriteAtlasEditorOpen() {
  androidSpriteAtlasEditorVisible.value = true
}

function handleAndroidSpriteAtlasEditorClose() {
  androidSpriteAtlasEditorVisible.value = false
}

async function applySpriteAtlasEditorPayload(raw: unknown) {
  if (isGameExport || isTilemapEditorWindow || isCodeEditorWindow || isSpriteAtlasEditorWindow) return
  const payload = (raw || {}) as SpriteAtlasEditorApplyPayload
  if (payload.action === 'saved') {
    await assets.refreshProject()
    if (payload.atlasPath) await assets.selectAsset(payload.atlasPath)
    project.setStatus(`精灵图集已保存：${payload.atlasPath || 'Atlas'}`)
    return
  }

  const current = scene.currentScene?.getEntityById(selection.selectedEntityId)
  if (!current) {
    project.setStatus('请先选择一个实体，再从图集编辑器应用帧。')
    return
  }
  let targetSprite = current.getComponent<SpriteComponent>('Sprite')

  if (payload.action === 'apply-frame' && payload.framePath) {
    if (!targetSprite) {
      targetSprite = new SpriteComponent('', Math.max(1, Number(payload.atlas?.cellWidth || 64)), Math.max(1, Number(payload.atlas?.cellHeight || 64)), true, 1, 0xffffff, true)
      current.addComponent(targetSprite)
    }
    targetSprite.texturePath = payload.framePath
    targetSprite.width = Math.max(1, Number(payload.atlas?.cellWidth || targetSprite.width || 64))
    targetSprite.height = Math.max(1, Number(payload.atlas?.cellHeight || targetSprite.height || 64))
    scene.markDirty()
    project.setStatus('已将图集帧应用到 Sprite。')
    return
  }

  if (payload.action === 'apply-animation' && payload.framePaths?.length) {
    if (!targetSprite) {
      targetSprite = new SpriteComponent('', Math.max(1, Number(payload.atlas?.cellWidth || 64)), Math.max(1, Number(payload.atlas?.cellHeight || 64)), true, 1, 0xffffff, true)
      current.addComponent(targetSprite)
    }
    let targetAnimation = current.getComponent<AnimationComponent>('Animation')
    if (!targetAnimation) {
      targetAnimation = new AnimationComponent(true, true, 8, true, 0, 0, [], [], '', '', null, [])
      current.addComponent(targetAnimation)
    }
    targetAnimation.sourceAtlasPath = payload.atlasPath || ''
    targetAnimation.atlasGrid = payload.atlas
      ? {
          columns: Math.max(1, Number(payload.atlas.columns || 1)),
          rows: Math.max(1, Number(payload.atlas.rows || 1)),
          cellWidth: Math.max(1, Number(payload.atlas.cellWidth || 1)),
          cellHeight: Math.max(1, Number(payload.atlas.cellHeight || 1)),
          frameCount: Math.max(1, Number(payload.atlas.frameCount || payload.framePaths.length))
        }
      : null
    targetAnimation.framePaths = payload.framePaths.map(String).filter(Boolean)
    targetAnimation.frameDurations = targetAnimation.framePaths.map(() => 1)
    targetAnimation.currentFrame = 0
    targetAnimation.elapsed = 0
    targetAnimation.playing = true
    targetAnimation.stateMachine = payload.stateMachine || {
      enabled: true,
      initialState: 'Atlas',
      currentState: 'Atlas',
      clips: [{
        name: 'Atlas',
        framePaths: [...targetAnimation.framePaths],
        frameDurations: [...targetAnimation.frameDurations],
        loop: true
      }],
      transitions: []
    }
    if (targetAnimation.framePaths[0]) {
      targetSprite.texturePath = targetAnimation.framePaths[0]
      targetSprite.width = Math.max(1, Number(payload.atlas?.cellWidth || targetSprite.width || 64))
      targetSprite.height = Math.max(1, Number(payload.atlas?.cellHeight || targetSprite.height || 64))
    }
    scene.markDirty()
    project.setStatus('已将图集帧应用到 Animation。')
  }
}

onMounted(() => {
  if (!isGameExport && !isTilemapEditorWindow && !isCodeEditorWindow && !isSpriteAtlasEditorWindow) {
    removeSpriteAtlasEditorListener = window.unu?.onSpriteAtlasEditorApply?.((payload) => { void applySpriteAtlasEditorPayload(payload) }) || null
  }
  if (!isAndroidEditorMode) return
  refreshAndroidUiClasses()
  window.addEventListener('resize', refreshAndroidUiClasses)
  window.addEventListener('unu-android-code-editor-open', handleAndroidCodeEditorOpen)
  window.addEventListener('unu-android-code-editor-close', handleAndroidCodeEditorClose)
  window.addEventListener('unu-android-tilemap-editor-open', handleAndroidTilemapEditorOpen)
  window.addEventListener('unu-android-tilemap-editor-close', handleAndroidTilemapEditorClose)
  window.addEventListener('unu-android-sprite-atlas-editor-open', handleAndroidSpriteAtlasEditorOpen)
  window.addEventListener('unu-android-sprite-atlas-editor-close', handleAndroidSpriteAtlasEditorClose)
})

onBeforeUnmount(() => {
  removeSpriteAtlasEditorListener?.()
  removeSpriteAtlasEditorListener = null
  window.removeEventListener('resize', refreshAndroidUiClasses)
  document.documentElement.classList.remove('unu-android-editor', 'unu-android-phone-compact')
  window.removeEventListener('unu-android-code-editor-open', handleAndroidCodeEditorOpen)
  window.removeEventListener('unu-android-code-editor-close', handleAndroidCodeEditorClose)
  window.removeEventListener('unu-android-tilemap-editor-open', handleAndroidTilemapEditorOpen)
  window.removeEventListener('unu-android-tilemap-editor-close', handleAndroidTilemapEditorClose)
  window.removeEventListener('unu-android-sprite-atlas-editor-open', handleAndroidSpriteAtlasEditorOpen)
  window.removeEventListener('unu-android-sprite-atlas-editor-close', handleAndroidSpriteAtlasEditorClose)
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
    assetTreeTruncated?: boolean
  },
  base: string
) {
  const suffixes: string[] = []
  if (scanned.assetTreeTruncated) {
    suffixes.push('资源树较大，已限制显示数量')
  }
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
  if (openingProject.value) return
  openingProject.value = true
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
      mode: payload.sampleProjectId ? 'sample' : 'local',
      renderBackend: scanned.renderBackend,
      physicsBackend: scanned.physicsBackend
    })
    project.resetSceneFile()
    project.setStatus(buildProjectHealthMessage(scanned, `已打开工程：${scanned.name}`))
    showLauncher.value = false
    await window.unu?.setMainWindowPreset?.('editor')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`打开项目失败：${message}`)
  } finally {
    openingProject.value = false
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
  align-items: stretch;
  justify-items: stretch;
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 14px;
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable both-edges;
  background: #0b1020;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
}

.android-window-overlay :deep(.code-window),
.android-window-overlay :deep(.tilemap-window),
.android-window-overlay :deep(.atlas-window) {
  width: 100%;
  min-width: 0;
  min-height: 100%;
  height: auto;
  max-height: none;
}
</style>
