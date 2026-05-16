<template>
  <div class="group">
    <div class="group-title">Collider</div>
    <label>Width <input type="number" :value="collider.width" @input="$emit('set-number', 'width', $event)" /></label>
    <label>Height <input type="number" :value="collider.height" @input="$emit('set-number', 'height', $event)" /></label>
    <label>Offset X <input type="number" :value="collider.offsetX" @input="$emit('set-number', 'offsetX', $event)" /></label>
    <label>Offset Y <input type="number" :value="collider.offsetY" @input="$emit('set-number', 'offsetY', $event)" /></label>
    <label>
      Collision Layer
      <select :value="collider.layer || 'Default'" @change="$emit('set-layer', $event)">
        <option v-for="layer in collisionLayers" :key="layer" :value="layer">{{ layer }}</option>
      </select>
    </label>
    <div class="collision-mask">
      <div class="mini-title">Collides With</div>
      <label v-for="layer in collisionLayers" :key="`mask_${layer}`" class="checkbox-row">
        <input
          type="checkbox"
          :checked="collider.collidesWith?.includes(layer) ?? true"
          @change="$emit('set-mask-layer', layer, $event)"
        />
        {{ layer }}
      </label>
    </div>
    <label class="checkbox-row">
      <input type="checkbox" :checked="collider.isTrigger" @change="$emit('set-checked', 'isTrigger', $event)" />
      Trigger
    </label>
  </div>
</template>

<script setup lang="ts">
import type { ColliderComponent, CollisionLayer } from '../../engine/components/ColliderComponent'

defineProps<{
  collider: ColliderComponent
  collisionLayers: readonly CollisionLayer[]
}>()

defineEmits<{
  'set-number': [key: string, event: Event]
  'set-layer': [event: Event]
  'set-mask-layer': [layer: CollisionLayer, event: Event]
  'set-checked': [key: string, event: Event]
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
.collision-mask {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 8px;
  padding: 8px;
  border: 1px solid #2a3446;
  border-radius: 8px;
  background: #131b28;
}
.collision-mask .mini-title { grid-column: 1 / -1; color: #8fa3bf; font-size: 12px; }
.collision-mask .checkbox-row { font-size: 12px; }
</style>
