<template>
  <div class="asset-tree" @contextmenu.self.prevent="openPanelMenu">
    <div class="header-row">
      <div class="section-title">资源树</div>
      <button class="mini-button" @click="toggleAll">{{ allExpanded ? '全部折叠' : '全部展开' }}</button>
    </div>
    <div class="project-path">{{ project.rootPath || 'sample-project' }}</div>
    <ul class="tree">
      <AssetTreeNode
        v-for="node in assets.tree"
        :key="node.id"
        :node="node"
        @open-context="openNodeMenu"
        @preview-image="openImagePreview"
        @asset-drop="handleAssetDrop"
      />
    </ul>

    <ContextMenu :visible="menu.visible" :x="menu.x" :y="menu.y" :items="menu.items" @close="closeMenu" />

    <div v-if="assetDialog.visible" class="asset-dialog-mask" @click.self="closeAssetDialog">
      <form class="asset-dialog" @submit.prevent="submitAssetDialog">
        <div class="asset-dialog-head">
          <strong>{{ assetDialog.title }}</strong>
          <button type="button" class="dialog-close" @click="closeAssetDialog">×</button>
        </div>
        <label v-if="assetDialog.mode !== 'delete'" class="dialog-field">
          <span>{{ assetDialog.label }}</span>
          <input
            ref="assetDialogInputRef"
            v-model="assetDialog.value"
            :placeholder="assetDialog.placeholder"
            autocomplete="off"
          />
        </label>
        <div class="dialog-hint">{{ assetDialog.hint }}</div>
        <div class="dialog-actions">
          <button type="button" @click="closeAssetDialog">取消</button>
          <button type="submit">确定</button>
        </div>
      </form>
    </div>

    <div v-if="imagePreview.visible" class="preview-mask" @click.self="closeImagePreview">
      <div class="preview-dialog" :style="previewDialogStyle">
        <div class="preview-head">
          <div class="preview-title">
            <strong>{{ imagePreview.name }}</strong>
            <span>{{ imagePreview.path }}</span>
          </div>
          <button class="preview-close" title="关闭" @click="closeImagePreview">×</button>
        </div>
        <div
          class="preview-body"
          :class="{ panning: imagePreview.dragging }"
          @wheel.prevent="handlePreviewWheel"
          @pointerdown="startPreviewPan"
          @pointermove="movePreviewPan"
          @pointerup="endPreviewPan"
          @pointercancel="endPreviewPan"
          @pointerleave="endPreviewPan"
        >
          <div v-if="imagePreview.loading" class="preview-placeholder">正在加载图片...</div>
          <div v-else-if="imagePreview.error" class="preview-placeholder error">{{ imagePreview.error }}</div>
          <img v-else :src="imagePreview.src" :alt="imagePreview.name" :style="previewImageStyle" draggable="false" />
        </div>
        <div v-if="!imagePreview.loading && !imagePreview.error" class="preview-foot">
          <span>{{ imagePreview.width }} × {{ imagePreview.height }}</span>
          <span>{{ Math.round(imagePreview.zoom * 100) }}%</span>
          <span>{{ imagePreview.path }}</span>
        </div>
        <span
          v-for="handle in resizeHandles"
          :key="handle"
          class="resize-handle"
          :class="`resize-${handle}`"
          @pointerdown.stop.prevent="startDialogResize($event, handle)"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { useAssetStore } from '../../stores/assets'
import { useProjectStore } from '../../stores/project'
import { useSceneStore } from '../../stores/scene'
import { useEditorStore } from '../../stores/editor'
import AssetTreeNode from './AssetTreeNode.vue'
import ContextMenu from '../common/ContextMenu.vue'
import type { ContextMenuItem } from '../common/contextMenuTypes'
import type { AssetNode } from '../../engine/assets/types'

const assets = useAssetStore()
const project = useProjectStore()
const scene = useSceneStore()
const editor = useEditorStore()

