<template>
  <main class="viewport-shell">
    <div class="viewport-header">
      <span>Scene View</span>
      <div class="preview-controls">
        <button v-if="!runtime.isPlaying" class="preview-btn" @click="runtime.play()">播放</button>
        <template v-else>
          <button class="preview-btn" @click="runtime.isPaused ? runtime.resume() : runtime.pause()">
            {{ runtime.isPaused ? '继续' : '暂停' }}
          </button>
          <button class="preview-btn stop" @click="runtime.stop()">停止</button>
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
    ></div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createDemoScene } from '../../engine/sampleScene'
import { PixiRenderer } from '../../engine/renderer/PixiRenderer'
import { deserializeScene } from '../../engine/serialization/sceneSerializer'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const containerRef = ref<HTMLDivElement | null>(null)
const isDragOver = ref(false)
const assets = useAssetStore()
const editor = useEditorStore()
const project = useProjectStore()
const runtime = useRuntimeStore()
const sceneStore = useSceneStore()
const selection = useSelectionStore()
let renderer: PixiRenderer | null = null
let lastRuntimeSyncAt = 0

const scenePathTitle = computed(() => project.currentScenePath || '内存场景')
const scenePathDisplay = computed(() => {
  const fullPath = String(project.currentScenePath || '').trim()
  if (!fullPath) return '内存场景'

  const normalizedFull = fullPath.replace(/\\/g, '/')
  const root = String(project.rootPath || '').trim().replace(/\\/g, '/').replace(/\/+$/g, '')
  if (root && root !== 'sample-project') {
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

  if (project.rootPath === 'sample-project') {
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
  renderer?.setSelection(selection.selectedEntityId)
  renderer?.setRuntimeState(false, false, sceneStore.currentScene, true)
}

onMounted(async () => {
  if (!containerRef.value) return

  try {
    await ensureInitialSceneReady()
    sceneStore.repairCurrentSceneComponents()

    renderer = new PixiRenderer({
      container: containerRef.value,
      onEntitySelected: (entityId) => selection.selectEntity(entityId),
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
      }
    })
    await renderer.init(sceneStore.currentScene)
    renderer.setGridVisible(editor.showGrid)
    renderer.setPlayDebugEnabled(runtime.playDebugEnabled)
    renderer.setSelection(selection.selectedEntityId)
    renderer.setTool(editor.tool)
  } catch (error) {
    console.error('Viewport 初始化失败', error)
    const message = error instanceof Error ? error.message : '未知错误'
    project.setStatus(`Viewport 初始化失败：${message}`)
  }
})

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
  () => editor.tool,
  (tool) => renderer?.setTool(tool)
)

watch(
  () => selection.selectedEntityId,
  (entityId) => renderer?.setSelection(entityId)
)

watch(
  () => [runtime.isPlaying, runtime.isPaused] as const,
  ([isPlaying, isPaused]) => {
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
  () => `${project.rootPath}::${project.sampleProjectId}`,
  (nextKey, prevKey) => {
    if (!prevKey || nextKey === prevKey) return
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

onBeforeUnmount(() => {
  runtime.stop()
  renderer?.destroy()
})
</script>

<style scoped>
.viewport-shell {
  display: grid;
  grid-template-rows: 40px minmax(0, 1fr);
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
  background: #1a2333;
  color: #dbe4ee;
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
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
