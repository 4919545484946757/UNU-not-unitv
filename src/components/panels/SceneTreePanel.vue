<template>
  <div class="scene-tree" @contextmenu.self.prevent="openPanelMenu">
    <div class="header-row">
      <div class="section-title">Scene 树</div>
      <div class="mini-actions">
        <button @click="editor.openEntityCreateDialog()">新建实体</button>
        <button :disabled="runtime.isPlaying" @click="openFolderDialog('create', selectedFolderPath)">新建类</button>
        <button @click="() => scene.duplicateSelectedEntity()">复制</button>
        <button :disabled="!scene.entityClipboard" @click="() => scene.pasteCopiedEntity()">粘贴</button>
        <button @click="() => scene.removeSelectedEntity()">删除</button>
      </div>
    </div>
    <div class="scene-switch-row">
      <label>编辑场景</label>
      <select :value="scene.currentScene?.id || ''" :disabled="runtime.isPlaying" @change="switchScene">
        <option v-for="item in scene.sceneList" :key="item.id" :value="item.id">
          {{ item.name }} ({{ item.entityCount }})
        </option>
      </select>
    </div>

    <div class="view-mode-tabs" role="tablist" aria-label="Scene tree view mode">
      <button :class="{ active: editor.sceneTreeViewMode === 'folder' }" @click="editor.setSceneTreeViewMode('folder')">
        文件树结构
      </button>
      <button :class="{ active: editor.sceneTreeViewMode === 'layer' }" @click="editor.setSceneTreeViewMode('layer')">
        图层列表视图
      </button>
    </div>

    <div v-if="editor.sceneTreeViewMode === 'layer'" class="layer-actions">
      <button @click="scene.moveSelectedEntityLayer(1)">图层上移</button>
      <button @click="scene.moveSelectedEntityLayer(-1)">图层下移</button>
    </div>

    <ul v-if="editor.sceneTreeViewMode === 'layer'" class="tree">
      <li
        v-for="entity in orderedEntities"
        :key="entity.id"
        class="entity-row layer-row"
        :class="{ active: selection.selectedEntityIdSet.has(entity.id), 'primary-active': selection.selectedEntityId === entity.id, 'drop-target': dragOverPath === `layer:${entity.id}` }"
        :draggable="!runtime.isPlaying"
        @click="selectEntity(entity.id, $event)"
        @contextmenu.stop.prevent="openEntityMenu($event, entity.id)"
        @dragstart="startEntityDrag($event, entity.id)"
        @dragover.prevent="handleLayerDragOver(entity)"
        @dragleave="dragOverPath = ''"
        @drop.prevent="dropOnLayerEntity(entity.id)"
      >
        <div class="meta">
          <span>
            {{ entity.name }}
            <em v-if="entity.prefabSourcePath" class="prefab-tag">Prefab</em>
            <em v-if="entity.prefabVariantBasePath" class="variant-tag">Variant</em>
            <em v-if="entity.getComponent('UI')" class="ui-tag">UI</em>
            <em v-if="entity.getComponent('Tilemap')" class="tilemap-tag">Tilemap</em>
            <em v-if="entity.sceneFolderPath" class="folder-tag">{{ entity.sceneFolderPath }}</em>
          </span>
          <small>{{ entity.id }}</small>
        </div>
        <strong class="layer">Z {{ entity.getTransform()?.zIndex ?? 0 }}</strong>
      </li>
    </ul>

    <ul
      v-else
      class="tree folder-tree"
      @dragover.self.prevent="dragOverPath = '__root__'"
      @dragleave.self="dragOverPath = ''"
      @drop.self.prevent="dropOnFolder('')"
    >
      <li
        v-for="row in folderRows"
        :key="row.key"
        class="entity-row"
        :class="{
          active: row.type === 'entity' ? selection.selectedEntityIdSet.has(row.entity.id) : selectedFolderPath === row.path,
          'primary-active': row.type === 'entity' && selection.selectedEntityId === row.entity.id,
          folder: row.type === 'folder',
          'drop-target': dragOverPath === (row.type === 'folder' ? row.path : row.entity.sceneFolderPath)
        }"
        :style="{ paddingLeft: `${10 + row.depth * 16}px` }"
        :draggable="!runtime.isPlaying"
        @click="row.type === 'folder' ? selectFolder(row.path, true) : selectEntity(row.entity.id, $event)"
        @contextmenu.stop.prevent="row.type === 'folder' ? openFolderMenu($event, row.path) : openEntityMenu($event, row.entity.id)"
        @dragstart="row.type === 'folder' ? startFolderDrag($event, row.path) : startEntityDrag($event, row.entity.id)"
        @dragover.prevent="handleRowDragOver(row)"
        @dragleave="dragOverPath = ''"
        @drop.prevent="row.type === 'folder' ? dropOnFolder(row.path) : dropOnFolder(row.entity.sceneFolderPath)"
      >
        <template v-if="row.type === 'folder'">
          <div class="meta folder-meta">
            <span><strong class="folder-caret">{{ expandedFolders.has(row.path) ? '▾' : '▸' }}</strong> {{ row.name }}</span>
            <small>{{ row.path }} · {{ row.count }} 个实体</small>
          </div>
          <strong class="layer">类</strong>
        </template>
        <template v-else>
          <div class="meta">
            <span>
              {{ row.entity.name }}
              <em v-if="row.entity.prefabSourcePath" class="prefab-tag">Prefab</em>
              <em v-if="row.entity.prefabVariantBasePath" class="variant-tag">Variant</em>
              <em v-if="row.entity.getComponent('UI')" class="ui-tag">UI</em>
              <em v-if="row.entity.getComponent('Tilemap')" class="tilemap-tag">Tilemap</em>
            </span>
            <small>{{ row.entity.id }}</small>
          </div>
          <strong class="layer">Z {{ row.entity.getTransform()?.zIndex ?? 0 }}</strong>
        </template>
      </li>
    </ul>

    <ContextMenu :visible="menu.visible" :x="menu.x" :y="menu.y" :items="menu.items" @close="closeMenu" />

    <div v-if="entityDialog.visible" class="entity-dialog-mask" @click.self="closeEntityDialog">
      <div class="entity-dialog">
        <div class="dialog-title-row">
          <strong>编辑实体信息</strong>
          <button class="close-btn" @click="closeEntityDialog">×</button>
        </div>
        <label>
          实体名称
          <input v-model="entityDialog.name" type="text" :disabled="runtime.isPlaying" @keydown.enter.prevent="submitEntityDialog" />
        </label>
        <label>
          实体 ID
          <input v-model="entityDialog.id" type="text" :disabled="runtime.isPlaying" @keydown.enter.prevent="submitEntityDialog" />
        </label>
        <label>
          分类 / 文件夹路径
          <input v-model="entityDialog.folderPath" type="text" placeholder="例如 Enemy/Flying，留空为根目录" :disabled="runtime.isPlaying" @keydown.enter.prevent="submitEntityDialog" />
        </label>
        <p class="dialog-tip">脚本可通过 <code>ctx.api.findEntitiesByClass('Enemy')</code> 找到该分类及子分类下的实体。</p>
        <p v-if="entityDialog.error" class="dialog-error">{{ entityDialog.error }}</p>
        <div class="dialog-actions">
          <button @click="closeEntityDialog">取消</button>
          <button :disabled="runtime.isPlaying" @click="submitEntityDialog">确定</button>
        </div>
      </div>
    </div>

    <div v-if="folderDialog.visible" class="entity-dialog-mask" @click.self="closeFolderDialog">
      <div class="entity-dialog">
        <div class="dialog-title-row">
          <strong>{{ folderDialog.mode === 'create' ? '新建类文件夹' : '重命名类文件夹' }}</strong>
          <button class="close-btn" @click="closeFolderDialog">×</button>
        </div>
        <label>
          类文件夹名称
          <input v-model="folderDialog.name" type="text" :disabled="runtime.isPlaying" @keydown.enter.prevent="submitFolderDialog" />
        </label>
        <p class="dialog-tip">
          父级：<code>{{ folderDialog.parentPath || '根目录' }}</code>
          <br />
          可使用斜杠创建嵌套类，例如 <code>Enemy/Flying</code>。
        </p>
        <p v-if="folderDialog.error" class="dialog-error">{{ folderDialog.error }}</p>
        <div class="dialog-actions">
          <button @click="closeFolderDialog">取消</button>
          <button :disabled="runtime.isPlaying" @click="submitFolderDialog">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Entity } from '../../engine/core/Entity'
