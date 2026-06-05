<template>
  <div class="atlas-window">
    <header class="atlas-header">
      <div>
        <div class="title">Sprite Atlas</div>
        <div class="subtitle">{{ atlasPath || imagePath || 'No image selected' }}</div>
      </div>
      <div class="header-actions">
        <button type="button" @click="() => saveAtlas(false)">Save Atlas</button>
        <button type="button" @click="applySelectedFrame" :disabled="!selectedFramePath">Apply Frame</button>
        <button type="button" @click="applyAllFrames" :disabled="framePaths.length === 0">Apply Animation</button>
      </div>
    </header>

    <main class="atlas-main">
      <section ref="previewPaneRef" class="preview-pane">
        <div
          class="preview-stage"
          :class="{ empty: !imageDataUrl, panning: previewDrag.mode === 'pan', selecting: previewDrag.mode === 'select' }"
          @pointerdown="startPreviewPointer"
          @pointermove="movePreviewPointer"
          @pointerup="endPreviewPointer"
          @pointercancel="endPreviewPointer"
          @pointerleave="endPreviewPointer"
        >
          <template v-if="imageDataUrl">
            <img ref="imageRef" :src="imageDataUrl" :alt="imagePath" @load="readImageSize" />
            <div class="frame-layer">
              <button
                v-for="frame in frames"
                :key="frame.index"
                class="frame-box"
                :class="{ selected: selectedFrameIndices.includes(frame.index), primary: frame.index === selectedFrameIndex }"
                :style="frameStyle(frame)"
                @pointerdown.stop
                @click.stop="handleFrameClick($event, frame.index)"
              >
                {{ frame.index + 1 }}
              </button>
            </div>
            <div v-if="marquee.visible" class="marquee" :style="marqueeStyle"></div>
          </template>
          <span v-else>Open from an image or atlas resource.</span>
        </div>
      </section>

      <aside class="side-pane">
        <div class="group">
          <div class="group-title">Source</div>
          <label>
            Image Path
            <input :value="imagePath" @input="setImagePath(($event.target as HTMLInputElement).value)" />
          </label>
          <label>
            Atlas Asset
            <input :value="atlasPath" readonly />
          </label>
          <div class="info-grid">
            <span>Image</span><strong>{{ imageSize.width }} x {{ imageSize.height }}</strong>
            <span>Frames</span><strong>{{ framePaths.length }}</strong>
          </div>
        </div>

        <div class="group">
          <div class="group-title">Grid</div>
          <div class="field-grid">
            <label>Columns <input type="number" min="1" :value="columns" @input="setColumns" /></label>
            <label>Rows <input type="number" min="1" :value="rows" @input="setRows" /></label>
            <label>Cell W <input type="number" min="1" :value="cellWidth" @input="setCellWidth" /></label>
            <label>Cell H <input type="number" min="1" :value="cellHeight" @input="setCellHeight" /></label>
            <label>Frame Count <input type="number" min="1" :max="maxFrameCount" :value="frameCount" @input="setFrameCount" /></label>
          </div>
          <div class="toolbar-row">
            <button type="button" @click="fitGridFromImage">Fit Image</button>
            <button type="button" @click="useAllCells">Use All Cells</button>
            <button type="button" @click="selectedFrameIndex = 0">First Frame</button>
          </div>
        </div>

        <div class="group">
          <div class="group-title">Selected Frame</div>
          <div class="info-grid">
            <span>Index</span><strong>{{ selectedFrameIndex + 1 }}</strong>
            <span>X</span><strong>{{ selectedFrameRect.x }}</strong>
            <span>Y</span><strong>{{ selectedFrameRect.y }}</strong>
            <span>Size</span><strong>{{ selectedFrameRect.w }} x {{ selectedFrameRect.h }}</strong>
          </div>
          <input :value="selectedFrameLabel" readonly />
        </div>

        <div class="group">
          <div class="group-title">Animation Machine</div>
          <div class="row-inline">
            <input v-model="newClipName" placeholder="State name" @keydown.enter.prevent="addClip" />
            <button type="button" @click="addClip">Add</button>
          </div>
          <div class="clip-tabs">
            <button
              v-for="clip in clips"
              :key="clip.name"
              :class="{ selected: clip.name === selectedClipName }"
              type="button"
              @click="selectedClipName = clip.name"
            >
              {{ clip.name }}
            </button>
          </div>
          <template v-if="selectedClip">
            <label>
              State
              <input :value="selectedClip.name" @input="renameSelectedClip(($event.target as HTMLInputElement).value)" />
            </label>
            <label class="checkbox-row">
              <input type="checkbox" :checked="selectedClip.loop" @change="setSelectedClipLoop(($event.target as HTMLInputElement).checked)" />
              Loop
            </label>
            <div class="toolbar-row">
              <button type="button" @click="appendSelectedFrameToClip">Add Frame</button>
              <button type="button" @click="appendAllFramesToClip">Use All</button>
              <button type="button" @click="clearSelectedClip">Clear</button>
              <button type="button" @click="removeSelectedClip" :disabled="clips.length <= 1">Delete</button>
            </div>
            <div class="clip-frame-list">
              <div v-for="(frame, index) in selectedClip.frames" :key="`clip_${selectedClip.name}_${index}`" class="clip-frame-row">
                <button type="button" @click="selectedFrameIndex = frame">#{{ frame + 1 }}</button>
                <input type="number" min="1" :value="selectedClip.durations[index] || 1" @input="setClipFrameDuration(index, ($event.target as HTMLInputElement).value)" />
                <button type="button" @click="moveClipFrame(index, -1)" :disabled="index === 0">Up</button>
                <button type="button" @click="moveClipFrame(index, 1)" :disabled="index === selectedClip.frames.length - 1">Down</button>
                <button type="button" @click="removeClipFrame(index)">X</button>
              </div>
            </div>
          </template>
        </div>

        <div class="group frames">
          <div class="group-title">Frames</div>
          <div class="frame-list">
            <button
              v-for="frame in frames"
              :key="`list_${frame.index}`"
              :class="{ selected: selectedFrameIndices.includes(frame.index) }"
              type="button"
              @click="handleFrameClick($event, frame.index)"
            >
              #{{ frame.index + 1 }} {{ frame.x }},{{ frame.y }}
            </button>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createAtlasFramePaths, deserializeAtlasAsset, normalizeAtlasClips, serializeAtlasAsset, type AtlasClipPayload, type AtlasGridPayload } from '../../engine/animation/atlasAsset'

