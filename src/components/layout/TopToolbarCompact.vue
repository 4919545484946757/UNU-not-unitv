<template>
  <header class="toolbar">
    <div class="brand-block">
      <div class="brand">UNU Engine</div>
      <div class="project-meta">{{ project.name }} · {{ scene.currentScene?.name || '未加载场景' }}</div>
    </div>

    <div class="toolbar-actions">
      <div class="action-select-wrap action-menu-wrap">
        <button class="action-menu-button" type="button" @click.stop="toggleActionMenu('project')">项目操作 ▾</button>
        <div v-if="openActionMenu === 'project'" class="action-menu" @click.stop>
          <button v-for="item in projectActions" :key="item.value" type="button" class="action-menu-item" @click="runProjectAction(item.value)">
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="action-select-wrap action-menu-wrap">
        <button class="action-menu-button" type="button" @click.stop="toggleActionMenu('scene')">场景操作 ▾</button>
        <div v-if="openActionMenu === 'scene'" class="action-menu" @click.stop>
          <button v-for="item in sceneActions" :key="item.value" type="button" class="action-menu-item" @click="runSceneAction(item.value)">
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="action-select-wrap action-menu-wrap">
        <button class="action-menu-button" type="button" @click.stop="toggleActionMenu('entity')">实体操作 ▾</button>
        <div v-if="openActionMenu === 'entity'" class="action-menu" @click.stop>
          <button v-for="item in entityActions" :key="item.value" type="button" class="action-menu-item" @click="runEntityAction(item.value)">
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="view-menu-wrap action-select-wrap">
        <button class="view-menu-button action-menu-button" type="button" @click.stop="toggleViewMenu">显示选项 ▾</button>
        <div v-if="viewMenuOpen" class="view-menu" @click.stop>
          <div class="menu-title">显示面板</div>
          <label class="filter-row">
            <input type="checkbox" :checked="editor.showLeftPanel" @change="setPanelVisible('left', $event)" />
            <span>左侧面板</span>
          </label>
          <label class="filter-row">
            <input type="checkbox" :checked="editor.showRightPanel" @change="setPanelVisible('right', $event)" />
            <span>右侧面板</span>
          </label>
          <label class="filter-row">
            <input type="checkbox" :checked="editor.showAssetBrowserPanel" @change="setPanelVisible('assets', $event)" />
            <span>素材箱面板</span>
          </label>
          <label class="filter-row">
            <input type="checkbox" :checked="editor.showBottomPanel" @change="setPanelVisible('bottom', $event)" />
            <span>下方命令/监测面板</span>
          </label>
          <label class="filter-row">
            <input
              type="checkbox"
              :checked="editor.hideChromeDuringPlay"
              @change="setHideChromeDuringPlay($event)"
            />
            <span>专注播放模式</span>
          </label>
          <div class="menu-tip">播放/调试播放时仅保留 Scene View，停止后恢复当前布局。</div>
          <div class="menu-actions">
            <button type="button" @click="setAllPanelsVisible(true)">全部显示</button>
            <button type="button" @click="setAllPanelsVisible(false)">全部隐藏</button>
          </div>
        </div>
      </div>

      <div class="tool-group">
        <button :disabled="runtime.isPlaying" @click="editor.setTool('select')">选择</button>
        <button :disabled="runtime.isPlaying" @click="editor.setTool('move')">移动</button>
        <button :disabled="runtime.isPlaying" @click="editor.setTool('scale')">缩放</button>
        <button :disabled="runtime.isPlaying" @click="editor.setTool('rotate')">旋转</button>
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
const viewMenuOpen = ref(false)
const openActionMenu = ref<'' | 'project' | 'scene' | 'entity'>('')
const statusCategories = STATUS_LOG_CATEGORIES
const statusCategoryLabels = STATUS_LOG_CATEGORY_LABELS
const projectActions = [
  { value: 'new', label: '新建项目' },
  { value: 'open', label: '打开工程' },
  { value: 'launcher', label: '回到开始界面' },
  { value: 'saveAs', label: '项目另存' },
  { value: 'exportGame', label: '导出 Web 游戏' },
  { value: 'keymap', label: '输入映射/改键' },
  { value: 'checkAssets', label: '检查并修复资源依赖' },
  { value: 'refresh', label: '刷新资源' },
  { value: 'import', label: '导入图片' },
  { value: 'importAudio', label: '导入音频' }
] as const
const sceneActions = [
  { value: 'list', label: '场景列表' },
  { value: 'new', label: '新建场景' },
  { value: 'open', label: '打开场景' },
  { value: 'save', label: '保存场景' },
  { value: 'saveAs', label: '另存场景' }
] as const
const entityActions = [
  { value: 'create', label: '新建实体' },
  { value: 'duplicate', label: '复制实体' },
  { value: 'remove', label: '删除实体' },
  { value: 'up', label: '图层上移' },
  { value: 'down', label: '图层下移' },
  { value: 'savePrefab', label: '保存 Prefab' },
  { value: 'loadPrefab', label: '实例化 Prefab' }
] as const

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

