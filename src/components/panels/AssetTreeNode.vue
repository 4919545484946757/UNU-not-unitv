<template>
  <li>
    <div class="row" :class="{ active: isActive }" @contextmenu.stop.prevent="emitContextMenu">
      <button
        v-if="hasChildren"
        class="toggle"
        :title="isExpanded ? '折叠' : '展开'"
        @click.stop="assets.toggleFolder(node.path)"
      >
        {{ isExpanded ? '▾' : '▸' }}
      </button>
      <span v-else class="toggle spacer"></span>

      <button class="node" @click="handleClick">
        <span>{{ node.type === 'folder' ? '📁' : icon }}</span>
        <span class="label">{{ node.name }}</span>
      </button>
    </div>

    <ul v-if="hasChildren && isExpanded" class="children">
      <AssetTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        @open-context="$emit('open-context', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AssetNode } from '../../engine/assets/types'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'

const props = withDefaults(defineProps<{ node: AssetNode }>(), {})
const emit = defineEmits<{
  (e: 'open-context', payload: { event: MouseEvent; node: AssetNode }): void
}>()

const assets = useAssetStore()
const editor = useEditorStore()

const isActive = computed(() => assets.selectedPath === props.node.path || assets.selectedAssetPath === props.node.path)
const hasChildren = computed(() => !!props.node.children?.length)
const isExpanded = computed(() => assets.isFolderExpanded(props.node.path))
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

function emitContextMenu(event: MouseEvent) {
  emit('open-context', { event, node: props.node })
}
</script>

<style scoped>
li { list-style: none; }
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  border-radius: 8px;
}
.row.active { background: rgba(86, 182, 194, 0.12); }
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
}
.spacer { display: inline-block; }
.node {
  min-width: max-content;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: #1a2030;
  border-radius: 8px;
  border: 1px solid transparent;
  color: #dbe4ee;
  cursor: pointer;
}
.row.active .node { border-color: #56b6c2; }
.label {
  white-space: nowrap;
}
.children { margin: 4px 0 0 18px; padding: 0; display: grid; gap: 4px; }
</style>
