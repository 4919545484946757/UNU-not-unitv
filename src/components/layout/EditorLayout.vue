<template>
  <div class="editor-shell">
    <TopToolbar v-if="showEditorChrome" @return-launcher="emit('return-launcher')" />
    <EntityCreateDialog />
    <SceneListDialog />
    <KeymapDialog />
    <div ref="mainRef" class="editor-main" :style="mainStyle">
      <LeftPanel v-if="showLeftPanel" />
      <div v-if="showLeftPanel" class="resizer left-resizer" @pointerdown.prevent="startResize('left', $event)"></div>
      <div ref="centerStackRef" class="center-stack" :style="centerStackStyle">
        <CenterViewport />
        <div v-if="showBottomPanel" class="console-resizer" @pointerdown.prevent="startConsoleResize"></div>
        <EditorConsole v-if="showBottomPanel" />
      </div>
      <div v-if="showRightPanel" class="resizer right-resizer" @pointerdown.prevent="startResize('right', $event)"></div>
      <RightPanel v-if="showRightPanel" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TopToolbar from './TopToolbarCompact.vue'
import EntityCreateDialog from '../common/EntityCreateDialog.vue'
import KeymapDialog from '../common/KeymapDialog.vue'
import SceneListDialog from '../common/SceneListDialog.vue'
import LeftPanel from './LeftPanel.vue'
import CenterViewport from './CenterViewport.vue'
import EditorConsole from './EditorConsole.vue'
import RightPanel from './RightPanel.vue'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'

const editor = useEditorStore()
const assets = useAssetStore()
const project = useProjectStore()
const runtime = useRuntimeStore()
const scene = useSceneStore()
const emit = defineEmits<{
  (event: 'return-launcher'): void
}>()
const RESIZER_WIDTH = 6
const MIN_CENTER_WIDTH = 320
const MIN_SCENE_VIEW_HEIGHT = 180
const COMPACT_MIN_CENTER_WIDTH = 140
const COMPACT_MIN_SCENE_VIEW_HEIGHT = 112
const COMPACT_LEFT_PANEL_WIDTH = 148
const COMPACT_RIGHT_PANEL_WIDTH = 156
const COMPACT_CONSOLE_HEIGHT = 88
const isAndroidEditorMode = import.meta.env.VITE_UNU_ANDROID_EDITOR === '1'
const mainRef = ref<HTMLDivElement | null>(null)
const centerStackRef = ref<HTMLDivElement | null>(null)
const centerStackHeight = ref(0)
const compactViewport = ref(false)
let cleanup: (() => void) | null = null
let centerStackObserver: ResizeObserver | null = null

const minCenterWidth = computed(() => (compactViewport.value ? COMPACT_MIN_CENTER_WIDTH : MIN_CENTER_WIDTH))
const minSceneViewHeight = computed(() => (compactViewport.value ? COMPACT_MIN_SCENE_VIEW_HEIGHT : MIN_SCENE_VIEW_HEIGHT))
const minLeftPanelWidth = computed(() => (compactViewport.value ? 128 : 220))
const minRightPanelWidth = computed(() => (compactViewport.value ? 140 : 240))
const maxLeftPanelWidth = computed(() => (compactViewport.value ? 420 : 640))
const maxRightPanelWidth = computed(() => (compactViewport.value ? 460 : 720))
const focusSceneView = computed(() => runtime.isPlaying && editor.hideChromeDuringPlay)
const showEditorChrome = computed(() => !focusSceneView.value)
const showLeftPanel = computed(() => editor.showLeftPanel && !focusSceneView.value)
const showRightPanel = computed(() => editor.showRightPanel && !focusSceneView.value)
const showBottomPanel = computed(() => editor.showBottomPanel && !focusSceneView.value)

const mainStyle = computed(() => {
  const columns = [
    ...(showLeftPanel.value ? [`${editor.leftPanelWidth}px`, `${RESIZER_WIDTH}px`] : []),
    'minmax(0, 1fr)',
    ...(showRightPanel.value ? [`${RESIZER_WIDTH}px`, `${editor.rightPanelWidth}px`] : [])
  ]
  return { gridTemplateColumns: columns.join(' ') }
})

