<template>
  <div class="group">
    <div class="group-title">Camera</div>
    <template v-if="camera">
      <div class="camera-actions">
        <button class="small" :disabled="runtimePlaying" @click="$emit('set-from-editor-view')">读取当前编辑视角</button>
        <button class="small" :disabled="runtimePlaying" @click="$emit('preview-camera-view')">预览该相机视角</button>
        <button v-if="cameraPreviewActive" class="small" :disabled="runtimePlaying" @click="$emit('exit-camera-preview')">退出相机预览</button>
      </div>
      <label class="checkbox-row"><input type="checkbox" :checked="camera.enabled" @change="$emit('set-checked', 'enabled', $event)" />Enabled</label>
      <label>
        Projection
        <select :value="camera.projection || 'orthographic'" @change="$emit('set-projection', $event)">
          <option value="orthographic">Orthographic</option>
          <option value="perspective">Perspective</option>
        </select>
      </label>
      <label>Zoom <input type="number" step="0.1" min="0.1" :value="camera.zoom" @input="$emit('set-number', 'zoom', $event)" /></label>
      <label v-if="camera.projection === 'perspective'">FOV <input type="number" step="1" min="1" max="160" :value="camera.fov" @input="$emit('set-number', 'fov', $event)" /></label>
      <label>Near Clip <input type="number" step="0.01" min="0.001" :value="camera.near" @input="$emit('set-number', 'near', $event)" /></label>
      <label>Far Clip <input type="number" step="1" min="1" :value="camera.far" @input="$emit('set-number', 'far', $event)" /></label>
      <div class="subgroup">
        <div class="group-title">Scene View Controls</div>
        <label class="checkbox-row"><input type="checkbox" :checked="camera.orbitEnabled" @change="$emit('set-checked', 'orbitEnabled', $event)" />Orbit</label>
        <label class="checkbox-row"><input type="checkbox" :checked="camera.panEnabled" @change="$emit('set-checked', 'panEnabled', $event)" />Pan</label>
        <label class="checkbox-row"><input type="checkbox" :checked="camera.zoomEnabled" @change="$emit('set-checked', 'zoomEnabled', $event)" />Zoom</label>
        <div class="axis-grid">
          <label>Target X <input type="number" :value="camera.targetX" @input="$emit('set-number', 'targetX', $event)" /></label>
          <label>Target Y <input type="number" :value="camera.targetY" @input="$emit('set-number', 'targetY', $event)" /></label>
          <label>Target Z <input type="number" :value="camera.targetZ" @input="$emit('set-number', 'targetZ', $event)" /></label>
        </div>
      </div>
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
  runtimePlaying?: boolean
  cameraPreviewActive?: boolean
}>()

defineEmits<{
  'set-number': [key: string, event: Event]
  'set-text': [key: string, event: Event]
  'set-checked': [key: string, event: Event]
  'set-projection': [event: Event]
  'add-camera': []
  'set-from-editor-view': []
  'preview-camera-view': []
  'exit-camera-preview': []
}>()
</script>

<style scoped>
.group { padding: 12px; border-radius: 10px; background: #1a2030; display: grid; gap: 8px; min-width: 0; width: 100%; box-sizing: border-box; transition: all ease-in-out 0.1s; }
.group:hover { background: #202637; }
.group-title { color: #9bb0c9; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; min-width: 0; width: 100%; }
input:not([type='checkbox']),
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
.subgroup { display: grid; gap: 8px; padding: 10px; border: 1px solid #2a3445; border-radius: 8px; background: #151b28; }
.camera-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.axis-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.small {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.tips { color: #a8b5c7; }
@media (max-width: 520px) {
  .axis-grid { grid-template-columns: 1fr; }
}
</style>
