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
