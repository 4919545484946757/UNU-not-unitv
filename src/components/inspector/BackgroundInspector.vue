<template>
  <div class="group">
    <div class="group-title">Background</div>
    <template v-if="background">
      <label class="checkbox-row">
        <input type="checkbox" :checked="background.enabled" @change="$emit('set-checked', 'enabled', $event)" />
        Enabled
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="background.followCamera" @change="$emit('set-checked', 'followCamera', $event)" />
        Follow Camera
      </label>
      <label>
        Fit Mode
        <select :value="background.fitMode" @change="$emit('set-fit-mode', $event)">
          <option value="cover">cover</option>
          <option value="contain">contain</option>
        </select>
      </label>
      <div class="asset-picker">
        <button @click="$emit('apply-selected-image')">Use Selected Image As Background</button>
        <span>{{ selectedImagePath || 'Select an image in Asset Tree first' }}</span>
      </div>
    </template>
    <template v-else>
      <div class="tips">Current entity does not have Background component.</div>
      <button class="small" @click="$emit('add-background')">Add Background Component</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { BackgroundComponent } from '../../engine/components/BackgroundComponent'

defineProps<{
  background: BackgroundComponent | null
  selectedImagePath: string
}>()

defineEmits<{
  'set-checked': [key: string, event: Event]
  'set-fit-mode': [event: Event]
  'apply-selected-image': []
  'add-background': []
}>()
</script>

<style scoped>
.group { padding: 12px; border-radius: 10px; background: #1a2030; display: grid; gap: 8px; min-width: 0; width: 100%; box-sizing: border-box; transition: all ease-in-out 0.1s; }
.group:hover { background: #202637; }
.group-title { color: #9bb0c9; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; min-width: 0; width: 100%; }
select {
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
