<template>
  <div class="tilemap-window">
    <header class="toolbar">
      <div class="title-wrap">
        <strong>Tilemap Editor</strong>
        <span class="sub">{{ session?.entityName || '-' }} · {{ cols }} x {{ rows }}</span>
      </div>
      <div class="toolbar-right">
        <label>
          Mode
          <select v-model="mode" @change="emitSnapshot">
            <option value="tiles">Tiles</option>
            <option value="collision">Collision</option>
          </select>
        </label>
        <button class="ghost" @click="resetView">Reset View</button>
        <button class="danger" @click="closeWindow">×</button>
      </div>
    </header>

    <main class="content">
      <section
        ref="viewportRef"
        class="viewport"
        @mousedown="onViewportMouseDown"
        @mousemove="onViewportMouseMove"
        @mouseup="onViewportMouseUp($event)"
        @mouseleave="onViewportMouseUp()"
        @wheel.prevent="onViewportWheel"
      >
        <div class="canvas" :style="canvasStyle">
          <button
            v-for="(value, index) in activeValues"
            :key="index"
            type="button"
            class="cell"
            :class="{ selected: isCellSelected(index), collision: mode === 'collision' && Number(value) > 0 }"
            :style="mode === 'tiles' ? tileCellStyle(Number(value)) : undefined"
            @mousedown.left="onCellMouseDown($event, index)"
            @mouseenter="onCellMouseEnter(index)"
          >
            {{ value }}
          </button>
        </div>
        <div v-if="marqueeActive" class="marquee" :style="marqueeStyle"></div>
      </section>

      <aside class="sidebar">
        <div class="panel">
          <div class="panel-title">Selected Cells</div>
          <div class="info">Count: {{ selectedCount }}</div>
          <div class="info">Primary Index: {{ selectedIndex >= 0 ? selectedIndex : '-' }}</div>
          <div class="info">Coord: {{ selectedCoord }}</div>
          <label>
            Value
            <input type="number" :value="selectedValueInput" @input="onSelectedValueInput" />
          </label>
          <div class="hint">Left click to select a tile, then input number for real-time update.</div>
          <div class="hint">Middle mouse button drags the map when area is too large.</div>
        </div>

        <div class="panel">
          <div class="panel-title">Value Materials</div>
          <div v-if="materialEntries.length === 0" class="info">No material mapping yet.</div>
          <div v-else class="materials">
            <div v-for="entry in materialEntries" :key="entry.value" class="material-row">
              <span class="badge">{{ entry.value }}</span>
              <img v-if="entry.preview" class="preview" :src="entry.preview" :alt="entry.path" />
              <div v-else class="preview placeholder">N/A</div>
              <span class="path" :title="entry.path">{{ entry.path }}</span>
              <button class="mini" @click="applyMaterialValueToSelected(entry.value)">应用到当前格</button>
            </div>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface TilemapEditorInitPayload {
  entityId: string
  entityName: string
  projectRoot?: string
  mode: 'tiles' | 'collision'
  columns: number
  rows: number
  tiles: number[]
  collision: number[]
  tileTextureMap: Record<number, string>
}

const session = ref<TilemapEditorInitPayload | null>(null)
const mode = ref<'tiles' | 'collision'>('tiles')
const tiles = ref<number[]>([])
const collision = ref<number[]>([])
const tileTextureMap = ref<Record<number, string>>({})
const cols = computed(() => Math.max(1, Number(session.value?.columns ?? 1)))
const rows = computed(() => Math.max(1, Number(session.value?.rows ?? 1)))
const selectedIndex = ref(-1)
const selectedIndices = ref<number[]>([])
const viewportRef = ref<HTMLElement | null>(null)
const panX = ref(0)
const panY = ref(0)
const zoom = ref(1)
const dragging = ref(false)
const dragOrigin = ref({ x: 0, y: 0, panX: 0, panY: 0 })
const previewCache = ref<Record<string, string>>({})
const inputBuffer = ref('')
const inputBufferAt = ref(0)
const mouseDownLeft = ref(false)
const shiftSelecting = ref(false)
const pendingClickIndex = ref(-1)
const longPressTimer = ref(0)
const pointerDown = ref({ x: 0, y: 0 })
const marqueeActive = ref(false)
const marqueeStart = ref({ x: 0, y: 0 })
const marqueeEnd = ref({ x: 0, y: 0 })
const marqueeBaseSelection = ref<number[]>([])
const cellSize = computed(() => {
  const count = cols.value * rows.value
  if (count >= 1800) return 20
  if (count >= 900) return 24
  if (count >= 400) return 28
  return 34
})