const menu = reactive({ visible: false, x: 0, y: 0, items: [] as ContextMenuItem[] })
const assetDialogInputRef = ref<HTMLInputElement | null>(null)
const assetDialog = reactive({
  visible: false,
  mode: 'create-file' as 'create-file' | 'create-folder' | 'rename' | 'delete',
  title: '',
  label: '',
  placeholder: '',
  hint: '',
  value: '',
  targetPath: '',
  targetType: '' as AssetNode['type'] | ''
})
const imagePreview = reactive({
  visible: false,
  loading: false,
  error: '',
  name: '',
  path: '',
  src: '',
  width: 0,
  height: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
  dialogWidth: 920,
  dialogHeight: 720,
  resizing: false,
  resizeHandle: '',
  resizeStartX: 0,
  resizeStartY: 0,
  resizeStartWidth: 0,
  resizeStartHeight: 0
})
const resizeHandles = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'] as const

const allExpanded = computed(() => {
  const folders = assets.flat.filter((node) => node.type === 'folder')
  return folders.length > 0 && folders.every((node) => assets.isFolderExpanded(node.path))
})

const previewImageStyle = computed(() => ({
  transform: `translate(${imagePreview.panX}px, ${imagePreview.panY}px) scale(${imagePreview.zoom})`
}))

const previewDialogStyle = computed(() => ({
  width: `${imagePreview.dialogWidth}px`,
  height: `${imagePreview.dialogHeight}px`
}))

function closeMenu() {
  menu.visible = false
}

function showMenu(event: MouseEvent, items: ContextMenuItem[]) {
  menu.x = event.clientX
  menu.y = event.clientY
  menu.items = items
  menu.visible = true
}

function toggleAll() {
  const expand = !allExpanded.value
  for (const node of assets.flat) {
    if (node.type === 'folder') assets.setFolderExpanded(node.path, expand)
  }
}

function openPanelMenu(event: MouseEvent) {
  showMenu(event, [
    { label: '刷新资源', action: () => assets.refreshProject() },
    { label: '新建文件', action: () => openCreateFileDialog(assets.selectedPath || 'assets') },
    { label: '新建文件夹', action: () => openCreateFolderDialog(assets.selectedPath || 'assets') },
    { label: '粘贴文件/文件夹', disabled: !assets.assetClipboard, action: () => assets.pasteCopiedAsset(assets.selectedPath || 'assets') },
    { label: '导入图片', action: () => assets.importImages() },
    { label: '导入音频', action: () => assets.importAudios() },
    { label: allExpanded.value ? '全部折叠' : '全部展开', action: () => toggleAll() }
  ])
}

function openCreateFileDialog(folderPath: string) {
  closeMenu()
  assetDialog.visible = true
  assetDialog.mode = 'create-file'
  assetDialog.title = '新建文件'
  assetDialog.label = '文件名'
  assetDialog.placeholder = '留空则使用 NewFile.ts'
  assetDialog.hint = `目标目录：${folderPath}`
  assetDialog.value = ''
  assetDialog.targetPath = folderPath
  assetDialog.targetType = 'folder'
  void nextTick(() => assetDialogInputRef.value?.focus())
}

function openCreateFolderDialog(folderPath: string) {
  closeMenu()
  assetDialog.visible = true
  assetDialog.mode = 'create-folder'
  assetDialog.title = '新建文件夹'
  assetDialog.label = '文件夹名'
  assetDialog.placeholder = '留空则使用 NewFolder'
  assetDialog.hint = `目标目录：${folderPath}`
  assetDialog.value = ''
  assetDialog.targetPath = folderPath
  assetDialog.targetType = 'folder'
  void nextTick(() => assetDialogInputRef.value?.focus())
}

function openRenameDialog(node: AssetNode) {
  closeMenu()
  assetDialog.visible = true
  assetDialog.mode = 'rename'
  assetDialog.title = node.type === 'folder' ? '重命名文件夹' : '重命名文件'
  assetDialog.label = '新名称'
  assetDialog.placeholder = node.name
  assetDialog.hint = node.type === 'folder'
    ? '文件夹重命名会改变其下资源路径，请确认相关引用是否需要同步调整。'
    : '如果不输入扩展名，将自动保留原文件扩展名。'
  assetDialog.value = node.name
  assetDialog.targetPath = node.path
  assetDialog.targetType = node.type
  void nextTick(() => {
    assetDialogInputRef.value?.focus()
    assetDialogInputRef.value?.select()
  })
}

