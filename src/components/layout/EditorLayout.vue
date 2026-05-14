<template>
  <div class="editor-shell">
    <TopToolbar @return-launcher="emit('return-launcher')" />
    <EntityCreateDialog />
    <SceneListDialog />
    <KeymapDialog />
    <div ref="mainRef" class="editor-main" :style="mainStyle">
      <LeftPanel />
      <div class="resizer left-resizer" @mousedown.prevent="startResize('left', $event)"></div>
      <div ref="centerStackRef" class="center-stack" :style="centerStackStyle">
        <CenterViewport />
        <div class="console-resizer" @mousedown.prevent="startConsoleResize"></div>
        <EditorConsole />
      </div>
      <div class="resizer right-resizer" @mousedown.prevent="startResize('right', $event)"></div>
      <RightPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
const mainRef = ref<HTMLDivElement | null>(null)
const centerStackRef = ref<HTMLDivElement | null>(null)
const centerStackHeight = ref(0)
let cleanup: (() => void) | null = null
let centerStackObserver: ResizeObserver | null = null

const mainStyle = computed(() => ({
  gridTemplateColumns: `${editor.leftPanelWidth}px ${RESIZER_WIDTH}px minmax(0, 1fr) ${RESIZER_WIDTH}px ${editor.rightPanelWidth}px`
}))

const effectiveConsoleHeight = computed(() => {
  const available = centerStackHeight.value || window.innerHeight
  const maxByLayout = Math.max(96, available - MIN_SCENE_VIEW_HEIGHT - 6)
  return Math.min(editor.consoleHeight, maxByLayout)
})

const centerStackStyle = computed(() => ({
  gridTemplateRows: `minmax(${MIN_SCENE_VIEW_HEIGHT}px, 1fr) 6px ${effectiveConsoleHeight.value}px`
}))

function clampPanelWidths(nextLeft: number, nextRight: number) {
  const mainWidth = mainRef.value?.clientWidth ?? window.innerWidth
  const maxLeft = Math.max(220, mainWidth - RESIZER_WIDTH * 2 - editor.rightPanelWidth - MIN_CENTER_WIDTH)
  const maxRight = Math.max(240, mainWidth - RESIZER_WIDTH * 2 - editor.leftPanelWidth - MIN_CENTER_WIDTH)

  return {
    left: Math.max(220, Math.min(Math.min(640, maxLeft), nextLeft)),
    right: Math.max(240, Math.min(Math.min(720, maxRight), nextRight))
  }
}

function startResize(side: 'left' | 'right', event: MouseEvent) {
  const startX = event.clientX
  const startLeft = editor.leftPanelWidth
  const startRight = editor.rightPanelWidth

  const onMove = (moveEvent: MouseEvent) => {
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
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.classList.remove('is-resizing-panels')
    window.dispatchEvent(new CustomEvent('unu:layout-resize-end'))
    cleanup = null
  }

  cleanup?.()
  cleanup = onUp
  document.body.classList.add('is-resizing-panels')
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function startConsoleResize(event: MouseEvent) {
  const startY = event.clientY
  const startHeight = editor.consoleHeight

  const onMove = (moveEvent: MouseEvent) => {
    const delta = moveEvent.clientY - startY
    editor.setConsoleHeight(startHeight - delta)
  }

  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.classList.remove('is-resizing-panels')
    window.dispatchEvent(new CustomEvent('unu:layout-resize-end'))
    cleanup = null
  }

  cleanup?.()
  cleanup = onUp
  document.body.classList.add('is-resizing-panels')
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
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
    editor.setTool('pan')
    project.setStatus('工具切换：平移 (R)')
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
  window.addEventListener('keydown', handleGlobalShortcut)
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
  height: calc(100% - 52px);
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

