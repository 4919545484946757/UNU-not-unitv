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
    { label: '新建实体', action: () => editor.openEntityCreateDialog() },
    { label: '复制实体', action: () => scene.duplicateSelectedEntity() },
    { label: '删除实体', action: () => scene.removeSelectedEntity() },
    { label: '图层上移', action: () => scene.moveSelectedEntityLayer(1) },
    { label: '图层下移', action: () => scene.moveSelectedEntityLayer(-1) }
  ])
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
</style>