const effectiveConsoleHeight = computed(() => {
  const available = centerStackHeight.value || window.innerHeight
  const minConsole = compactViewport.value ? 68 : 96
  const maxByLayout = Math.max(minConsole, available - minSceneViewHeight.value - 6)
  return Math.min(editor.consoleHeight, maxByLayout)
})

const centerStackStyle = computed(() => ({
  gridTemplateRows: showBottomPanel.value
    ? `minmax(${minSceneViewHeight.value}px, 1fr) 6px ${effectiveConsoleHeight.value}px`
    : 'minmax(0, 1fr)'
}))

watch(focusSceneView, () => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('unu:layout-resize-end'))
  })
})

function clampPanelWidths(nextLeft: number, nextRight: number) {
  const mainWidth = mainRef.value?.clientWidth ?? window.innerWidth
  const maxLeft = Math.max(
    minLeftPanelWidth.value,
    mainWidth - RESIZER_WIDTH * 2 - editor.rightPanelWidth - minCenterWidth.value
  )
  const maxRight = Math.max(
    minRightPanelWidth.value,
    mainWidth - RESIZER_WIDTH * 2 - editor.leftPanelWidth - minCenterWidth.value
  )

  return {
    left: Math.max(minLeftPanelWidth.value, Math.min(Math.min(maxLeftPanelWidth.value, maxLeft), nextLeft)),
    right: Math.max(minRightPanelWidth.value, Math.min(Math.min(maxRightPanelWidth.value, maxRight), nextRight))
  }
}

function refreshCompactViewport() {
  const compact = isAndroidEditorMode && Math.min(window.innerWidth, window.innerHeight) <= 540
  compactViewport.value = compact
  editor.setCompactUi(compact)
  if (!compact) return
  if (editor.leftPanelWidth > COMPACT_LEFT_PANEL_WIDTH) editor.setLeftPanelWidth(COMPACT_LEFT_PANEL_WIDTH)
  if (editor.rightPanelWidth > COMPACT_RIGHT_PANEL_WIDTH) editor.setRightPanelWidth(COMPACT_RIGHT_PANEL_WIDTH)
  if (editor.consoleHeight > COMPACT_CONSOLE_HEIGHT) editor.setConsoleHeight(COMPACT_CONSOLE_HEIGHT)
}

function startResize(side: 'left' | 'right', event: PointerEvent) {
  const startX = event.clientX
  const startLeft = editor.leftPanelWidth
  const startRight = editor.rightPanelWidth

  const onMove = (moveEvent: PointerEvent) => {
    const delta = moveEvent.clientX - startX
    if (side === 'left') {
      const next = clampPanelWidths(startLeft + delta, editor.rightPanelWidth)
      editor.setLeftPanelWidth(next.left)
    } else {
      const next = clampPanelWidths(editor.leftPanelWidth, startRight - delta)
      editor.setRightPanelWidth(next.right)
    }
  }

  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    document.body.classList.remove('is-resizing-panels')
    window.dispatchEvent(new CustomEvent('unu:layout-resize-end'))
    cleanup = null
  }

  cleanup?.()
  cleanup = onUp
  document.body.classList.add('is-resizing-panels')
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

function startConsoleResize(event: PointerEvent) {
  const startY = event.clientY
  const startHeight = editor.consoleHeight

  const onMove = (moveEvent: PointerEvent) => {
    const delta = moveEvent.clientY - startY
    editor.setConsoleHeight(startHeight - delta)
  }

  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    document.body.classList.remove('is-resizing-panels')
    window.dispatchEvent(new CustomEvent('unu:layout-resize-end'))
    cleanup = null
  }

  cleanup?.()
  cleanup = onUp
  document.body.classList.add('is-resizing-panels')
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

