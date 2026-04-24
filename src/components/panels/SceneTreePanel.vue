<template>
  <div class="scene-tree" @contextmenu.self.prevent="openPanelMenu">
    <div class="header-row">
      <div class="section-title">Scene 树</div>
      <div class="mini-actions">
        <button @click="editor.openEntityCreateDialog()">新建实体</button>
        <button @click="scene.duplicateSelectedEntity">复制</button>
        <button @click="scene.removeSelectedEntity">删除</button>
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
    <div class="layer-actions">
      <button @click="scene.moveSelectedEntityLayer(1)">图层上移</button>
      <button @click="scene.moveSelectedEntityLayer(-1)">图层下移</button>
    </div>
    <ul class="tree">
      <li
        v-for="entity in orderedEntities"
        :key="entity.id"
        :class="{ active: selection.selectedEntityId === entity.id }"
        @click="selection.selectEntity(entity.id)"
        @contextmenu.stop.prevent="openEntityMenu($event, entity.id)"
      >
        <div class="meta">
          <span>
            {{ entity.name }}
            <em v-if="entity.prefabSourcePath" class="prefab-tag">Prefab</em>
            <em v-if="entity.prefabVariantBasePath" class="variant-tag">Variant</em>
            <em v-if="entity.getComponent('UI')" class="ui-tag">UI</em>
            <em v-if="entity.getComponent('Tilemap')" class="tilemap-tag">Tilemap</em>
          </span>
          <small>{{ entity.id }}</small>
        </div>
        <strong class="layer">Z {{ entity.getTransform()?.zIndex ?? 0 }}</strong>
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
        <p v-if="entityDialog.error" class="dialog-error">{{ entityDialog.error }}</p>
        <div class="dialog-actions">
          <button @click="closeEntityDialog">取消</button>
          <button :disabled="runtime.isPlaying" @click="submitEntityDialog">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'
import ContextMenu from '../common/ContextMenu.vue'
import type { ContextMenuItem } from '../common/contextMenuTypes'

const editor = useEditorStore()
const runtime = useRuntimeStore()
const scene = useSceneStore()
const selection = useSelectionStore()
const menu = reactive({ visible: false, x: 0, y: 0, items: [] as ContextMenuItem[] })
const entityDialog = reactive({
  visible: false,
  entityId: '',
  name: '',
  id: '',
  error: ''
})

const orderedEntities = computed(() =>
  [...scene.entities].sort((a, b) => (a.getTransform()?.zIndex ?? 0) - (b.getTransform()?.zIndex ?? 0))
)

function closeMenu() {
  menu.visible = false
}

function showMenu(event: MouseEvent, items: ContextMenuItem[]) {
  menu.x = event.clientX
  menu.y = event.clientY
  menu.items = items
  menu.visible = true
}

function openPanelMenu(event: MouseEvent) {
  showMenu(event, [
    { label: '新建实体', action: () => editor.openEntityCreateDialog() },
    { label: '复制当前实体', disabled: !selection.selectedEntityId, action: () => scene.duplicateSelectedEntity() },
    { label: '删除当前实体', disabled: !selection.selectedEntityId, action: () => scene.removeSelectedEntity() }
  ])
}

function openEntityMenu(event: MouseEvent, entityId: string) {
  selection.selectEntity(entityId)
  showMenu(event, [
    { label: '选中实体', action: () => selection.selectEntity(entityId) },
    { label: '编辑实体信息', disabled: runtime.isPlaying, action: () => openEntityDialog(entityId) },
    { label: '重命名实体', disabled: runtime.isPlaying, action: () => openEntityDialog(entityId, 'name') },
    { label: '修改实体 ID', disabled: runtime.isPlaying, action: () => openEntityDialog(entityId, 'id') },
    { label: '新建实体', action: () => editor.openEntityCreateDialog() },
    { label: '复制实体', action: () => scene.duplicateSelectedEntity() },
    { label: '删除实体', action: () => scene.removeSelectedEntity() },
    { label: '图层上移', action: () => scene.moveSelectedEntityLayer(1) },
    { label: '图层下移', action: () => scene.moveSelectedEntityLayer(-1) }
  ])
}

function openEntityDialog(entityId: string, focus: 'name' | 'id' | 'both' = 'both') {
  if (runtime.isPlaying) return
  const entity = scene.currentScene?.getEntityById(entityId)
  if (!entity) return
  selection.selectEntity(entityId)
  entityDialog.entityId = entityId
  entityDialog.name = entity.name
  entityDialog.id = entity.id
  entityDialog.error = ''
  entityDialog.visible = true
  if (focus === 'name' || focus === 'id') {
    window.requestAnimationFrame(() => {
      const selector = focus === 'name' ? '.entity-dialog label:nth-of-type(1) input' : '.entity-dialog label:nth-of-type(2) input'
      const input = document.querySelector<HTMLInputElement>(selector)
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
  selection.selectEntity(targetEntity.id)
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
  closeEntityDialog()
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
.section-title { color: #94a3b8; font-size: 13px; }
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
.mini-actions, .layer-actions { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
button {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
}
.tree { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #1a2030;
  border-radius: 8px;
  cursor: pointer;
}
li.active { outline: 1px solid #56b6c2; }
.meta { display: grid; gap: 2px; min-width: max-content; }
.prefab-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-style: normal;
  color: #dff5ff;
  background: #21506a;
}
.ui-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-style: normal;
  color: #ecfced;
  background: #2f5d3a;
}
.tilemap-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-style: normal;
  color: #f4efff;
  background: #5f3a86;
}
.variant-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-style: normal;
  color: #fff7e6;
  background: #8a5a21;
}
small { color: #8ea0b8; }
.layer { color: #79c0ff; font-size: 12px; }

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
  width: min(360px, calc(100% - 20px));
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

