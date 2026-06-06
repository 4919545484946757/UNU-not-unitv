<template>
  <aside class="panel left-panel" :style="panelStyle">
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="{ active: editor.leftTab === tab.value }"
        @click="editor.leftTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <section class="tree-panel">
      <div class="scroll-inner">
        <template v-if="editor.leftTab === 'Assets'">
          <AssetTreePanel />
        </template>
        <template v-else-if="editor.leftTab === 'Scene'">
          <SceneTreePanel />
        </template>
        <template v-else>
          <PrefabPanel />
        </template>
      </div>
    </section>

    <div v-if="editor.showAssetBrowserPanel" class="horizontal-resizer" @pointerdown.prevent="startBrowserResize"></div>

    <section v-if="editor.showAssetBrowserPanel" class="browser-panel">
      <div class="scroll-inner">
        <div class="section-title">{{ is3DProject ? '模型 / 贴图 / 脚本资源' : '素材箱' }}</div>
        <AssetBrowserPanel />
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import AssetTreePanel from '../panels/AssetTreePanel.vue'
import SceneTreePanel from '../panels/SceneTreePanel.vue'
import PrefabPanel from '../panels/PrefabPanel.vue'
import AssetBrowserPanel from '../panels/AssetBrowserPanel.vue'

const editor = useEditorStore()
const project = useProjectStore()
const is3DProject = computed(() => project.renderBackend === 'three')
const tabs = computed(() => is3DProject.value
  ? [
      { value: 'Scene', label: 'Scene Graph' },
      { value: 'Assets', label: 'Assets' },
      { value: 'Prefab', label: 'Prefabs' }
    ] as const
  : [
      { value: 'Assets', label: 'Assets' },
      { value: 'Scene', label: 'Scene' },
      { value: 'Prefab', label: 'Prefab' }
    ] as const
)
let cleanup: (() => void) | null = null

const panelStyle = computed(() => ({
  gridTemplateRows: editor.showAssetBrowserPanel
    ? `${editor.compactUi ? 30 : 40}px minmax(0, 1fr) 6px ${editor.assetBrowserHeight}px`
    : `${editor.compactUi ? 30 : 40}px minmax(0, 1fr)`
}))

function startBrowserResize(event: PointerEvent) {
  const startY = event.clientY
  const startHeight = editor.assetBrowserHeight

  const onMove = (moveEvent: PointerEvent) => {
    const delta = moveEvent.clientY - startY
    editor.setAssetBrowserHeight(startHeight - delta)
  }

  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    document.body.classList.remove('is-resizing-panels')
    cleanup = null
  }

  cleanup?.()
  cleanup = onUp
  document.body.classList.add('is-resizing-panels')
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

onBeforeUnmount(() => cleanup?.())
</script>

<style scoped>
.panel {
  background: #131720;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
}
.left-panel {
  display: grid;
  min-height: 0;
  min-width: 0;
}
.tabs {
  display: flex;
  border-bottom: 1px solid #252c38;
  min-width: 0;
}
.tabs button {
  flex: 1;
  border: none;
  background: transparent;
  color: #8ea0b8;
  cursor: pointer;
  min-width: 0;
}
.tabs button.active {
  color: #fff;
  background: #1b2130;
}
.tree-panel,
.browser-panel {
  padding: 12px;
  overflow: auto;
  min-height: 0;
  min-width: 0;
}
.browser-panel {
  border-top: 1px solid #252c38;
}
.horizontal-resizer {
  position: relative;
  background: #151a22;
  cursor: row-resize;
  touch-action: none;
}
.horizontal-resizer::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 2px;
  background: #2a3444;
}
.horizontal-resizer:hover::after {
  background: #56b6c2;
}
.section-title {
  margin-bottom: 6px;
  font-size: 13px;
  color: #94a3b8;
}
.scroll-inner {
  min-width: 0;
  width: 100%;
  min-height: 100%;
}
</style>
