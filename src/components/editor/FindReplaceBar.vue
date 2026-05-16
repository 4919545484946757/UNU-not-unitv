<template>
  <div class="find-popover">
    <input
      ref="queryInput"
      :value="query"
      class="find-input"
      placeholder="查找"
      @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
      @keydown.enter.prevent="$emit('next', 1)"
      @keydown.shift.enter.prevent="$emit('next', -1)"
      @keydown.esc.prevent="$emit('close')"
    />
    <input
      :value="replace"
      class="find-input replace-input"
      placeholder="替换为"
      @input="$emit('update:replace', ($event.target as HTMLInputElement).value)"
      @keydown.enter.prevent="$emit('replace-current')"
      @keydown.esc.prevent="$emit('close')"
    />
    <span class="find-count">{{ matchLabel }}</span>
    <label class="find-toggle">
      <input :checked="caseSensitive" type="checkbox" @change="$emit('update:caseSensitive', ($event.target as HTMLInputElement).checked)" />
      Aa
    </label>
    <button @click="$emit('next', -1)">上一个</button>
    <button @click="$emit('next', 1)">下一个</button>
    <button @click="$emit('replace-current')">替换</button>
    <button @click="$emit('replace-all')">全部替换</button>
    <button class="find-close" title="关闭" @click="$emit('close')">×</button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

defineProps<{
  query: string
  replace: string
  caseSensitive: boolean
  matchLabel: string
}>()

defineEmits<{
  'update:query': [value: string]
  'update:replace': [value: string]
  'update:caseSensitive': [value: boolean]
  next: [direction: 1 | -1]
  'replace-current': []
  'replace-all': []
  close: []
}>()

const queryInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  void nextTick(() => {
    queryInput.value?.focus()
    queryInput.value?.select()
  })
})
</script>
