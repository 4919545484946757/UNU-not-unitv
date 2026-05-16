<template>
  <div class="group">
    <div class="group-title">Sprite</div>
    <label>Width <input type="number" :value="sprite.width" @input="$emit('set-number', 'width', $event)" /></label>
    <label>Height <input type="number" :value="sprite.height" @input="$emit('set-number', 'height', $event)" /></label>
    <label>Texture Offset X <input type="number" :value="sprite.offsetX || 0" @input="$emit('set-number', 'offsetX', $event)" /></label>
    <label>Texture Offset Y <input type="number" :value="sprite.offsetY || 0" @input="$emit('set-number', 'offsetY', $event)" /></label>
    <label>Alpha <input type="number" step="0.1" min="0" max="1" :value="sprite.alpha" @input="$emit('set-number', 'alpha', $event)" /></label>
    <div class="color-field">
      <label>
        Color
        <input type="color" :value="colorInput" @input="$emit('set-hex', 'tint', $event)" />
      </label>
      <label>
        Tint Hex
        <input :value="hexValue" placeholder="0xffffff" @input="$emit('set-hex', 'tint', $event)" />
      </label>
    </div>
    <label>Texture Path <input :value="sprite.texturePath" @input="$emit('set-text', 'texturePath', $event)" /></label>
    <div class="asset-picker">
      <button @click="$emit('apply-selected-image')">Use Selected Image</button>
      <span>{{ selectedImagePath || 'Select an image in Asset Tree first' }}</span>
    </div>
    <label class="checkbox-row">
      <input type="checkbox" :checked="sprite.visible" @change="$emit('set-checked', 'visible', $event)" />
      Visible
    </label>
  </div>
</template>

<script setup lang="ts">
import type { SpriteComponent } from '../../engine/components/SpriteComponent'

defineProps<{
  sprite: SpriteComponent
  selectedImagePath: string
  hexValue: string
  colorInput: string
}>()

defineEmits<{
  'set-number': [key: string, event: Event]
  'set-text': [key: string, event: Event]
  'set-hex': [key: string, event: Event]
  'set-checked': [key: string, event: Event]
  'apply-selected-image': []
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
.color-field { display: grid; grid-template-columns: minmax(96px, 0.65fr) minmax(0, 1fr); gap: 8px; min-width: 0; }
.color-field input[type='color'] { height: 36px; padding: 3px; cursor: pointer; }
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.asset-picker { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #9bb0c9; min-width: 0; width: 100%; }
.asset-picker span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-picker button {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
</style>