interface AtlasEditorInitPayload {
  projectRoot?: string
  imagePath?: string
  atlasPath?: string
}

type AtlasClipDraft = AtlasClipPayload

const projectRoot = ref('')
const imagePath = ref('')
const atlasPath = ref('')
const atlasFilePath = ref('')
const imageDataUrl = ref('')
const imageRef = ref<HTMLImageElement | null>(null)
const previewPaneRef = ref<HTMLElement | null>(null)
const imageSize = ref({ width: 0, height: 0 })
const columns = ref(4)
const rows = ref(4)
const cellWidth = ref(64)
const cellHeight = ref(64)
const frameCount = ref(16)
const selectedFrameIndex = ref(0)
const selectedFrameIndices = ref<number[]>([0])
const newClipName = ref('')
const selectedClipName = ref('Atlas')
const clips = ref<AtlasClipDraft[]>([])
let removeInitListener: (() => void) | null = null
let autoSaveTimer: number | null = null
let longPressTimer: number | null = null
let initializing = false

const previewDrag = ref({
  active: false,
  mode: 'none' as 'none' | 'pending' | 'pan' | 'select',
  pointerId: 0,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  startScrollLeft: 0,
  startScrollTop: 0
})
const marquee = ref({ visible: false, x: 0, y: 0, width: 0, height: 0 })

const normalizedAtlas = computed<AtlasGridPayload>(() => {
  const safeColumns = Math.max(1, Math.floor(Number(columns.value) || 1))
  const safeRows = Math.max(1, Math.floor(Number(rows.value) || 1))
  const maxFrames = Math.max(1, safeColumns * safeRows)
  return {
    imagePath: imagePath.value.trim(),
    columns: safeColumns,
    rows: safeRows,
    cellWidth: Math.max(1, Math.floor(Number(cellWidth.value) || 1)),
    cellHeight: Math.max(1, Math.floor(Number(cellHeight.value) || 1)),
    frameCount: Math.max(1, Math.min(Math.max(1, Math.floor(Number(frameCount.value) || 1)), maxFrames))
  }
})
const maxFrameCount = computed(() => Math.max(1, normalizedAtlas.value.columns * normalizedAtlas.value.rows))

