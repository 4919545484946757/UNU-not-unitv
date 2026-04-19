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
      />
    </ul>

    <ContextMenu :visible="menu.visible" :x="menu.x" :y="menu.y" :items="menu.items" @close="closeMenu" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
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

const allExpanded = computed(() => {
  const folders = assets.flat.filter((node) => node.type === 'folder')
  return folders.length > 0 && folders.every((node) => assets.isFolderExpanded(node.path))
})

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
    { label: '导入图片', action: () => assets.importImages() },
    { label: '导入音频', action: () => assets.importAudios() },
    { label: allExpanded.value ? '全部折叠' : '全部展开', action: () => toggleAll() }
  ])
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
    items.push({ label: '导入图片到工程', action: () => assets.importImages() })
    items.push({ label: '导入音频到工程', action: () => assets.importAudios() })
    items.push({ label: '刷新资源', action: () => assets.refreshProject() })
  }

  if (node.type === 'image') {
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

  showMenu(event, items)
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
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
}
.project-path {
  margin-bottom: 10px;
  font-size: 12px;
  color: #8ea0b8;
  white-space: nowrap;
}
.tree { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
</style>