import { useEditorStore } from '../../stores/editor'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'
import ContextMenu from '../common/ContextMenu.vue'
import type { ContextMenuItem } from '../common/contextMenuTypes'

type FolderRow = { type: 'folder'; key: string; path: string; name: string; depth: number; count: number }
type EntityRow = { type: 'entity'; key: string; entity: Entity; depth: number }
type SceneTreeRow = FolderRow | EntityRow

type FolderNode = {
  name: string
  path: string
  folders: Map<string, FolderNode>
  entities: Entity[]
}

const editor = useEditorStore()
const runtime = useRuntimeStore()
const scene = useSceneStore()
const selection = useSelectionStore()
const menu = reactive({ visible: false, x: 0, y: 0, items: [] as ContextMenuItem[] })
const expandedFolders = ref(new Set<string>())
const knownFolders = ref(new Set<string>())
const selectedFolderPath = ref('')
const dragOverPath = ref('')
const dragPayload = ref<null | { type: 'folder'; path: string } | { type: 'entity'; ids: string[] }>(null)
const entityDialog = reactive({
  visible: false,
  entityId: '',
  name: '',
  id: '',
  folderPath: '',
  error: ''
})
const folderDialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'rename',
  sourcePath: '',
  parentPath: '',
  name: '',
  error: ''
})