const activeValues = computed(() => (mode.value === 'tiles' ? tiles.value : collision.value))
const canvasStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
  transformOrigin: '0 0',
  gridTemplateColumns: `repeat(${cols.value}, ${cellSize.value}px)`,
  gridTemplateRows: `repeat(${rows.value}, ${cellSize.value}px)`
}))
const selectedLookup = computed(() => {
  const map: Record<number, true> = {}
  for (const index of selectedIndices.value) map[index] = true
  return map
})
const selectedCount = computed(() => selectedIndices.value.length)
const selectedCoord = computed(() => {
  if (selectedIndex.value < 0) return '-'
  return `${selectedIndex.value % cols.value}, ${Math.floor(selectedIndex.value / cols.value)}`
})
const selectedValueInput = computed(() => {
  if (!selectedIndices.value.length) return ''
  const values = selectedIndices.value.map((index) => Number(activeValues.value[index] ?? 0))
  const first = values[0] ?? 0
  const allSame = values.every((value) => value === first)
  return allSame ? String(first) : ''
})
const marqueeStyle = computed(() => {
  const left = Math.min(marqueeStart.value.x, marqueeEnd.value.x)
  const top = Math.min(marqueeStart.value.y, marqueeEnd.value.y)
  const width = Math.abs(marqueeEnd.value.x - marqueeStart.value.x)
  const height = Math.abs(marqueeEnd.value.y - marqueeStart.value.y)
  return { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }
})
const materialEntries = computed(() =>
  Object.keys(tileTextureMap.value || {})
    .map((key) => Number(key))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
    .map((value) => {
      const path = String(tileTextureMap.value[value] || '')
      return { value, path, preview: previewCache.value[path] || '' }
    })
)

function normalizeArray(values: number[], size: number) {
  const next = values.slice(0, size).map((v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0))
  while (next.length < size) next.push(0)
  return next
}

function applyInitPayload(raw: unknown) {
  const payload = (raw || {}) as Partial<TilemapEditorInitPayload>
  const columns = Math.max(1, Math.round(Number(payload.columns ?? 1)))
  const rowsValue = Math.max(1, Math.round(Number(payload.rows ?? 1)))
  const size = columns * rowsValue
  session.value = {
    entityId: String(payload.entityId || ''),
    entityName: String(payload.entityName || 'Tilemap'),
    mode: payload.mode === 'collision' ? 'collision' : 'tiles',
    columns,
    rows: rowsValue,
    tiles: normalizeArray((payload.tiles || []) as number[], size),
    collision: normalizeArray((payload.collision || []) as number[], size),
    tileTextureMap: { ...((payload.tileTextureMap || {}) as Record<number, string>) }
  }
  mode.value = session.value.mode
  tiles.value = [...session.value.tiles]
  collision.value = [...session.value.collision]
  tileTextureMap.value = { ...session.value.tileTextureMap }
  selectedIndex.value = -1
  selectedIndices.value = []
  resetView()
}

async function ensurePreview(path: string) {
  if (!path) return ''
  if (previewCache.value[path] !== undefined) return previewCache.value[path]
  const root = String(session.value?.projectRoot || '')
  if (!window.unu?.readAssetDataUrl || !root || root === 'sample-project') {
    previewCache.value = { ...previewCache.value, [path]: '' }
    return ''
  }
  const result = await window.unu.readAssetDataUrl({ projectRoot: root, relativePath: path })
  const dataUrl = result?.dataUrl || ''
  previewCache.value = { ...previewCache.value, [path]: dataUrl }
  return dataUrl
}