function openStatusFilterMenu() {
  statusFilterMenuOpen.value = true
  closeActionMenu()
}

function toggleActionMenu(menu: 'project' | 'scene' | 'entity') {
  openActionMenu.value = openActionMenu.value === menu ? '' : menu
  if (openActionMenu.value) {
    viewMenuOpen.value = false
    statusFilterMenuOpen.value = false
  }
}

function closeActionMenu() {
  openActionMenu.value = ''
}

function toggleViewMenu() {
  viewMenuOpen.value = !viewMenuOpen.value
  if (viewMenuOpen.value) {
    statusFilterMenuOpen.value = false
    closeActionMenu()
  }
}

function closeViewMenu() {
  viewMenuOpen.value = false
}

function closeStatusFilterMenu() {
  statusFilterMenuOpen.value = false
}

onMounted(() => {
  window.addEventListener('click', closeStatusFilterMenu)
  window.addEventListener('click', closeViewMenu)
  window.addEventListener('click', closeActionMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeStatusFilterMenu)
  window.removeEventListener('click', closeViewMenu)
  window.removeEventListener('click', closeActionMenu)
})

function setPanelVisible(panel: 'left' | 'right' | 'assets' | 'bottom', event: Event) {
  editor.setPanelVisible(panel, (event.target as HTMLInputElement).checked)
}

function setHideChromeDuringPlay(event: Event) {
  editor.setHideChromeDuringPlay((event.target as HTMLInputElement).checked)
}

function setAllPanelsVisible(visible: boolean) {
  editor.setPanelVisible('left', visible)
  editor.setPanelVisible('right', visible)
  editor.setPanelVisible('assets', visible)
  editor.setPanelVisible('bottom', visible)
}

async function runProjectAction(action: typeof projectActions[number]['value']) {
  closeActionMenu()
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
}

async function runSceneAction(action: typeof sceneActions[number]['value']) {
  closeActionMenu()
  if (action === 'list') editor.openSceneListDialog()
  else if (action === 'new') await runAction('新建场景', () => scene.createNewScene())
  else if (action === 'open') await runAction('打开场景', () => scene.openSceneFromDisk())
  else if (action === 'save') await runAction('保存场景', () => scene.saveScene())
  else if (action === 'saveAs') await runAction('另存场景', () => scene.saveSceneAs())
}

async function runEntityAction(action: typeof entityActions[number]['value']) {
  closeActionMenu()
  if (action === 'create') editor.openEntityCreateDialog()
  else if (action === 'duplicate') await runAction('复制实体', () => scene.duplicateSelectedEntity())
  else if (action === 'remove') await runAction('删除实体', () => scene.removeSelectedEntity())
  else if (action === 'up') await runAction('图层上移', () => scene.moveSelectedEntityLayer(1))
  else if (action === 'down') await runAction('图层下移', () => scene.moveSelectedEntityLayer(-1))
  else if (action === 'savePrefab') await runAction('保存 Prefab', () => scene.saveSelectedAsPrefab())
  else if (action === 'loadPrefab') await runAction('实例化 Prefab', () => scene.instantiatePrefabFromDisk())
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
  gap: 6px;
}

.action-select-wrap {
  display: grid;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
  min-width: 0;
}

.action-select-wrap > span {
  padding-left: 2px;
  line-height: 1;
}

.action-menu-button {
  min-width: 0;
  height: 30px;
  border: 1px solid #364155;
  border-bottom: 2px solid #47546a;
  background:
    linear-gradient(180deg, rgba(43, 52, 69, 0.96));
  color: #ecf0f7;
  border-radius: 8px;
  padding: 0 10px;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  cursor: pointer;
  outline: none;
  transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.action-menu-button:hover {
  border-color: #51617b;
  background-color: #333b4c;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
}

.action-menu-button:focus-visible {
  border-color: #66d9ef;
  box-shadow: 0 0 0 2px rgba(102, 217, 239, 0.18);
}

.tool-group {
  display: inline-flex;
  gap: 4px;
}

.action-menu-wrap,
.view-menu-wrap {
  position: relative;
}

.action-menu-button,
.view-menu-button {
  text-align: left;
}

.action-menu,
.view-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 2600;
  width: max-content;
  min-width: 50px;
  max-width: min(72vw, 260px);
  padding: 10px;
  border: 1px solid #364155;
  border-radius: 10px;
  background: #171d28;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.38);
}

.view-menu {
  min-width: 220px;
}

.action-menu {
  display: grid;
  gap: 3px;
}

.action-menu-item {
  width: 100%;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #dbe7f8;
  padding: 7px 8px;
  text-align: left;
  font-size: 12px;
}

.action-menu-item:hover {
  background: #263143;
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
