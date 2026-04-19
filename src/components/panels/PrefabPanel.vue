<template>
  <div class="prefab-panel">
    <div class="section-title">Prefab</div>
    <div class="tips">
      支持将当前实体保存为 Prefab、从磁盘实例化、保存为变体（Variant），以及一键应用源 Prefab 更新。
    </div>
    <div class="tips" v-if="selectedEntity">
      当前选中：{{ selectedEntity.name }}
      <span v-if="selectedEntity.prefabSourcePath"> | 源文件：{{ selectedEntity.prefabSourcePath }}</span>
      <span v-else> | 源文件：未绑定</span>
      <span v-if="selectedEntity.prefabVariantBasePath"> | 变体基线：{{ selectedEntity.prefabVariantBasePath }}</span>
    </div>
    <div class="actions">
      <button @click="scene.saveSelectedAsPrefab()">保存当前实体为 Prefab</button>
      <button :disabled="!selectedEntity?.prefabSourcePath" @click="scene.saveSelectedAsPrefabVariant()">保存当前实体为 Prefab 变体</button>
      <button @click="scene.instantiatePrefabFromDisk()">从文件实例化 Prefab</button>
      <button :disabled="!selectedEntity?.prefabSourcePath" @click="scene.applySelectedPrefabSource()">应用源 Prefab 更新到实例</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'

const scene = useSceneStore()
const selection = useSelectionStore()
const selectedEntity = computed(() => scene.currentScene?.getEntityById(selection.selectedEntityId) ?? null)
</script>

<style scoped>
.prefab-panel { display: grid; gap: 12px; }
.section-title { color: #94a3b8; font-size: 13px; }
.tips { color: #8ea0b8; font-size: 12px; line-height: 1.6; }
.actions { display: grid; gap: 8px; }
button {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
