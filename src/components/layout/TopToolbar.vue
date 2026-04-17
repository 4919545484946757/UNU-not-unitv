<template>
  <header class="toolbar">
    <div class="brand-block">
      <div class="brand">UNU Engine</div>
      <div class="project-meta">{{ project.name }} · {{ scene.currentScene?.name || '未加载场景' }}</div>
    </div>

    <div class="toolbar-actions">
      <button @click="runAction('新建项目', () => assets.createProject())">新建项目</button>
      <button @click="runAction('打开工程', () => assets.openProjectFolder())">打开工程</button>
      <button @click="runAction('刷新资源', () => assets.refreshProject())">刷新资源</button>
      <button @click="runAction('导入图片', handleImportImages)">导入图片</button>
      <button @click="runAction('新建场景', () => scene.createNewScene())">新建场景</button>
      <button @click="runAction('打开场景', () => scene.openSceneFromDisk())">打开场景</button>
      <button @click="runAction('保存场景', () => scene.saveScene())">保存场景</button>
      <button @click="runAction('另存场景', () => scene.saveSceneAs())">另存场景</button>
      <button @click="runAction('新建实体', () => scene.createEmptyEntity())">新建实体</button>
      <button @click="runAction('保存 Prefab', () => scene.saveSelectedAsPrefab())">保存 Prefab</button>
      <button @click="runAction('实例化 Prefab', () => scene.instantiatePrefabFromDisk())">实例化 Prefab</button>
      <button @click="runAction('复制实体', () => scene.duplicateSelectedEntity())">复制实体</button>
      <button @click="runAction('删除实体', () => scene.removeSelectedEntity())">删除实体</button>
      <button @click="runAction('图层上移', () => scene.moveSelectedEntityLayer(1))">图层上移</button>
      <button @click="runAction('图层下移', () => scene.moveSelectedEntityLayer(-1))">图层下移</button>
      <button @click="editor.setTool('select')">选择</button>
      <button @click="editor.setTool('move')">移动</button>
      <button @click="editor.setTool('scale')">缩放</button>
      <button @click="editor.setRightTab('Timeline')">时间轴</button>
      <button @click="editor.toggleGrid()">{{ editor.showGrid ? '隐藏网格' : '显示网格' }}</button>
      <button class="play" @click="runAction(runtime.isPlaying ? '停止预览' : '播放预览', togglePlay)">{{ runtime.isPlaying ? '停止预览' : '播放预览' }}</button>
    </div>

    <div class="status">
      <span>{{ scene.isDirty ? '未保存' : '已同步' }}</span>
      <span>{{ runtime.fps }} FPS</span>
      <span class="message">{{ project.statusMessage }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'

const assets = useAssetStore()
const editor = useEditorStore()
const project = useProjectStore()
const runtime = useRuntimeStore()
const scene = useSceneStore()

async function runAction(label: string, action: () => void | Promise<void>) {
  try {
    await action()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`${label}失败：${message}`)
    console.error(`[UNU] toolbar action failed: ${label}`, error)
  }
}

async function handleImportImages() {
  await assets.importImages()
}

function togglePlay() {
  if (runtime.isPlaying) runtime.stop()
  else runtime.play()
}
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: 240px 1fr 260px;
  gap: 16px;
  align-items: center;
  padding: 8px 16px;
  background: #121722;
  border-bottom: 1px solid #252c38;
}
.brand-block {
  min-width: 0;
}
.brand {
  font-weight: 700;
  letter-spacing: 0.08em;
}
.project-meta {
  margin-top: 2px;
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toolbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
button {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
}
.play { background: #264653; }
.status {
  font-size: 13px;
  color: #94a3b8;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  white-space: nowrap;
  overflow: hidden;
}
.message {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
