<template>
  <main class="viewport-shell">
    <div class="viewport-header">
      <span>Scene View</span>
      <div class="preview-controls">
        <button v-if="!runtime.isPlaying" class="preview-btn" @click="startPreview">播放</button>
        <template v-else>
          <button class="preview-btn" @click="togglePreviewPause">
            {{ runtime.isPaused ? '继续' : '暂停' }}
          </button>
          <button class="preview-btn stop" @click="stopPreview">停止</button>
        </template>
        <button
          class="preview-btn debug"
          :class="{ active: runtime.playDebugEnabled }"
          @click="runtime.togglePlayDebug()"
        >
          调试播放
        </button>
      </div>
      <span class="hint">
        选择 / 移动 / 缩放 / 平移 · Timeline 支持 .anim.json · 当前工具：{{ editor.tool }} · 当前场景：
        <span class="scene-path" :title="scenePathTitle">{{ scenePathDisplay }}</span>
      </span>
    </div>
    <div
      ref="containerRef"
      class="viewport-canvas"
      :class="{ dragover: isDragOver, panning: editor.tool === 'pan' && !runtime.isPlaying }"
      @dragover.prevent="handleDragOver"
      @dragenter.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop"
      @pointerdown="onViewportPointerDown"
      @pointermove="onViewportPointerMove"
      @pointerup="onViewportPointerUp"
      @pointercancel="onViewportPointerUp"
    >
      <div v-if="runtime.isLoading" class="loading-layer">
        <div class="loading-card">
          <div class="loading-spinner"></div>
          <div class="loading-title">{{ runtime.loadingMessage || 'Loading...' }}</div>
          <div class="loading-subtitle">正在准备场景状态与出生点</div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createDemoScene } from '../../engine/sampleScene'
import { createSceneRenderer } from '../../engine/renderer/RendererFactory'
import type { SceneRenderer, SceneRendererOptions } from '../../engine/renderer/RendererTypes'
import { deserializeScene } from '../../engine/serialization/sceneSerializer'
import { useAssetStore } from '../../stores/assets'
import { useConsoleStore } from '../../stores/console'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const containerRef = ref<HTMLDivElement | null>(null)
const isDragOver = ref(false)
const assets = useAssetStore()
const consoleStore = useConsoleStore()
const editor = useEditorStore()
const project = useProjectStore()
const runtime = useRuntimeStore()
const sceneStore = useSceneStore()
const selection = useSelectionStore()
let renderer: SceneRenderer | null = null
let lastRuntimeSyncAt = 0
let disposeProjectScriptChanged: (() => void) | null = null
let scriptHotReloadTimer = 0
let scriptHotReloading = false
const activeTouchPointers = new Map<number, { x: number; y: number }>()
let pinchDistance = 0

const scenePathTitle = computed(() => project.currentScenePath || '内存场景')
const scenePathDisplay = computed(() => {
  const fullPath = String(project.currentScenePath || '').trim()
  if (!fullPath) return '内存场景'

  const normalizedFull = fullPath.replace(/\\/g, '/')
  const root = String(project.rootPath || '').trim().replace(/\\/g, '/').replace(/\/+$/g, '')
  if (root && !project.isMemoryProject) {
    const fullLower = normalizedFull.toLowerCase()
    const rootLower = root.toLowerCase()
    if (fullLower.startsWith(`${rootLower}/`)) {
      return normalizedFull.slice(root.length + 1)
    }
  }
  const lastSlash = normalizedFull.lastIndexOf('/')
  return lastSlash >= 0 ? normalizedFull.slice(lastSlash + 1) : normalizedFull
})

async function ensureInitialSceneReady() {
  if (sceneStore.currentScene) return

  if (project.isMemoryProject) {
    sceneStore.bootstrap(createDemoScene())
    return
  }

  if (!window.unu?.readTextAsset) {
    sceneStore.createNewScene('MainScene', true)
    return
  }

  const sceneAssets = assets.flat
    .filter((node) => node.type === 'scene' && !!node.path)
    .sort((a, b) => a.path.localeCompare(b.path))
  if (!sceneAssets.length) {
    sceneStore.createNewScene('MainScene', true)
    return
  }

  try {
    const loadedScenes: Array<{ scene: ReturnType<typeof deserializeScene>; filePath: string }> = []
    for (const sceneAsset of sceneAssets) {
      const loaded = await window.unu.readTextAsset({
        projectRoot: project.rootPath,
        relativePath: sceneAsset.path
      })
      if (!loaded?.content) continue
      try {
        const scene = deserializeScene(loaded.content)
        loadedScenes.push({ scene, filePath: loaded.filePath })
      } catch {
        // Ignore broken scene files and continue loading others.
      }
    }
    if (!loadedScenes.length) {
      sceneStore.createNewScene('MainScene', true)
      return
    }
    sceneStore.bootstrapSceneCollection(loadedScenes)
  } catch {
    sceneStore.createNewScene('MainScene', true)
  }
}