watch(
  materialEntries,
  (entries) => {
    for (const entry of entries) void ensurePreview(entry.path)
  },
  { immediate: true, deep: true }
)

function tileCellStyle(value: number) {
  if (value <= 0) return {}
  const hue = (value * 47) % 360
  return {
    background: `hsl(${hue} 46% 26%)`,
    borderColor: `hsl(${hue} 58% 52%)`
  }
}

async function emitSnapshot() {
  if (!session.value || !window.unu?.submitTilemapEditorUpdate) return
  await window.unu.submitTilemapEditorUpdate({
    entityId: session.value.entityId,
    mode: mode.value,
    tiles: [...tiles.value],
    collision: [...collision.value],
    tileTextureMap: { ...tileTextureMap.value }
  })
}

function updateSelectedValue(nextRaw: string) {
  const indices = selectedIndices.value.length ? [...selectedIndices.value] : (selectedIndex.value >= 0 ? [selectedIndex.value] : [])
  if (!indices.length) return
  const raw = Number(nextRaw)
  const nextValue = mode.value === 'collision' ? (raw > 0 ? 1 : 0) : Math.max(0, Math.round(Number.isFinite(raw) ? raw : 0))
  if (mode.value === 'tiles') {
    const next = [...tiles.value]
    for (const index of indices) next[index] = nextValue
    tiles.value = next
  } else {
    const next = [...collision.value]
    for (const index of indices) next[index] = nextValue
    collision.value = next
  }
  void emitSnapshot()
}

function onSelectedValueInput(event: Event) {
  updateSelectedValue((event.target as HTMLInputElement).value)
}

function setSelectedIndices(nextIndices: number[], preservePrimary = false) {
  const max = Math.max(0, cols.value * rows.value - 1)
  const unique = Array.from(new Set(nextIndices.filter((index) => Number.isInteger(index) && index >= 0 && index <= max)))
  unique.sort((a, b) => a - b)
  selectedIndices.value = unique
  if (!unique.length) {
    selectedIndex.value = -1
  } else if (preservePrimary && selectedIndex.value >= 0 && unique.includes(selectedIndex.value)) {
    // keep current primary
  } else {
    selectedIndex.value = unique[unique.length - 1]
  }
}

function addSelection(index: number) {
  if (selectedLookup.value[index]) return
  setSelectedIndices([...selectedIndices.value, index])
}

function isCellSelected(index: number) {
  return !!selectedLookup.value[index]
}

function selectCell(index: number) {
  setSelectedIndices([index])
  inputBuffer.value = ''
}

function resetView() {
  panX.value = 8
  panY.value = 8
  zoom.value = 1
}

