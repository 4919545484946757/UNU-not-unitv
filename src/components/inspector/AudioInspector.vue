<template>
  <div class="group">
    <div class="group-title">Audio</div>
    <template v-if="audio">
      <label class="checkbox-row">
        <input type="checkbox" :checked="audio.enabled" @change="$emit('set-checked', 'enabled', $event)" />
        Enabled
      </label>
      <label>Clip Path <input :value="audio.clipPath" @input="$emit('set-text', 'clipPath', $event)" /></label>
      <div class="asset-picker">
        <button @click="$emit('apply-selected-audio')">Use Selected Audio</button>
        <span>{{ selectedAudioPath || 'Select an audio in Asset Tree first' }}</span>
      </div>
      <label>Group
        <select :value="audio.group" @change="$emit('set-group', $event)">
          <option value="bgm">BGM</option>
          <option value="sfx">SFX</option>
          <option value="ui">UI</option>
        </select>
      </label>
      <label>Volume <input type="number" min="0" max="1" step="0.05" :value="audio.volume" @input="$emit('set-number', 'volume', $event)" /></label>
      <label class="checkbox-row"><input type="checkbox" :checked="audio.loop" @change="$emit('set-checked', 'loop', $event)" />Loop</label>
      <label class="checkbox-row"><input type="checkbox" :checked="audio.playOnStart" @change="$emit('set-checked', 'playOnStart', $event)" />Play On Start</label>
      <label class="checkbox-row"><input type="checkbox" :checked="audio.playing" @change="$emit('set-checked', 'playing', $event)" />Playing</label>
    </template>
    <template v-else>
      <div class="tips">Current entity does not have Audio component.</div>
      <button class="small" @click="$emit('add-audio')">Add Audio Component</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AudioComponent } from '../../engine/components/AudioComponent'

defineProps<{
  audio: AudioComponent | null
  selectedAudioPath: string
}>()

defineEmits<{
  'set-number': [key: string, event: Event]
  'set-text': [key: string, event: Event]
  'set-checked': [key: string, event: Event]
  'set-group': [event: Event]
  'apply-selected-audio': []
  'add-audio': []
}>()
</script>

<style scoped>
.group { padding: 12px; border-radius: 10px; background: #1a2030; display: grid; gap: 8px; min-width: 0; width: 100%; box-sizing: border-box; transition: all ease-in-out 0.1s; }
.group:hover { background: #202637; }
.group-title { color: #9bb0c9; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; min-width: 0; width: 100%; }
input:not([type='checkbox']), select {
  background: #0f141d;
  color: #ecf0f7;
  border: 1px solid #313a4a;
  border-radius: 8px;
  padding: 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.asset-picker { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #9bb0c9; min-width: 0; width: 100%; }
.asset-picker span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-picker button, .small {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.tips { color: #a8b5c7; }
</style>