async function reloadCurrentProjectScene() {
  runtime.stop()
  selection.clearSelection()
  sceneStore.resetProjectSceneState()

  await ensureInitialSceneReady()
  sceneStore.repairCurrentSceneComponents()
  if (!sceneStore.currentScene) return
  await renderer?.renderScene(sceneStore.currentScene)
  renderer?.setSelections([...selection.selectedEntityIds], selection.selectedEntityId, selection.selectedModelNodeEntityId === selection.selectedEntityId ? selection.selectedModelNodePath : '')
  renderer?.setRuntimeState(false, false, sceneStore.currentScene, true)
}

async function startProjectScriptWatcher() {
  disposeProjectScriptChanged?.()
  disposeProjectScriptChanged = null
  if (scriptHotReloadTimer) {
    window.clearTimeout(scriptHotReloadTimer)
    scriptHotReloadTimer = 0
  }
  if (!window.unu?.watchProjectScripts || !window.unu?.onProjectScriptChanged) return
  if (!project.rootPath || project.isMemoryProject) return

  await window.unu.watchProjectScripts({ projectRoot: project.rootPath }).catch(() => null)
  disposeProjectScriptChanged = window.unu.onProjectScriptChanged((payload) => {
    const currentRoot = String(project.rootPath || '').replace(/\\/g, '/').toLowerCase()
    const changedRoot = String(payload.projectRoot || '').replace(/\\/g, '/').toLowerCase()
    if (!currentRoot || changedRoot !== currentRoot) return
    if (scriptHotReloadTimer) window.clearTimeout(scriptHotReloadTimer)
    scriptHotReloadTimer = window.setTimeout(() => {
      void hotReloadProjectScripts(payload.relativePath)
    }, 80)
  })
}

async function hotReloadProjectScripts(relativePath: string) {
  if (scriptHotReloading) return
  scriptHotReloading = true
  try {
    await renderer?.hotReloadProjectRuntimeFiles(relativePath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`脚本热重载失败：${message}`)
  } finally {
    scriptHotReloading = false
  }
}

async function locateScriptError(error: { scriptPath: string; line: number; column?: number; message: string; phase: string; entityName?: string }) {
  const scriptPath = String(error.scriptPath || '').replace(/\\/g, '/').trim()
  const where = `${scriptPath || 'unknown'}:${error.line || 1}${error.column ? `:${error.column}` : ''}`
  const entityHint = error.entityName ? `（实体：${error.entityName}）` : ''
  if (runtime.isPlaying) {
    project.setStatus(`播放态脚本${error.phase}错误 ${where}${entityHint}：${error.message}`)
    return
  }
  if (!scriptPath || scriptPath.startsWith('builtin://')) {
    project.setStatus(`脚本错误：${error.message}`)
    return
  }
  const assetExists = assets.flat.some((node) => node.path === scriptPath)
  if (assetExists) await assets.selectAsset(scriptPath)
  editor.revealScriptError(scriptPath, error.line || 1, error.column, error.message)
  project.setStatus(`脚本${error.phase}错误 ${where}${entityHint}：${error.message}`)
}

function blurActiveElement() {
  const active = document.activeElement
  if (active instanceof HTMLElement) active.blur()
}

function startPreview() {
  blurActiveElement()
  runtime.play()
}

function togglePreviewPause() {
  blurActiveElement()
  if (runtime.isPaused) runtime.resume()
  else runtime.pause()
}

function stopPreview() {
  blurActiveElement()
  runtime.stop()
}

