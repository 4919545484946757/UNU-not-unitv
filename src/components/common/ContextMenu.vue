<template>
  <teleport to="body">
    <div v-if="visible" ref="menuRef" class="menu" :style="styleObject" @contextmenu.prevent>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ContextMenuItem } from './contextMenuTypes'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{ (e: 'close'): void }>()
const menuRef = ref<HTMLDivElement | null>(null)
const adjustedX = ref(0)
const adjustedY = ref(0)
const maxHeight = ref(320)

const styleObject = computed(() => ({
  left: `${adjustedX.value}px`,
  top: `${adjustedY.value}px`,
  maxHeight: `${maxHeight.value}px`
}))

watch(
  () => [props.visible, props.x, props.y, props.items.length],
  () => {
    if (!props.visible) return
    adjustedX.value = props.x
    adjustedY.value = props.y
    maxHeight.value = Math.max(120, window.innerHeight - 16)
    void nextTick(adjustPosition)
  },
  { immediate: true }
)

function close() {
  emit('close')
}

function adjustPosition() {
  const menu = menuRef.value
  if (!menu) return
  const margin = 8
  const rect = menu.getBoundingClientRect()
  const availableHeight = Math.max(120, window.innerHeight - margin * 2)
  maxHeight.value = availableHeight

  const width = rect.width || 180
  const height = Math.min(rect.height || availableHeight, availableHeight)
  adjustedX.value = Math.max(margin, Math.min(props.x, window.innerWidth - width - margin))
  adjustedY.value = Math.max(margin, Math.min(props.y, window.innerHeight - height - margin))
}

async function handleItemClick(item: ContextMenuItem) {
  if (item.disabled) return
  await item.action()
  close()
}

function onWindowPointerDown(event: Event) {
  const target = event.target instanceof Node ? event.target : null
  if (target && menuRef.value?.contains(target)) return
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
  max-width: min(320px, calc(100vw - 16px));
  padding: 6px;
  display: grid;
  gap: 4px;
  overflow: auto;
  background: #161b24;
  border: 1px solid #2b3444;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}
.menu::-webkit-scrollbar {
  width: 8px;
}
.menu::-webkit-scrollbar-thumb {
  background: #2d3748;
  border-radius: 999px;
}
.menu-item {
  border: none;
  background: transparent;
  color: #dbe4ee;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.menu-item:hover:not(:disabled) {
  background: #232b3c;
}
.menu-item:disabled {
  color: #6f86a6;
  cursor: not-allowed;
}
</style>
