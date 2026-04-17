<template>
  <teleport to="body">
    <div v-if="visible" class="menu" :style="styleObject" @contextmenu.prevent>
      <button
        v-for="item in items"
        :key="item.label"
        class="menu-item"
        :disabled="item.disabled"
        @click="handleItemClick(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { ContextMenuItem } from './contextMenuTypes'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const styleObject = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`
}))

function close() {
  emit('close')
}

async function handleItemClick(item: ContextMenuItem) {
  if (item.disabled) return
  await item.action()
  close()
}

function onWindowPointerDown() {
  if (props.visible) close()
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.visible) close()
}

onMounted(() => {
  window.addEventListener('pointerdown', onWindowPointerDown)
  window.addEventListener('keydown', onWindowKeydown)
  window.addEventListener('resize', onWindowPointerDown)
  window.addEventListener('scroll', onWindowPointerDown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onWindowPointerDown)
  window.removeEventListener('keydown', onWindowKeydown)
  window.removeEventListener('resize', onWindowPointerDown)
  window.removeEventListener('scroll', onWindowPointerDown, true)
})
</script>

<style scoped>
.menu {
  position: fixed;
  z-index: 2000;
  min-width: 180px;
  padding: 6px;
  display: grid;
  gap: 4px;
  background: #161b24;
  border: 1px solid #2b3444;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}
.menu-item {
  border: none;
  background: transparent;
  color: #dbe4ee;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.menu-item:hover:not(:disabled) {
  background: #232b3c;
}
.menu-item:disabled {
  color: #6f86a6;
  cursor: not-allowed;
}
</style>
