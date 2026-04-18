<template>
  <teleport to="body">
    <div
      v-if="project.statusPopupVisible"
      class="status-popup"
      :style="{ left: `${popupX}px`, top: `${popupY}px` }"
    >
      <div class="popup-header" @mousedown.prevent="startDrag">
        <span class="title">状态消息</span>
        <button class="close-btn" @click="project.closeStatusPopup()">×</button>
      </div>
      <div class="popup-body">
        <div class="meta-row">
          <span>{{ scene.isDirty ? '未保存' : '已同步' }}</span>
          <span>{{ runtime.fps }} FPS</span>
        </div>
        <div class="message">{{ project.statusMessage }}</div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'

const project = useProjectStore()
const runtime = useRuntimeStore()
const scene = useSceneStore()

let dragging = false
let offsetX = 0
let offsetY = 0

const popupX = computed(() => {
  if (project.statusPopupX > 0) return project.statusPopupX
  return Math.max(12, window.innerWidth - 420)
})

const popupY = computed(() => (project.statusPopupY > 0 ? project.statusPopupY : 12))

function startDrag(event: MouseEvent) {
  dragging = true
  offsetX = event.clientX - popupX.value
  offsetY = event.clientY - popupY.value
}

function handleDrag(event: MouseEvent) {
  if (!dragging) return
  const x = Math.max(0, Math.min(window.innerWidth - 320, event.clientX - offsetX))
  const y = Math.max(0, Math.min(window.innerHeight - 120, event.clientY - offsetY))
  project.setStatusPopupPosition({ x, y })
}

function stopDrag() {
  dragging = false
}

onMounted(() => {
  window.addEventListener('mousemove', handleDrag)
  window.addEventListener('mouseup', stopDrag)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleDrag)
  window.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.status-popup {
  position: fixed;
  z-index: 3100;
  width: 380px;
  max-width: min(90vw, 520px);
  background: #171d28;
  border: 1px solid #2f3a4d;
  border-radius: 12px;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #2f3a4d;
  cursor: move;
  user-select: none;
}

.title {
  font-size: 12px;
  color: #b7c5d9;
}

.close-btn {
  border: none;
  background: transparent;
  color: #dbe4ee;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.popup-body {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.meta-row {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #8fa3bf;
}

.message {
  color: #e5edf7;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