const frames = computed(() => {
  const atlas = normalizedAtlas.value
  return Array.from({ length: atlas.frameCount }, (_, index) => {
    const col = index % atlas.columns
    const row = Math.floor(index / atlas.columns)
    return {
      index,
      x: col * atlas.cellWidth,
      y: row * atlas.cellHeight,
      w: atlas.cellWidth,
      h: atlas.cellHeight
    }
  })
})

const framePaths = computed(() => imagePath.value.trim() ? createAtlasFramePaths(normalizedAtlas.value, atlasPath.value) : [])
const selectedFramePath = computed(() => framePaths.value[selectedFrameIndex.value] || '')
const selectedFrameLabel = computed(() => {
  const atlasName = atlasPath.value.split('/').pop() || 'Unsaved Atlas'
  return `${atlasName} / Frame #${selectedFrameIndex.value + 1}`
})
const marqueeStyle = computed(() => ({
  left: `${marquee.value.x}px`,
  top: `${marquee.value.y}px`,
  width: `${marquee.value.width}px`,
  height: `${marquee.value.height}px`
}))
const selectedFrameRect = computed(() => frames.value[selectedFrameIndex.value] || { x: 0, y: 0, w: normalizedAtlas.value.cellWidth, h: normalizedAtlas.value.cellHeight })
const selectedClip = computed(() => clips.value.find((clip) => clip.name === selectedClipName.value) || clips.value[0] || null)

function frameStyle(frame: { x: number; y: number; w: number; h: number }) {
  const width = Math.max(1, imageSize.value.width)
  const height = Math.max(1, imageSize.value.height)
  return {
    left: `${(frame.x / width) * 100}%`,
    top: `${(frame.y / height) * 100}%`,
    width: `${(frame.w / width) * 100}%`,
    height: `${(frame.h / height) * 100}%`
  }
}

function setFrameSelection(indices: number[], primary = indices[indices.length - 1] ?? selectedFrameIndex.value) {
  const maxIndex = Math.max(0, normalizedAtlas.value.frameCount - 1)
  const unique = indices
    .map((index) => Math.max(0, Math.min(maxIndex, Math.floor(Number(index) || 0))))
    .filter((index, offset, list) => list.indexOf(index) === offset)
    .sort((a, b) => a - b)
  selectedFrameIndices.value = unique.length ? unique : [Math.max(0, Math.min(maxIndex, primary))]
  selectedFrameIndex.value = Math.max(0, Math.min(maxIndex, primary))
}

function handleFrameClick(event: MouseEvent, index: number) {
  if (event.ctrlKey || event.metaKey) {
    const exists = selectedFrameIndices.value.includes(index)
    setFrameSelection(exists ? selectedFrameIndices.value.filter((item) => item !== index) : [...selectedFrameIndices.value, index], index)
    return
  }
  if (event.shiftKey) {
    const start = selectedFrameIndex.value
    const min = Math.min(start, index)
    const max = Math.max(start, index)
    setFrameSelection(Array.from({ length: max - min + 1 }, (_, offset) => min + offset), index)
    return
  }
  setFrameSelection([index], index)
}

function pointInRect(x: number, y: number, rect: DOMRect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function rectsIntersect(a: DOMRect | { left: number; right: number; top: number; bottom: number }, b: DOMRect | { left: number; right: number; top: number; bottom: number }) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top
}

function frameClientRect(frame: { x: number; y: number; w: number; h: number }) {
  const image = imageRef.value
  if (!image) return null
  const rect = image.getBoundingClientRect()
  const width = Math.max(1, imageSize.value.width)
  const height = Math.max(1, imageSize.value.height)
  const left = rect.left + (frame.x / width) * rect.width
  const top = rect.top + (frame.y / height) * rect.height
  const right = left + (frame.w / width) * rect.width
  const bottom = top + (frame.h / height) * rect.height
  return { left, right, top, bottom }
}