function viewportPoint(event: MouseEvent) {
  const target = viewportRef.value
  if (!target) return { x: 0, y: 0 }
  const rect = target.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function clearLongPressTimer() {
  if (!longPressTimer.value) return
  window.clearTimeout(longPressTimer.value)
  longPressTimer.value = 0
}

function selectedByMarqueeRect() {
  const left = Math.min(marqueeStart.value.x, marqueeEnd.value.x)
  const right = Math.max(marqueeStart.value.x, marqueeEnd.value.x)
  const top = Math.min(marqueeStart.value.y, marqueeEnd.value.y)
  const bottom = Math.max(marqueeStart.value.y, marqueeEnd.value.y)
  const hits: number[] = []
  const size = cellSize.value * zoom.value
  if (size <= 0) return hits
  const total = cols.value * rows.value
  for (let index = 0; index < total; index += 1) {
    const col = index % cols.value
    const row = Math.floor(index / cols.value)
    const x1 = panX.value + col * size
    const y1 = panY.value + row * size
    const x2 = x1 + size
    const y2 = y1 + size
    const overlap = x1 < right && x2 > left && y1 < bottom && y2 > top
    if (overlap) hits.push(index)
  }
  return hits
}

function updateMarqueeSelection() {
  const hits = selectedByMarqueeRect()
  setSelectedIndices([...marqueeBaseSelection.value, ...hits], true)
}

function onViewportMouseDown(event: MouseEvent) {
  if (event.button === 1) {
    dragging.value = true
    dragOrigin.value = { x: event.clientX, y: event.clientY, panX: panX.value, panY: panY.value }
    return
  }
  if (event.button !== 0) return
  const target = event.target as HTMLElement | null
  if (!target?.classList?.contains('cell')) pendingClickIndex.value = -1
  mouseDownLeft.value = true
  pointerDown.value = viewportPoint(event)
  if (event.shiftKey) {
    shiftSelecting.value = true
    if (pendingClickIndex.value >= 0) addSelection(pendingClickIndex.value)
    return
  }
  clearLongPressTimer()
  longPressTimer.value = window.setTimeout(() => {
    if (!mouseDownLeft.value || shiftSelecting.value) return
    marqueeActive.value = true
    marqueeStart.value = { ...pointerDown.value }
    marqueeEnd.value = { ...pointerDown.value }
    marqueeBaseSelection.value = []
    updateMarqueeSelection()
  }, 220)
}

function onViewportMouseMove(event: MouseEvent) {
  if (dragging.value) {
    const dx = event.clientX - dragOrigin.value.x
    const dy = event.clientY - dragOrigin.value.y
    panX.value = dragOrigin.value.panX + dx
    panY.value = dragOrigin.value.panY + dy
    return
  }
  if (marqueeActive.value) {
    marqueeEnd.value = viewportPoint(event)
    updateMarqueeSelection()
  }
}

function onViewportMouseUp(event?: MouseEvent) {
  dragging.value = false
  if (event && event.button === 1) return
  if (!mouseDownLeft.value && !marqueeActive.value && !shiftSelecting.value) return

  clearLongPressTimer()
  if (marqueeActive.value) {
    updateMarqueeSelection()
    marqueeActive.value = false
  } else if (!shiftSelecting.value && pendingClickIndex.value >= 0) {
    selectCell(pendingClickIndex.value)
  }
  mouseDownLeft.value = false
  shiftSelecting.value = false
  pendingClickIndex.value = -1
}

function onViewportWheel(event: WheelEvent) {
  const target = viewportRef.value
  if (!target) return
  const rect = target.getBoundingClientRect()
  const cursorX = event.clientX - rect.left
  const cursorY = event.clientY - rect.top
  const beforeWorldX = (cursorX - panX.value) / zoom.value
  const beforeWorldY = (cursorY - panY.value) / zoom.value
  const delta = event.deltaY < 0 ? 1.1 : 0.9
  const nextZoom = Math.max(0.4, Math.min(4, zoom.value * delta))
  zoom.value = nextZoom
  panX.value = cursorX - beforeWorldX * nextZoom
  panY.value = cursorY - beforeWorldY * nextZoom
}

function applyMaterialValueToSelected(value: number) {
  if (!selectedIndices.value.length && selectedIndex.value < 0) return
  updateSelectedValue(String(Math.max(0, Math.round(value))))
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (!selectedIndices.value.length && selectedIndex.value < 0) return
  const target = event.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase() || ''
  const editable = tag === 'input' || tag === 'textarea' || tag === 'select' || !!target?.isContentEditable
  if (editable) return

  const key = event.key
  const now = performance.now()
  if (key >= '0' && key <= '9') {
    event.preventDefault()
    if (now - inputBufferAt.value > 900) inputBuffer.value = ''
    inputBufferAt.value = now
    inputBuffer.value = `${inputBuffer.value}${key}`.slice(0, 6)
    updateSelectedValue(inputBuffer.value)
    return
  }
  if (key === 'Backspace') {
    event.preventDefault()
    if (mode.value === 'collision') {
      inputBuffer.value = '0'
      updateSelectedValue('0')
      return
    }
    inputBuffer.value = inputBuffer.value.slice(0, Math.max(0, inputBuffer.value.length - 1))
    updateSelectedValue(inputBuffer.value || '0')
  }
}

function onCellMouseDown(event: MouseEvent, index: number) {
  pendingClickIndex.value = index
  if (event.shiftKey) {
    shiftSelecting.value = true
    mouseDownLeft.value = true
    addSelection(index)
  }
}

function onCellMouseEnter(index: number) {
  if (!mouseDownLeft.value || !shiftSelecting.value) return
  addSelection(index)
}

async function closeWindow() {
  if (window.unu?.closeTilemapEditor) {
    await window.unu.closeTilemapEditor()
  } else {
    window.close()
  }
}

let removeInitListener: (() => void) | null = null
const onWindowMouseUp = () => onViewportMouseUp()
onMounted(() => {
  removeInitListener = window.unu?.onTilemapEditorInit?.((payload) => {
    applyInitPayload(payload)
  }) || null
  window.addEventListener('keydown', onWindowKeyDown)
  window.addEventListener('mouseup', onWindowMouseUp)
})

onBeforeUnmount(() => {
  clearLongPressTimer()
  removeInitListener?.()
  removeInitListener = null
  window.removeEventListener('keydown', onWindowKeyDown)
  window.removeEventListener('mouseup', onWindowMouseUp)
})
</script>

<style scoped>
.tilemap-window {
  height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: #0d1320;
  color: #dce7f6;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #2a374f;
  background: #111a2b;
}
.title-wrap {
  display: grid;
  gap: 2px;
}
.sub {
  font-size: 12px;
  color: #9eb3cf;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.toolbar-right select,
.toolbar-right input,
.toolbar-right button {
  background: #0f141d;
  color: #eaf2ff;
  border: 1px solid #30405b;
  border-radius: 8px;
  padding: 6px 8px;
}
.toolbar-right button {
  cursor: pointer;
}
.toolbar-right .ghost {
  background: #1d2b44;
}
.toolbar-right .danger {
  background: #41212a;
  border-color: #683742;
}
.content {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
}
.viewport {
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 20% 10%, #162640 0%, #0b1220 60%, #080d16 100%);
}
.marquee {
  position: absolute;
  border: 1px solid #7dd3ff;
  background: rgba(125, 211, 255, 0.18);
  pointer-events: none;
}
.canvas {
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  gap: 0;
  user-select: none;
}
.cell {
  width: 100%;
  height: 100%;
  margin: 0;
  border: 1px solid #2f405f;
  border-radius: 0;
  background: #182338;
  color: #f2f8ff;
  font-size: 11px;
  cursor: pointer;
}
.cell.selected {
  outline: 2px solid #6ed6ff;
  outline-offset: -2px;
}
.cell.collision {
  background: #4d222e;
  border-color: #d55766;
}
.sidebar {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border-left: 1px solid #2a374f;
  background: #10192a;
  padding: 10px;
  display: grid;
  gap: 10px;
}
.panel {
  border: 1px solid #2a3850;
  border-radius: 10px;
  background: #121e33;
  padding: 10px;
  display: grid;
  gap: 8px;
}
.panel-title {
  color: #98afd0;
  font-size: 13px;
}
.info {
  color: #b4c6df;
  font-size: 12px;
  word-break: break-word;
}
.hint {
  color: #8ea4c0;
  font-size: 12px;
}
.panel label {
  display: grid;
  gap: 6px;
  font-size: 12px;
}
.panel input {
  background: #0f141d;
  color: #ecf2fd;
  border: 1px solid #30405b;
  border-radius: 8px;
  padding: 6px 8px;
}
.materials {
  display: grid;
  gap: 6px;
}
.material-row {
  display: grid;
  grid-template-columns: 48px 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
}
.badge {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 7px;
  border: 1px solid #466292;
  background: #1f3153;
  color: #def0ff;
  font-size: 12px;
  padding: 4px 6px;
}
.preview {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 1px solid #3a4d71;
  object-fit: cover;
  background: #17253d;
}
.preview.placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #9cb2cf;
}
.path {
  color: #b6c8df;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini {
  background: #1a3150;
  color: #e7f2ff;
  border: 1px solid #40628e;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
}
</style>
