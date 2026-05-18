<template>
  <div class="group">
    <div class="group-title">Script</div>
    <template v-if="script">
      <label class="checkbox-row">
        <input type="checkbox" :checked="script.enabled" @change="$emit('set-enabled', $event)" />
        Enabled
      </label>
      <label>
        Script Path
        <input :value="script.scriptPath" placeholder="assets/scripts/example.js 或 builtin://..." @input="$emit('set-path', $event)" />
      </label>
      <div class="script-link-card">
        <div>
          <strong>Bound Script</strong>
          <span>{{ script.scriptPath || '未设置脚本路径，将只使用实体内联配置。' }}</span>
        </div>
        <button class="small" :disabled="!canOpenScriptAsset" @click="$emit('open-bound-script')">打开脚本文件</button>
      </div>
      <div class="asset-picker">
        <button :disabled="!selectedScriptAssetPath" @click="$emit('bind-selected-script')">Use Selected Script</button>
        <span>{{ selectedScriptAssetPath || 'Select a script/text asset in Asset Tree first' }}</span>
      </div>
      <div class="row-inline">
        <button class="small" @click="$emit('open-script-panel')">编辑配置</button>
        <button class="small" @click="$emit('open-external-editor')">独立窗口编辑配置</button>
        <button class="small danger" :disabled="isPlaying" @click="$emit('remove-script')">移除 Script</button>
      </div>
      <div class="tips">Script Path 指向项目脚本逻辑；实体配置内容请在 Script 面板或独立窗口中编辑。</div>
    </template>
    <template v-else>
      <div class="tips">Current entity does not have Script component.</div>
      <div class="row-inline">
        <button class="small" :disabled="isPlaying" @click="$emit('add-script')">Add Script Component</button>
        <button class="small" :disabled="isPlaying || !selectedScriptAssetPath" @click="$emit('add-selected-script')">Use Selected Script</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ScriptComponent } from '../../engine/components/ScriptComponent'

defineProps<{
  script: ScriptComponent | null
  selectedScriptAssetPath: string
  canOpenScriptAsset: boolean
  isPlaying: boolean
}>()

defineEmits<{
  'set-enabled': [event: Event]
  'set-path': [event: Event]
  'open-bound-script': []
  'bind-selected-script': []
  'open-script-panel': []
  'open-external-editor': []
  'remove-script': []
  'add-script': []
  'add-selected-script': []
}>()
</script>

<style scoped>
.group {
  padding: 12px;
  border-radius: 10px;
  background: #1a2030;
  display: grid;
  gap: 8px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  transition: all ease-in-out 0.1s;
}

.group:hover {
  background: #202637;
}

.group-title {
  color: #9bb0c9;
  font-size: 13px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  min-width: 0;
  width: 100%;
}

input:not([type='checkbox']) {
  background: #0f141d;
  color: #ecf0f7;
  border: 1px solid #313a4a;
  border-radius: 8px;
  padding: 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.script-link-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 8px;
  border: 1px solid #2a3446;
  border-radius: 8px;
  background: #131b28;
}

.script-link-card strong {
  display: block;
  color: #dbe7f5;
  font-size: 12px;
  margin-bottom: 3px;
}

.script-link-card span {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #8fa3bf;
  font-size: 12px;
}

.asset-picker {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #9bb0c9;
  min-width: 0;
  width: 100%;
}

.asset-picker span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-picker button,
.small {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.asset-picker button:disabled,
.small:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.small.danger {
  border-color: #5b2631;
  background: #3b1e27;
}

.row-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
  width: 100%;
}

.tips {
  color: #a8b5c7;
  font-size: 12px;
  line-height: 1.45;
}
</style>
