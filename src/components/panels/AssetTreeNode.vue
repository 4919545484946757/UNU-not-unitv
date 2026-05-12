<template>
  <li>
    <div
      class="row"
      :class="{ active: isActive, 'drag-over': dragOver }"
      draggable="true"
      @contextmenu.stop.prevent="emitContextMenu"
      @dragstart.stop="handleDragStart"
      @dragend="dragOver = false"
      @dragover.prevent.stop="handleDragOver"
      @dragleave.stop="dragOver = false"
      @drop.prevent.stop="handleDrop"
    >
      <button
        v-if="hasChildren"
        class="toggle"
        :title="isExpanded ? '折叠' : '展开'"
        @click.stop="assets.toggleFolder(node.path)"
      >
        {{ isExpanded ? '▾' : '▸' }}
      </button>
      <span v-else class="toggle spacer"></span>

      <button class="node" @click="handleClick" @dblclick.stop="handleDoubleClick">
        <span>{{ node.type === 'folder' ? '📁' : icon }}</span>
        <span class="label">
          {{ node.name }}<span v-if="isDirtyTextAsset" class="dirty-dot">●</span>
        </span>
      </button>
    </div>

    <ul v-if="hasChildren && isExpanded" class="children">
      <AssetTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        @open-context="$emit('open-context', $event)"
        @preview-image="$emit('preview-image', $event)"
        @asset-drop="$emit('asset-drop', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AssetNode } from '../../engine/assets/types'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'

const props = withDefaults(defineProps<{ node: AssetNode }>(), {})
const emit = defineEmits<{
  (e: 'open-context', payload: { event: MouseEvent; node: AssetNode }): void
  (e: 'preview-image', node: AssetNode): void
  (e: 'asset-drop', payload: { sourcePath: string; targetNode: AssetNode }): void
}>()

const assets = useAssetStore()
const editor = useEditorStore()
const dragOver = ref(false)

const isActive = computed(() => assets.selectedPath === props.node.path || assets.selectedAssetPath === props.node.path)
const hasChildren = computed(() => !!props.node.children?.length)
const isExpanded = computed(() => assets.isFolderExpanded(props.node.path))
const isTextAsset = computed(() => (
  props.node.type === 'script' ||
  props.node.type === 'animation' ||
  props.node.type === 'atlas' ||
  props.node.type === 'scene' ||
  props.node.type === 'prefab'
))
const isDirtyTextAsset = computed(() => isTextAsset.value && assets.isTextAssetDirty(props.node.path))
const icon = computed(() => {
  if (props.node.type === 'image') return '🖼️'
  if (props.node.type === 'script') return '🧩'
  if (props.node.type === 'scene') return '🎬'
  if (props.node.type === 'prefab') return '📦'
  if (props.node.type === 'animation') return '🎞️'
  if (props.node.type === 'atlas') return '🧱'
  if (props.node.type === 'audio') return '🔊'
  return '📄'
})

async function handleClick() {
  if (props.node.type === 'folder') {
    assets.selectPath(props.node.path)
    assets.toggleFolder(props.node.path)
    return
  }
  await assets.selectAsset(props.node.path)
  if (props.node.type === 'script') editor.setRightTab('Script')
  if (props.node.type === 'animation' || props.node.type === 'atlas') editor.setRightTab('Timeline')
}

async function handleDoubleClick() {
  if (props.node.type === 'folder') return
  await assets.selectAsset(props.node.path)
  if (props.node.type === 'image') {
    emit('preview-image', props.node)
    return
  }
  if (props.node.type === 'script') editor.setRightTab('Script')
  if (props.node.type === 'animation' || props.node.type === 'atlas') editor.setRightTab('Timeline')
}

function emitContextMenu(event: MouseEvent) {
  emit('open-context', { event, node: props.node })
}

function handleDragStart(event: DragEvent) {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/x-unu-asset-path', props.node.path)
  event.dataTransfer.setData('text/plain', props.node.path)
}

function handleDragOver(event: DragEvent) {
  const sourcePath = event.dataTransfer?.getData('application/x-unu-asset-path') || event.dataTransfer?.getData('text/plain') || ''
  if (sourcePath && sourcePath === props.node.path) return
  dragOver.value = true
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function handleDrop(event: DragEvent) {
  dragOver.value = false
  const sourcePath = event.dataTransfer?.getData('application/x-unu-asset-path') || event.dataTransfer?.getData('text/plain') || ''
  if (!sourcePath || sourcePath === props.node.path) return
  emit('asset-drop', { sourcePath, targetNode: props.node })
}
</script>

<style scoped>
li { list-style: none; }
.row {
  display: flex;
  align-items: center;
  gap: 0px;
  padding: 2px 0;
  border-radius: 0px;
}
.row.active { background: rgba(86, 182, 194, 0.12); }
.row.drag-over {
  background: rgba(242, 201, 76, 0.16);
  outline: 1px dashed rgba(242, 201, 76, 0.75);
}
.toggle {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: #8ea0b8;
  cursor: pointer;
  font-size: x-large;
  justify-content: center;
  margin-bottom: 10px;
}
.spacer { display: inline-block; }
.node {
  min-width: max-content;
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 8px 10px;
  background: #1a203000;
  border-radius: 0px;
  border: 1px solid transparent;
  border-bottom: 2px solid #353b4b;
  color: #dbe4ee;
  cursor: pointer;
}
.row.active .node { /*border-color: #56b6c2;*/ }
.label {
  white-space: nowrap;
}
.dirty-dot {
  display: inline-block;
  margin-left: 5px;
  color: #f2c94c;
  font-size: 11px;
  line-height: 1;
  transform: translateY(-1px);
}
.children { margin: 4px 0 0 18px; padding: 0; display: grid; gap: 4px; }
</style>
