<template>
  <aside class="panel left-panel" :style="panelStyle">
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="{ active: editor.leftTab === tab }"
        @click="editor.leftTab = tab"
      >
        {{ tab }}
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

    <div class="horizontal-resizer" @mousedown.prevent="startBrowserResize"></div>

    <section class="browser-panel">
      <div class="scroll-inner">
        <div class="section-title">素材箱</div>
        <div class="section-tip">拖动中间分隔线可调整素材箱高度</div>
        <AssetBrowserPanel />
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useEditorStore } from '../../stores/editor'
import AssetTreePanel from '../panels/AssetTreePanel.vue'
import SceneTreePanel from '../panels/SceneTreePanel.vue'
import PrefabPanel from '../panels/PrefabPanel.vue'
import AssetBrowserPanel from '../panels/AssetBrowserPanel.vue'

const editor = useEditorStore()
const tabs = ['Assets', 'Scene', 'Prefab']
let cleanup: (() => void) | null = null

const panelStyle = computed(() => ({
  gridTemplateRows: `40px minmax(0, 1fr) 6px ${editor.assetBrowserHeight}px`
}))

function startBrowserResize(event: MouseEvent) {
  const startY = event.clientY
  const startHeight = editor.assetBrowserHeight

  const onMove = (moveEvent: MouseEvent) => {
    const delta = moveEvent.clientY - startY
    editor.setAssetBrowserHeight(startHeight - delta)
  }

  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.classList.remove('is-resizing-panels')
    cleanup = null
  }

  cleanup?.()
  cleanup = onUp
  document.body.classList.add('is-resizing-panels')
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
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
.section-tip {
  margin-bottom: 10px;
  font-size: 12px;
  color: #6f86a6;
}
.scroll-inner {
  min-width: max-content;
  width: max-content;
  min-height: 100%;
}
</style>
