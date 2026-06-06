<template>
  <div class="group">
    <div class="group-title">Physics Body</div>
    <label class="checkbox-row">
      <input type="checkbox" :checked="body.enabled" @change="$emit('set-checked', 'enabled', $event)" />
      Enabled
    </label>
    <label>
      Body Type
      <select :value="body.bodyType || 'dynamic'" @change="$emit('set-body-type', $event)">
        <option value="static">Static</option>
        <option value="dynamic">Dynamic</option>
        <option value="kinematic">Kinematic</option>
      </select>
    </label>
    <label>Mass <input type="number" min="0" step="0.1" :value="body.mass" @input="$emit('set-number', 'mass', $event)" /></label>
    <label>Damping <input type="number" min="0" max="1" step="0.01" :value="body.damping" @input="$emit('set-number', 'damping', $event)" /></label>
    <label class="checkbox-row">
      <input type="checkbox" :checked="body.useGravity" @change="$emit('set-checked', 'useGravity', $event)" />
      Use Gravity
    </label>
    <label class="checkbox-row">
      <input type="checkbox" :checked="body.lockedRotation" @change="$emit('set-checked', 'lockedRotation', $event)" />
      Lock Rotation
    </label>
    <div class="axis-grid">
      <label>Vel X <input type="number" :value="body.velocityX" @input="$emit('set-number', 'velocityX', $event)" /></label>
      <label>Vel Y <input type="number" :value="body.velocityY" @input="$emit('set-number', 'velocityY', $event)" /></label>
      <label>Vel Z <input type="number" :value="body.velocityZ" @input="$emit('set-number', 'velocityZ', $event)" /></label>
    </div>
    <div class="axis-grid">
      <label>Ang X <input type="number" :value="body.angularVelocityX" @input="$emit('set-number', 'angularVelocityX', $event)" /></label>
      <label>Ang Y <input type="number" :value="body.angularVelocityY" @input="$emit('set-number', 'angularVelocityY', $event)" /></label>
      <label>Ang Z <input type="number" :value="body.angularVelocityZ" @input="$emit('set-number', 'angularVelocityZ', $event)" /></label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PhysicsBodyComponent } from '../../engine/components/PhysicsBodyComponent'

defineProps<{
  body: PhysicsBodyComponent
}>()

defineEmits<{
  'set-number': [key: string, event: Event]
  'set-checked': [key: string, event: Event]
  'set-body-type': [event: Event]
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
.axis-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
@media (max-width: 520px) {
  .axis-grid { grid-template-columns: 1fr; }
}
</style>