function handleGlobalShortcut(event: KeyboardEvent) {
  const mod = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()
  if (isTypingTarget(event.target) && !(mod && ['s', 'z', 'y'].includes(key))) return

  if (mod && key === 's') {
    event.preventDefault()
    void (event.shiftKey ? scene.saveSceneAs() : scene.saveScene())
    return
  }

  if (mod && key === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      if (assets.canRedoFileOperation) void assets.redoFileOperation()
      else scene.redo()
    } else {
      if (assets.canUndoFileOperation) void assets.undoFileOperation()
      else scene.undo()
    }
    return
  }

  if (mod && key === 'y') {
    event.preventDefault()
    if (assets.canRedoFileOperation) void assets.redoFileOperation()
    else scene.redo()
    return
  }

  if (mod && key === 'd') {
    event.preventDefault()
    scene.duplicateSelectedEntity()
    return
  }

  if (key === 'delete' || key === 'backspace') {
    event.preventDefault()
    scene.removeSelectedEntity()
    return
  }

  if (key === 'q') {
    if (runtime.isPlaying) return
    editor.setTool('select')
    project.setStatus('工具切换：选择 (Q)')
    return
  }
  if (key === 'w') {
    if (runtime.isPlaying) return
    editor.setTool('move')
    project.setStatus('工具切换：移动 (W)')
    return
  }
  if (key === 'e') {
    if (runtime.isPlaying) return
    editor.setTool('scale')
    project.setStatus('工具切换：缩放 (E)')
    return
  }
  if (key === 'r') {
    if (runtime.isPlaying) return
    editor.setTool('rotate')
    project.setStatus('工具切换：旋转 (R)')
    return
  }
  if (key === 'h') {
    if (runtime.isPlaying) return
    editor.setTool('pan')
    project.setStatus('工具切换：平移 (H)')
    return
  }
  if (key === ' ') {
    event.preventDefault()
    if (mod) {
      runtime.stop()
      project.setStatus('已停止播放预览，返回编辑态')
    }
    return
  }

  if (key === 'p') {
    event.preventDefault()
    runtime.togglePause()
    project.setStatus(runtime.isPlaying ? (runtime.isPaused ? '预览已暂停（可继续）' : '预览已继续') : '已进入播放预览（运行态副本）')
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!scene.isDirty) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  refreshCompactViewport()
  window.addEventListener('keydown', handleGlobalShortcut)
  window.addEventListener('resize', refreshCompactViewport)
  window.addEventListener('beforeunload', handleBeforeUnload)
  centerStackObserver = new ResizeObserver((entries) => {
    const height = entries[0]?.contentRect.height || centerStackRef.value?.clientHeight || 0
    centerStackHeight.value = Math.max(0, Math.round(height))
  })
  if (centerStackRef.value) {
    centerStackHeight.value = centerStackRef.value.clientHeight
    centerStackObserver.observe(centerStackRef.value)
  }
})

onBeforeUnmount(() => {
  cleanup?.()
  centerStackObserver?.disconnect()
  centerStackObserver = null
  window.removeEventListener('keydown', handleGlobalShortcut)
  window.removeEventListener('resize', refreshCompactViewport)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.editor-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0e1014;
  min-width: 0;
}

.editor-main {
  display: grid;
  flex: 1;
  height: auto;
  gap: 1px;
  background: #1a1f29;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.editor-main > * {
  min-width: 0;
  min-height: 0;
}

.center-stack {
  display: grid;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.console-resizer {
  position: relative;
  background: #151a22;
  cursor: row-resize;
  touch-action: none;
  min-height: 0;
  z-index: 6;
}

.console-resizer::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 2px;
  background: #2a3444;
}

.console-resizer:hover::after {
  background: #56b6c2;
}

.resizer {
  position: relative;
  background: #151a22;
  cursor: col-resize;
  touch-action: none;
  min-height: 0;
  z-index: 5;
}

.resizer::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  width: 2px;
  height: 100%;
  background: #2a3444;
}

.resizer:hover::after {
  background: #56b6c2;
}
</style>