function openDeleteDialog(node: AssetNode) {
  closeMenu()
  assetDialog.visible = true
  assetDialog.mode = 'delete'
  assetDialog.title = node.type === 'folder' ? '删除文件夹' : '删除文件'
  assetDialog.label = '确认删除'
  assetDialog.placeholder = node.name
  assetDialog.hint = `将删除：${node.path}。此操作会从磁盘移除文件${node.type === 'folder' ? '夹及其所有内容' : ''}。如需继续，请直接点击确定。`
  assetDialog.value = node.name
  assetDialog.targetPath = node.path
  assetDialog.targetType = node.type
}

function closeAssetDialog() {
  assetDialog.visible = false
  assetDialog.value = ''
  assetDialog.targetPath = ''
  assetDialog.targetType = ''
}

async function submitAssetDialog() {
  const value = assetDialog.value.trim()
  if (assetDialog.mode === 'create-file') {
    await assets.createTextAssetInFolder(assetDialog.targetPath, value || undefined)
  } else if (assetDialog.mode === 'create-folder') {
    await assets.createFolderInFolder(assetDialog.targetPath, value || undefined)
  } else if (assetDialog.mode === 'rename') {
    await assets.renameAsset(assetDialog.targetPath, value)
  } else if (assetDialog.mode === 'delete') {
    await assets.deleteAsset(assetDialog.targetPath)
  }
  closeAssetDialog()
}

function openNodeMenu(payload: { event: MouseEvent; node: AssetNode }) {
  const { event, node } = payload
  const items: ContextMenuItem[] = []
  const isTextAsset = node.type === 'script' || node.type === 'animation' || node.type === 'atlas' || node.type === 'scene' || node.type === 'prefab'

  items.push({
    label: node.type === 'folder' ? '在文件管理器中打开目录' : '在文件管理器中定位文件',
    action: () => assets.revealInFolder(node.path, node.type === 'folder')
  })

  if (node.type === 'folder') {
    items.push({ label: '打开目录', action: () => assets.selectPath(node.path) })
    items.push({
      label: assets.isFolderExpanded(node.path) ? '折叠目录' : '展开目录',
      action: () => assets.toggleFolder(node.path)
    })
    items.push({ label: '新建文件', action: () => openCreateFileDialog(node.path) })
    items.push({ label: '新建文件夹', action: () => openCreateFolderDialog(node.path) })
    items.push({ label: '复制文件夹', action: () => assets.copyAsset(node.path) })
    items.push({ label: '粘贴文件/文件夹', disabled: !assets.assetClipboard, action: () => assets.pasteCopiedAsset(node.path) })
    items.push({ label: '重命名文件夹', action: () => openRenameDialog(node) })
    if (!['assets', 'scenes', 'prefabs'].includes(node.path)) {
      items.push({ label: '删除文件夹', action: () => openDeleteDialog(node) })
    }
    items.push({ label: '导入图片到工程', action: () => assets.importImages() })
    items.push({ label: '导入音频到工程', action: () => assets.importAudios() })
    items.push({ label: '刷新资源', action: () => assets.refreshProject() })
  }

  if (node.type === 'image') {
    items.push({ label: '预览图片', action: () => openImagePreview(node) })
    items.push({ label: '新建精灵图集', action: () => openSpriteAtlasEditor(node) })
    items.push({ label: '选中图片', action: () => assets.selectAsset(node.path) })
    items.push({
      label: '创建 Sprite 实体',
      action: async () => {
        await assets.selectAsset(node.path)
        await scene.createSpriteEntityFromAsset(node.path)
        editor.leftTab = 'Scene'
        editor.setRightTab('Inspector')
      }
    })
  }

  if (node.type === 'audio') {
    items.push({ label: '选中音频', action: () => assets.selectAsset(node.path) })
    items.push({
      label: '打开 Inspector 配置',
      action: async () => {
        await assets.selectAsset(node.path)
        editor.setRightTab('Inspector')
      }
    })
  }

  if (node.type === 'scene') {
    items.push({ label: '选中场景资源', action: () => assets.selectAsset(node.path) })
    items.push({ label: '从磁盘打开场景', action: () => scene.openSceneFromDisk() })
  }

  if (node.type === 'prefab') {
    items.push({ label: '选中 Prefab 资源', action: () => assets.selectAsset(node.path) })
    items.push({ label: '实例化 Prefab', action: () => scene.instantiatePrefabFromDisk() })
  }

  if (isTextAsset) {
    items.push({
      label: '打开文本面板',
      action: async () => {
        await assets.selectAsset(node.path)
        editor.setRightTab('Script')
      }
    })
  }

  if (node.type === 'animation' || node.type === 'atlas') {
    if (node.type === 'atlas') {
      items.push({ label: '打开精灵图集编辑器', action: () => openSpriteAtlasEditor(node) })
    }
    items.push({
      label: '打开时间轴面板',
      action: async () => {
        await assets.selectAsset(node.path)
        editor.setRightTab('Timeline')
      }
    })
  }

  if (items.length === 0) {
    items.push({ label: '选中资源', action: () => assets.selectAsset(node.path) })
  }

  if (node.type !== 'folder') {
    items.push({ label: '复制文件', action: () => assets.copyAsset(node.path) })
    items.push({
      label: '粘贴到所在目录',
      disabled: !assets.assetClipboard,
      action: () => assets.pasteCopiedAsset(node.path.split('/').slice(0, -1).join('/') || 'assets')
    })
    items.push({ label: '重命名文件', action: () => openRenameDialog(node) })
    items.push({ label: '删除文件', action: () => openDeleteDialog(node) })
  }

  showMenu(event, items)
}

