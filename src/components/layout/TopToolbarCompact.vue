<template>
  <header class="toolbar">
    <div class="brand-block">
      <div class="brand">UNU Engine</div>
      <div class="project-meta">{{ project.name }} · {{ scene.currentScene?.name || '未加载场景' }}</div>
    </div>

    <div class="toolbar-actions">
      <label class="action-select-wrap">
        <span>项目</span>
        <select class="action-select" @change="handleProjectAction">
          <option value="">项目操作</option>
          <option value="new">新建项目</option>
          <option value="open">打开工程</option>
          <option value="saveAs">项目另存</option>
          <option value="refresh">刷新资源</option>
          <option value="import">导入图片</option>
          <option value="importAudio">导入音频</option>
        </select>
      </label>

      <label class="action-select-wrap">
        <span>场景</span>
        <select class="action-select" @change="handleSceneAction">
          <option value="">场景操作</option>
          <option value="new">新建场景</option>
          <option value="open">打开场景</option>
          <option value="save">保存场景</option>
          <option value="saveAs">另存场景</option>
        </select>
      </label>

      <label class="action-select-wrap">
        <span>实体</span>
        <select class="action-select" @change="handleEntityAction">
          <option value="">实体操作</option>
          <option value="create">新建实体</option>
          <option value="createTilemap">新建 Tilemap</option>
          <option value="duplicate">复制实体</option>
          <option value="remove">删除实体</option>
          <option value="up">图层上移</option>
          <option value="down">图层下移</option>
          <option value="savePrefab">保存 Prefab</option>
          <option value="loadPrefab">实例化 Prefab</option>
        </select>
      </label>

      <div class="tool-group">
        <button @click="editor.setTool('select')">选择</button>
        <button @click="editor.setTool('move')">移动</button>
        <button @click="editor.setTool('scale')">缩放</button>
      </div>

      <div class="tool-group">
        <button @click="editor.setRightTab('Timeline')">时间轴</button>
        <button @click="editor.toggleGrid()">{{ editor.showGrid ? '隐藏网格' : '显示网格' }}</button>
      </div>
    </div>

    <div class="status-slot">
      <button class="status-toggle" @click="project.toggleStatusPopup()">
        {{ project.statusPopupVisible ? '隐藏消息' : '显示消息' }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useSceneStore } from '../../stores/scene'

const assets = useAssetStore()
const editor = useEditorStore()
const project = useProjectStore()
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

function resetSelect(event: Event) {
  const target = event.target as HTMLSelectElement
  target.value = ''
}

async function handleProjectAction(event: Event) {
  const action = (event.target as HTMLSelectElement).value
  if (action === 'new') await runAction('新建项目', () => assets.createProject())
  else if (action === 'open') await runAction('打开工程', () => assets.openProjectFolder())
  else if (action === 'saveAs') await runAction('项目另存', () => assets.saveProjectAs())
  else if (action === 'refresh') await runAction('刷新资源', () => assets.refreshProject())
  else if (action === 'import') await runAction('导入图片', () => assets.importImages())
  else if (action === 'importAudio') await runAction('导入音频', () => assets.importAudios())
  resetSelect(event)
}

async function handleSceneAction(event: Event) {
  const action = (event.target as HTMLSelectElement).value
  if (action === 'new') await runAction('新建场景', () => scene.createNewScene())
  else if (action === 'open') await runAction('打开场景', () => scene.openSceneFromDisk())
  else if (action === 'save') await runAction('保存场景', () => scene.saveScene())
  else if (action === 'saveAs') await runAction('另存场景', () => scene.saveSceneAs())
  resetSelect(event)
}

async function handleEntityAction(event: Event) {
  const action = (event.target as HTMLSelectElement).value
  if (action === 'create') await runAction('新建实体', () => scene.createEmptyEntity())
  else if (action === 'createTilemap') await runAction('新建 Tilemap', () => scene.createTilemapEntity())
  else if (action === 'duplicate') await runAction('复制实体', () => scene.duplicateSelectedEntity())
  else if (action === 'remove') await runAction('删除实体', () => scene.removeSelectedEntity())
  else if (action === 'up') await runAction('图层上移', () => scene.moveSelectedEntityLayer(1))
  else if (action === 'down') await runAction('图层下移', () => scene.moveSelectedEntityLayer(-1))
  else if (action === 'savePrefab') await runAction('保存 Prefab', () => scene.saveSelectedAsPrefab())
  else if (action === 'loadPrefab') await runAction('实例化 Prefab', () => scene.instantiatePrefabFromDisk())
  resetSelect(event)
}
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 136px;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
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

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.action-select-wrap {
  display: grid;
  gap: 2px;
  font-size: 11px;
  color: #94a3b8;
}

.action-select {
  min-width: 112px;
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  border-radius: 8px;
  padding: 4px 8px;
}

.tool-group {
  display: inline-flex;
  gap: 6px;
}

button {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.status-slot {
  display: flex;
  justify-content: flex-end;
}

.status-toggle {
  width: 100%;
  min-width: 100px;
  white-space: nowrap;
}
</style>
