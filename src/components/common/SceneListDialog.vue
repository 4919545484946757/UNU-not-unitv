<template>
  <div v-if="editor.sceneListDialogVisible" class="scene-dialog-mask" @click.self="close">
    <div class="scene-dialog">
      <div class="header">
        <div class="title">场景列表</div>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="actions">
        <button class="primary" :disabled="runtime.isPlaying" @click="createScene">新建场景</button>
      </div>

      <div class="list">
        <div v-for="item in scene.sceneList" :key="item.id" class="scene-item" :class="{ active: item.isCurrent }">
          <div class="meta">
            <div class="name">{{ item.name }}</div>
            <div class="sub">{{ item.entityCount }} 个实体 · {{ item.id }}</div>
          </div>
          <div class="item-actions">
            <button :disabled="runtime.isPlaying || item.isCurrent" @click="switchScene(item.id)">切换</button>
            <button :disabled="runtime.isPlaying" @click="renameScene(item.id, item.name)">重命名</button>
            <button :disabled="runtime.isPlaying" @click="duplicateScene(item.id)">复制</button>
            <button :disabled="runtime.isPlaying || scene.sceneList.length <= 1" @click="removeScene(item.id)">删除</button>
          </div>
        </div>
      </div>

      <div class="footer">
        <span v-if="runtime.isPlaying" class="tips">播放状态下不可编辑场景列表，请先停止播放。</span>
        <button @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'

const editor = useEditorStore()
const runtime = useRuntimeStore()
const scene = useSceneStore()

watch(
  () => editor.sceneListDialogVisible,
  (visible) => {
    if (!visible) return
    scene.ensureSampleSceneCatalog()
  },
  { immediate: true }
)

function close() {
  editor.closeSceneListDialog()
}

function createScene() {
  if (runtime.isPlaying) return
  const name = window.prompt('输入新场景名称', `Scene_${scene.sceneList.length + 1}`)
  if (!name) return
  scene.createNewScene(String(name).trim() || `Scene_${scene.sceneList.length + 1}`, true)
}

function switchScene(sceneId: string) {
  if (runtime.isPlaying) return
  scene.switchEditingScene(sceneId)
}

function renameScene(sceneId: string, currentName: string) {
  if (runtime.isPlaying) return
  const next = window.prompt('输入新的场景名称', currentName)
  if (next == null) return
  scene.renameScene(sceneId, next)
}

function duplicateScene(sceneId: string) {
  if (runtime.isPlaying) return
  scene.duplicateScene(sceneId)
}

function removeScene(sceneId: string) {
  if (runtime.isPlaying) return
  scene.removeScene(sceneId)
}
</script>

<style scoped>
.scene-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1210;
  background: rgba(6, 8, 13, 0.62);
  display: grid;
  place-items: center;
  padding: 20px;
}
.scene-dialog {
  width: min(760px, calc(100vw - 40px));
  max-height: min(640px, calc(100vh - 40px));
  background: #111826;
  border: 1px solid #32435e;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 10px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 14px;
  color: #cfe1f8;
}
.close-btn {
  border: 1px solid #3f5170;
  background: #1c2a42;
  color: #ecf3ff;
  border-radius: 8px;
  width: 28px;
  height: 28px;
  cursor: pointer;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.list {
  display: grid;
  gap: 8px;
  overflow: auto;
}
.scene-item {
  border: 1px solid #2d3b53;
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.scene-item.active {
  border-color: #56b6c2;
  background: rgba(36, 77, 99, 0.25);
}
.meta {
  min-width: 0;
}
.name {
  color: #ebf4ff;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  color: #90a6c4;
  font-size: 11px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
button {
  border: 1px solid #33445f;
  background: #1d2a40;
  color: #ecf2fd;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.primary {
  background: #235a7a;
  border-color: #3b7ea5;
}
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tips {
  color: #f7c76f;
  font-size: 12px;
}
</style>
