<template>
  <div class="group">
    <div class="group-title">Transform</div>
    <label>X <input type="number" :value="transform.x" @input="$emit('set-number', 'x', $event)" /></label>
    <label>Y <input type="number" :value="transform.y" @input="$emit('set-number', 'y', $event)" /></label>
    <label>Scale X <input type="number" step="0.1" :value="transform.scaleX" @input="$emit('set-number', 'scaleX', $event)" /></label>
    <label>Scale Y <input type="number" step="0.1" :value="transform.scaleY" @input="$emit('set-number', 'scaleY', $event)" /></label>
    <label>Rotation (°) <input type="number" step="1" :value="rotationDegrees" @input="$emit('set-rotation', $event)" /></label>
    <label>
      Position Mode
      <select :value="transform.positionMode || 'world'" @change="$emit('set-position-mode', $event)">
        <option value="world">World Space</option>
        <option value="viewport">Viewport Edges</option>
      </select>
    </label>
    <template v-if="(transform.positionMode || 'world') === 'viewport'">
      <div class="tips">Viewport Edges 模式下，X/Y 表示到所选横向/纵向边缘的像素距离；Center/Middle 表示相对视窗中心偏移。</div>
      <label>
        Horizontal Edge
        <select :value="transform.viewportHorizontal || 'center'" @change="$emit('set-viewport-horizontal', $event)">
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label>
        Vertical Edge
        <select :value="transform.viewportVertical || 'middle'" @change="$emit('set-viewport-vertical', $event)">
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
        </select>
      </label>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { TransformComponent } from '../../engine/components/TransformComponent'

defineProps<{
  transform: TransformComponent
  rotationDegrees: string
}>()

defineEmits<{
  'set-number': [key: string, event: Event]
  'set-rotation': [event: Event]
  'set-position-mode': [event: Event]
  'set-viewport-horizontal': [event: Event]
  'set-viewport-vertical': [event: Event]
}>()
</script>
