<template>
  <aside class="panel right-panel">
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="{ active: editor.rightTab === tab }"
        @click="editor.setRightTab(tab)"
      >
        {{ tab }}
      </button>
    </div>

    <div class="content">
      <div class="scroll-inner">
        <InspectorPanel v-if="editor.rightTab === 'Inspector'" />
        <ScriptEditorPanel v-else-if="editor.rightTab === 'Script'" />
        <TimelinePanel v-else />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useEditorStore } from '../../stores/editor'
import InspectorPanel from '../panels/InspectorPanel.vue'
import ScriptEditorPanel from '../panels/ScriptEditorPanel.vue'
import TimelinePanel from '../panels/TimelinePanel.vue'

const editor = useEditorStore()
const tabs = ['Inspector', 'Script', 'Timeline'] as const
</script>

<style scoped>
.panel {
  background: #131720;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.right-panel {
  display: grid;
  grid-template-rows: 40px minmax(0, 1fr);
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
.content {
  overflow: auto;
  padding: 12px;
  min-height: 0;
  min-width: 0;
}
.scroll-inner {
  width: 100%;
  min-width: 0;
  min-height: 100%;
  height: 100%;
  display: grid;
}
</style>
