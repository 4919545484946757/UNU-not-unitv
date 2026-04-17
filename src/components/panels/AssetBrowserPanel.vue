<template>
  <div>
    <div class="path">当前目录：{{ assets.selectedPath }}</div>
    <div class="tip">单击选中资源，双击图片可直接创建 Sprite 实体</div>
    <div class="grid">
      <button
        v-for="item in assets.browserItems"
        :key="item.id"
        class="thumb"
        :class="{ active: assets.selectedAssetPath === item.path }"
        @click="handleClick(item.path, item.type)"
        @dblclick="handleDoubleClick(item.path, item.type)"
      >
        <div class="preview">
          <img v-if="item.type === 'image' && assets.previews[item.path]" :src="assets.previews[item.path]" alt="preview" />
          <span v-else>{{ item.type }}</span>
        </div>
        <div class="label">{{ item.name }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AssetType } from '../../engine/assets/types'
import { useAssetStore } from '../../stores/assets'
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import { useSceneStore } from '../../stores/scene'

const assets = useAssetStore()
const editor = useEditorStore()
const project = useProjectStore()
const scene = useSceneStore()

async function handleClick(path: string, type: AssetType) {
  if (type === 'folder') {
    assets.selectPath(path)
    return
  }

  await assets.selectAsset(path)
  if (type === 'script') editor.setRightTab('Script')
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

  if (type === 'script') editor.setRightTab('Script')
  if (type === 'animation' || type === 'atlas') editor.setRightTab('Timeline')
}
</script>

<style scoped>
.path { margin-bottom: 6px; font-size: 12px; color: #8ea0b8; }
.tip { margin-bottom: 10px; font-size: 12px; color: #6f86a6; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(160px, 1fr)); gap: 10px; min-width: 340px; }
.thumb {
  text-align: left;
  border: 1px solid #293243;
  background: #1a2030;
  border-radius: 10px;
  padding: 10px;
  color: #dbe4ee;
  cursor: pointer;
}
.thumb.active { outline: 1px solid #56b6c2; }
.preview {
  height: 60px;
  display: grid;
  place-items: center;
  background: #232b3c;
  border-radius: 8px;
  color: #79c0ff;
  overflow: hidden;
}
.preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.label { margin-top: 8px; font-size: 12px; color: #d4d9e2; }
</style>