function frameIndexAtClientPoint(x: number, y: number) {
  for (const frame of frames.value) {
    const rect = frameClientRect(frame)
    if (rect && pointInRect(x, y, rect as DOMRect)) return frame.index
  }
  return -1
}

function updateMarquee(x: number, y: number) {
  const image = imageRef.value
  if (!image) return
  const rect = image.getBoundingClientRect()
  const left = Math.max(rect.left, Math.min(previewDrag.value.startX, x))
  const top = Math.max(rect.top, Math.min(previewDrag.value.startY, y))
  const right = Math.min(rect.right, Math.max(previewDrag.value.startX, x))
  const bottom = Math.min(rect.bottom, Math.max(previewDrag.value.startY, y))
  marquee.value = {
    visible: true,
    x: left - rect.left,
    y: top - rect.top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  }
  const selected = frames.value
    .filter((frame) => {
      const frameRect = frameClientRect(frame)
      return frameRect && rectsIntersect({ left, right, top, bottom }, frameRect)
    })
    .map((frame) => frame.index)
  setFrameSelection(selected, selected[selected.length - 1] ?? selectedFrameIndex.value)
}

function clearLongPressTimer() {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function startPreviewPointer(event: PointerEvent) {
  if (!imageDataUrl.value || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return
  const pane = previewPaneRef.value
  if (!pane) return
  previewDrag.value = {
    active: true,
    mode: 'pending',
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    startScrollLeft: pane.scrollLeft,
    startScrollTop: pane.scrollTop
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  clearLongPressTimer()
  longPressTimer = window.setTimeout(() => {
    if (!previewDrag.value.active || previewDrag.value.pointerId !== event.pointerId) return
    previewDrag.value.mode = 'select'
    updateMarquee(event.clientX, event.clientY)
  }, 320)
}

function movePreviewPointer(event: PointerEvent) {
  if (!previewDrag.value.active || previewDrag.value.pointerId !== event.pointerId) return
  const dx = event.clientX - previewDrag.value.startX
  const dy = event.clientY - previewDrag.value.startY
  if (previewDrag.value.mode === 'pending' && Math.hypot(dx, dy) > 6) {
    clearLongPressTimer()
    previewDrag.value.mode = 'pan'
  }
  if (previewDrag.value.mode === 'pan') {
    const pane = previewPaneRef.value
    if (pane) {
      pane.scrollLeft = previewDrag.value.startScrollLeft - dx
      pane.scrollTop = previewDrag.value.startScrollTop - dy
    }
    return
  }
  if (previewDrag.value.mode === 'select') {
    updateMarquee(event.clientX, event.clientY)
  }
}

function endPreviewPointer(event: PointerEvent) {
  if (!previewDrag.value.active || previewDrag.value.pointerId !== event.pointerId) return
  const mode = previewDrag.value.mode
  clearLongPressTimer()
  marquee.value.visible = false
  previewDrag.value.active = false
  previewDrag.value.mode = 'none'
  if (mode === 'pending') {
    const hit = frameIndexAtClientPoint(event.clientX, event.clientY)
    if (hit >= 0) setFrameSelection([hit], hit)
  }
}

async function loadImagePreview() {
  imageDataUrl.value = ''
  imageSize.value = { width: 0, height: 0 }
  const path = imagePath.value.trim()
  if (!path || !projectRoot.value || !window.unu?.readAssetDataUrl) return
  const result = await window.unu.readAssetDataUrl({ projectRoot: projectRoot.value, relativePath: path })
  imageDataUrl.value = result?.dataUrl || ''
  await nextTick()
  readImageSize()
}

function readImageSize() {
  const image = imageRef.value
  if (!image) return
  const width = image.naturalWidth || image.width || 0
  const height = image.naturalHeight || image.height || 0
  if (width > 0 && height > 0) imageSize.value = { width, height }
}

function fitGridFromImage() {
  const width = imageSize.value.width
  const height = imageSize.value.height
  if (width > 0 && height > 0) {
    cellWidth.value = Math.max(1, Math.floor(width / Math.max(1, columns.value)))
    cellHeight.value = Math.max(1, Math.floor(height / Math.max(1, rows.value)))
  }
  frameCount.value = maxFrameCount.value
  scheduleAutoSave()
}

function setImagePath(path: string) {
  imagePath.value = path.trim()
  if (atlasPath.value && !atlasFilePath.value) atlasPath.value = ''
  scheduleAutoSave()
}

function toPositiveInt(value: unknown, fallback = 1) {
  const parsed = Math.floor(Number(value))
  return Number.isFinite(parsed) ? Math.max(1, parsed) : fallback
}

function setColumns(event: Event) {
  columns.value = toPositiveInt((event.target as HTMLInputElement).value, columns.value)
  fitGridFromImage()
  scheduleAutoSave()
}

function setRows(event: Event) {
  rows.value = toPositiveInt((event.target as HTMLInputElement).value, rows.value)
  fitGridFromImage()
  scheduleAutoSave()
}

function setCellWidth(event: Event) {
  cellWidth.value = toPositiveInt((event.target as HTMLInputElement).value, cellWidth.value)
  scheduleAutoSave()
}

function setCellHeight(event: Event) {
  cellHeight.value = toPositiveInt((event.target as HTMLInputElement).value, cellHeight.value)
  scheduleAutoSave()
}

function setFrameCount(event: Event) {
  frameCount.value = Math.max(1, Math.min(maxFrameCount.value, toPositiveInt((event.target as HTMLInputElement).value, frameCount.value)))
  scheduleAutoSave()
}

function useAllCells() {
  frameCount.value = maxFrameCount.value
  scheduleAutoSave()
}

function normalizeClipDraft(clip: AtlasClipDraft): AtlasClipDraft {
  const maxIndex = Math.max(0, normalizedAtlas.value.frameCount - 1)
  return normalizeAtlasClips([clip], maxIndex + 1)[0] || { name: 'Atlas', frames: [], durations: [], loop: true }
}

function ensureDefaultClip() {
  const allFrames = Array.from({ length: normalizedAtlas.value.frameCount }, (_, index) => index)
  if (!clips.value.length) {
    clips.value = [{ name: 'Atlas', frames: allFrames, durations: allFrames.map(() => 1), loop: true }]
    selectedClipName.value = 'Atlas'
    return
  }
  clips.value = clips.value.map(normalizeClipDraft)
  if (!clips.value.some((clip) => clip.name === selectedClipName.value)) selectedClipName.value = clips.value[0].name
}

function addClip() {
  const base = newClipName.value.trim() || `State${clips.value.length + 1}`
  let name = base
  let suffix = 2
  while (clips.value.some((clip) => clip.name === name)) {
    name = `${base}${suffix}`
    suffix += 1
  }
  clips.value = [...clips.value, { name, frames: [], durations: [], loop: true }]
  selectedClipName.value = name
  newClipName.value = ''
  scheduleAutoSave()
}

function renameSelectedClip(value: string) {
  const clip = selectedClip.value
  if (!clip) return
  const next = value.trim()
  if (!next || (next !== clip.name && clips.value.some((item) => item.name === next))) return
  const previous = clip.name
  clips.value = clips.value.map((item) => item.name === previous ? { ...item, name: next } : item)
  selectedClipName.value = next
  scheduleAutoSave()
}

function setSelectedClipLoop(loop: boolean) {
  const clip = selectedClip.value
  if (!clip) return
  clips.value = clips.value.map((item) => item.name === clip.name ? { ...item, loop } : item)
  scheduleAutoSave()
}

function appendSelectedFrameToClip() {
  const clip = selectedClip.value
  if (!clip) return
  const selection = selectedFrameIndices.value.length ? selectedFrameIndices.value : [selectedFrameIndex.value]
  clips.value = clips.value.map((item) => item.name === clip.name ? {
    ...item,
    frames: [...item.frames, ...selection],
    durations: [...item.durations, ...selection.map(() => 1)]
  } : item)
  scheduleAutoSave()
}

function appendAllFramesToClip() {
  const clip = selectedClip.value
  if (!clip) return
  const allFrames = Array.from({ length: normalizedAtlas.value.frameCount }, (_, index) => index)
  clips.value = clips.value.map((item) => item.name === clip.name ? {
    ...item,
    frames: allFrames,
    durations: allFrames.map((_, index) => Math.max(1, Number(item.durations[index] || 1)))
  } : item)
  scheduleAutoSave()
}

function clearSelectedClip() {
  const clip = selectedClip.value
  if (!clip) return
  clips.value = clips.value.map((item) => item.name === clip.name ? { ...item, frames: [], durations: [] } : item)
  scheduleAutoSave()
}

function removeSelectedClip() {
  const clip = selectedClip.value
  if (!clip || clips.value.length <= 1) return
  clips.value = clips.value.filter((item) => item.name !== clip.name)
  selectedClipName.value = clips.value[0]?.name || ''
  scheduleAutoSave()
}

function setClipFrameDuration(index: number, value: string) {
  const clip = selectedClip.value
  if (!clip) return
  const durations = [...clip.durations]
  durations[index] = Math.max(1, Math.floor(Number(value) || 1))
  clips.value = clips.value.map((item) => item.name === clip.name ? normalizeClipDraft({ ...item, durations }) : item)
  scheduleAutoSave()
}

function removeClipFrame(index: number) {
  const clip = selectedClip.value
  if (!clip) return
  clips.value = clips.value.map((item) => item.name === clip.name ? {
    ...item,
    frames: item.frames.filter((_, i) => i !== index),
    durations: item.durations.filter((_, i) => i !== index)
  } : item)
  scheduleAutoSave()
}

function moveClipFrame(index: number, direction: -1 | 1) {
  const clip = selectedClip.value
  if (!clip) return
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= clip.frames.length) return
  const frames = [...clip.frames]
  const durations = [...clip.durations]
  ;[frames[index], frames[nextIndex]] = [frames[nextIndex], frames[index]]
  ;[durations[index], durations[nextIndex]] = [durations[nextIndex], durations[index]]
  clips.value = clips.value.map((item) => item.name === clip.name ? { ...item, frames, durations } : item)
  scheduleAutoSave()
}

function buildStateMachinePayload(paths: string[]) {
  ensureDefaultClip()
  const safeClips = clips.value.map(normalizeClipDraft).filter((clip) => clip.frames.length > 0)
  const finalClips = safeClips.length
    ? safeClips
    : [{ name: 'Atlas', frames: paths.map((_, index) => index), durations: paths.map(() => 1), loop: true }]
  return {
    enabled: true,
    initialState: finalClips[0].name,
    currentState: finalClips[0].name,
    clips: finalClips.map((clip) => ({
      name: clip.name,
      framePaths: clip.frames.map((frame) => paths[frame]).filter(Boolean),
      frameDurations: clip.frames.map((_, index) => Math.max(1, Number(clip.durations[index] || 1))),
      loop: clip.loop
    })),
    transitions: []
  }
}

function sanitizeAtlasBaseName(path: string) {
  return (path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'SpriteAtlas')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim() || 'SpriteAtlas'
}

function scheduleAutoSave() {
  if (initializing || !projectRoot.value || !imagePath.value || !window.unu?.saveTextAsset) return
  if (autoSaveTimer) window.clearTimeout(autoSaveTimer)
  autoSaveTimer = window.setTimeout(() => {
    autoSaveTimer = null
    void saveAtlas(true)
  }, 500)
}

async function initialize(payload: AtlasEditorInitPayload) {
  initializing = true
  projectRoot.value = String(payload?.projectRoot || '').trim()
  atlasPath.value = String(payload?.atlasPath || '').trim()
  atlasFilePath.value = ''
  selectedFrameIndex.value = 0

  if (atlasPath.value && window.unu?.readTextAsset && projectRoot.value) {
    const result = await window.unu.readTextAsset({ projectRoot: projectRoot.value, relativePath: atlasPath.value })
    if (result?.content) {
      const data = deserializeAtlasAsset(result.content)
      imagePath.value = data.atlas.imagePath
      columns.value = data.atlas.columns
      rows.value = data.atlas.rows
      cellWidth.value = data.atlas.cellWidth
      cellHeight.value = data.atlas.cellHeight
      frameCount.value = data.atlas.frameCount
      atlasFilePath.value = result.filePath
      clips.value = normalizeAtlasClips(data.clips, data.atlas.frameCount)
    }
  } else {
    imagePath.value = String(payload?.imagePath || '').trim()
    clips.value = []
  }
  await loadImagePreview()
  ensureDefaultClip()
  setFrameSelection([0], 0)
  initializing = false
}

async function saveAtlas(auto = false) {
  if (!window.unu?.saveTextAsset || !projectRoot.value || !imagePath.value) return
  const imageName = sanitizeAtlasBaseName(imagePath.value)
  const content = serializeAtlasAsset(normalizedAtlas.value, clips.value)
  const targetPath = atlasFilePath.value || atlasPath.value || `assets/animations/${imageName}.atlas.json`
  const previousAtlasPath = atlasPath.value
  const saved = await window.unu.saveTextAsset({
    filePath: targetPath,
    content,
    projectRoot: projectRoot.value,
    subdir: 'assets/animations',
    suggestedName: `${imageName}.atlas.json`,
    title: 'Save Sprite Atlas',
    filterName: 'UNU Sprite Atlas'
  })
  if (!saved) return
  atlasFilePath.value = saved.filePath
  atlasPath.value = saved.relativePath || saved.name
  if (!auto || !previousAtlasPath) {
    await window.unu.submitSpriteAtlasEditorUpdate?.({
      action: 'saved',
      atlasPath: atlasPath.value,
      atlas: normalizedAtlas.value,
      framePaths: framePaths.value
    })
  }
  return saved
}

async function applySelectedFrame() {
  if (!selectedFramePath.value) return
  await saveAtlas()
  const savedFramePaths = createAtlasFramePaths(normalizedAtlas.value, atlasPath.value)
  await window.unu?.submitSpriteAtlasEditorUpdate?.({
    action: 'apply-frame',
    atlasPath: atlasPath.value,
    framePath: savedFramePaths[selectedFrameIndex.value] || selectedFramePath.value,
    frameIndex: selectedFrameIndex.value,
    atlas: normalizedAtlas.value,
    framePaths: savedFramePaths
  })
}

async function applyAllFrames() {
  if (!framePaths.value.length) return
  await saveAtlas()
  const savedFramePaths = createAtlasFramePaths(normalizedAtlas.value, atlasPath.value)
  await window.unu?.submitSpriteAtlasEditorUpdate?.({
    action: 'apply-animation',
    atlasPath: atlasPath.value,
    framePath: savedFramePaths[selectedFrameIndex.value] || selectedFramePath.value,
    frameIndex: selectedFrameIndex.value,
    atlas: normalizedAtlas.value,
    framePaths: savedFramePaths,
    stateMachine: buildStateMachinePayload(savedFramePaths)
  })
}

watch([imagePath], () => {
  void loadImagePreview()
})

watch(framePaths, (paths) => {
  selectedFrameIndex.value = Math.max(0, Math.min(selectedFrameIndex.value, Math.max(0, paths.length - 1)))
  setFrameSelection(selectedFrameIndices.value, selectedFrameIndex.value)
  ensureDefaultClip()
})

onMounted(() => {
  removeInitListener = window.unu?.onSpriteAtlasEditorInit?.((payload) => {
    void initialize((payload || {}) as AtlasEditorInitPayload)
  }) || null
})

onBeforeUnmount(() => {
  if (autoSaveTimer) {
    window.clearTimeout(autoSaveTimer)
    autoSaveTimer = null
    void saveAtlas(true)
  }
  clearLongPressTimer()
  removeInitListener?.()
  removeInitListener = null
})
</script>

<style scoped>
.atlas-window {
  width: 100%;
  height: 100vh;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: #0b1020;
  color: #e5edf7;
}

:global(.android-window-overlay) .atlas-window {
  min-height: 100%;
  height: auto;
  max-height: none;
}

:global(.android-window-overlay) .atlas-header {
  flex-wrap: wrap;
  align-items: flex-start;
}

:global(.android-window-overlay) .atlas-main {
  min-height: min(700px, calc(100dvh - var(--unu-safe-top) - var(--unu-safe-bottom) - 78px));
}

:global(.android-window-overlay) .preview-pane {
  min-height: 320px;
}

:global(.android-window-overlay) .side-pane {
  min-height: 0;
}
.atlas-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #263246;
  background: #111827;
}
.title { font-size: 15px; font-weight: 700; }
.subtitle { margin-top: 4px; color: #9aa9bd; font-size: 12px; word-break: break-all; }
.header-actions, .toolbar-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.row-inline { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: end; }
button {
  border: 1px solid #344154;
  background: #1d2635;
  color: #edf3fb;
  border-radius: 8px;
  padding: 7px 10px;
  cursor: pointer;
}
button:disabled { opacity: 0.5; cursor: not-allowed; }
.atlas-main {
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
}
.preview-pane {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  display: grid;
  place-items: center;
  padding: 16px;
  cursor: grab;
}
.preview-stage {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  background: #111827;
  border: 1px solid #2f3b4f;
  display: grid;
  place-items: center;
  user-select: none;
  touch-action: none;
}
.preview-stage.panning { cursor: grabbing; }
.preview-stage.selecting { cursor: crosshair; }
.preview-stage.empty {
  width: min(560px, calc(100vw - 360px));
  height: 360px;
  color: #8ea0b8;
}
.preview-stage img {
  display: block;
  max-width: min(100%, 920px);
  max-height: calc(100vh - 112px);
  image-rendering: pixelated;
}
.frame-layer {
  position: absolute;
  inset: 0;
}
.frame-box {
  position: absolute;
  padding: 0;
  border-radius: 0;
  border: 1px solid rgba(111, 209, 255, 0.62);
  background: rgba(23, 118, 174, 0.08);
  color: #dff6ff;
  font-size: 11px;
  display: grid;
  place-items: start end;
}
.frame-box.selected {
  border-color: #ffd166;
  background: rgba(255, 209, 102, 0.18);
  color: #fff4cc;
  outline: 1px solid rgba(255, 209, 102, 0.75);
}
.frame-box.primary {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.85);
}
.marquee {
  position: absolute;
  border: 1px solid #ffd166;
  background: rgba(255, 209, 102, 0.16);
  pointer-events: none;
}
.side-pane {
  min-height: 0;
  overflow: auto;
  border-left: 1px solid #263246;
  padding: 12px;
  display: grid;
  gap: 12px;
  align-content: start;
  background: #101726;
}
.group {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #263246;
  border-radius: 8px;
  background: #151d2b;
}
.group-title {
  color: #aab7c8;
  font-size: 12px;
  font-weight: 700;
}
label {
  display: grid;
  gap: 6px;
  color: #cbd6e3;
  font-size: 12px;
}
input, textarea {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid #344154;
  border-radius: 8px;
  background: #0c1220;
  color: #edf3fb;
  padding: 8px;
}
textarea {
  min-height: 88px;
  resize: vertical;
  font-family: Consolas, monospace;
  font-size: 12px;
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.info-grid {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 6px 10px;
  font-size: 12px;
  color: #93a4ba;
}
.info-grid strong { color: #e5edf7; font-weight: 600; }
.frames {
  min-height: 0;
}
.frame-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  max-height: 220px;
  overflow: auto;
}
.frame-list button {
  text-align: left;
  font-size: 12px;
  padding: 6px 8px;
}
.frame-list button.selected {
  border-color: #ffd166;
  color: #fff4cc;
}
.clip-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.clip-tabs button.selected {
  border-color: #75d5ff;
  color: #dff6ff;
  background: #17324a;
}
.clip-frame-list {
  display: grid;
  gap: 6px;
  max-height: 180px;
  overflow: auto;
}
.clip-frame-row {
  display: grid;
  grid-template-columns: minmax(64px, 1fr) 64px 48px 56px 32px;
  gap: 6px;
  align-items: center;
}
.clip-frame-row input {
  padding: 6px;
}
.clip-frame-row button {
  padding: 6px;
  min-width: 0;
}
@media (max-width: 820px) {
  .atlas-main { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) auto; }
  .side-pane { border-left: 0; border-top: 1px solid #263246; max-height: 46vh; }
  .preview-stage.empty { width: calc(100vw - 32px); }
}

@media (max-width: 820px), (max-height: 520px) {
  :global(.android-window-overlay) .atlas-main {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(320px, auto) auto;
    min-height: auto;
  }

  :global(.android-window-overlay) .side-pane {
    max-height: none;
    overflow: visible;
  }
}
</style>