function buildRendererOptions(): SceneRendererOptions {
  if (!containerRef.value) throw new Error('Viewport container is not ready.')
  return {
    container: containerRef.value,
    onEntitySelected: (entityId, options) => {
      if (!entityId) selection.clearSelection()
      else if (options?.modelNodePath) selection.selectModelNode(entityId, options.modelNodePath)
      else if (options?.selectedEntityIds) selection.selectEntities(options.selectedEntityIds, options.primaryId || entityId)
      else if (options?.additive) selection.toggleEntity(entityId)
      else selection.selectEntity(entityId)
    },
    onSceneMutated: () => sceneStore.markDirty(),
    onRuntimeSceneUpdated: (scene) => {
      if (!runtime.isPlaying) {
        sceneStore.clearRuntimeScene()
        return
      }
      const now = performance.now()
      if (now - lastRuntimeSyncAt < 120) return
      lastRuntimeSyncAt = now
      sceneStore.setRuntimeScene(scene)
    },
    onScriptError: (error) => {
      void locateScriptError(error)
    },
    onConsoleMessage: (message) => {
      const prefix = message.entityName ? `[${message.entityName}] ` : ''
      consoleStore.push(message.level, `${prefix}${message.message}`, {
        source: message.scriptPath,
        line: message.line,
        column: message.column
      })
    }
  }
}

async function initializeRenderer(refreshPlayingScene = true) {
  if (!containerRef.value) return
  renderer?.destroy()
  renderer = createSceneRenderer({
    ...buildRendererOptions(),
    backend: project.renderBackend
  })
  await renderer.init(sceneStore.currentScene)
  renderer.setGridVisible(editor.showGrid)
  renderer.setDebugOverlayVisible(editor.showDebugOverlay)
  renderer.setDebugOverlayOptions?.(editor.debugOverlayOptions)
  renderer.setPlayDebugEnabled(runtime.playDebugEnabled)
  renderer.setSelections([...selection.selectedEntityIds], selection.selectedEntityId, selection.selectedModelNodeEntityId === selection.selectedEntityId ? selection.selectedModelNodePath : '')
  renderer.setTool(editor.tool)
  renderer.setEditorCameraSettings?.({
    controlMode: editor.threeEditorCameraControlMode,
    projection: editor.threeEditorCameraProjection,
    moveSpeed: editor.threeEditorCameraMoveSpeed
  })
  if (runtime.isPlaying) await renderer.setRuntimeState(true, runtime.isPaused, sceneStore.currentScene, refreshPlayingScene)
}

onMounted(async () => {
  if (!containerRef.value) return

  try {
    window.addEventListener('unu:set-camera-from-editor-view', handleSetCameraFromEditorView as EventListener)
    window.addEventListener('unu:preview-camera-view', handlePreviewCameraView as EventListener)
    window.addEventListener('unu:exit-camera-preview', handleExitCameraPreview)
    window.addEventListener('keydown', handleCameraPreviewKeydown, true)
    await ensureInitialSceneReady()
    sceneStore.repairCurrentSceneComponents()

    await initializeRenderer(false)
    await startProjectScriptWatcher()
  } catch (error) {
    console.error('Viewport 初始化失败', error)
    const message = error instanceof Error ? error.message : '未知错误'
    project.setStatus(`Viewport 初始化失败：${message}`)
  }
})

function eventEntityId(event: Event) {
  return String((event as CustomEvent<{ entityId?: string }>).detail?.entityId || '').trim()
}

function handleSetCameraFromEditorView(event: Event) {
  if (runtime.isPlaying) return
  const entityId = eventEntityId(event)
  if (!entityId || !renderer?.setSelectedCameraFromEditorView) {
    project.setStatus('当前渲染器不支持读取编辑视角到相机。')
    return
  }
  const ok = renderer.setSelectedCameraFromEditorView(entityId)
  if (!ok) {
    project.setStatus('读取编辑视角失败：请确认当前选中实体拥有 Camera 组件。')
    return
  }
  sceneStore.markDirty()
  if (sceneStore.currentScene) void renderer.renderScene(sceneStore.currentScene)
  project.setStatus('已将当前编辑视角写入相机实体。')
}

function handlePreviewCameraView(event: Event) {
  if (runtime.isPlaying) return
  const entityId = eventEntityId(event)
  if (!entityId || !renderer?.previewCameraView) {
    project.setStatus('当前渲染器不支持编辑态相机预览。')
    return
  }
  const ok = renderer.previewCameraView(entityId)
  if (!ok) {
    project.setStatus('相机预览失败：请确认当前选中实体拥有 Camera 组件。')
    return
  }
  editor.setCameraPreviewEntity(entityId)
  project.setStatus('已切换到该相机的编辑态预览视角。')
}

