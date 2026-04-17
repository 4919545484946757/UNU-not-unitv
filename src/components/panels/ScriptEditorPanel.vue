<template>
  <div class="editor-panel">
    <div class="title-row">
      <div class="title">Script Editor</div>
      <div class="badge" v-if="script">{{ script.scriptPath || '未挂载脚本' }}</div>
    </div>
    <textarea v-model="scriptText" spellcheck="false" @input="saveToComponent"></textarea>
    <div class="tips">
      运行时已接入内置脚本：`builtin://player-input`、`builtin://patrol`、`builtin://spin`。
      可在脚本中使用 `ctx.api.input` 读取键鼠输入与动作映射。
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScriptComponent } from '../../engine/components/ScriptComponent'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const sceneStore = useSceneStore()
const selection = useSelectionStore()

const entity = computed(() => sceneStore.currentScene?.getEntityById(selection.selectedEntityId) ?? null)
const script = computed(() => entity.value?.getComponent<ScriptComponent>('Script') ?? null)
const scriptText = computed({
  get: () => script.value?.sourceCode ?? defaultTemplate,
  set: (value: string) => {
    if (!script.value) return
    script.value.sourceCode = value
  }
})

const defaultTemplate = `export default {
  onInit(ctx) {},
  onStart(ctx) {},
  onUpdate(ctx) {
    const vx = ctx.api.input.getAxis('horizontal')
    const vy = ctx.api.input.getAxis('vertical')
  },
  onDestroy(ctx) {}
}`

function saveToComponent() {
  if (!script.value) return
  sceneStore.markDirty()
}
</script>

<style scoped>
.editor-panel { height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 10px; }
.title-row { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.title { color: #94a3b8; font-size: 13px; }
.badge { font-size: 12px; color: #dbe4ee; background: #202838; padding: 4px 8px; border-radius: 999px; }
textarea {
  width: 100%;
  height: 100%;
  resize: none;
  border: 1px solid #2a3140;
  border-radius: 10px;
  background: #0f141d;
  color: #dbe4ee;
  padding: 12px;
  font-family: "Cascadia Code", "Fira Code", monospace;
  font-size: 13px;
}
.tips { color: #8ea0b8; font-size: 12px; line-height: 1.6; }
</style>
