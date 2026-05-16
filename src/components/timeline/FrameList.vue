<template>
  <div class="timeline-strip">
    <button
      v-for="(framePath, index) in framePaths"
      :key="framePath + '_' + index"
      class="frame-card"
      :class="{ active: currentIndex === index, playback: currentFrame === index && previewPlaying }"
      @click="$emit('select-frame', index)"
    >
      <div class="frame-index">{{ index }}</div>
      <div class="frame-name">{{ frameLabel(framePath) }}</div>
      <div class="frame-duration">{{ frameDurations[index] ?? 1 }}x</div>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  framePaths: string[]
  frameDurations: number[]
  currentIndex: number
  currentFrame: number
  previewPlaying: boolean
}>()

defineEmits<{
  'select-frame': [index: number]
}>()

function frameLabel(path: string) {
  const normalized = String(path || '').replace(/\\/g, '/')
  if (normalized.startsWith('atlas://')) {
    const [base] = normalized.replace('atlas://', '').split('#')
    return `${base.slice(base.lastIndexOf('/') + 1) || base} · atlas`
  }
  return normalized.slice(normalized.lastIndexOf('/') + 1) || 'Frame'
}
</script>