async function openSpriteAtlasEditor(node: AssetNode) {
  if (!window.unu?.openSpriteAtlasEditor || !project.rootPath) {
    project.setStatus('精灵图集编辑器需要在支持文件接口的工程中使用。')
    return
  }
  await assets.selectAsset(node.path)
  const payload = {
    projectRoot: project.rootPath,
    imagePath: node.type === 'image' ? node.path : undefined,
    atlasPath: node.type === 'atlas' ? node.path : undefined
  }
  const result = await window.unu.openSpriteAtlasEditor(payload)
  if (!result?.ok) project.setStatus(`打开精灵图集编辑器失败：${result?.error || '未知错误'}`)
}

async function handleAssetDrop(payload: { sourcePath: string; targetNode: AssetNode }) {
  const source = assets.flat.find((node) => node.path === payload.sourcePath)
  if (!source) {
    project.setStatus(`移动资源失败：未找到源资源 ${payload.sourcePath}`)
    return
  }
  if (['assets', 'scenes', 'prefabs'].includes(source.path)) {
    project.setStatus('顶层项目目录不能被拖拽移动。')
    return
  }
  const targetFolder = payload.targetNode.type === 'folder'
    ? payload.targetNode.path
    : payload.targetNode.path.split('/').slice(0, -1).join('/')
  if (!targetFolder || targetFolder === source.path) return
  if (source.type === 'folder' && targetFolder.startsWith(`${source.path}/`)) {
    project.setStatus('不能把文件夹移动到它自己的子目录中。')
    return
  }
  await assets.moveAsset(source.path, targetFolder)
}

function closeImagePreview() {
  imagePreview.visible = false
  imagePreview.loading = false
  imagePreview.error = ''
  resetPreviewView()
}

