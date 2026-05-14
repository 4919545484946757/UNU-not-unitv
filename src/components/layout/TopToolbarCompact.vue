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
          <option value="launcher">回到开始界面</option>
          <option value="saveAs">项目另存</option>
          <option value="exportGame">导出 Web 游戏</option>
          <option value="keymap">输入映射/改键</option>
          <option value="checkAssets">检查并修复资源依赖</option>
          <option value="refresh">刷新资源</option>
          <option value="import">导入图片</option>
          <option value="importAudio">导入音频</option>
        </select>
      </label>

      <label class="action-select-wrap">
        <span>场景</span>
        <select class="action-select" @change="handleSceneAction">
          <option value="">场景操作</option>
          <option value="list">场景列表</option>
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
          <option value="duplicate">复制实体</option>
          <option value="remove">删除实体</option>
          <option value="up">图层上移</option>
          <option value="down">图层下移</option>
          <option value="savePrefab">保存 Prefab</option>
          <option value="loadPrefab">实例化 Prefab</option>
        </select>
      </label>

      <div class="tool-group">
        <button :disabled="runtime.isPlaying" @click="editor.setTool('select')">选择</button>
        <button :disabled="runtime.isPlaying" @click="editor.setTool('move')">移动</button>
        <button :disabled="runtime.isPlaying" @click="editor.setTool('scale')">缩放</button>
        <button :disabled="runtime.isPlaying" @click="editor.setTool('pan')">平移</button>
      </div>

      <div class="tool-group">
        <button :disabled="runtime.isPlaying" @click="editor.openSceneListDialog()">场景列表</button>
        <button @click="editor.setRightTab('Timeline')">时间轴</button>
        <button @click="editor.toggleGrid()">{{ editor.showGrid ? '隐藏网格' : '显示网格' }}</button>
      </div>
    </div>

    <div class="status-slot">
      <button
        class="status-toggle"
        title="右键编辑信息白名单"
        @click="project.toggleStatusPopup()"
        @contextmenu.prevent.stop="openStatusFilterMenu"
      >
        {{ project.statusConsoleVisible ? '隐藏状态日志' : '显示状态日志' }}
      </button>
      <div
        v-if="statusFilterMenuOpen"
        class="status-filter-menu"
        @click.stop
        @contextmenu.prevent.stop
      >
        <div class="menu-title">状态日志白名单</div>
        <div class="menu-tip">勾选后，对应类型的状态信息会显示在控制台。</div>
        <label
          v-for="category in statusCategories"
          :key="category"
          class="filter-row"
        >
          <input
            type="checkbox"
            :checked="project.statusConsoleFilters[category]"
            @change="project.setStatusConsoleFilter(category, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ statusCategoryLabels[category] }}</span>
        </label>
        <div class="menu-actions">
          <button type="button" @click="project.setAllStatusConsoleFilters(true)">全选</button>
          <button type="button" @click="project.setAllStatusConsoleFilters(false)">全不选</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { STATUS_LOG_CATEGORIES, STATUS_LOG_CATEGORY_LABELS, useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'

const assets = useAssetStore()
const editor = useEditorStore()
const project = useProjectStore()
const scene = useSceneStore()
const runtime = useRuntimeStore()
const statusFilterMenuOpen = ref(false)
const statusCategories = STATUS_LOG_CATEGORIES
const statusCategoryLabels = STATUS_LOG_CATEGORY_LABELS

const emit = defineEmits<{
  (event: 'return-launcher'): void
}>()

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

function openStatusFilterMenu() {
  statusFilterMenuOpen.value = true
}

function closeStatusFilterMenu() {
  statusFilterMenuOpen.value = false
}

onMounted(() => {
  window.addEventListener('click', closeStatusFilterMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeStatusFilterMenu)
})

async function handleProjectAction(event: Event) {
  const action = (event.target as HTMLSelectElement).value
  if (action === 'new') await runAction('新建项目', () => assets.createProject())
  else if (action === 'open') await runAction('打开工程', () => assets.openProjectFolder())
  else if (action === 'launcher') emit('return-launcher')
  else if (action === 'saveAs') await runAction('项目另存', () => assets.saveProjectAs())
  else if (action === 'exportGame') await runAction('导出 Web 游戏', () => assets.exportGame())
  else if (action === 'keymap') editor.openKeymapDialog()
  else if (action === 'checkAssets') await runAction('资源依赖检查', () => assets.checkAssetIntegrity())
  else if (action === 'refresh') await runAction('刷新资源', () => assets.refreshProject())
  else if (action === 'import') await runAction('导入图片', () => assets.importImages())
  else if (action === 'importAudio') await runAction('导入音频', () => assets.importAudios())
  resetSelect(event)
}

async function handleSceneAction(event: Event) {
  const action = (event.target as HTMLSelectElement).value
  if (action === 'list') editor.openSceneListDialog()
  else if (action === 'new') await runAction('新建场景', () => scene.createNewScene())
  else if (action === 'open') await runAction('打开场景', () => scene.openSceneFromDisk())
  else if (action === 'save') await runAction('保存场景', () => scene.saveScene())
  else if (action === 'saveAs') await runAction('另存场景', () => scene.saveSceneAs())
  resetSelect(event)
}

async function handleEntityAction(event: Event) {
  const action = (event.target as HTMLSelectElement).value
  if (action === 'create') editor.openEntityCreateDialog()
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
  gap: 4px;
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
  border-radius: 4px;
  padding: 4px 8px;
}
.action-select:hover {
  background: #333b4c;
}

.tool-group {
  display: inline-flex;
  gap: 4px;
}

button {
  border: transparent;
  border-bottom: 3px solid #3d4657;
  background: #20263200;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 0px;
  cursor: pointer;
}
button:hover {
  background: #384050a1;
}

.status-slot {
  position: relative;
  display: flex;
  justify-content: flex-end;
}

.status-toggle {
  width: 100%;
  min-width: 100px;
  white-space: nowrap;
}

.status-filter-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 2600;
  width: 220px;
  max-height: min(70vh, 420px);
  overflow: auto;
  padding: 10px;
  border: 1px solid #364155;
  border-radius: 10px;
  background: #171d28;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.38);
}

.menu-title {
  font-size: 13px;
  font-weight: 700;
  color: #eef4ff;
}

.menu-tip {
  margin: 5px 0 8px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.45;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 4px;
  color: #dbe7f8;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
}

.filter-row:hover {
  background: #263143;
}

.filter-row input {
  width: 14px;
  height: 14px;
  accent-color: #66d9ef;
}

.menu-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.menu-actions button {
  flex: 1;
  padding: 5px 6px;
  font-size: 12px;
  border-bottom-width: 2px;
  background: #222b3b;
}
</style>