const orderedEntities = computed(() =>
  [...scene.entities].sort((a, b) => (a.getTransform()?.zIndex ?? 0) - (b.getTransform()?.zIndex ?? 0))
)

const folderRows = computed<SceneTreeRow[]>(() => {
  const root: FolderNode = { name: '', path: '', folders: new Map(), entities: [] }
  for (const folderPath of scene.currentScene?.sceneFolders || []) {
    ensureFolderNode(root, normalizeSceneFolderPath(folderPath))
  }
  for (const entity of orderedEntities.value) {
    const path = normalizeSceneFolderPath(entity.sceneFolderPath)
    if (!path) {
      root.entities.push(entity)
      continue
    }
    const parts = path.split('/')
    const node = ensureFolderNode(root, parts.join('/'))
    node.entities.push(entity)
  }
  const rows: SceneTreeRow[] = []
  appendFolderRows(root, rows, 0)
  return rows
})

function ensureFolderNode(root: FolderNode, folderPath: string) {
  const parts = normalizeSceneFolderPath(folderPath).split('/').filter(Boolean)
  let node = root
  let currentPath = ''
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part
    if (!node.folders.has(part)) {
      node.folders.set(part, { name: part, path: currentPath, folders: new Map(), entities: [] })
      if (!knownFolders.value.has(currentPath)) {
        knownFolders.value.add(currentPath)
        expandedFolders.value.add(currentPath)
      }
    }
    node = node.folders.get(part)!
  }
  return node
}