function handleExitCameraPreview() {
  if (!renderer?.exitCameraPreview) {
    editor.setCameraPreviewEntity('')
    return
  }
  const ok = renderer.exitCameraPreview()
  editor.setCameraPreviewEntity('')
  project.setStatus(ok ? '已退出相机预览并恢复编辑视角。' : '当前没有活动的相机预览。')
}

function handleCameraPreviewKeydown(event: KeyboardEvent) {
  if (event.code !== 'Escape' || !editor.cameraPreviewEntityId) return
  const target = event.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return
  event.preventDefault()
  handleExitCameraPreview()
}

watch(
  () => sceneStore.revision,
  async () => {
    if (runtime.isPlaying) {
      renderer?.setRuntimeState(true, runtime.isPaused, sceneStore.currentScene, true)
      return
    }
    if (sceneStore.currentScene) await renderer?.renderScene(sceneStore.currentScene)
  }
)

watch(
  () => editor.showGrid,
  (visible) => renderer?.setGridVisible(visible)
)

watch(
  () => editor.showDebugOverlay,
  (visible) => renderer?.setDebugOverlayVisible(visible)
)

watch(
  () => [
    editor.debugOverlayOptions.bounds,
    editor.debugOverlayOptions.colliders,
    editor.debugOverlayOptions.axes,
    editor.debugOverlayOptions.lights,
    editor.debugOverlayOptions.cameras
  ] as const,
  () => renderer?.setDebugOverlayOptions?.(editor.debugOverlayOptions)
)

watch(
  () => editor.tool,
  (tool) => renderer?.setTool(tool)
)

watch(
  () => [editor.threeEditorCameraControlMode, editor.threeEditorCameraProjection, editor.threeEditorCameraMoveSpeed] as const,
  ([controlMode, projection, moveSpeed]) => renderer?.setEditorCameraSettings?.({ controlMode, projection, moveSpeed })
)

watch(
  () => [selection.selectedEntityId, selection.selectedEntityIds.join('|'), selection.selectedModelNodeEntityId, selection.selectedModelNodePath] as const,
  ([entityId]) => renderer?.setSelections([...selection.selectedEntityIds], entityId, selection.selectedModelNodeEntityId === entityId ? selection.selectedModelNodePath : '')
)

watch(
  () => [runtime.isPlaying, runtime.isPaused] as const,
  ([isPlaying, isPaused]) => {
    if (isPlaying && editor.cameraPreviewEntityId) handleExitCameraPreview()
    renderer?.setRuntimeState(isPlaying, isPaused, sceneStore.currentScene)
    if (!isPlaying) {
      sceneStore.clearRuntimeScene()
      project.setStatus('已停止播放预览，返回编辑态')
      return
    }
    project.setStatus(isPaused ? '预览已暂停（可继续）' : '已进入播放预览（运行态副本）')
  }
)

watch(
  () => runtime.playDebugEnabled,
  (enabled) => renderer?.setPlayDebugEnabled(enabled)
)

watch(
  () => project.renderBackend,
  async (nextBackend, previousBackend) => {
    if (!previousBackend || nextBackend === previousBackend) return
    await initializeRenderer(false)
    if (sceneStore.currentScene) await renderer?.renderScene(sceneStore.currentScene)
  }
)

watch(
  () => `${project.rootPath}::${project.sampleProjectId}`,
  (nextKey, prevKey) => {
    if (!prevKey || nextKey === prevKey) return
    void startProjectScriptWatcher()
    void reloadCurrentProjectScene()
  }
)

function handleDragOver(event: DragEvent) {
  const path = event.dataTransfer?.getData('application/x-unu-asset-path')
  if (path) {
    event.dataTransfer!.dropEffect = 'copy'
    isDragOver.value = true
  }
}

async function handleDrop(event: DragEvent) {
  isDragOver.value = false
  if (!containerRef.value) return
  const path = event.dataTransfer?.getData('application/x-unu-asset-path') || event.dataTransfer?.getData('text/plain')
  if (!path) return
  await assets.selectAsset(path)
  const rect = containerRef.value.getBoundingClientRect()
  await sceneStore.createSpriteEntityFromAsset(path, {
    x: event.clientX - rect.left - rect.width / 2,
    y: event.clientY - rect.top - rect.height / 2
  })
  editor.leftTab = 'Scene'
  editor.setRightTab('Inspector')
  project.setStatus(`已拖入图片并创建实体：${path.split('/').pop() || path}`)
}

