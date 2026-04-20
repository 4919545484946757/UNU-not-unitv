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
      </div>
      <span class="hint">
        选择 / 移动 / 缩放 / 平移 · Timeline 支持 .anim.json · 当前工具：{{ editor.tool }} · 当前场景：{{ project.currentScenePath || '内存场景' }}
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
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createDemoScene } from '../../engine/sampleScene'
import { PixiRenderer } from '../../engine/renderer/PixiRenderer'
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

onMounted(async () => {
  if (!containerRef.value) return

  try {
    if (!sceneStore.currentScene) {
      sceneStore.bootstrap(createDemoScene())
    }
    if (assets.tree.length === 0) {
      await assets.openProjectFolder()
    }

    renderer = new PixiRenderer({
      container: containerRef.value,
      onEntitySelected: (entityId) => selection.selectEntity(entityId),
      onSceneMutated: () => sceneStore.markDirty()
    })
    await renderer.init(sceneStore.currentScene)
    renderer.setGridVisible(editor.showGrid)
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
      project.setStatus('已停止播放预览，返回编辑态')
      return
    }
    project.setStatus(isPaused ? '预览已暂停（可继续）' : '已进入播放预览（运行态副本）')
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
  justify-content: space-between;
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
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
</style>
