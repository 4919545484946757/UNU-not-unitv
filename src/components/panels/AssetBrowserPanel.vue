<template>
  <div class="asset-browser">
    <div class="path-bar" aria-label="当前素材目录">
      <span class="path-label">当前目录</span>
      <template v-for="(crumb, index) in pathCrumbs" :key="crumb.path">
        <span v-if="index > 0" class="path-separator">/</span>
        <button
          class="path-crumb"
          :class="{ active: crumb.path === assets.selectedPath }"
          :title="`切换到 ${crumb.path}`"
          @click="selectCrumb(crumb.path)"
        >
          {{ crumb.label }}
        </button>
      </template>
    </div>

    <div v-if="assets.browserItems.length === 0" class="empty-state">
      当前目录为空。可以在资源树中右键该目录新建文件或导入资源。
    </div>

    <div v-else class="grid">
      <button
        v-for="item in assets.browserItems"
        :key="item.id"
        class="thumb"
        :class="{
          active: assets.selectedAssetPath === item.path || assets.selectedPath === item.path,
          folder: item.type === 'folder'
        }"
        @click="handleClick(item.path, item.type)"
        @dblclick="handleDoubleClick(item.path, item.type)"
      >
        <div class="preview" :class="`type-${item.type}`">
          <img
            v-if="item.type === 'image' && assets.previews[item.path]"
            :key="`${item.path}:${assets.previews[item.path].length}`"
            :src="assets.previews[item.path]"
            alt="preview"
          />
          <span v-else-if="item.type === 'image' && loadingPreviewPaths.has(item.path)" class="asset-kind loading">加载中</span>
          <span v-else class="asset-kind">{{ getAssetKindLabel(item.type) }}</span>
        </div>
        <div class="label" :title="item.path">{{ item.name }}</div>
        <div class="sub-label">{{ item.type === 'folder' ? '目录' : item.type }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AssetType } from '../../engine/assets/types'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useSceneStore } from '../../stores/scene'

const assets = useAssetStore()
const editor = useEditorStore()
const project = useProjectStore()
const scene = useSceneStore()
const loadingPreviewPathsRef = ref(new Set<string>())
const loadingPreviewPaths = computed(() => loadingPreviewPathsRef.value)

const pathCrumbs = computed(() => {
  const parts = assets.selectedPath.split('/').filter(Boolean)
  if (parts.length === 0) return [{ label: 'assets', path: 'assets' }]
  return parts.map((part, index) => ({
    label: part,
    path: parts.slice(0, index + 1).join('/')
  }))
})

const visibleImagePathKey = computed(() => (
  `${project.rootPath}::${assets.selectedPath}::${assets.browserItems
    .filter((item) => item.type === 'image')
    .map((item) => item.path)
    .join('|')}`
))

watch(
  visibleImagePathKey,
  () => {
    for (const item of assets.browserItems) {
      if (item.type === 'image') void ensureBrowserPreview(item.path)
    }
  },
  { immediate: true, flush: 'post' }
)

async function ensureBrowserPreview(path: string) {
  if (assets.previews[path] || loadingPreviewPathsRef.value.has(path)) return
  loadingPreviewPathsRef.value = new Set([...loadingPreviewPathsRef.value, path])
  try {
    await assets.ensurePreview(path)
  } finally {
    const next = new Set(loadingPreviewPathsRef.value)
    next.delete(path)
    loadingPreviewPathsRef.value = next
  }
}

function selectCrumb(path: string) {
  assets.selectPath(path)
}

function getAssetKindLabel(type: AssetType) {
  if (type === 'folder') return 'DIR'
  if (type === 'image') return 'IMG'
  if (type === 'audio') return 'AUD'
  if (type === 'script') return 'JS/TS'
  if (type === 'scene') return 'SCENE'
  if (type === 'prefab') return 'PREFAB'
  if (type === 'animation') return 'ANIM'
  if (type === 'atlas') return 'ATLAS'
  return 'FILE'
}

async function handleClick(path: string, type: AssetType) {
  if (type === 'folder') {
    assets.selectPath(path)
    return
  }

  await assets.selectAsset(path)
  if (type === 'script' || type === 'scene' || type === 'prefab') editor.setRightTab('Script')
  if (type === 'animation' || type === 'atlas') editor.setRightTab('Timeline')
}

async function handleDoubleClick(path: string, type: AssetType) {
  if (type === 'folder') {
    assets.selectPath(path)
    return
  }

  await assets.selectAsset(path)

  if (type === 'image') {
    await scene.createSpriteEntityFromAsset(path)
    editor.leftTab = 'Scene'
    editor.setRightTab('Inspector')
    project.setStatus(`已根据图片创建 Sprite 实体：${path.split('/').pop() || path}`)
    return
  }

  if (type === 'script' || type === 'scene' || type === 'prefab') editor.setRightTab('Script')
  if (type === 'animation' || type === 'atlas') editor.setRightTab('Timeline')
}
</script>

<style scoped>
.asset-browser {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.path-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid #293243;
  border-radius: 8px;
  background: #151b27;
  font-size: 12px;
}

.path-label {
  color: #8ea0b8;
  margin-right: 4px;
}

.path-separator {
  color: #506179;
}

.path-crumb {
  border: 1px solid transparent;
  background: transparent;
  color: #cfe6ff;
  padding: 3px 6px;
  border-radius: 5px;
  cursor: pointer;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-crumb:hover {
  border-color: #334155;
  background: #202a3a;
}

.path-crumb.active {
  color: #f3fbff;
  background: #1e4d59;
  border-color: #56b6c2;
}

.empty-state {
  border: 1px dashed #334155;
  border-radius: 10px;
  padding: 14px;
  color: #8ea0b8;
  font-size: 12px;
  line-height: 1.5;
  background: #151b27;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
  min-width: 0;
}

.thumb {
  min-width: 0;
  text-align: left;
  border: 1px solid #293243;
  background: #1a2030;
  border-radius: 10px;
  padding: 10px;
  color: #dbe4ee;
  cursor: pointer;
}

.thumb:hover {
  border-color: #3b4a61;
  background: #20283a;
}

.thumb.active {
  outline: 1px solid #56b6c2;
  border-color: #56b6c2;
}

.thumb.folder {
  background: #192332;
}

.preview {
  height: 60px;
  display: grid;
  place-items: center;
  background: #232b3c;
  border-radius: 8px;
  color: #79c0ff;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.asset-kind {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.asset-kind.loading {
  color: #a9b7ca;
  letter-spacing: 0;
}

.type-folder { color: #ffd166; }
.type-script { color: #9ee493; }
.type-animation,
.type-atlas { color: #c4a7ff; }
.type-scene { color: #8bd3ff; }
.type-prefab { color: #ffb86b; }
.type-audio { color: #ff8fab; }

.label {
  margin-top: 8px;
  font-size: 12px;
  color: #d4d9e2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-label {
  margin-top: 3px;
  font-size: 11px;
  color: #7d8da6;
}
</style>