function appendFolderRows(node: FolderNode, rows: SceneTreeRow[], depth: number) {
  for (const folder of [...node.folders.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    rows.push({ type: 'folder', key: `folder:${folder.path}`, path: folder.path, name: folder.name, depth, count: countFolderEntities(folder) })
    if (expandedFolders.value.has(folder.path)) appendFolderRows(folder, rows, depth + 1)
  }
  for (const entity of node.entities) rows.push({ type: 'entity', key: `entity:${entity.id}`, entity, depth })
}

function countFolderEntities(node: FolderNode): number {
  let count = node.entities.length
  for (const child of node.folders.values()) count += countFolderEntities(child)
  return count
}

function normalizeSceneFolderPath(value: unknown) {
  return String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')
}

function closeMenu() {
  menu.visible = false
}

function showMenu(event: MouseEvent, items: ContextMenuItem[]) {
  menu.x = event.clientX
  menu.y = event.clientY
  menu.items = items
  menu.visible = true
}

function toggleFolder(path: string) {
  const next = new Set(expandedFolders.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  expandedFolders.value = next
}

function selectFolder(path: string, shouldToggle = false) {
  selectedFolderPath.value = normalizeSceneFolderPath(path)
  selection.clearSelection()
  if (shouldToggle) toggleFolder(selectedFolderPath.value)
}

function selectEntity(entityId: string, event?: MouseEvent) {
  selectedFolderPath.value = ''
  if (event?.shiftKey) selection.toggleEntity(entityId)
  else selection.selectEntity(entityId)
}

function openPanelMenu(event: MouseEvent) {
  showMenu(event, [
    { label: '新建实体', action: () => editor.openEntityCreateDialog() },
    { label: '新建根类文件夹', disabled: runtime.isPlaying, action: () => openFolderDialog('create', '') },
    { label: '粘贴类文件夹到根目录', disabled: !scene.folderClipboard || runtime.isPlaying, action: () => pasteFolder('') },
    { label: '复制当前实体', disabled: !selection.selectedEntityId, action: () => scene.duplicateSelectedEntity() },
    { label: '粘贴实体', disabled: !scene.entityClipboard || runtime.isPlaying, action: () => scene.pasteCopiedEntity() },
    { label: '删除当前实体', disabled: !selection.selectedEntityId, action: () => scene.removeSelectedEntity() },
    { label: '清除当前实体分类', disabled: !selection.selectedEntityId || runtime.isPlaying, action: () => scene.updateSelectedEntityFolderPath('') }
  ])
}

function openFolderMenu(event: MouseEvent, folderPath: string) {
  selectFolder(folderPath, false)
  showMenu(event, [
    { label: `折叠/展开：${folderPath}`, action: () => toggleFolder(folderPath) },
    { label: '显示此类及子类实体调试框', action: () => setFolderDebugFrameVisible(folderPath, true) },
    { label: '隐藏此类及子类实体调试框', action: () => setFolderDebugFrameVisible(folderPath, false) },
    { label: '新建子类文件夹', disabled: runtime.isPlaying, action: () => openFolderDialog('create', folderPath) },
    { label: '重命名类文件夹', disabled: runtime.isPlaying, action: () => openFolderDialog('rename', folderPath) },
    { label: '复制类文件夹', action: () => scene.copySceneFolder(folderPath) },
    { label: '粘贴类文件夹到此处', disabled: !scene.folderClipboard || runtime.isPlaying, action: () => pasteFolder(folderPath) },
    { label: '删除类文件夹', disabled: runtime.isPlaying, action: () => deleteFolder(folderPath) },
    { label: '将当前选中实体移入此类', disabled: !selection.selectedEntityId || runtime.isPlaying, action: () => scene.updateSelectedEntityFolderPath(folderPath) },
    { label: '选择此类第一个实体', disabled: !firstEntityInFolder(folderPath), action: () => selectFirstEntityInFolder(folderPath) },
    { label: '新建实体', action: () => editor.openEntityCreateDialog() }
  ])
}

function firstEntityInFolder(folderPath: string) {
  const normalized = normalizeSceneFolderPath(folderPath)
  return orderedEntities.value.find((entity) => {
    const current = normalizeSceneFolderPath(entity.sceneFolderPath)
    return current === normalized || current.startsWith(`${normalized}/`)
  }) || null
}

function selectFirstEntityInFolder(folderPath: string) {
  const first = firstEntityInFolder(folderPath)
  if (first) selectEntity(first.id)
}

function openEntityMenu(event: MouseEvent, entityId: string) {
  if (!selection.selectedEntityIdSet.has(entityId)) selectEntity(entityId)
  const entity = scene.currentScene?.getEntityById(entityId)
  const debugVisible = entity?.debugFrameVisible !== false
  showMenu(event, [
    { label: '选中实体', action: () => selection.selectEntity(entityId) },
    { label: debugVisible ? '隐藏调试框' : '显示调试框', action: () => toggleEntityDebugFrameVisible(entityId) },
    { label: '编辑实体信息/分类', disabled: runtime.isPlaying, action: () => openEntityDialog(entityId) },
    { label: '重命名实体', disabled: runtime.isPlaying, action: () => openEntityDialog(entityId, 'name') },
    { label: '修改实体 ID', disabled: runtime.isPlaying, action: () => openEntityDialog(entityId, 'id') },
    { label: '设置分类/文件夹', disabled: runtime.isPlaying, action: () => openEntityDialog(entityId, 'folder') },
    { label: '清除分类/文件夹', disabled: runtime.isPlaying, action: () => scene.updateEntityFolderPath(entityId, '') },
    { label: '新建实体', action: () => editor.openEntityCreateDialog() },
    { label: '复制实体', action: () => scene.duplicateSelectedEntity() },
    { label: '粘贴实体', disabled: !scene.entityClipboard || runtime.isPlaying, action: () => scene.pasteCopiedEntity() },
    { label: '删除实体', disabled: runtime.isPlaying, action: () => scene.removeEntityById(entityId) },
    { label: '图层上移', action: () => scene.moveSelectedEntityLayer(1) },
    { label: '图层下移', action: () => scene.moveSelectedEntityLayer(-1) }
  ])
}

function toggleEntityDebugFrameVisible(entityId: string) {
  const entity = scene.currentScene?.getEntityById(entityId)
  if (!entity) return
  entity.debugFrameVisible = entity.debugFrameVisible === false
  scene.markDirty()
}

function setFolderDebugFrameVisible(folderPath: string, visible: boolean) {
  const normalized = normalizeSceneFolderPath(folderPath)
  let changed = false
  for (const entity of orderedEntities.value) {
    const current = normalizeSceneFolderPath(entity.sceneFolderPath)
    if (current !== normalized && !current.startsWith(`${normalized}/`)) continue
    if (entity.debugFrameVisible === visible) continue
    entity.debugFrameVisible = visible
    changed = true
  }
  if (changed) scene.markDirty()
}

function openEntityDialog(entityId: string, focus: 'name' | 'id' | 'folder' | 'both' = 'both') {
  if (runtime.isPlaying) return
  const entity = scene.currentScene?.getEntityById(entityId)
  if (!entity) return
  selectEntity(entityId)
  entityDialog.entityId = entityId
  entityDialog.name = entity.name
  entityDialog.id = entity.id
  entityDialog.folderPath = entity.sceneFolderPath || ''
  entityDialog.error = ''
  entityDialog.visible = true
  if (focus === 'name' || focus === 'id' || focus === 'folder') {
    window.requestAnimationFrame(() => {
      const index = focus === 'name' ? 1 : focus === 'id' ? 2 : 3
      const input = document.querySelector<HTMLInputElement>(`.entity-dialog label:nth-of-type(${index}) input`)
      input?.focus()
      input?.select()
    })
  }
}

function closeEntityDialog() {
  entityDialog.visible = false
  entityDialog.error = ''
}

function submitEntityDialog() {
  if (!entityDialog.visible || runtime.isPlaying) return
  const normalizedName = String(entityDialog.name || '').trim()
  const normalizedId = String(entityDialog.id || '').trim()
  const normalizedFolder = normalizeSceneFolderPath(entityDialog.folderPath)
  if (!normalizedName) {
    entityDialog.error = '实体名称不能为空。'
    return
  }
  if (!normalizedId) {
    entityDialog.error = '实体 ID 不能为空。'
    return
  }
  if (/\s/.test(normalizedId)) {
    entityDialog.error = '实体 ID 不能包含空白字符。'
    return
  }
  const targetEntity = scene.currentScene?.getEntityById(entityDialog.entityId)
  if (!targetEntity) {
    entityDialog.error = '未找到当前选中的实体。'
    return
  }
  selectEntity(targetEntity.id)
  const nameOk = scene.renameSelectedEntity(normalizedName)
  if (!nameOk) {
    entityDialog.error = '实体重命名失败，请检查输入。'
    return
  }
  const idOk = scene.updateSelectedEntityId(normalizedId)
  if (!idOk) {
    entityDialog.error = '实体 ID 更新失败，请检查是否重复。'
    return
  }
  scene.updateEntityFolderPath(normalizedId, normalizedFolder)
  closeEntityDialog()
}

function openFolderDialog(mode: 'create' | 'rename', path = '') {
  if (runtime.isPlaying) return
  const normalized = normalizeSceneFolderPath(path)
  folderDialog.visible = true
  folderDialog.mode = mode
  folderDialog.sourcePath = mode === 'rename' ? normalized : ''
  folderDialog.parentPath = mode === 'rename' ? getFolderParentPath(normalized) : normalized
  folderDialog.name = mode === 'rename' ? getFolderBaseName(normalized) : ''
  folderDialog.error = ''
  window.requestAnimationFrame(() => {
    const input = document.querySelector<HTMLInputElement>('.entity-dialog input')
    input?.focus()
    input?.select()
  })
}

function closeFolderDialog() {
  folderDialog.visible = false
  folderDialog.error = ''
}

function submitFolderDialog() {
  if (!folderDialog.visible || runtime.isPlaying) return
  const name = normalizeSceneFolderPath(folderDialog.name)
  if (!name) {
    folderDialog.error = '类文件夹名称不能为空。'
    return
  }
  if (folderDialog.mode === 'create') {
    const created = scene.createSceneFolder(folderDialog.parentPath, name)
    if (!created) {
      folderDialog.error = '新建类文件夹失败。'
      return
    }
    selectedFolderPath.value = String(created)
  } else {
    const renamed = scene.renameSceneFolder(folderDialog.sourcePath, name)
    if (!renamed) {
      folderDialog.error = '重命名类文件夹失败。'
      return
    }
    selectedFolderPath.value = String(renamed)
  }
  closeFolderDialog()
}

function deleteFolder(folderPath: string) {
  const normalized = normalizeSceneFolderPath(folderPath)
  const ok = scene.deleteSceneFolder(normalized)
  if (ok && selectedFolderPath.value && isFolderInside(selectedFolderPath.value, normalized)) selectedFolderPath.value = ''
}

function pasteFolder(targetParentPath: string) {
  const pasted = scene.pasteSceneFolder(targetParentPath)
  if (pasted) selectedFolderPath.value = String(pasted)
}

function startFolderDrag(event: DragEvent, folderPath: string) {
  if (runtime.isPlaying) return
  dragPayload.value = { type: 'folder', path: normalizeSceneFolderPath(folderPath) }
  event.dataTransfer?.setData('text/plain', `scene-folder:${folderPath}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function startEntityDrag(event: DragEvent, entityId: string) {
  if (runtime.isPlaying) return
  if (!selection.selectedEntityIdSet.has(entityId)) selectEntity(entityId)
  const ids = selection.selectedEntityIds.length ? [...selection.selectedEntityIds] : [entityId]
  dragPayload.value = { type: 'entity', ids }
  event.dataTransfer?.setData('text/plain', `scene-entity:${ids.join(',')}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function handleRowDragOver(row: SceneTreeRow) {
  if (runtime.isPlaying || !dragPayload.value) return
  dragOverPath.value = row.type === 'folder' ? row.path : normalizeSceneFolderPath(row.entity.sceneFolderPath)
}

function handleLayerDragOver(entity: Entity) {
  if (runtime.isPlaying || !dragPayload.value) return
  dragOverPath.value = `layer:${entity.id}`
}

function dropOnFolder(targetFolderPath: string) {
  if (runtime.isPlaying || !dragPayload.value) return
  const target = normalizeSceneFolderPath(targetFolderPath)
  if (dragPayload.value.type === 'entity') {
    for (const id of dragPayload.value.ids) scene.moveEntityToSceneFolder(id, target)
  } else if (dragPayload.value.path !== target) {
    scene.moveSceneFolder(dragPayload.value.path, target)
  }
  dragPayload.value = null
  dragOverPath.value = ''
}

function dropOnLayerEntity(targetEntityId: string) {
  if (runtime.isPlaying || !dragPayload.value || dragPayload.value.type !== 'entity') return
  selection.selectEntities(dragPayload.value.ids, dragPayload.value.ids[dragPayload.value.ids.length - 1])
  const index = orderedEntities.value.findIndex((entity) => entity.id === targetEntityId)
  if (index >= 0) scene.moveSelectedEntitiesToLayerIndex(index)
  dragPayload.value = null
  dragOverPath.value = ''
}

function getFolderParentPath(path: string) {
  const parts = normalizeSceneFolderPath(path).split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}

function getFolderBaseName(path: string) {
  const parts = normalizeSceneFolderPath(path).split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

function isFolderInside(path: string, folderPath: string) {
  const current = normalizeSceneFolderPath(path)
  const folder = normalizeSceneFolderPath(folderPath)
  return current === folder || current.startsWith(`${folder}/`)
}

function switchScene(event: Event) {
  if (runtime.isPlaying) return
  const id = (event.target as HTMLSelectElement).value
  if (!id) return
  scene.switchEditingScene(id)
}
</script>

<style scoped>
.scene-tree { position: relative; }
.header-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.section-title { color: #94a3b8; font-size: 13px; margin-bottom: 10px;}
.scene-switch-row {
  display: grid;
  gap: 6px;
  margin-bottom: 8px;
}
.scene-switch-row label {
  color: #9aa9bd;
  font-size: 12px;
}
.scene-switch-row select {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  border-radius: 8px;
  padding: 6px 8px;
}
.view-mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
  padding: 4px;
  border: 1px solid #263244;
  border-radius: 10px;
  background: #111823;
}
.view-mode-tabs button {
  border-radius: 7px;
  border-color: transparent;
  background: transparent;
  color: #96a8bd;
}
.view-mode-tabs button.active {
  background: #243044;
  color: #f4f8ff;
  border-color: #3a4a62;
}
.mini-actions, .layer-actions { display: flex; gap: 5px; margin-bottom: 8px; flex-wrap: wrap; }
button {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 4px 8px;
  border-radius: 5px;
  cursor: pointer;
}
button:hover { background: #2d3443; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.tree { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.entity-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 3px;
  border-top: 3px solid #344154;
  cursor: pointer;
}
.folder-tree .entity-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  /*background: #1a2030;*/
  border-bottom: 3px solid #344154;
  border-radius: 3px;
  border-top: none;
  cursor: pointer;
}
.entity-row:hover { background: #29324a; }
.entity-row.active { outline: 2px solid #56b6c2; }
.entity-row.folder {
  
  border-bottom: 3px solid #c69928;
  background: #1a2030;
}
.entity-row.folder:hover {
  background: #313a51;
}
.layer-row {
  background: #1a2030;
}
.folder-meta span { color: #e5f2bf; }
.folder-caret {
  display: inline-block;
  width: 16px;
  color: #cce77a;
}
.meta { display: grid; gap: 2px; min-width: 0; }
.meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-tag,
.prefab-tag,
.ui-tag,
.tilemap-tag,
.variant-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-style: normal;
}
.folder-tag { color: #f3ffd1; background: #4d5d25; }
.prefab-tag { color: #dff5ff; background: #21506a; }
.ui-tag { color: #ecfced; background: #2f5d3a; }
.tilemap-tag { color: #f4efff; background: #5f3a86; }
.variant-tag { color: #fff7e6; background: #8a5a21; }
small { color: #8ea0b8; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.layer { color: #79c0ff; font-size: 12px; white-space: nowrap; }

.entity-dialog-mask {
  position: absolute;
  inset: 0;
  background: rgba(6, 9, 14, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.entity-dialog {
  width: min(380px, calc(100% - 20px));
  border: 1px solid #334154;
  background: #131a25;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.dialog-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #dce8f8;
}

.close-btn {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}

.entity-dialog label {
  display: grid;
  gap: 6px;
  color: #9aacbf;
  font-size: 12px;
}

.entity-dialog input {
  border: 1px solid #344459;
  background: #1a2331;
  color: #f2f7ff;
  border-radius: 8px;
  padding: 8px 10px;
}

.dialog-tip {
  margin: 0;
  color: #879ab3;
  font-size: 12px;
  line-height: 1.55;
}
.dialog-tip code {
  color: #d8e9ff;
}
.dialog-error {
  margin: 0;
  color: #ff9b9b;
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