function touchDistance() {
  const points = Array.from(activeTouchPointers.values())
  if (points.length < 2) return 0
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
}

function touchCenter() {
  const points = Array.from(activeTouchPointers.values())
  return {
    x: (points[0].x + points[1].x) / 2,
    y: (points[0].y + points[1].y) / 2
  }
}

function onViewportPointerDown(event: PointerEvent) {
  if (event.pointerType !== 'touch') return
  activeTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (activeTouchPointers.size >= 2) {
    pinchDistance = touchDistance()
    event.preventDefault()
  }
}

function onViewportPointerMove(event: PointerEvent) {
  if (event.pointerType !== 'touch' || !activeTouchPointers.has(event.pointerId)) return
  activeTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (activeTouchPointers.size < 2) return
  const nextDistance = touchDistance()
  if (pinchDistance > 0 && nextDistance > 0) {
    const center = touchCenter()
    renderer?.zoomViewportByFactor(center.x, center.y, nextDistance / pinchDistance)
  }
  pinchDistance = nextDistance
  event.preventDefault()
}

function onViewportPointerUp(event: PointerEvent) {
  if (event.pointerType !== 'touch') return
  activeTouchPointers.delete(event.pointerId)
  pinchDistance = activeTouchPointers.size >= 2 ? touchDistance() : 0
}

onBeforeUnmount(() => {
  activeTouchPointers.clear()
  disposeProjectScriptChanged?.()
  disposeProjectScriptChanged = null
  if (scriptHotReloadTimer) window.clearTimeout(scriptHotReloadTimer)
  void window.unu?.unwatchProjectScripts?.()
  window.removeEventListener('unu:set-camera-from-editor-view', handleSetCameraFromEditorView as EventListener)
  window.removeEventListener('unu:preview-camera-view', handlePreviewCameraView as EventListener)
  window.removeEventListener('unu:exit-camera-preview', handleExitCameraPreview)
  window.removeEventListener('keydown', handleCameraPreviewKeydown, true)
  runtime.stop()
  renderer?.destroy()
})
</script>

<style scoped>
.viewport-shell {
  display: grid;
  grid-template-rows: 40px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  background: #0f131b;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.viewport-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid #252c38;
  color: #9fb0c7;
  font-size: 13px;
  gap: 12px;
  min-width: 0;
}
.preview-controls {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.preview-btn {
  border: 1px solid #3a465d;
  background: #468847;
  color: #dbe4ee;
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
}
.preview-btn.debug {
  background: #1a2333;
}
.preview-btn.stop {
  background: #3b2020;
}
.preview-btn.debug.active {
  background: #2c5a35;
  border-color: #4d9f5f;
}
.viewport-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  touch-action: none;
}

.viewport-canvas :deep(canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.loading-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 50% 45%, rgba(86, 182, 194, 0.18), transparent 34%),
    rgba(8, 12, 18, 0.72);
  backdrop-filter: blur(2px);
  pointer-events: all;
}

.loading-card {
  display: grid;
  justify-items: center;
  gap: 10px;
  min-width: 220px;
  padding: 22px 28px;
  border: 1px solid rgba(137, 176, 205, 0.35);
  border-radius: 18px;
  background: rgba(18, 24, 36, 0.92);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.42);
}

.loading-spinner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid rgba(154, 185, 216, 0.24);
  border-top-color: #66d9ef;
  animation: loading-spin 0.9s linear infinite;
}

.loading-title {
  color: #f3f8ff;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.loading-subtitle {
  color: #9fb0c7;
  font-size: 12px;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}
.viewport-canvas.panning {
  cursor: grab;
}
.viewport-canvas.dragover::after {
  content: '松开后在当前位置创建 Sprite 实体';
  position: absolute;
  inset: 16px;
  display: grid;
  place-items: center;
  border: 1px dashed #56b6c2;
  border-radius: 12px;
  color: #8de2ff;
  background: rgba(31, 41, 55, 0.35);
  pointer-events: none;
}
.hint {
  flex: 1;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.scene-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
}
</style>
