<template>
  <div class="group">
    <div class="group-title">Camera</div>
    <template v-if="camera">
      <label>Zoom <input type="number" step="0.1" min="0.1" :value="camera.zoom" @input="$emit('set-number', 'zoom', $event)" /></label>
      <label>Follow Entity ID <input :value="camera.followEntityId" @input="$emit('set-text', 'followEntityId', $event)" /></label>
      <label>Follow Smoothing <input type="number" step="0.01" min="0" max="1" :value="camera.followSmoothing" @input="$emit('set-number', 'followSmoothing', $event)" /></label>
      <label>Offset X <input type="number" :value="camera.offsetX" @input="$emit('set-number', 'offsetX', $event)" /></label>
      <label>Offset Y <input type="number" :value="camera.offsetY" @input="$emit('set-number', 'offsetY', $event)" /></label>
      <label class="checkbox-row"><input type="checkbox" :checked="camera.boundsEnabled" @change="$emit('set-checked', 'boundsEnabled', $event)" />Enable Bounds</label>
      <template v-if="camera.boundsEnabled">
        <label>Min X <input type="number" :value="camera.minX" @input="$emit('set-number', 'minX', $event)" /></label>
        <label>Max X <input type="number" :value="camera.maxX" @input="$emit('set-number', 'maxX', $event)" /></label>
        <label>Min Y <input type="number" :value="camera.minY" @input="$emit('set-number', 'minY', $event)" /></label>
        <label>Max Y <input type="number" :value="camera.maxY" @input="$emit('set-number', 'maxY', $event)" /></label>
      </template>
    </template>
    <template v-else>
      <div class="tips">Current entity does not have Camera component.</div>
      <button class="small" @click="$emit('add-camera')">Add Camera Component</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { CameraComponent } from '../../engine/components/CameraComponent'

defineProps<{
  camera: CameraComponent | null
}>()

defineEmits<{
  'set-number': [key: string, event: Event]
  'set-text': [key: string, event: Event]
  'set-checked': [key: string, event: Event]
  'add-camera': []
}>()
</script>

<style scoped>
.group { padding: 12px; border-radius: 10px; background: #1a2030; display: grid; gap: 8px; min-width: 0; width: 100%; box-sizing: border-box; transition: all ease-in-out 0.1s; }
.group:hover { background: #202637; }
.group-title { color: #9bb0c9; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; min-width: 0; width: 100%; }
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
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.small {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.tips { color: #a8b5c7; }
</style>