async function openImagePreview(node: AssetNode) {
  if (node.type !== 'image') return
  imagePreview.visible = true
  imagePreview.loading = true
  imagePreview.error = ''
  imagePreview.name = node.name
  imagePreview.path = node.path
  imagePreview.src = ''
  imagePreview.width = 0
  imagePreview.height = 0
  resetPreviewView()
  resetPreviewDialogSize()

  try {
    await assets.selectAsset(node.path)
    const dataUrl = await assets.ensurePreview(node.path)
    const src = dataUrl || `/${node.path}`
    const size = await loadImageSize(src)
    imagePreview.src = src
    imagePreview.width = size.width
    imagePreview.height = size.height
    project.setStatus(`已打开图片预览：${node.name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    imagePreview.error = `图片预览失败：${message}`
    project.setStatus(imagePreview.error)
  } finally {
    imagePreview.loading = false
  }
}

function loadImageSize(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height
    })
    image.onerror = () => reject(new Error('无法读取图片数据'))
    image.src = src
  })
}

function resetPreviewView() {
  imagePreview.zoom = 1
  imagePreview.panX = 0
  imagePreview.panY = 0
  imagePreview.dragging = false
  imagePreview.dragStartX = 0
  imagePreview.dragStartY = 0
  imagePreview.dragOriginX = 0
  imagePreview.dragOriginY = 0
}

function resetPreviewDialogSize() {
  imagePreview.dialogWidth = clampNumber(Math.min(920, window.innerWidth * 0.92), 420, Math.max(420, window.innerWidth - 48))
  imagePreview.dialogHeight = clampNumber(Math.min(720, window.innerHeight * 0.88), 320, Math.max(320, window.innerHeight - 48))
  imagePreview.resizing = false
  imagePreview.resizeHandle = ''
}

function handlePreviewWheel(event: WheelEvent) {
  if (imagePreview.loading || imagePreview.error || !imagePreview.src) return
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12
  imagePreview.zoom = clampNumber(imagePreview.zoom * factor, 0.2, 12)
}

function startPreviewPan(event: PointerEvent) {
  if (imagePreview.resizing) return
  if (event.button !== 0 && event.button !== 1) return
  if (imagePreview.loading || imagePreview.error || !imagePreview.src) return
  event.preventDefault()
  imagePreview.dragging = true
  imagePreview.dragStartX = event.clientX
  imagePreview.dragStartY = event.clientY
  imagePreview.dragOriginX = imagePreview.panX
  imagePreview.dragOriginY = imagePreview.panY
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function movePreviewPan(event: PointerEvent) {
  if (!imagePreview.dragging) return
  imagePreview.panX = imagePreview.dragOriginX + event.clientX - imagePreview.dragStartX
  imagePreview.panY = imagePreview.dragOriginY + event.clientY - imagePreview.dragStartY
}

function endPreviewPan(event: PointerEvent) {
  if (!imagePreview.dragging) return
  imagePreview.dragging = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
}

function startDialogResize(event: PointerEvent, handle: string) {
  imagePreview.resizing = true
  imagePreview.resizeHandle = handle
  imagePreview.resizeStartX = event.clientX
  imagePreview.resizeStartY = event.clientY
  imagePreview.resizeStartWidth = imagePreview.dialogWidth
  imagePreview.resizeStartHeight = imagePreview.dialogHeight
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', moveDialogResize)
  window.addEventListener('pointerup', endDialogResize, { once: true })
  window.addEventListener('pointercancel', endDialogResize, { once: true })
}

function moveDialogResize(event: PointerEvent) {
  if (!imagePreview.resizing) return
  const dx = event.clientX - imagePreview.resizeStartX
  const dy = event.clientY - imagePreview.resizeStartY
  const handle = imagePreview.resizeHandle
  const maxWidth = Math.max(420, window.innerWidth - 48)
  const maxHeight = Math.max(320, window.innerHeight - 48)
  let nextWidth = imagePreview.resizeStartWidth
  let nextHeight = imagePreview.resizeStartHeight
  if (handle.includes('e')) nextWidth += dx
  if (handle.includes('w')) nextWidth -= dx
  if (handle.includes('s')) nextHeight += dy
  if (handle.includes('n')) nextHeight -= dy
  imagePreview.dialogWidth = clampNumber(nextWidth, 420, maxWidth)
  imagePreview.dialogHeight = clampNumber(nextHeight, 320, maxHeight)
}

function endDialogResize() {
  imagePreview.resizing = false
  imagePreview.resizeHandle = ''
  window.removeEventListener('pointermove', moveDialogResize)
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}
</script>

<style scoped>
.asset-tree { position: relative; }
.header-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.section-title { color: #94a3b8; font-size: 13px; }
.mini-button {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.mini-button:hover { background: #2d3441; }
.project-path {
  margin-bottom: 10px;
  font-size: 12px;
  color: #8ea0b8;
  white-space: nowrap;
}
.tree { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
.asset-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(5, 8, 13, 0.54);
}
.asset-dialog {
  width: min(420px, calc(100vw - 48px));
  display: grid;
  gap: 12px;
  border: 1px solid #354255;
  border-radius: 8px;
  background: #111821;
  padding: 14px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.38);
}
.asset-dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: #edf5ff;
}
.dialog-close {
  width: 28px;
  height: 28px;
  border: 1px solid #303848;
  border-radius: 6px;
  background: #202632;
  color: #ecf0f7;
  cursor: pointer;
}
.dialog-field {
  display: grid;
  gap: 6px;
  color: #a9b7ca;
  font-size: 12px;
}
.dialog-field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #303848;
  border-radius: 6px;
  background: #202632;
  color: #ecf0f7;
  padding: 8px 10px;
  outline: none;
}
.dialog-field input:focus {
  border-color: #56b6c2;
}
.dialog-hint {
  color: #8ea0b8;
  font-size: 12px;
  line-height: 1.5;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.dialog-actions button {
  border: 1px solid #303848;
  border-radius: 6px;
  background: #202632;
  color: #ecf0f7;
  padding: 7px 12px;
  cursor: pointer;
}
.dialog-actions button[type='submit'] {
  border-color: #56b6c2;
  background: #1e4d59;
}
.preview-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(5, 8, 13, 0.62);
}
.preview-dialog {
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 48px);
  display: grid;
  grid-template-rows: auto minmax(220px, 1fr) auto;
  border: 1px solid #354255;
  border-radius: 8px;
  background: #111821;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.38);
  overflow: hidden;
  position: relative;
}
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #283445;
  min-width: 0;
}
.preview-title {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.preview-title strong {
  color: #edf5ff;
  font-size: 13px;
}
.preview-title span {
  color: #8ea0b8;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-close {
  width: 30px;
  height: 30px;
  border: 1px solid #303848;
  border-radius: 6px;
  background: #202632;
  color: #ecf0f7;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.preview-body {
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background:
    linear-gradient(45deg, #18202c 25%, transparent 25%),
    linear-gradient(-45deg, #18202c 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #18202c 75%),
    linear-gradient(-45deg, transparent 75%, #18202c 75%);
  background-color: #111821;
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
  overflow: auto;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.preview-body.panning {
  cursor: grabbing;
}
.preview-body img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  transform-origin: center center;
  will-change: transform;
}
.preview-placeholder {
  color: #a9b7ca;
  font-size: 13px;
}
.preview-placeholder.error {
  color: #ffb4b4;
}
.preview-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid #283445;
  color: #8ea0b8;
  font-size: 12px;
  min-width: 0;
}
.preview-foot span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.resize-handle {
  position: absolute;
  z-index: 5;
}
.resize-n,
.resize-s {
  left: 12px;
  right: 12px;
  height: 8px;
  cursor: ns-resize;
}
.resize-n { top: 0; }
.resize-s { bottom: 0; }
.resize-e,
.resize-w {
  top: 12px;
  bottom: 12px;
  width: 8px;
  cursor: ew-resize;
}
.resize-e { right: 0; }
.resize-w { left: 0; }
.resize-ne,
.resize-nw,
.resize-se,
.resize-sw {
  width: 14px;
  height: 14px;
}
.resize-ne {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}
.resize-nw {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}
.resize-se {
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
}
.resize-sw {
  left: 0;
  bottom: 0;
  cursor: nesw-resize;
}
</style>



